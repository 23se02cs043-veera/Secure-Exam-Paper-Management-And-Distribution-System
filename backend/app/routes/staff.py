"""Staff routes — paper upload, management, and dashboard."""
import os
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, send_file, current_app, g
from werkzeug.utils import secure_filename

from .. import db
from ..models.paper import Paper
from ..models.paper_access_log import PaperAccessLog
from ..utils.decorators import role_required, check_panic_lock
from ..utils.validators import validate_course_code, validate_file_extension, sanitize_string
from ..services.encryption import encrypt_file
from ..services.hash_verification import compute_sha256
from ..services.watermark import add_watermark_to_pdf
from ..services.audit_service import log_action

staff_bp = Blueprint('staff', __name__, url_prefix='/api/staff')


@staff_bp.route('/dashboard', methods=['GET'])
@role_required('staff', 'coordinator', 'super_admin')
def dashboard():
    user = g.current_user
    from ..models.user import User
    papers = Paper.query.filter_by(uploaded_by_id=user.id, is_deleted=False).all()
    total_papers = len(papers)
    total_size = sum(p.size_bytes for p in papers)

    paper_ids = [p.id for p in papers]
    student_access_logs = PaperAccessLog.query.join(User, PaperAccessLog.user_id == User.id)\
        .filter(PaperAccessLog.paper_id.in_(paper_ids), User.role == 'student')\
        .order_by(PaperAccessLog.created_at.desc()).all() if paper_ids else []

    total_student_accesses = len(student_access_logs)

    # Recent activity from audit logs
    from ..models.audit_log import AuditLog
    recent = AuditLog.query.filter_by(user_id=user.id)\
        .order_by(AuditLog.created_at.desc()).limit(10).all()

    return jsonify({
        'stats': {
            'total_papers': total_papers,
            'total_downloads': total_student_accesses,
            'storage_used_mb': round(total_size / (1024 * 1024), 2),
        },
        'recent_activity': [r.to_dict() for r in recent],
        'recent_student_access_logs': [l.to_dict() for l in student_access_logs[:30]],
        'papers': [p.to_dict() for p in sorted(papers, key=lambda x: x.created_at or datetime.min, reverse=True)]
    }), 200


@staff_bp.route('/audit-logs/clear', methods=['DELETE'])
@role_required('staff', 'coordinator', 'super_admin')
def clear_staff_audit_logs():
    user = g.current_user
    from ..models.audit_log import AuditLog
    AuditLog.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({'message': 'Recent operations cleared successfully'}), 200


@staff_bp.route('/papers/upload', methods=['POST'])
@role_required('staff', 'coordinator', 'super_admin')
@check_panic_lock
def upload_paper():
    """Upload and encrypt an exam paper."""
    user = g.current_user

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'Empty filename'}), 400

    # Validate file extension
    valid, err = validate_file_extension(file.filename)
    if not valid:
        return jsonify({'error': err}), 400

    title = sanitize_string(request.form.get('title', ''))
    subject = sanitize_string(request.form.get('subject', ''))
    semester = request.form.get('semester', '1')
    course_code = sanitize_string(request.form.get('course_code', '')).upper()
    encryption_type = request.form.get('encryption_type', 'aes256gcm')
    watermark_enabled = request.form.get('watermark_enabled', 'true').lower() == 'true'

    if not title or not subject:
        return jsonify({'error': 'Title and subject are required'}), 400

    try:
        semester = int(semester)
    except ValueError:
        return jsonify({'error': 'Semester must be a number'}), 400

    valid, err = validate_course_code(course_code)
    if not valid:
        return jsonify({'error': err}), 400

    if encryption_type not in ['aes256gcm', 'aes256cbc', 'chacha20']:
        return jsonify({'error': 'Invalid encryption type'}), 400

    # Check course code uniqueness
    if Paper.query.filter_by(course_code=course_code, is_deleted=False).first():
        return jsonify({'error': f'Course code {course_code} already exists'}), 400

    # Save file temporarily
    filename = secure_filename(file.filename)
    upload_folder = current_app.config['UPLOAD_FOLDER_ABS']
    temp_path = os.path.join(upload_folder, f'temp_{datetime.utcnow().timestamp()}_{filename}')
    file.save(temp_path)

    # Check file size
    file_size = os.path.getsize(temp_path)
    if file_size > 100 * 1024 * 1024:  # 100MB
        os.remove(temp_path)
        return jsonify({'error': 'File too large. Maximum size is 100MB'}), 413

    try:
        # Compute hash BEFORE encryption
        file_hash = compute_sha256(temp_path)

        # Encrypt the file
        enc_result = encrypt_file(temp_path, encryption_type)
        encrypted_path = enc_result['encrypted_path']

        # Remove unencrypted temp file
        os.remove(temp_path)

        # Create DB record
        paper = Paper(
            title=title,
            subject=subject,
            semester=semester,
            course_code=course_code,
            uploaded_by_id=user.id,
            file_path=encrypted_path,
            original_filename=filename,
            file_hash=file_hash,
            encryption_type=encryption_type,
            encryption_key=enc_result['key_hex'],
            encryption_nonce=enc_result['nonce_hex'],
            watermark_enabled=watermark_enabled,
            size_bytes=file_size,
        )
        db.session.add(paper)
        db.session.commit()

        # Check for optional release schedule parameters
        release_time_str = request.form.get('release_time')
        expiry_time_str = request.form.get('expiry_time')
        release_notes = request.form.get('release_notes', 'Scheduled during paper upload by teaching staff')

        if release_time_str:
            try:
                release_time = datetime.fromisoformat(release_time_str.replace('Z', '+00:00'))
                if release_time.tzinfo is None:
                    release_time = release_time.replace(tzinfo=timezone.utc)
                release_time = release_time.astimezone(timezone.utc).replace(tzinfo=None)
                expiry_time = None
                if expiry_time_str:
                    expiry_time = datetime.fromisoformat(expiry_time_str.replace('Z', '+00:00'))
                    if expiry_time.tzinfo is None:
                        expiry_time = expiry_time.replace(tzinfo=timezone.utc)
                    expiry_time = expiry_time.astimezone(timezone.utc).replace(tzinfo=None)

                from ..models.paper_release import PaperRelease
                release = PaperRelease(
                    paper_id=paper.id,
                    scheduled_release_time=release_time,
                    released_by_id=user.id,
                    expiry_time=expiry_time,
                    release_notes=release_notes,
                    is_released=False,
                )
                db.session.add(release)
                db.session.commit()
            except Exception:
                pass

        log_action(
            user_id=user.id,
            action='upload_paper',
            resource_type='paper',
            resource_id=paper.id,
            details={'course_code': course_code, 'encryption_type': encryption_type},
            ip_address=request.remote_addr
        )

        return jsonify({
            'message': 'Paper uploaded and encrypted successfully',
            'paper': paper.to_dict()
        }), 201

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@staff_bp.route('/papers', methods=['GET'])
@role_required('staff', 'coordinator', 'super_admin')
def list_papers():
    user = g.current_user
    # Super admin/coordinator see all; staff sees own
    if user.role in ('super_admin', 'coordinator'):
        papers = Paper.query.filter_by(is_deleted=False).order_by(Paper.course_code.asc()).all()
    else:
        papers = Paper.query.filter_by(uploaded_by_id=user.id, is_deleted=False)\
            .order_by(Paper.course_code.asc()).all()
    return jsonify({'papers': [p.to_dict() for p in papers]}), 200


@staff_bp.route('/papers/<int:paper_id>', methods=['GET'])
@role_required('staff', 'coordinator', 'super_admin')
def get_paper(paper_id):
    paper = Paper.query.filter_by(id=paper_id, is_deleted=False).first_or_404()
    from ..models.user import User
    access_logs = PaperAccessLog.query.join(User, PaperAccessLog.user_id == User.id)\
        .filter(PaperAccessLog.paper_id == paper_id, User.role == 'student')\
        .order_by(PaperAccessLog.created_at.desc()).limit(50).all()
    data = paper.to_dict()
    data['access_logs'] = [log.to_dict() for log in access_logs]
    return jsonify({'paper': data}), 200


@staff_bp.route('/papers/<int:paper_id>', methods=['PATCH', 'POST'])
@role_required('staff', 'coordinator', 'super_admin')
def update_paper(paper_id):
    user = g.current_user
    paper = Paper.query.filter_by(id=paper_id, is_deleted=False).first_or_404()

    if request.is_json:
        data = request.get_json(silent=True) or {}
    elif request.form:
        data = request.form.to_dict()
    else:
        data = {}

    # Replace / Re-upload PDF file if provided
    if request.files and 'file' in request.files:
        file = request.files['file']
        if file and file.filename and file.filename.lower().endswith('.pdf'):
            import os, uuid
            from flask import current_app
            from werkzeug.utils import secure_filename
            from ..services.encryption import generate_key, generate_nonce, encrypt_bytes
            from ..utils.security import compute_sha256_bytes

            raw_bytes = file.read()
            if len(raw_bytes) > 0:
                original_filename = secure_filename(file.filename) or 'paper.pdf'
                key_hex = generate_key()
                nonce_hex = generate_nonce()
                sha256_hash = compute_sha256_bytes(raw_bytes)

                enc_bytes = encrypt_bytes(raw_bytes, key_hex, nonce_hex)
                unique_filename = f"{uuid.uuid4().hex}_{original_filename}.enc"
                upload_dir = current_app.config['UPLOAD_FOLDER_ABS']
                target_path = os.path.join(upload_dir, unique_filename)

                with open(target_path, 'wb') as f:
                    f.write(enc_bytes)

                if paper.file_path and os.path.exists(paper.file_path):
                    try:
                        os.remove(paper.file_path)
                    except Exception:
                        pass

                paper.file_path = target_path
                paper.file_hash = sha256_hash
                paper.encryption_key = key_hex
                paper.encryption_nonce = nonce_hex
                paper.size_bytes = len(raw_bytes)
                paper.original_filename = original_filename

    if 'course_code' in data and data['course_code']:
        valid_cc, cc_msg = validate_course_code(data['course_code'])
        if not valid_cc:
            return jsonify({'error': cc_msg}), 400
        paper.course_code = sanitize_string(data['course_code']).upper()

    if 'title' in data and data['title']:
        paper.title = sanitize_string(data['title'])
    if 'subject' in data and data['subject']:
        paper.subject = sanitize_string(data['subject'])
    if 'semester' in data and data['semester']:
        try:
            paper.semester = int(data['semester'])
        except ValueError:
            pass
    if 'watermark_enabled' in data:
        paper.watermark_enabled = str(data['watermark_enabled']).lower() in ('true', '1', 'yes')

    # Update Exam Paper Date & Time (Restricted to Exam Coordinators)
    if user.role == 'staff':
        time_str = None
        status_change = False
    else:
        time_str = data.get('scheduled_release_time') or data.get('distribution_time') or data.get('scheduled_time')
        status_change = 'is_locked' in data or 'status' in data or 'distribution_status' in data or 'is_released' in data

    if time_str:
        try:
            dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
            now = datetime.utcnow()
            is_future = dt > now

            paper.is_locked = False
            paper.locked_at = None
            paper.locked_reason = None

            from ..models.paper_release import PaperRelease
            from ..services.scheduler import schedule_paper_release, cancel_scheduled_release

            if is_future:
                # Set all existing releases for this paper to is_released = False so it transitions from released to scheduled
                prev_releases = PaperRelease.query.filter_by(paper_id=paper_id).all()
                for pr in prev_releases:
                    pr.is_released = False
                    pr.actual_release_time = None

            release = PaperRelease.query.filter_by(paper_id=paper_id).order_by(PaperRelease.created_at.desc()).first()
            if not release:
                release = PaperRelease(
                    paper_id=paper_id,
                    scheduled_release_time=dt,
                    released_by_id=user.id,
                    is_released=not is_future,
                    actual_release_time=None if is_future else now,
                    is_locked=False,
                    release_notes='Scheduled / Updated by Teaching Staff',
                    created_at=now,
                    updated_at=now
                )
                db.session.add(release)
                db.session.flush()
            else:
                if release.scheduler_job_id:
                    cancel_scheduled_release(release.scheduler_job_id)
                release.scheduled_release_time = dt
                release.released_by_id = user.id
                release.is_released = not is_future
                release.actual_release_time = None if is_future else now
                release.is_locked = False
                release.updated_at = now

            if is_future:
                job_id = schedule_paper_release(paper.id, dt, release.id)
                release.scheduler_job_id = job_id
        except Exception as e:
            print(f"[STAFF_ROUTE] Schedule update error: {e}")

    # Update Paper Status (Student Access Allowed vs Blocked / Expired / Locked)
    # The admin/coordinator edit form sends `is_locked: false` together with a
    # future schedule. Do not interpret that default checkbox value as an
    # immediate release; the schedule branch above owns the release state.
    has_explicit_status = 'status' in data or 'distribution_status' in data
    if has_explicit_status or ('is_locked' in data and not time_str):
        status_val = str(data.get('status') or data.get('distribution_status') or '').lower()
        should_lock = bool(data.get('is_locked')) or status_val in ('locked', 'expired', 'disabled', 'blocked')
        
        paper.is_locked = should_lock
        if should_lock:
            paper.locked_at = datetime.utcnow()
            paper.locked_reason = data.get('locked_reason', 'Access locked/expired by teaching staff')
        else:
            paper.locked_at = None
            paper.locked_reason = None
            
        from ..models.paper_release import PaperRelease
        release = PaperRelease.query.filter_by(paper_id=paper_id).order_by(PaperRelease.created_at.desc()).first()
        if release:
            release.is_locked = should_lock
            release.is_released = not should_lock
            release.updated_at = datetime.utcnow()
        elif not should_lock:
            release = PaperRelease(
                paper_id=paper_id,
                scheduled_release_time=datetime.utcnow(),
                released_by_id=user.id,
                is_released=True,
                is_locked=False,
                release_notes='Released by Teaching Staff',
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.session.add(release)

    paper.updated_at = datetime.utcnow()
    db.session.commit()
    log_action(user_id=user.id, action='update_paper', resource_type='paper', resource_id=paper_id)

    return jsonify({'message': 'Paper status and details updated successfully', 'paper': paper.to_dict()}), 200


@staff_bp.route('/papers/<int:paper_id>', methods=['DELETE'])
@role_required('staff', 'coordinator', 'super_admin')
def delete_paper(paper_id):
    user = g.current_user
    paper = Paper.query.filter_by(id=paper_id, is_deleted=False).first_or_404()

    # Teaching staff can delete their uploaded papers
    if user.role == 'staff' and paper.uploaded_by_id != user.id:
        return jsonify({'error': 'You can only delete your own uploaded exam papers.'}), 403

    paper.is_deleted = True
    db.session.commit()
    log_action(
        user_id=user.id,
        action='delete_paper',
        resource_type='paper',
        resource_id=paper_id,
        details={'course_code': paper.course_code}
    )
    return jsonify({'message': 'Exam paper deleted successfully'}), 200


@staff_bp.route('/papers/<int:paper_id>/replace-pdf', methods=['POST'])
@role_required('staff', 'coordinator', 'super_admin')
def replace_paper_pdf(paper_id):
    user = g.current_user
    paper = Paper.query.filter_by(id=paper_id, is_deleted=False).first_or_404()

    if not request.files or 'file' not in request.files:
        return jsonify({'error': 'No PDF file provided in request'}), 400

    file = request.files['file']
    if not file or not file.filename or not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Invalid file. Only PDF files are allowed.'}), 400

    import os, uuid
    from werkzeug.utils import secure_filename
    from flask import current_app
    from ..services.encryption import encrypt_file
    from ..services.hash_verification import compute_sha256

    filename = secure_filename(file.filename) or 'paper.pdf'
    temp_filename = f"temp_edit_{uuid.uuid4().hex}_{filename}"
    temp_path = os.path.join(current_app.config['UPLOAD_FOLDER_ABS'], temp_filename)
    file.save(temp_path)

    try:
        file_size = os.path.getsize(temp_path)
        file_hash = compute_sha256(temp_path)
        enc_result = encrypt_file(temp_path, paper.encryption_type or 'AES-256-GCM')

        if os.path.exists(temp_path):
            os.remove(temp_path)

        if paper.file_path and os.path.exists(paper.file_path):
            try:
                os.remove(paper.file_path)
            except Exception:
                pass

        paper.file_path = enc_result['encrypted_path']
        paper.file_hash = file_hash
        paper.encryption_key = enc_result['key_hex']
        paper.encryption_nonce = enc_result['nonce_hex']
        paper.size_bytes = file_size
        paper.original_filename = filename

        course_code = request.form.get('course_code')
        title = request.form.get('title')
        subject = request.form.get('subject')
        semester = request.form.get('semester')
        watermark_enabled = request.form.get('watermark_enabled')
        if course_code:
            valid_cc, cc_msg = validate_course_code(course_code)
            if not valid_cc:
                return jsonify({'error': cc_msg}), 400
            paper.course_code = sanitize_string(course_code).upper()
        if title:
            paper.title = sanitize_string(title)
        if subject:
            paper.subject = sanitize_string(subject)
        if semester:
            try:
                paper.semester = int(semester)
            except ValueError:
                pass
        if watermark_enabled is not None:
            paper.watermark_enabled = str(watermark_enabled).lower() in ('true', '1', 'yes')

        db.session.commit()
        log_action(user_id=user.id, action='replace_paper_pdf', resource_type='paper', resource_id=paper.id)

        return jsonify({'message': 'PDF file replaced and encrypted successfully', 'paper': paper.to_dict()}), 200

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({'error': f'Failed to process replacement PDF file: {str(e)}'}), 500
