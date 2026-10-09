"""PaperAccessLog — tracks every view/download of a paper."""
from datetime import datetime
from .. import db


class PaperAccessLog(db.Model):
    __tablename__ = 'paper_access_logs'

    id = db.Column(db.Integer, primary_key=True)
    paper_id = db.Column(db.Integer, db.ForeignKey('papers.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    action = db.Column(db.Enum('view', 'download'), nullable=False, default='view')
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    accessor = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'paper_id': self.paper_id,
            'user_id': self.user_id,
            'user_name': self.accessor.full_name if self.accessor else None,
            'user_email': self.accessor.email if self.accessor else None,
            'action': self.action,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<PaperAccessLog paper_id={self.paper_id} user_id={self.user_id} action={self.action}>'
