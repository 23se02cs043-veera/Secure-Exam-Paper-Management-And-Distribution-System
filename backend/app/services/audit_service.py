"""Audit logging service."""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List


ACTIONS = {
    'LOGIN': 'login',
    'LOGOUT': 'logout',
    'REGISTER': 'register',
    'UPLOAD_PAPER': 'upload_paper',
    'DOWNLOAD_PAPER': 'download_paper',
    'VIEW_PAPER': 'view_paper',
    'DELETE_PAPER': 'delete_paper',
    'RELEASE_PAPER': 'release_paper',
    'SCHEDULE_RELEASE': 'schedule_release',
    'LOCK_PAPER': 'lock_paper',
    'UNLOCK_PAPER': 'unlock_paper',
    'CREATE_USER': 'create_user',
    'UPDATE_USER': 'update_user',
    'DELETE_USER': 'delete_user',
    'PANIC_LOCK': 'panic_lock',
    'PANIC_UNLOCK': 'panic_unlock',
    'FAILED_LOGIN': 'failed_login',
    'HASH_VERIFY': 'hash_verify',
}


def log_action(user_id=None, action: str = '', resource_type: str = None,
               resource_id: int = None, details: dict = None,
               ip_address: str = None, user_agent: str = None):
    """Create an audit log entry in the database."""
    try:
        from ..models.audit_log import AuditLog
        from .. import db
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.session.add(log)
        db.session.commit()
        return log
    except Exception as e:
        print(f"[AUDIT] Failed to log action {action}: {e}")
        return None


def get_user_activity(user_id: int, limit: int = 50) -> List[dict]:
    """Get recent activity for a user."""
    from ..models.audit_log import AuditLog
    logs = AuditLog.query.filter_by(user_id=user_id)\
        .order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [log.to_dict() for log in logs]


def get_recent_logs(limit: int = 100, action_filter: str = None,
                    user_id_filter: int = None, date_from: datetime = None,
                    date_to: datetime = None, page: int = 1, per_page: int = 20) -> dict:
    """Get paginated audit logs with optional filters."""
    from ..models.audit_log import AuditLog
    query = AuditLog.query

    if action_filter:
        query = query.filter(AuditLog.action == action_filter)
    if user_id_filter:
        query = query.filter(AuditLog.user_id == user_id_filter)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)

    query = query.order_by(AuditLog.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return {
        'logs': [log.to_dict() for log in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': page,
        'per_page': per_page,
    }


def get_audit_stats() -> dict:
    """Get audit statistics for the admin dashboard."""
    from ..models.audit_log import AuditLog
    from .. import db
    from sqlalchemy import func

    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)

    total = AuditLog.query.count()
    last_24h_count = AuditLog.query.filter(AuditLog.created_at >= last_24h).count()
    failed_logins = AuditLog.query.filter(
        AuditLog.action == 'failed_login',
        AuditLog.created_at >= last_24h
    ).count()

    return {
        'total_entries': total,
        'entries_24h': last_24h_count,
        'failed_logins_24h': failed_logins,
    }
