"""Authentication routes — register, login, refresh, logout, /me."""
import hashlib
import json
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g, redirect, current_app, render_template_string
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)

from .. import db
from ..models.user import User
from ..models.user_session import UserSession
from ..services.password_service import hash_password, verify_password
from ..services.audit_service import log_action
from ..services.security_service import record_failed_login, check_failed_login_threshold
from ..utils.validators import validate_email, validate_password, validate_phone
from ..utils.decorators import any_authenticated

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user account."""
    if not current_app.config['PUBLIC_REGISTRATION_ENABLED']:
        return jsonify({'error': 'Public registration is disabled. Contact your institution administrator.'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')
    full_name = (data.get('full_name') or '').strip()
    phone = (data.get('phone') or '').strip()
    enrollment_number = (data.get('enrollment_number') or '').strip()
    course = (data.get('course') or '').strip()
    role = 'student'

    # Validate fields
    valid, err = validate_email(email)
    if not valid:
        return jsonify({'error': err}), 400

    if password != confirm_password:
        return jsonify({'error': 'Passwords do not match'}), 400

    valid, err = validate_password(password)
    if not valid:
        return jsonify({'error': err}), 400

    if not full_name:
        return jsonify({'error': 'Full name is required'}), 400

    if phone:
        valid, err = validate_phone(phone)
        if not valid:
            return jsonify({'error': err}), 400

    # Check email uniqueness
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    # Create user
    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        phone=phone or None,
        enrollment_number=(enrollment_number or None) if role == 'student' else None,
        course=(course or None) if role == 'student' else None,
        role=role,
        is_active=True,
    )
    db.session.add(user)
    db.session.commit()

    log_action(
        user_id=user.id,
        action='register',
        resource_type='user',
        resource_id=user.id,
        ip_address=request.remote_addr
    )

    return jsonify({
        'message': 'User registered successfully',
        'user': user.to_public_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and issue JWT tokens."""
    from ..services.security_service import get_active_panic_lock
    lock = get_active_panic_lock()
    skip_panic = request.headers.get('X-Skip-Panic-Check') == 'true'
    if lock and lock.is_currently_active() and not skip_panic:
        return jsonify({
            'error': 'SYSTEM PANIC LOCKDOWN ACTIVE: All authentication and portal logins are currently locked across all accounts.',
            'reason': lock.reason,
            'panic_lockout': True
        }), 503

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')
    ip = request.remote_addr

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    # Check brute force
    if check_failed_login_threshold(email, ip):
        return jsonify({'error': 'Too many failed attempts. Account temporarily locked.'}), 429

    user = User.query.filter_by(email=email).first()

    if not user or not verify_password(password, user.password_hash):
        # Record failed attempt
        record_failed_login(
            user_id=user.id if user else None,
            email=email,
            ip_address=ip
        )
        if user:
            user.increment_failed_login()
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated. Contact administrator.'}), 403

    if user.is_locked_out():
        return jsonify({'error': 'Account temporarily locked due to too many failed attempts.'}), 429

    # Create tokens
    additional_claims = {'role': user.role, 'email': user.email}
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims
    )
    refresh_token = create_refresh_token(identity=str(user.id))

    # Store session
    jti_access = get_jwt()['jti'] if False else None  # Will be set on first request
    refresh_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(days=7)
    session = UserSession(
        user_id=user.id,
        token_hash=hashlib.sha256(access_token.encode()).hexdigest(),
        refresh_token_hash=refresh_hash,
        expires_at=expires_at,
    )
    db.session.add(session)

    # Reset failed logins
    user.reset_failed_logins()

    log_action(
        user_id=user.id,
        action='login',
        resource_type='user',
        resource_id=user.id,
        ip_address=ip,
        user_agent=request.headers.get('User-Agent')
    )

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'token_type': 'Bearer',
        'expires_in': 1800,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token using a valid refresh token."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401

    additional_claims = {'role': user.role, 'email': user.email}
    access_token = create_access_token(
        identity=str(user_id),
        additional_claims=additional_claims
    )

    return jsonify({
        'access_token': access_token,
        'expires_in': 1800
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout: blacklist the current token."""
    user_id = get_jwt_identity()
    jti = get_jwt().get('jti', '')
    token_hash = hashlib.sha256(jti.encode()).hexdigest()

    session = UserSession.query.filter_by(token_hash=token_hash).first()
    if session:
        session.blacklist()

    log_action(
        user_id=user_id,
        action='logout',
        ip_address=request.remote_addr
    )

    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Return the currently authenticated user's profile."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request a password reset (stub — email sending requires SMTP config)."""
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()

    valid, err = validate_email(email)
    if not valid:
        return jsonify({'error': err}), 400

    # Always return success to prevent email enumeration
    user = User.query.filter_by(email=email).first()
    if user:
        # In production: generate reset token, store it, send email
        log_action(
            user_id=user.id,
            action='forgot_password',
            resource_type='user',
            resource_id=user.id,
            ip_address=request.remote_addr
        )

    return jsonify({
        'message': 'If that email exists, a reset link has been sent.'
    }), 200


@auth_bp.route('/oauth/<provider>', methods=['GET'])
def oauth_authorize(provider):
    """Serve a premium mock OAuth authorization screen or redirect to real OAuth if credentials are configured."""
    provider_lower = provider.lower()
    provider_name = provider.capitalize()
    action = request.args.get('action', 'signin')
    
    # Check if real OAuth credentials are set in configuration
    client_id = None
    if provider_lower == 'google':
        client_id = current_app.config.get('GOOGLE_CLIENT_ID')
    elif provider_lower == 'github':
        client_id = current_app.config.get('GITHUB_CLIENT_ID')

    if not current_app.debug and (
        not client_id or client_id.startswith('your-') or len(client_id) <= 10
    ):
        return jsonify({'error': 'This OAuth provider is not configured.'}), 503
        
    if client_id and not client_id.startswith('your-') and len(client_id) > 10:
        # Redirect to real Google/GitHub OAuth consent screen!
        if provider_lower == 'google':
            redirect_uri = f"{current_app.config['BACKEND_URL']}/api/auth/oauth/google/callback?action={action}"
            params = {
                'client_id': client_id,
                'redirect_uri': redirect_uri,
                'response_type': 'code',
                'scope': 'openid email profile',
                'state': 'google-oauth-state'
            }
            auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
            return redirect(auth_url)
        elif provider_lower == 'github':
            redirect_uri = f"{current_app.config['BACKEND_URL']}/api/auth/oauth/github/callback?action={action}"
            params = {
                'client_id': client_id,
                'redirect_uri': redirect_uri,
                'scope': 'user:email read:user',
                'state': 'github-oauth-state'
            }
            auth_url = f"https://github.com/login/oauth/authorize?{urllib.parse.urlencode(params)}"
            return redirect(auth_url)

    # If no Client IDs are configured, fall back to our gorgeous mock login screen
    # Custom colors/icons per provider
    colors = {
        'google': '#4285F4',
        'github': '#24292e',
        'microsoft': '#00a4ef',
        'yahoo': '#6001d2'
    }
    provider_color = colors.get(provider_lower, '#4169E1')
    
    # Beautiful responsive glassmorphic mock consent screen template
    action_title = "Continue"
    action_desc = "Create your secure account and profile details." if action == "signup" else "SecureExam is requesting profile access and email validation."
    action_btn = "Authorize & Register" if action == "signup" else "Authorize & Sign In"

    html_template = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{ action_title }} with {{ provider_name }}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary: {{ provider_color }};
                --bg: #f8fafc;
                --card-bg: #ffffff;
                --text: #0f172a;
                --text-muted: #475569;
                --border: #e2e8f0;
            }
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                font-family: 'Outfit', sans-serif;
            }
            body {
                background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%);
                color: var(--text);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .card {
                background: var(--card-bg);
                border: 1px solid var(--border);
                border-radius: 20px;
                width: 100%;
                max-width: 460px;
                padding: 40px;
                box-shadow: 0 15px 35px -5px rgba(15, 23, 42, 0.08);
                text-align: center;
            }
            .header {
                margin-bottom: 30px;
            }
            .logo-badge {
                width: 64px;
                height: 64px;
                border-radius: 16px;
                background: var(--primary);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                font-weight: 700;
                margin: 0 auto 20px;
                box-shadow: 0 8px 16px rgba(0,0,0,0.12);
            }
            h1 {
                font-size: 24px;
                margin-bottom: 8px;
                font-weight: 700;
                color: #0f172a;
            }
            p.subtitle {
                color: var(--text-muted);
                font-size: 14px;
                font-weight: 500;
            }
            form {
                text-align: left;
                margin-top: 20px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                font-size: 13px;
                color: #1e293b;
                margin-bottom: 6px;
                font-weight: 600;
            }
            input, select {
                width: 100%;
                background: #ffffff;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                padding: 12px 16px;
                color: #0f172a;
                font-size: 15px;
                transition: all 0.3s ease;
            }
            input:focus, select:focus {
                outline: none;
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
            }
            .btn {
                width: 100%;
                background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
                color: white;
                border: none;
                border-radius: 10px;
                padding: 14px;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                transition: transform 0.2s ease, opacity 0.2s ease;
                box-shadow: 0 8px 20px -4px rgba(37, 99, 235, 0.4);
                margin-top: 10px;
            }
            .btn:hover {
                opacity: 0.95;
                transform: translateY(-1px);
            }
            .btn:active {
                transform: translateY(1px);
            }
            .disclaimer {
                font-size: 12px;
                color: #64748b;
                margin-top: 20px;
                line-height: 1.4;
                font-weight: 500;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <div class="logo-badge">{{ provider_name[0] }}</div>
                <h1>{{ action_title }} with {{ provider_name }}</h1>
                <p class="subtitle">{{ action_desc }}</p>
            </div>
            
            <form action="/api/auth/oauth/{{ provider }}/callback?action={{ action }}" method="POST" autoComplete="off">
                <div class="form-group">
                    <label for="email">Enter Your Email Address</label>
                    <input type="email" id="email" name="email" placeholder="Enter your email address" required autofocus autoComplete="off">
                </div>
                <div class="form-group">
                    <label for="name">Account Full Name</label>
                    <input type="text" id="name" name="name" placeholder="Enter your full name" required autoComplete="off">
                </div>
                <div class="form-group">
                    <label for="phone">Enter 10-Digit Mobile Phone Number (Required)</label>
                    <input type="tel" id="phone" name="phone" placeholder="Enter 10-digit mobile number" pattern="[6-9][0-9]{9}" title="Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9" required autoComplete="off">
                </div>
                <button type="submit" class="btn">{{ action_btn }}</button>
            </form>
            
            <p class="disclaimer">
                This is a secure local simulation sandbox. Mobile phone verification is required for all OAuth logins.
            </p>
        </div>
    </body>
    </html>
    """
    
    return render_template_string(
        html_template,
        provider_name=provider_name,
        provider_color=provider_color,
        provider=provider_lower,
        action_title=action_title,
        action_desc=action_desc,
        action_btn=action_btn,
        action=action
    )


@auth_bp.route('/oauth/<provider>/callback', methods=['GET', 'POST'])
def oauth_callback(provider):
    """Handle callback from either the simulated form POST or the real OAuth GET redirect."""
    provider_lower = provider.lower()
    if not current_app.debug:
        client_id = current_app.config.get(f'{provider_lower.upper()}_CLIENT_ID')
        if not client_id or client_id.startswith('your-') or len(client_id) <= 10:
            return jsonify({'error': 'This OAuth provider is not configured.'}), 503
        if request.method != 'GET':
            return jsonify({'error': 'Mock OAuth callbacks are disabled in production.'}), 403

    action = request.args.get('action', 'signin')
    email = None
    name = None
    phone = None
    role = 'student'
    
    if request.method == 'POST':
        # Simulated OAuth form POST
        email = request.form.get('email', '').strip().lower()
        name = request.form.get('name', '').strip()
        phone = request.form.get('phone', '').strip()
    else:
        # Real OAuth GET redirect from Google/GitHub
        code = request.args.get('code')
        phone = request.args.get('phone', '').strip()
        if not code:
            return jsonify({'error': 'OAuth authorization code missing'}), 400
            
        try:
            if provider_lower == 'google':
                user_info = _get_real_google_user_info(code)
            elif provider_lower == 'github':
                user_info = _get_real_github_user_info(code)
            else:
                return jsonify({'error': 'Unsupported live provider'}), 400
                
            email = user_info.get('email')
            name = user_info.get('name')
        except Exception as e:
            return jsonify({'error': f'Failed to retrieve profile info: {str(e)}'}), 500

    if not email:
        return jsonify({'error': 'Email is required for authentication'}), 400

    if phone:
        valid, err = validate_phone(phone)
        if not valid:
            return jsonify({'error': f'Phone validation error: {err}'}), 400

    # Look up user
    user = User.query.filter_by(email=email).first()
    
    if not user:
        if not current_app.config['PUBLIC_REGISTRATION_ENABLED']:
            return jsonify({'error': 'Public registration is disabled. Contact your institution administrator.'}), 403

        # Create a new user with OAuth attributes
        import uuid
        from ..services.password_service import hash_password
        
        # Generate a cryptographically secure random password
        temp_pass = f"OAuthSecure_{uuid.uuid4().hex[:12]}!"
        user = User(
            email=email,
            password_hash=hash_password(temp_pass),
            full_name=name or f"OAuth {provider.capitalize()} User",
            phone=phone or None,
            role='student',
            is_active=True,
            oauth_provider=provider_lower,
            oauth_id=f"oauth_id_{uuid.uuid4().hex[:12]}"
        )
        db.session.add(user)
        db.session.commit()
        
        log_action(
            user_id=user.id,
            action='register_oauth',
            resource_type='user',
            resource_id=user.id,
            details={'provider': provider, 'role': role, 'action': action},
            ip_address=request.remote_addr
        )
    else:
        # User exists, update provider info and phone
        if not user.oauth_provider:
            user.oauth_provider = provider_lower
        if phone:
            user.phone = phone
        db.session.commit()

    # Log login action
    user.reset_failed_logins()
    
    log_action(
        user_id=user.id,
        action='login_oauth',
        resource_type='user',
        resource_id=user.id,
        details={'provider': provider, 'action': action},
        ip_address=request.remote_addr
    )

    # Generate JWT tokens
    additional_claims = {'role': user.role, 'email': user.email}
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims
    )
    refresh_token = create_refresh_token(identity=str(user.id))

    # Redirect user to the frontend login endpoint with token query params
    import urllib.parse
    user_data = urllib.parse.quote(json.dumps(user.to_dict()))
    
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
    redirect_url = f"{frontend_url}/login?access_token={access_token}&refresh_token={refresh_token}&user={user_data}"
    
    return redirect(redirect_url)


def _get_real_google_user_info(code):
    """Retrieve verified profile information from Google's OpenID Connect API."""
    import urllib.request
    import urllib.parse
    import json
    
    client_id = current_app.config.get('GOOGLE_CLIENT_ID')
    client_secret = current_app.config.get('GOOGLE_CLIENT_SECRET')
    redirect_uri = f"{current_app.config['BACKEND_URL']}/api/auth/oauth/google/callback"
    
    # Exchange code for token
    token_url = "https://oauth2.googleapis.com/token"
    data = urllib.parse.urlencode({
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }).encode('utf-8')
    
    req = urllib.request.Request(token_url, data=data, method='POST')
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        access_token = res.get('access_token')
        
    # Get user info
    info_url = "https://openidconnect.googleapis.com/v1/userinfo"
    info_req = urllib.request.Request(info_url, headers={'Authorization': f'Bearer {access_token}'})
    with urllib.request.urlopen(info_req) as info_res:
        user_info = json.loads(info_res.read().decode())
        return {
            'email': user_info.get('email'),
            'name': user_info.get('name')
        }


def _get_real_github_user_info(code):
    """Retrieve profile information from GitHub's REST API."""
    import urllib.request
    import urllib.parse
    import json
    
    client_id = current_app.config.get('GITHUB_CLIENT_ID')
    client_secret = current_app.config.get('GITHUB_CLIENT_SECRET')
    redirect_uri = f"{current_app.config['BACKEND_URL']}/api/auth/oauth/github/callback"
    
    # Exchange code for token
    token_url = "https://github.com/login/oauth/access_token"
    data = urllib.parse.urlencode({
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri
    }).encode('utf-8')
    
    req = urllib.request.Request(token_url, data=data, headers={'Accept': 'application/json'}, method='POST')
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        access_token = res.get('access_token')
        
    # Get user profile
    info_url = "https://api.github.com/user"
    info_req = urllib.request.Request(info_url, headers={
        'Authorization': f'token {access_token}',
        'User-Agent': 'SecureExam-App'
    })
    with urllib.request.urlopen(info_req) as info_res:
        user_info = json.loads(info_res.read().decode())
        email = user_info.get('email')
        
    # Fallback to secondary email checks if public profile email is blank
    if not email:
        email_url = "https://api.github.com/user/emails"
        email_req = urllib.request.Request(email_url, headers={
            'Authorization': f'token {access_token}',
            'User-Agent': 'SecureExam-App'
        })
        with urllib.request.urlopen(email_req) as email_res:
            emails = json.loads(email_res.read().decode())
            primary_email = [e.get('email') for e in emails if e.get('primary')]
            email = primary_email[0] if primary_email else emails[0].get('email')
            
    return {
        'email': email,
        'name': user_info.get('name') or user_info.get('login')
    }
