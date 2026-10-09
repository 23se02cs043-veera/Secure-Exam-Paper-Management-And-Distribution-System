"""Scheduler Service — automatically triggers and releases scheduled exam papers punctually."""
import time
import threading
from datetime import datetime


def process_due_scheduled_releases(app=None):
    """Checks for due scheduled exam paper releases and automatically marks them as released punctually."""
    from ..models.paper_release import PaperRelease
    from ..models.paper import Paper
    from .. import db

    def _execute():
        now = datetime.utcnow()
        due_releases = PaperRelease.query.filter(
            PaperRelease.is_released == False,
            PaperRelease.is_locked == False,
            PaperRelease.scheduled_release_time <= now
        ).all()

        updated_count = 0
        for release in due_releases:
            if release.paper and not release.paper.is_deleted and not release.paper.is_locked:
                release.is_released = True
                release.actual_release_time = now
                notes = release.release_notes or ''
                if '[Punctually released by automated scheduler]' not in notes:
                    release.release_notes = (notes + ' [Punctually released by automated scheduler]').strip()
                updated_count += 1

        if updated_count > 0:
            db.session.commit()

    if app:
        with app.app_context():
            _execute()
    else:
        _execute()


def _background_scheduler_loop(app):
    """Daemon thread loop that checks for due scheduled paper releases every 5 seconds."""
    while True:
        try:
            time.sleep(5)
            process_due_scheduled_releases(app)
        except Exception:
            pass


def start_scheduler_background_thread(app):
    """Starts the background scheduler thread if not already running."""
    thread = threading.Thread(target=_background_scheduler_loop, args=(app,), daemon=True)
    thread.start()
