"""Security alert and panic lock service."""
from datetime import datetime, timedelta
from typing import Optional


FAILED_LOGIN_THRESHOLD = 5
FAILED_LOGIN_WINDOW_MINUTES = 15
LOCKOUT_DURATION_MINUTES = 30


def create_security_alert(alert_type: str, severity: str, description: str,
                           user_id=None, resource_type: str = None,
                           resource_id: int = None, ip_address: str = None):
    """Create a security alert record."""
    try:
        from ..models.security_alert import SecurityAlert
        from .. import db
        alert = SecurityAlert(
            alert_type=alert_type,
            severity=severity,
            description=description,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
        )
        db.session.add(alert)
        db.session.commit()
        return alert
    except Exception as e:
        print(f"[SECURITY] Failed to create alert: {e}")
        return None


def check_failed_login_threshold(email: str, ip_address: str = None) -> bool:
    """Check if a user/IP has exceeded failed login attempts. Returns True if locked."""
    from ..models.audit_log import AuditLog
    from ..models.user import User

    window_start = datetime.utcnow() - timedelta(minutes=FAILED_LOGIN_WINDOW_MINUTES)

    user = User.query.filter_by(email=email).first()
    if user and user.is_locked_out():
        return True

    # Check by IP for brute force
    if ip_address:
        ip_attempts = AuditLog.query.filter(
            AuditLog.action == 'failed_login',
            AuditLog.ip_address == ip_address,
            AuditLog.created_at >= window_start
        ).count()

        if ip_attempts >= 10:  # Stricter IP-level threshold
            create_security_alert(
                alert_type='brute_force',
                severity='high',
                description=f'Brute force detected from IP {ip_address} ({ip_attempts} attempts in 15 min)',
                ip_address=ip_address
            )
            return True

    return False


def record_failed_login(user_id=None, email: str = '', ip_address: str = None):
    """Record a failed login attempt and check threshold."""
    from .audit_service import log_action

    log_action(
        user_id=user_id,
        action='failed_login',
        details={'email': email},
        ip_address=ip_address
    )

    # Check if we need to fire an alert
    if user_id:
        from ..models.audit_log import AuditLog
        window_start = datetime.utcnow() - timedelta(minutes=FAILED_LOGIN_WINDOW_MINUTES)
        count = AuditLog.query.filter(
            AuditLog.action == 'failed_login',
            AuditLog.user_id == user_id,
            AuditLog.created_at >= window_start
        ).count()

        if count >= FAILED_LOGIN_THRESHOLD:
            create_security_alert(
                alert_type='failed_login',
                severity='medium',
                description=f'{count} failed login attempts for {email} in {FAILED_LOGIN_WINDOW_MINUTES} minutes',
                user_id=user_id,
                ip_address=ip_address
            )


def detect_file_tampering(paper_id: int, current_hash: str) -> bool:
    """Compare current file hash against stored hash. Alert if mismatch."""
    from ..models.paper import Paper

    paper = Paper.query.get(paper_id)
    if not paper:
        return False

    import hmac
    if not hmac.compare_digest(paper.file_hash.lower(), current_hash.lower()):
        create_security_alert(
            alert_type='file_tampering',
            severity='critical',
            description=f'File tampering detected for paper ID {paper_id} ({paper.course_code})',
            resource_type='paper',
            resource_id=paper_id
        )
        return True
    return False


def get_security_dashboard() -> dict:
    """Get security statistics for the admin dashboard."""
    from ..models.security_alert import SecurityAlert
    from ..models.audit_log import AuditLog

    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)

    total_alerts = SecurityAlert.query.count()
    unresolved = SecurityAlert.query.filter_by(resolved=False).count()
    critical = SecurityAlert.query.filter_by(severity='critical', resolved=False).count()
    high = SecurityAlert.query.filter_by(severity='high', resolved=False).count()
    alerts_24h = SecurityAlert.query.filter(SecurityAlert.created_at >= last_24h).count()
    failed_logins_24h = AuditLog.query.filter(
        AuditLog.action == 'failed_login',
        AuditLog.created_at >= last_24h
    ).count()

    recent_alerts = SecurityAlert.query.order_by(
        SecurityAlert.created_at.desc()
    ).limit(10).all()

    active_lock = get_active_panic_lock()

    return {
        'total_alerts': total_alerts,
        'unresolved_alerts': unresolved,
        'critical_alerts': critical,
        'high_alerts': high,
        'alerts_24h': alerts_24h,
        'failed_logins_24h': failed_logins_24h,
        'recent_alerts': [a.to_dict() for a in recent_alerts],
        'panic_lock_active': active_lock.is_currently_active() if active_lock else False,
        'panic_lock': active_lock.to_dict() if active_lock else None,
    }


def get_active_panic_lock():
    """Get the current active panic lock, or None."""
    from ..models.panic_lock import PanicLock
    locks = PanicLock.query.filter_by(is_active=True).all()
    for lock in locks:
        if lock.is_currently_active():
            return lock
    return None


def activate_panic_lock(lock_type: str, reason: str, activated_by_id: int,
                         duration_minutes: int = None):
    """Activate an emergency panic lock."""
    from ..models.panic_lock import PanicLock
    from .. import db
    from .audit_service import log_action

    # Deactivate any existing locks
    existing = PanicLock.query.filter_by(is_active=True).all()
    for lock in existing:
        lock.is_active = False

    active_until = None
    if duration_minutes:
        active_until = datetime.utcnow() + timedelta(minutes=duration_minutes)

    lock = PanicLock(
        lock_type=lock_type,
        is_active=True,
        reason=reason,
        activated_by_id=activated_by_id,
        active_until=active_until,
    )
    db.session.add(lock)
    db.session.commit()

    log_action(
        user_id=activated_by_id,
        action='panic_lock',
        details={'lock_type': lock_type, 'reason': reason, 'duration_minutes': duration_minutes}
    )

    create_security_alert(
        alert_type='panic_lock',
        severity='critical',
        description=f'PANIC LOCK activated: {reason}',
        user_id=activated_by_id
    )

    return lock


def deactivate_panic_lock(deactivated_by_id: int) -> bool:
    """Deactivate all active panic locks."""
    from .audit_service import log_action
    lock = get_active_panic_lock()
    if not lock:
        return False
    lock.deactivate(deactivated_by_id)
    log_action(user_id=deactivated_by_id, action='panic_unlock')
    return True
