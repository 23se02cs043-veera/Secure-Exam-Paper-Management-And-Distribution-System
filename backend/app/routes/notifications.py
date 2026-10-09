"""Notifications routes."""
from flask import Blueprint, jsonify, g
from .. import db
from ..models.notification import Notification
from ..utils.decorators import any_authenticated

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('', methods=['GET'])
@any_authenticated
def list_notifications():
    user = g.current_user
    notifs = Notification.query.filter_by(user_id=user.id)\
        .order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify({'notifications': [n.to_dict() for n in notifs]}), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@any_authenticated
def unread_count():
    user = g.current_user
    count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return jsonify({'unread_count': count}), 200


@notifications_bp.route('/<int:notif_id>/read', methods=['PATCH'])
@any_authenticated
def mark_read(notif_id):
    user = g.current_user
    notif = Notification.query.filter_by(id=notif_id, user_id=user.id).first_or_404()
    notif.mark_read()
    return jsonify({'message': 'Notification marked as read'}), 200


@notifications_bp.route('/read-all', methods=['PATCH'])
@any_authenticated
def mark_all_read():
    user = g.current_user
    Notification.query.filter_by(user_id=user.id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read'}), 200


@notifications_bp.route('/<int:notif_id>', methods=['DELETE'])
@any_authenticated
def delete_notification(notif_id):
    user = g.current_user
    notif = Notification.query.filter_by(id=notif_id, user_id=user.id).first_or_404()
    db.session.delete(notif)
    db.session.commit()
    return jsonify({'message': 'Notification deleted'}), 200
