"""Notification model."""
from datetime import datetime
from .. import db


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(
        db.Enum('paper_released', 'paper_expiring', 'paper_locked', 'system', 'security'),
        nullable=False, default='system'
    )
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    related_paper_id = db.Column(db.Integer, db.ForeignKey('papers.id', ondelete='SET NULL'), nullable=True)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    action_url = db.Column(db.String(512), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def mark_read(self):
        self.is_read = True
        db.session.commit()

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'related_paper_id': self.related_paper_id,
            'is_read': self.is_read,
            'action_url': self.action_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Notification {self.type} for user_id={self.user_id}>'
