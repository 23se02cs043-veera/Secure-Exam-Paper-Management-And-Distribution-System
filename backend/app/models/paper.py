"""Paper model — encrypted exam papers."""
from datetime import datetime
from .. import db


class Paper(db.Model):
    __tablename__ = 'papers'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    course_code = db.Column(db.String(50), nullable=False, index=True)
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_hash = db.Column(db.String(64), nullable=False)
    encryption_type = db.Column(
        db.Enum('aes256gcm', 'aes256cbc', 'chacha20'),
        nullable=False, default='aes256gcm'
    )
    encryption_key = db.Column(db.Text, nullable=True)
    encryption_nonce = db.Column(db.String(255), nullable=True)
    watermark_enabled = db.Column(db.Boolean, nullable=False, default=True)
    watermark_config = db.Column(db.JSON, nullable=True)
    size_bytes = db.Column(db.BigInteger, nullable=False, default=0)
    is_deleted = db.Column(db.Boolean, nullable=False, default=False)
    is_locked = db.Column(db.Boolean, nullable=False, default=False)
    locked_at = db.Column(db.DateTime, nullable=True)
    locked_reason = db.Column(db.String(255), nullable=True)
    download_count = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    releases = db.relationship('PaperRelease', backref='paper', lazy='dynamic', cascade='all, delete-orphan')
    access_logs = db.relationship('PaperAccessLog', backref='paper', lazy='dynamic', cascade='all, delete-orphan')

    def get_size_mb(self) -> float:
        return round(self.size_bytes / (1024 * 1024), 2) if self.size_bytes else 0.0

    def get_unique_viewers_count(self) -> int:
        from ..models.paper_access_log import PaperAccessLog
        from ..models.user import User
        return PaperAccessLog.query.join(User, PaperAccessLog.user_id == User.id)\
            .filter(PaperAccessLog.paper_id == self.id, User.role == 'student')\
            .with_entities(PaperAccessLog.user_id).distinct().count()

    def to_dict(self) -> dict:
        from ..models.paper_release import PaperRelease
        latest_release = self.releases.order_by(PaperRelease.id.desc()).first()

        return {
            'id': self.id,
            'title': self.title,
            'subject': self.subject,
            'semester': self.semester,
            'course_code': self.course_code,
            'uploaded_by_id': self.uploaded_by_id,
            'uploaded_by': self.uploader.full_name if self.uploader else None,
            'file_hash': self.file_hash,
            'encryption_type': self.encryption_type,
            'watermark_enabled': self.watermark_enabled,
            'size_bytes': self.size_bytes,
            'size_mb': self.get_size_mb(),
            'is_deleted': self.is_deleted,
            'is_locked': self.is_locked,
            'locked_at': self.locked_at.isoformat() if self.locked_at else None,
            'locked_reason': self.locked_reason,
            'download_count': self.download_count,
            'unique_viewers': self.get_unique_viewers_count(),
            'original_filename': self.original_filename,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'distribution_time': latest_release.scheduled_release_time.isoformat() if latest_release and latest_release.scheduled_release_time else None,
            'actual_distribution_time': latest_release.actual_release_time.isoformat() if latest_release and latest_release.actual_release_time else None,
            'distribution_status': 'locked' if self.is_locked else (latest_release.get_status() if latest_release else 'not_scheduled'),
        }

    def __repr__(self):
        return f'<Paper {self.course_code}: {self.title}>'
