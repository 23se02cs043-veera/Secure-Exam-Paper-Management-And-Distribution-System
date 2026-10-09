"""PanicLock model — emergency system lockdown."""
from datetime import datetime
from .. import db


class PanicLock(db.Model):
    __tablename__ = 'panic_locks'

    id = db.Column(db.Integer, primary_key=True)
    lock_type = db.Column(
        db.Enum('all', 'papers', 'downloads'),
        nullable=False, default='all'
    )
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    reason = db.Column(db.Text, nullable=False)
    activated_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    active_until = db.Column(db.DateTime, nullable=True)
    deactivated_at = db.Column(db.DateTime, nullable=True)
    deactivated_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    activated_by = db.relationship('User', foreign_keys=[activated_by_id])
    deactivated_by = db.relationship('User', foreign_keys=[deactivated_by_id])

    def is_currently_active(self) -> bool:
        if not self.is_active:
            return False
        if self.active_until and datetime.utcnow() > self.active_until:
            return False
        return True

    def deactivate(self, user_id: int):
        self.is_active = False
        self.deactivated_at = datetime.utcnow()
        self.deactivated_by_id = user_id
        db.session.commit()

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'lock_type': self.lock_type,
            'is_active': self.is_currently_active(),
            'reason': self.reason,
            'activated_by': self.activated_by.full_name if self.activated_by else None,
            'active_until': self.active_until.isoformat() if self.active_until else None,
            'deactivated_at': self.deactivated_at.isoformat() if self.deactivated_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<PanicLock type={self.lock_type} active={self.is_currently_active()}>'
