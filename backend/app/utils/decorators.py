"""Role-based access control decorators."""
from functools import wraps
from flask import jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity


def _get_user_by_identity(user_id):
    """Safely fetch user by JWT identity — handles string or int ID."""
    from ..models.user import User
    try:
        uid = int(user_id)
    except (TypeError, ValueError):
        return None
    return User.query.get(uid)


def get_current_user():
    """Get the current authenticated user from DB."""
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        return _get_user_by_identity(user_id)
    except Exception:
        return None


def role_required(*roles):
    """
    Decorator factory to require specific roles.
    Usage: @role_required('super_admin', 'staff')
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                user_id = get_jwt_identity()
            except Exception:
                return jsonify({'error': 'Authentication required'}), 401

            user = _get_user_by_identity(user_id)

            if not user:
                return jsonify({'error': 'User not found'}), 401
            if not user.is_active:
                return jsonify({'error': 'Account is inactive'}), 403
            if user.role not in roles:
                return jsonify({'error': 'Insufficient permissions', 'required_roles': list(roles)}), 403

            g.current_user = user
            return f(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(f):
    """Require super_admin role."""
    return role_required('super_admin')(f)


def staff_required(f):
    """Require staff, coordinator, or super_admin role."""
    return role_required('staff', 'coordinator', 'super_admin')(f)


def coordinator_required(f):
    """Require coordinator or super_admin role."""
    return role_required('coordinator', 'super_admin')(f)


def student_required(f):
    """Require student role."""
    return role_required('student', 'super_admin')(f)


def any_authenticated(f):
    """Require any authenticated user."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
        except Exception:
            return jsonify({'error': 'Authentication required'}), 401

        user = _get_user_by_identity(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'User not found or inactive'}), 401

        g.current_user = user
        return f(*args, **kwargs)
    return wrapper


def check_panic_lock(f):
    """Decorator that blocks operations if a panic lock is active."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        from ..services.security_service import get_active_panic_lock
        lock = get_active_panic_lock()
        if lock and lock.is_currently_active():
            return jsonify({
                'error': 'System is under panic lock',
                'reason': lock.reason,
                'active_until': lock.active_until.isoformat() if lock.active_until else None,
            }), 503
        return f(*args, **kwargs)
    return wrapper
