"""SecurityAlert model."""
from datetime import datetime
from .. import db


class SecurityAlert(db.Model):
    __tablename__ = 'security_alerts'

    id = db.Column(db.Integer, primary_key=True)
    alert_type = db.Column(
        db.Enum('failed_login', 'unauthorized_access', 'file_tampering',
                'suspicious_download', 'panic_lock', 'brute_force'),
        nullable=False, index=True
    )
    severity = db.Column(
        db.Enum('low', 'medium', 'high', 'critical'),
        nullable=False, default='medium'
    )
    description = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    resource_type = db.Column(db.String(100), nullable=True)
    resource_id = db.Column(db.Integer, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    resolved = db.Column(db.Boolean, nullable=False, default=False)
    resolved_by_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    user = db.relationship('User', foreign_keys=[user_id])
    resolved_by = db.relationship('User', foreign_keys=[resolved_by_id])

    def resolve(self, user_id: int):
        self.resolved = True
        self.resolved_by_id = user_id
        self.resolved_at = datetime.utcnow()
        db.session.commit()

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'alert_type': self.alert_type,
            'severity': self.severity,
            'description': self.description,
            'user_id': self.user_id,
            'user_email': self.user.email if self.user else None,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'ip_address': self.ip_address,
            'resolved': self.resolved,
            'resolved_by': self.resolved_by.full_name if self.resolved_by else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<SecurityAlert {self.alert_type} severity={self.severity}>'
