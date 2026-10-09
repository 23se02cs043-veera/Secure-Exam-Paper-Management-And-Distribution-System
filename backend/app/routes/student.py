"""Student routes — dashboard, papers, and secure paper viewing."""
from datetime import datetime
from flask import Blueprint, request, jsonify, g, send_file
import io

from ..utils.decorators import role_required, check_panic_lock
from ..services.audit_service import log_action
from ..services.encryption import decrypt_file_to_bytes
from ..services.watermark import add_watermark_to_pdf

student_bp = Blueprint('student', __name__, url_prefix='/api/student')


def _get_classified_student_papers():
    """Evaluates each active paper and classifies it into released vs upcoming without duplication."""
    from ..models.paper import Paper
    from ..models.paper_release import PaperRelease

    active_papers = Paper.query.filter_by(is_deleted=False, is_locked=False).order_by(Paper.course_code.asc()).all()

    released_list = []
    upcoming_list = []

    for p in active_papers:
        # Check if there is an active released record
        released_rel = PaperRelease.query.filter_by(paper_id=p.id, is_released=True, is_locked=False).order_by(PaperRelease.id.desc()).first()
        if released_rel and not released_rel.is_expired():
            released_list.append(released_rel.to_dict())
            continue

        # Otherwise check if there is an upcoming scheduled release
        upcoming_rel = PaperRelease.query.filter_by(paper_id=p.id, is_released=False, is_locked=False).order_by(PaperRelease.id.desc()).first()
        if upcoming_rel and not upcoming_rel.is_expired():
            time_diff = (upcoming_rel.scheduled_release_time - datetime.utcnow()).total_seconds() if upcoming_rel.scheduled_release_time else 0
            entry = upcoming_rel.to_dict()
            entry['countdown_seconds'] = max(0, int(time_diff))
            upcoming_list.append(entry)

    return released_list, upcoming_list


def _get_released_papers():
    from ..models.paper_release import PaperRelease
    released_dicts, _ = _get_classified_student_papers()
    result = []
    for rdict in released_dicts:
        rel = PaperRelease.query.get(rdict['id'])
        if rel:
            result.append(rel)
    return result


@student_bp.route('/dashboard', methods=['GET'])
@role_required('student', 'super_admin')
def dashboard():
    user = g.current_user

    released_papers, upcoming_data = _get_classified_student_papers()

    # Access logs for this student (distinct papers count)
    from ..models.paper_access_log import PaperAccessLog
    total_viewed = PaperAccessLog.query.filter_by(user_id=user.id).with_entities(PaperAccessLog.paper_id).distinct().count()
    access_logs = PaperAccessLog.query.filter_by(user_id=user.id).order_by(PaperAccessLog.created_at.desc()).limit(20).all()

    return jsonify({
        'upcoming_exams': upcoming_data,
        'released_papers': released_papers,
        'access_history': [l.to_dict() for l in access_logs],
        'stats': {
            'total_upcoming': len(upcoming_data),
            'papers_released': len(released_papers),
            'papers_viewed': total_viewed,
        }
    }), 200


@student_bp.route('/papers', methods=['GET'])
@role_required('student', 'super_admin')
def list_papers():
    from ..models.paper import Paper
    papers = Paper.query.filter_by(is_deleted=False).order_by(Paper.course_code.asc()).all()
    return jsonify({'papers': [p.to_dict() for p in papers]}), 200


@student_bp.route('/papers/<int:paper_id>', methods=['GET'])
@role_required('student', 'super_admin')
def get_paper(paper_id):
    from ..models.paper_release import PaperRelease

    release = PaperRelease.query.filter_by(
        paper_id=paper_id, is_released=True, is_locked=False
    ).first()

    if not release or release.is_expired():
        return jsonify({'error': 'Paper not accessible'}), 403

    return jsonify({'paper': release.to_dict()}), 200


@student_bp.route('/papers/<int:paper_id>/view', methods=['GET'])
@role_required('student', 'staff', 'coordinator', 'super_admin')
@check_panic_lock
def view_paper(paper_id):
    """Decrypt paper, watermark it, and stream to user."""
    user = g.current_user
    from ..models.paper_release import PaperRelease
    from ..models.paper import Paper
    from ..models.paper_access_log import PaperAccessLog
    from .. import db

    paper = Paper.query.filter_by(id=paper_id, is_deleted=False).first_or_404()

    # For students, verify release status
    if user.role not in ('super_admin', 'staff', 'coordinator'):
        release = PaperRelease.query.filter_by(
            paper_id=paper_id, is_released=True, is_locked=False
        ).first()

        if not release or release.is_expired():
            return jsonify({'error': 'Paper not accessible or expired'}), 403

        if paper.is_locked:
            return jsonify({'error': 'Paper is currently locked'}), 403

    try:
        # Decrypt
        pdf_bytes = decrypt_file_to_bytes(
            paper.file_path,
            paper.encryption_key,
            paper.encryption_nonce,
            paper.encryption_type
        )

        # Add watermark if enabled
        if paper.watermark_enabled:
            pdf_bytes = add_watermark_to_pdf(
                pdf_bytes,
                user_name=user.full_name,
                user_id=user.id,
                user_email=user.email,
                course_code=paper.course_code,
                enrollment_number=user.enrollment_number or f"REG-{user.id:04d}"
            )

        # Log access
        access_log = PaperAccessLog(
            paper_id=paper_id,
            user_id=user.id,
            action='view',
            ip_address=request.remote_addr
        )
        db.session.add(access_log)
        paper.download_count += 1
        db.session.commit()

        log_action(
            user_id=user.id,
            action='view_paper',
            resource_type='paper',
            resource_id=paper_id,
            ip_address=request.remote_addr
        )

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=False,
            download_name=f'{paper.course_code}_exam.pdf'
        )

    except Exception as e:
        return jsonify({'error': f'Failed to retrieve paper: {str(e)}'}), 500


@student_bp.route('/exams', methods=['GET'])
@role_required('student', 'super_admin')
def list_exams():
    """List all upcoming scheduled releases (upcoming exams)."""
    from ..models.paper_release import PaperRelease
    upcoming = PaperRelease.query.filter_by(is_released=False)\
        .order_by(PaperRelease.scheduled_release_time.asc()).all()

    result = []
    for r in upcoming:
        if r.paper and not r.paper.is_deleted:
            diff = (r.scheduled_release_time - datetime.utcnow()).total_seconds()
            entry = r.to_dict()
            entry['countdown_seconds'] = max(0, int(diff))
            result.append(entry)

    return jsonify({'exams': result}), 200
