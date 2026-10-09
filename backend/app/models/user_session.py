"""UserSession model — JWT token tracking for blacklisting."""
from datetime import datetime
from .. import db


class UserSession(db.Model):
    __tablename__ = 'user_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token_hash = db.Column(db.String(255), nullable=False, unique=True, index=True)
    refresh_token_hash = db.Column(db.String(255), nullable=True, unique=True)
    is_blacklisted = db.Column(db.Boolean, nullable=False, default=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at

    def blacklist(self):
        self.is_blacklisted = True
        db.session.commit()

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'is_blacklisted': self.is_blacklisted,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<UserSession user_id={self.user_id} blacklisted={self.is_blacklisted}>'
