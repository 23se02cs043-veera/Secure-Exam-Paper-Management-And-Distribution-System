"""User model — represents all platform users across roles."""
from datetime import datetime, timezone
from .. import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    enrollment_number = db.Column(db.String(50), nullable=True)
    course = db.Column(db.String(100), nullable=True)
    role = db.Column(
        db.Enum('super_admin', 'staff', 'coordinator', 'student'),
        nullable=False, default='student'
    )
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    last_login = db.Column(db.DateTime, nullable=True)
    failed_logins = db.Column(db.Integer, nullable=False, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    oauth_provider = db.Column(db.String(50), nullable=True)
    oauth_id = db.Column(db.String(255), nullable=True)
    profile_image = db.Column(db.String(512), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    papers = db.relationship('Paper', backref='uploader', lazy='dynamic', foreign_keys='Paper.uploaded_by_id')
    audit_logs = db.relationship('AuditLog', backref='user', lazy='dynamic', foreign_keys='AuditLog.user_id')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', foreign_keys='Notification.user_id')
    sessions = db.relationship('UserSession', backref='user', lazy='dynamic')
    releases = db.relationship('PaperRelease', backref='released_by', lazy='dynamic', foreign_keys='PaperRelease.released_by_id')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'phone': self.phone,
            'enrollment_number': self.enrollment_number,
            'course': self.course,
            'role': self.role,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'profile_image': self.profile_image,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_public_dict(self) -> dict:
        """Safe dict — no sensitive fields."""
        return {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'phone': self.phone,
            'enrollment_number': self.enrollment_number,
            'course': self.course,
            'role': self.role,
            'is_active': self.is_active,
            'profile_image': self.profile_image,
        }

    def is_locked_out(self) -> bool:
        """Check if the account is currently locked out."""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False

    def increment_failed_login(self):
        """Increment failed login counter and lock if threshold exceeded."""
        from datetime import timedelta
        self.failed_logins = (self.failed_logins or 0) + 1
        if self.failed_logins >= 5:
            self.locked_until = datetime.utcnow() + timedelta(minutes=30)
        db.session.commit()

    def reset_failed_logins(self):
        """Reset failed login counter after successful login."""
        self.failed_logins = 0
        self.locked_until = None
        self.last_login = datetime.utcnow()
        db.session.commit()

    def __repr__(self):
        return f'<User {self.email} ({self.role})>'
