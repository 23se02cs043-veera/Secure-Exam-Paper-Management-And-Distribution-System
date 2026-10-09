"""Coordinator routes — paper release scheduling and monitoring."""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from .. import db
from ..models.paper import Paper
from ..models.paper_release import PaperRelease
from ..utils.decorators import role_required, check_panic_lock
from ..services.audit_service import log_action
from ..services.scheduler import schedule_paper_release, cancel_scheduled_release

coordinator_bp = Blueprint('coordinator', __name__, url_prefix='/api/coordinator')


@coordinator_bp.route('/dashboard', methods=['GET'])
@role_required('coordinator', 'super_admin')
def dashboard():
    papers = Paper.query.filter_by(is_deleted=False).all()
    paper_dicts = [p.to_dict() for p in papers]

    released = sum(1 for p in paper_dicts if p['distribution_status'] == 'released' and not p['is_locked'])
    upcoming = sum(1 for p in paper_dicts if p['distribution_status'] in ('scheduled', 'pending', 'not_scheduled') and not p['is_locked'])
    locked = sum(1 for p in paper_dicts if p['is_locked'] or p['distribution_status'] in ('expired', 'locked'))

    recent = PaperRelease.query.order_by(PaperRelease.created_at.desc()).limit(10).all()

    return jsonify({
        'stats': {
            'released_papers': released,
            'upcoming_releases': upcoming,
            'locked_papers': locked,
        },
        'papers': paper_dicts,
        'recent_activity': [r.to_dict() for r in recent]
    }), 200


@coordinator_bp.route('/papers', methods=['GET'])
@role_required('coordinator', 'super_admin')
def list_papers():
    papers = Paper.query.filter_by(is_deleted=False).order_by(Paper.course_code.asc()).all()
    return jsonify({'papers': [p.to_dict() for p in papers]}), 200


@coordinator_bp.route('/papers/released', methods=['GET'])
@role_required('coordinator', 'super_admin')
def released_papers():
    releases = PaperRelease.query.filter_by(is_released=True)\
        .order_by(PaperRelease.actual_release_time.desc()).all()
    return jsonify({'releases': [r.to_dict() for r in releases]}), 200


@coordinator_bp.route('/papers/<int:paper_id>', methods=['GET'])
@role_required('coordinator', 'super_admin')
def get_paper(paper_id):
    paper = Paper.query.filter_by(id=paper_id, is_deleted=False).first_or_404()
    releases = PaperRelease.query.filter_by(paper_id=paper_id).all()
    data = paper.to_dict()
    data['releases'] = [r.to_dict() for r in releases]
    return jsonify({'paper': data}), 200


@coordinator_bp.route('/papers/<int:paper_id>/schedule-release', methods=['POST'])
@role_required('coordinator', 'super_admin')
@check_panic_lock
def schedule_release(paper_id):
    user = g.current_user
    paper = Paper.query.filter_by(id=paper_id, is_deleted=False).first_or_404()
    data = request.get_json() or {}

    release_time_str = data.get('release_time')
    expiry_time_str = data.get('expiry_time')
    release_notes = data.get('release_notes', '')

    if not release_time_str:
        return jsonify({'error': 'release_time is required'}), 400

    try:
        release_time = datetime.fromisoformat(release_time_str.replace('Z', '+00:00'))
        if release_time.tzinfo is None:
            release_time = release_time.replace(tzinfo=timezone.utc)
        release_time = release_time.astimezone(timezone.utc).replace(tzinfo=None)  # Store as UTC naive
    except ValueError:
        return jsonify({'error': 'Invalid release_time format. Use ISO 8601.'}), 400

    if release_time <= datetime.utcnow():
        return jsonify({'error': 'Release time must be in the future'}), 400

    expiry_time = None
    if expiry_time_str:
        try:
            expiry_time = datetime.fromisoformat(expiry_time_str.replace('Z', '+00:00'))
            if expiry_time.tzinfo is None:
                expiry_time = expiry_time.replace(tzinfo=timezone.utc)
            expiry_time = expiry_time.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            return jsonify({'error': 'Invalid expiry_time format'}), 400

    # Update the current release so rescheduling never leaves an older release/job active.
    release = PaperRelease.query.filter_by(
        paper_id=paper_id,
        is_locked=False
    ).order_by(PaperRelease.created_at.desc()).first()
    if release and release.scheduler_job_id:
        cancel_scheduled_release(release.scheduler_job_id)

    if not release:
        release = PaperRelease(
            paper_id=paper_id,
            scheduled_release_time=release_time,
            released_by_id=user.id,
            expiry_time=expiry_time,
            release_notes=release_notes,
            is_released=False,
        )
        db.session.add(release)
        db.session.flush()
    else:
        release.scheduled_release_time = release_time
        release.released_by_id = user.id
        release.expiry_time = expiry_time
        release.release_notes = release_notes
        release.is_released = False
        release.actual_release_time = None
        release.is_locked = False

    # Schedule the job
    job_id = schedule_paper_release(paper_id, release_time, release.id)
    release.scheduler_job_id = job_id
    db.session.commit()

    log_action(
        user_id=user.id,
        action='schedule_release',
        resource_type='paper_release',
        resource_id=release.id,
        details={'paper_id': paper_id, 'release_time': release_time_str},
        ip_address=request.remote_addr
    )

    return jsonify({
        'message': 'Paper release scheduled successfully',
        'release': release.to_dict()
    }), 201


@coordinator_bp.route('/papers/<int:paper_id>/release-now', methods=['POST'])
@role_required('coordinator', 'super_admin')
@check_panic_lock
def release_now(paper_id):
    user = g.current_user
    paper = Paper.query.filter_by(id=paper_id, is_deleted=False).first_or_404()

    data = request.get_json() or {}
    expiry_time_str = data.get('expiry_time')

    expiry_time = None
    if expiry_time_str:
        try:
            expiry_time = datetime.fromisoformat(expiry_time_str.replace('Z', '+00:00'))
            if expiry_time.tzinfo is None:
                expiry_time = expiry_time.replace(tzinfo=timezone.utc)
            expiry_time = expiry_time.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            pass

    release = PaperRelease(
        paper_id=paper_id,
        scheduled_release_time=datetime.utcnow(),
        actual_release_time=datetime.utcnow(),
        released_by_id=user.id,
        expiry_time=expiry_time,
        is_released=True,
    )
    db.session.add(release)
    db.session.flush()

    # Send notifications to students
    from ..models.notification import Notification
    from ..models.user import User
    students = User.query.filter_by(role='student', is_active=True).all()
    for student in students:
        notif = Notification(
            user_id=student.id,
            type='paper_released',
            title=f'Paper Released: {paper.subject}',
            message=f'{paper.subject} ({paper.course_code}) is now available.',
            related_paper_id=paper_id,
        )
        db.session.add(notif)

    db.session.commit()
    log_action(user_id=user.id, action='release_paper', resource_type='paper', resource_id=paper_id)

    return jsonify({'message': 'Paper released immediately', 'release': release.to_dict()}), 200


@coordinator_bp.route('/papers/<int:paper_id>/lock', methods=['PATCH'])
@role_required('coordinator', 'super_admin')
def lock_paper(paper_id):
    user = g.current_user
    data = request.get_json() or {}
    password = data.get('password')
    reason = data.get('reason', 'Manual lock by coordinator')

    if not password:
        return jsonify({'error': 'Verification password is required to lock exam papers'}), 400

    from ..services.password_service import verify_password
    if not verify_password(password, user.password_hash):
        return jsonify({'error': 'Invalid authorization password. Action blocked.'}), 401

    release = PaperRelease.query.filter_by(paper_id=paper_id, is_released=True)\
        .order_by(PaperRelease.actual_release_time.desc()).first()

    paper = Paper.query.get_or_404(paper_id)
    paper.is_locked = True
    paper.locked_at = datetime.utcnow()
    paper.locked_reason = reason

    if release:
        release.is_locked = True

    db.session.commit()
    log_action(
        user_id=user.id,
        action='lock_paper',
        resource_type='paper',
        resource_id=paper_id,
        details={'reason': reason}
    )

    return jsonify({'message': 'Paper locked successfully'}), 200


@coordinator_bp.route('/papers/<int:paper_id>/unlock', methods=['PATCH'])
@role_required('coordinator', 'super_admin')
def unlock_paper(paper_id):
    user = g.current_user
    data = request.get_json() or {}
    password = data.get('password')

    if not password:
        return jsonify({'error': 'Verification password is required to unlock exam papers'}), 400

    from ..services.password_service import verify_password
    if not verify_password(password, user.password_hash):
        return jsonify({'error': 'Invalid authorization password. Action blocked.'}), 401

    paper = Paper.query.get_or_404(paper_id)
    paper.is_locked = False
    paper.locked_at = None
    paper.locked_reason = None

    release = PaperRelease.query.filter_by(paper_id=paper_id)\
        .order_by(PaperRelease.created_at.desc()).first()
    if release:
        release.is_locked = False

    db.session.commit()
    log_action(user_id=user.id, action='unlock_paper', resource_type='paper', resource_id=paper_id)
    return jsonify({'message': 'Paper unlocked successfully'}), 200


@coordinator_bp.route('/releases/<int:release_id>', methods=['DELETE'])
@role_required('coordinator', 'super_admin')
def cancel_release(release_id):
    user = g.current_user
    release = PaperRelease.query.get_or_404(release_id)

    if release.is_released:
        return jsonify({'error': 'Cannot cancel an already-released paper'}), 400

    if release.scheduler_job_id:
        cancel_scheduled_release(release.scheduler_job_id)

    db.session.delete(release)
    db.session.commit()
    log_action(user_id=user.id, action='cancel_release', resource_type='paper_release', resource_id=release_id)

    return jsonify({'message': 'Release cancelled successfully'}), 200
