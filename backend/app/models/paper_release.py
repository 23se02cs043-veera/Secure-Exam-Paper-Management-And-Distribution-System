"""PaperRelease model — tracks scheduled and actual releases of exam papers."""
from datetime import datetime
from .. import db


class PaperRelease(db.Model):
    __tablename__ = 'paper_releases'

    id = db.Column(db.Integer, primary_key=True)
    paper_id = db.Column(db.Integer, db.ForeignKey('papers.id', ondelete='CASCADE'), nullable=False)
    scheduled_release_time = db.Column(db.DateTime, nullable=False)
    actual_release_time = db.Column(db.DateTime, nullable=True)
    released_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    expiry_time = db.Column(db.DateTime, nullable=True)
    is_released = db.Column(db.Boolean, nullable=False, default=False)
    is_locked = db.Column(db.Boolean, nullable=False, default=False)
    scheduler_job_id = db.Column(db.String(255), nullable=True)
    release_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def is_expired(self) -> bool:
        if self.expiry_time and datetime.utcnow() > self.expiry_time:
            return True
        return False

    def get_status(self) -> str:
        if self.is_locked:
            return 'locked'
        if not self.is_released:
            if self.scheduled_release_time > datetime.utcnow():
                return 'scheduled'
            return 'pending'
        if self.is_expired():
            return 'expired'
        return 'released'

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'paper_id': self.paper_id,
            'paper_title': self.paper.title if self.paper else None,
            'paper_subject': self.paper.subject if self.paper else None,
            'course_code': self.paper.course_code if self.paper else None,
            'scheduled_release_time': self.scheduled_release_time.isoformat() if self.scheduled_release_time else None,
            'actual_release_time': self.actual_release_time.isoformat() if self.actual_release_time else None,
            'released_by': self.released_by.full_name if self.released_by else None,
            'expiry_time': self.expiry_time.isoformat() if self.expiry_time else None,
            'is_released': self.is_released,
            'is_locked': self.is_locked,
            'status': self.get_status(),
            'release_notes': self.release_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<PaperRelease paper_id={self.paper_id} status={self.get_status()}>'
