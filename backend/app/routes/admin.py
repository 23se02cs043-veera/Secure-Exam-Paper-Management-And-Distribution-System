"""Admin routes — user management, audit logs, security center, panic lock."""
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from .. import db
from ..models.user import User
from ..models.audit_log import AuditLog
from ..models.paper import Paper
from ..models.paper_release import PaperRelease
from ..models.security_alert import SecurityAlert
from ..utils.decorators import admin_required
from ..utils.validators import validate_email, validate_password, validate_phone, validate_role, sanitize_string
from ..services.password_service import hash_password
from ..services.audit_service import log_action
from ..services.security_service import (
    activate_panic_lock, deactivate_panic_lock, get_active_panic_lock,
    get_security_dashboard
)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    total_users = User.query.count()
    users_by_role = {
        'super_admin': User.query.filter_by(role='super_admin').count(),
        'staff': User.query.filter_by(role='staff').count(),
        'coordinator': User.query.filter_by(role='coordinator').count(),
        'student': User.query.filter_by(role='student').count(),
    }
    total_papers = Paper.query.filter_by(is_deleted=False).count()
    total_releases = PaperRelease.query.filter_by(is_released=True).count()
    last_24h = datetime.utcnow() - timedelta(hours=24)
    failed_logins_24h = AuditLog.query.filter(
        AuditLog.action == 'failed_login',
        AuditLog.created_at >= last_24h
    ).count()
    audit_entries_24h = AuditLog.query.filter(AuditLog.created_at >= last_24h).count()
    security_alerts = SecurityAlert.query.filter_by(resolved=False).count()

    recent_logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(10).all()
    recent_alerts = SecurityAlert.query.filter_by(resolved=False)\
        .order_by(SecurityAlert.created_at.desc()).limit(5).all()
    recent_releases = PaperRelease.query.order_by(PaperRelease.created_at.desc()).limit(5).all()
    uploaded_papers = Paper.query.filter_by(is_deleted=False).order_by(Paper.created_at.desc()).all()

    return jsonify({
        'total_users': total_users,
        'users_by_role': users_by_role,
        'total_papers': total_papers,
        'total_releases': total_releases,
        'failed_logins_24h': failed_logins_24h,
        'audit_entries_24h': audit_entries_24h,
        'security_alerts': security_alerts,
        'recent_logs': [l.to_dict() for l in recent_logs],
        'recent_alerts': [a.to_dict() for a in recent_alerts],
        'recent_releases': [r.to_dict() for r in recent_releases],
        'uploaded_papers': [p.to_dict() for p in uploaded_papers],
    }), 200


@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    search = request.args.get('search', '')
    role_filter = request.args.get('role', '')
    status_filter = request.args.get('status', '')

    query = User.query
    if search:
        query = query.filter(
            db.or_(
                User.email.ilike(f'%{search}%'),
                User.full_name.ilike(f'%{search}%')
            )
        )
    if role_filter:
        query = query.filter_by(role=role_filter)
    if status_filter == 'active':
        query = query.filter_by(is_active=True)
    elif status_filter == 'inactive':
        query = query.filter_by(is_active=False)

    paginated = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        'users': [u.to_dict() for u in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': page,
    }), 200


@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json() or {}
    admin = g.current_user

    email = sanitize_string(data.get('email', '')).lower()
    password = data.get('password', '')
    full_name = sanitize_string(data.get('full_name', ''))
    phone = sanitize_string(data.get('phone', ''))
    enrollment_number = sanitize_string(data.get('enrollment_number', ''))
    course = sanitize_string(data.get('course', ''))
    role = data.get('role', 'student')

    valid, err = validate_email(email)
    if not valid:
        return jsonify({'error': err}), 400
    valid, err = validate_password(password)
    if not valid:
        return jsonify({'error': err}), 400
    if not full_name:
        return jsonify({'error': 'Full name is required'}), 400
    valid, err = validate_role(role)
    if not valid:
        return jsonify({'error': err}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

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

    log_action(user_id=admin.id, action='create_user', resource_type='user', resource_id=user.id,
               details={'email': email, 'role': role})

    return jsonify({'message': 'User created successfully', 'user': user.to_dict()}), 201


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    data = user.to_dict()
    recent_activity = AuditLog.query.filter_by(user_id=user_id)\
        .order_by(AuditLog.created_at.desc()).limit(10).all()
    data['recent_activity'] = [a.to_dict() for a in recent_activity]
    return jsonify({'user': data}), 200


@admin_bp.route('/users/<int:user_id>', methods=['PATCH'])
@admin_required
def update_user(user_id):
    admin = g.current_user
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}

    if 'email' in data and data['email']:
        new_email = sanitize_string(data['email']).strip().lower()
        if new_email != user.email:
            valid, err = validate_email(new_email)
            if not valid:
                return jsonify({'error': err}), 400
            if User.query.filter(User.email == new_email, User.id != user_id).first():
                return jsonify({'error': 'Email address already registered by another account'}), 400
            user.email = new_email
    if 'full_name' in data:
        user.full_name = sanitize_string(data['full_name'])
    if 'phone' in data:
        user.phone = sanitize_string(data['phone']) or None
    if 'role' in data:
        valid, err = validate_role(data['role'])
        if not valid:
            return jsonify({'error': err}), 400
        user.role = data['role']

    if user.role != 'student':
        user.enrollment_number = None
        user.course = None
    else:
        if 'enrollment_number' in data:
            user.enrollment_number = sanitize_string(data['enrollment_number']) or None
        if 'course' in data:
            user.course = sanitize_string(data['course']) or None
    if 'is_active' in data:
        user.is_active = bool(data['is_active'])
    if 'password' in data and data['password']:
        valid, err = validate_password(data['password'])
        if not valid:
            return jsonify({'error': err}), 400
        user.password_hash = hash_password(data['password'])

    user.reset_failed_logins()
    db.session.commit()
    log_action(user_id=admin.id, action='update_user', resource_type='user', resource_id=user_id,
               details={'changes': list(data.keys())})

    return jsonify({'message': 'User updated successfully', 'user': user.to_dict()}), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    admin = g.current_user
    user = User.query.get_or_404(user_id)
    if user.id == admin.id:
        return jsonify({'error': 'Cannot delete your own account'}), 400

    try:
        from ..models.user_session import UserSession
        from ..models.notification import Notification
        from ..models.audit_log import AuditLog
        from ..models.paper import Paper
        from ..models.paper_release import PaperRelease
        from ..models.paper_access_log import PaperAccessLog

        # Delete sessions and notifications
        UserSession.query.filter_by(user_id=user.id).delete()
        Notification.query.filter_by(user_id=user.id).delete()

        # Update audit logs to nullify user_id so audit history is not corrupted
        AuditLog.query.filter_by(user_id=user.id).update({AuditLog.user_id: None})

        # Delete paper releases managed by this user
        PaperRelease.query.filter_by(released_by_id=user.id).delete()

        import os
        # Delete papers uploaded by this user and clean up files/releases
        uploaded_papers = Paper.query.filter_by(uploaded_by_id=user.id).all()
        for paper in uploaded_papers:
            # Delete paper releases for this paper
            PaperRelease.query.filter_by(paper_id=paper.id).delete()
            # Delete paper access logs for this paper
            PaperAccessLog.query.filter_by(paper_id=paper.id).delete()
            # Delete physical encrypted file if it exists
            if paper.file_path and os.path.exists(paper.file_path):
                try:
                    os.remove(paper.file_path)
                except Exception:
                    pass
            db.session.delete(paper)

        # Log deletion action under the admin
        log_action(
            user_id=admin.id,
            action='delete_user',
            resource_type='user',
            resource_id=user_id,
            details={'email': user.email}
        )

        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User profile deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete user: {str(e)}'}), 500


@admin_bp.route('/audit-logs', methods=['GET'])
@admin_required
def audit_logs():
    from ..services.audit_service import get_recent_logs
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    action = request.args.get('action')
    user_id = request.args.get('user_id', type=int)
    date_from_str = request.args.get('date_from')
    date_to_str = request.args.get('date_to')

    date_from = None
    date_to = None
    if date_from_str:
        try:
            date_from = datetime.fromisoformat(date_from_str)
        except ValueError:
            pass
    if date_to_str:
        try:
            date_to = datetime.fromisoformat(date_to_str)
        except ValueError:
            pass

    result = get_recent_logs(
        action_filter=action, user_id_filter=user_id,
        date_from=date_from, date_to=date_to,
        page=page, per_page=per_page
    )
    return jsonify(result), 200


@admin_bp.route('/audit-logs/clear', methods=['DELETE'])
@admin_required
def clear_all_audit_logs():
    AuditLog.query.delete()
    db.session.commit()
    return jsonify({'message': 'All system audit logs cleared successfully'}), 200


@admin_bp.route('/security-alerts', methods=['GET'])
@admin_required
def security_alerts():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    severity = request.args.get('severity')
    resolved = request.args.get('resolved')

    query = SecurityAlert.query
    if severity:
        query = query.filter_by(severity=severity)
    if resolved is not None:
        query = query.filter_by(resolved=(resolved == 'true'))

    paginated = query.order_by(SecurityAlert.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'alerts': [a.to_dict() for a in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
    }), 200


@admin_bp.route('/security-alerts/<int:alert_id>/resolve', methods=['PATCH'])
@admin_required
def resolve_alert(alert_id):
    admin = g.current_user
    alert = SecurityAlert.query.get_or_404(alert_id)
    alert.resolve(admin.id)
    return jsonify({'message': 'Alert resolved'}), 200


@admin_bp.route('/security-alerts/clear', methods=['DELETE'])
@admin_required
def clear_all_security_alerts():
    SecurityAlert.query.delete()
    db.session.commit()
    return jsonify({'message': 'All active security alerts and warnings cleared successfully'}), 200


@admin_bp.route('/security/panic-lock', methods=['POST'])
@admin_required
def create_panic_lock():
    admin = g.current_user
    data = request.get_json() or {}
    lock_type = data.get('lock_type', 'all')
    duration_minutes = data.get('duration_minutes')
    reason = data.get('reason', 'Emergency lockdown initiated by admin')

    if lock_type not in ('all', 'papers', 'downloads'):
        return jsonify({'error': 'Invalid lock_type'}), 400

    lock = activate_panic_lock(
        lock_type=lock_type,
        reason=reason,
        activated_by_id=admin.id,
        duration_minutes=int(duration_minutes) if duration_minutes else None
    )

    return jsonify({
        'message': 'Panic lock activated',
        'lock': lock.to_dict()
    }), 200


@admin_bp.route('/security/panic-lock', methods=['DELETE'])
@admin_required
def remove_panic_lock():
    admin = g.current_user
    success = deactivate_panic_lock(admin.id)
    if not success:
        return jsonify({'error': 'No active panic lock found'}), 404
    return jsonify({'message': 'Panic lock deactivated'}), 200


@admin_bp.route('/security/panic-lock/status', methods=['GET'])
@admin_required
def panic_lock_status():
    lock = get_active_panic_lock()
    if lock and lock.is_currently_active():
        return jsonify({'active': True, 'lock': lock.to_dict()}), 200
    return jsonify({'active': False, 'lock': None}), 200


@admin_bp.route('/security', methods=['GET'])
@admin_required
def security_overview():
    return jsonify(get_security_dashboard()), 200


@admin_bp.route('/reports/overview', methods=['GET'])
@admin_required
def reports_overview():
    from ..models.paper_access_log import PaperAccessLog
    from sqlalchemy import func

    total_views = PaperAccessLog.query.filter(PaperAccessLog.action.in_(['view', 'decrypt_view'])).count()
    total_downloads = PaperAccessLog.query.filter_by(action='download').count()
    total_users = User.query.count()
    papers = Paper.query.filter_by(is_deleted=False).order_by(Paper.created_at.desc()).all()
    total_papers = len(papers)
    total_releases = PaperRelease.query.filter_by(is_released=True).count()

    return jsonify({
        'total_views': total_views,
        'total_downloads': total_downloads,
        'total_users': total_users,
        'total_papers': total_papers,
        'total_releases': total_releases,
        'uploaded_papers': [p.to_dict() for p in papers],
        'users_by_role': {
            role: User.query.filter_by(role=role).count()
            for role in ['super_admin', 'staff', 'coordinator', 'student']
        },
    }), 200
