"""User profile routes — accessible to any authenticated user."""
from flask import Blueprint, request, jsonify, g
from .. import db
from ..utils.decorators import any_authenticated
from ..utils.validators import validate_phone, sanitize_string
from ..services.password_service import verify_password, hash_password

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


@users_bp.route('/profile', methods=['GET'])
@any_authenticated
def get_profile():
    return jsonify({'user': g.current_user.to_dict()}), 200


@users_bp.route('/profile', methods=['PATCH'])
@any_authenticated
def update_profile():
    user = g.current_user
    data = request.get_json() or {}

    if 'full_name' in data:
        user.full_name = sanitize_string(data['full_name'])
    if 'phone' in data:
        if data['phone']:
            valid, err = validate_phone(data['phone'])
            if not valid:
                return jsonify({'error': err}), 400
        user.phone = sanitize_string(data['phone']) or None

    db.session.commit()
    return jsonify({'message': 'Profile updated', 'user': user.to_dict()}), 200


@users_bp.route('/change-password', methods=['POST'])
@any_authenticated
def change_password():
    user = g.current_user
    data = request.get_json() or {}

    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')

    if not verify_password(old_password, user.password_hash):
        return jsonify({'error': 'Current password is incorrect'}), 400

    from ..utils.validators import validate_password
    valid, err = validate_password(new_password)
    if not valid:
        return jsonify({'error': err}), 400

    user.password_hash = hash_password(new_password)
    db.session.commit()

    return jsonify({'message': 'Password changed successfully'}), 200


@users_bp.route('/panic-lock/status', methods=['GET'])
def panic_lock_status():
    from ..services.security_service import get_active_panic_lock
    lock = get_active_panic_lock()
    if lock and lock.is_currently_active():
        return jsonify({'active': True, 'lock': lock.to_dict()}), 200
    return jsonify({'active': False, 'lock': None}), 200


@users_bp.route('/panic-lock/deactivate', methods=['POST'])
def deactivate_panic_lock_public():
    """Public endpoint to deactivate Panic Lock using Admin credentials."""
    data = request.get_json() or {}
    email = (data.get('email') or 'admin@university.edu').strip().lower()
    password = data.get('password', '')

    if not password:
        return jsonify({'error': 'Administrator password is required'}), 400

    from ..models.user import User
    from ..services.password_service import verify_password
    from ..services.security_service import deactivate_panic_lock, get_active_panic_lock

    user = User.query.filter_by(email=email).first()
    if not user or user.role != 'super_admin' or not verify_password(password, user.password_hash):
        return jsonify({'error': 'Invalid administrator password. Only System Administrator can deactivate panic lockdown.'}), 401

    success = deactivate_panic_lock(user.id)
    if not success:
        return jsonify({'error': 'No active panic lock found'}), 404

    return jsonify({'message': 'System Panic Lockdown deactivated successfully. All logins restored.'}), 200
