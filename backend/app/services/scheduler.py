"""APScheduler integration for paper release scheduling."""
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore

scheduler = BackgroundScheduler(
    jobstores={'default': MemoryJobStore()},
    job_defaults={'coalesce': True, 'max_instances': 1},
    timezone='UTC'
)
_app = None


def init_scheduler(app):
    """Initialize APScheduler within the Flask app context."""
    global _app
    _app = app

    if not scheduler.running:
        scheduler.start()

    if not scheduler.get_job('check_punctual_releases'):
        scheduler.add_job(
            func=_check_punctual_releases_job,
            trigger='interval',
            seconds=2,
            id='check_punctual_releases',
            replace_existing=True,
            name='Punctually trigger due paper releases'
        )

    if not scheduler.get_job('auto_expire_papers'):
        scheduler.add_job(
            func=_auto_expire_papers_job,
            trigger='interval',
            minutes=1,
            id='auto_expire_papers',
            replace_existing=True,
            name='Auto-expire released papers'
        )

    if not scheduler.get_job('cleanup_sessions'):
        scheduler.add_job(
            func=_cleanup_sessions_job,
            trigger='interval',
            hours=6,
            id='cleanup_sessions',
            replace_existing=True,
            name='Cleanup expired sessions'
        )


def schedule_paper_release(paper_id: int, release_time: datetime, release_id: int) -> str:
    """Schedule a paper release at a specific time. Returns job_id."""
    job_id = f'release_paper_{paper_id}_{release_id}'
    scheduler.add_job(
        func=_execute_paper_release_job,
        trigger='date',
        run_date=release_time,
        args=[paper_id, release_id],
        id=job_id,
        replace_existing=True,
        name=f'Release paper {paper_id}'
    )
    return job_id


def cancel_scheduled_release(job_id: str) -> bool:
    """Cancel a scheduled release job."""
    try:
        scheduler.remove_job(job_id)
        return True
    except Exception:
        return False


def release_paper_immediately(paper_id: int, released_by_id: int, release_id: int) -> dict:
    """Release a paper immediately."""
    if _app:
        with _app.app_context():
            return _do_release_paper(paper_id, release_id)
    return {'error': 'App context not available'}


def _execute_paper_release_job(paper_id: int, release_id: int):
    """Job function that runs in scheduler thread."""
    global _app
    if _app:
        with _app.app_context():
            _do_release_paper(paper_id, release_id)


def _do_release_paper(paper_id: int, release_id: int) -> dict:
    """Core release logic: update DB, send notifications."""
    try:
        from .. import db
        from ..models.paper_release import PaperRelease
        from ..models.notification import Notification
        from ..models.user import User

        release = PaperRelease.query.get(release_id)
        if not release or release.is_released:
            return {'error': 'Release not found or already released'}
        if release.is_locked or release.scheduled_release_time > datetime.utcnow():
            return {'error': 'Release is not due yet or is locked'}

        release.is_released = True
        release.actual_release_time = datetime.utcnow()
        db.session.commit()

        # Send notifications to all students
        students = User.query.filter_by(role='student', is_active=True).all()
        for student in students:
            notif = Notification(
                user_id=student.id,
                type='paper_released',
                title=f'Exam Paper Released: {release.paper.subject}',
                message=f'The exam paper for {release.paper.subject} ({release.paper.course_code}) is now available.',
                related_paper_id=paper_id,
                action_url=f'/student/papers/{paper_id}'
            )
            db.session.add(notif)
        db.session.commit()

        return {'success': True, 'paper_id': paper_id, 'release_id': release_id}
    except Exception as e:
        print(f"[SCHEDULER] Error releasing paper {paper_id}: {e}")
        return {'error': str(e)}


def _auto_expire_papers_job():
    """Auto-lock papers that have passed their expiry time."""
    global _app
    if not _app:
        return
    with _app.app_context():
        try:
            from .. import db
            from ..models.paper_release import PaperRelease

            expired = PaperRelease.query.filter(
                PaperRelease.is_released == True,
                PaperRelease.is_locked == False,
                PaperRelease.expiry_time <= datetime.utcnow(),
                PaperRelease.expiry_time != None
            ).all()

            for release in expired:
                release.is_locked = True
            db.session.commit()
        except Exception as e:
            print(f"[SCHEDULER] Auto-expire error: {e}")


def _check_punctual_releases_job():
    """Auto-release papers whose scheduled time has arrived in real-time."""
    global _app
    if not _app:
        return
    with _app.app_context():
        try:
            from .. import db
            from ..models.paper_release import PaperRelease
            now_utc = datetime.utcnow()
            now_local = datetime.now()

            # Check both UTC and local naive times for punctual release
            due_releases = PaperRelease.query.filter(
                PaperRelease.is_released == False,
                PaperRelease.is_locked == False,
                ((PaperRelease.scheduled_release_time <= now_utc) | (PaperRelease.scheduled_release_time <= now_local))
            ).all()

            for release in due_releases:
                if release.paper and not release.paper.is_deleted and not release.paper.is_locked:
                    release.is_released = True
                    release.actual_release_time = now_utc
                    notes = release.release_notes or ''
                    if '[Punctually released by automated scheduler]' not in notes:
                        release.release_notes = (notes + ' [Punctually released by automated scheduler]').strip()

                    # Notify active students
                    from ..models.user import User
                    from ..models.notification import Notification
                    students = User.query.filter_by(role='student', is_active=True).all()
                    for student in students:
                        notif = Notification(
                            user_id=student.id,
                            type='paper_released',
                            title=f'Exam Paper Released: {release.paper.subject}',
                            message=f'The scheduled exam paper for {release.paper.subject} ({release.paper.course_code}) is now active.',
                            related_paper_id=release.paper_id,
                            action_url=f'/student/papers/{release.paper_id}'
                        )
                        db.session.add(notif)

            if due_releases:
                db.session.commit()
        except Exception as e:
            print(f"[SCHEDULER] Punctual release job error: {e}")


def _cleanup_sessions_job():
    """Remove old expired/blacklisted session records."""
    global _app
    if not _app:
        return
    with _app.app_context():
        try:
            from .. import db
            from ..models.user_session import UserSession
            cutoff = datetime.utcnow() - timedelta(days=7)
            UserSession.query.filter(
                UserSession.expires_at < cutoff
            ).delete()
            db.session.commit()
        except Exception as e:
            print(f"[SCHEDULER] Session cleanup error: {e}")
