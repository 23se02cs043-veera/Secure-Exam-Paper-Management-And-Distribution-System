"""PDF watermarking service using reportlab and pypdf."""
import io
from datetime import datetime

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.colors import Color
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False


def create_watermark_pdf(user_name: str, user_id: int, user_email: str = '',
                          course_code: str = '', enrollment_number: str = '') -> bytes:
    """
    Create a single-page watermark PDF with diagonal repeated text containing Student Name and Enrollment Number.
    Returns PDF bytes.
    """
    if not REPORTLAB_AVAILABLE:
        return b''

    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=A4)
    width, height = A4

    reg_num = enrollment_number or f"REG-{user_id:04d}"
    student_title = f"{user_name.upper()}"
    student_sub = f"{reg_num} | STRICTLY CONFIDENTIAL"

    # Semi-transparent dark blue/crimson tint for diagonal text
    c.setFillColor(Color(0.7, 0.1, 0.1, alpha=0.14))
    c.setStrokeColor(Color(0.7, 0.1, 0.1, alpha=0.08))

    # Draw diagonal Student Name and Enrollment Number watermark multiple times
    c.saveState()
    c.translate(width / 2, height / 2)
    c.rotate(45)

    step_x = 280
    step_y = 140
    for x in range(-3, 4):
        for y in range(-5, 6):
            c.setFont("Helvetica-Bold", 22)
            c.drawCentredString(x * step_x, y * step_y, student_title)
            c.setFont("Helvetica-Bold", 13)
            c.drawCentredString(x * step_x, y * step_y - 18, student_sub)

    c.restoreState()

    timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

    # Top header bar with student metadata
    c.setFillColor(Color(0.1, 0.18, 0.35, alpha=0.12))
    c.rect(0, height - 26, width, 26, fill=1, stroke=0)
    c.setFillColor(Color(0.1, 0.1, 0.1, alpha=0.85))
    c.setFont("Helvetica-Bold", 8)
    top_info_text = f"SECURE EXAM SYSTEM  |  STUDENT: {student_title}  |  REG NO: {reg_num}  |  COURSE: {course_code}  |  {timestamp}"
    c.drawString(10, height - 17, top_info_text)

    # Bottom footer bar with student details & email
    c.setFillColor(Color(0.1, 0.18, 0.35, alpha=0.12))
    c.rect(0, 0, width, 32, fill=1, stroke=0)

    c.setFillColor(Color(0.1, 0.1, 0.1, alpha=0.85))
    c.setFont("Helvetica-Bold", 8)
    info_text = f"AUTHORIZED STUDENT COPY  |  NAME: {student_title}  |  ENROLLMENT: {reg_num}  |  EMAIL: {user_email}  |  IP LOGGED"
    c.drawString(10, 11, info_text)

    c.save()
    packet.seek(0)
    return packet.read()


def add_watermark_to_pdf(pdf_bytes: bytes, user_name: str, user_id: int,
                          user_email: str = '', course_code: str = '',
                          enrollment_number: str = '') -> bytes:
    """
    Merge watermark onto every page of a PDF.
    Returns watermarked PDF bytes.
    Falls back to original bytes if watermarking fails.
    """
    if not (REPORTLAB_AVAILABLE and PYPDF_AVAILABLE):
        return pdf_bytes

    try:
        watermark_bytes = create_watermark_pdf(
            user_name=user_name,
            user_id=user_id,
            user_email=user_email,
            course_code=course_code,
            enrollment_number=enrollment_number
        )
        if not watermark_bytes:
            return pdf_bytes

        watermark_reader = pypdf.PdfReader(io.BytesIO(watermark_bytes))
        watermark_page = watermark_reader.pages[0]

        original_reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        writer = pypdf.PdfWriter()

        for page in original_reader.pages:
            page.merge_page(watermark_page)
            writer.add_page(page)

        output = io.BytesIO()
        writer.write(output)
        output.seek(0)
        return output.read()

    except Exception as e:
        print(f"[WATERMARK] Failed to add watermark: {e}")
        return pdf_bytes  # Fallback to original


def add_header_footer_to_pdf(pdf_bytes: bytes, user_name: str, course_code: str,
                               exam_date: str = '') -> bytes:
    """
    Add a header/footer info bar to each page.
    Falls back gracefully on error.
    """
    if not REPORTLAB_AVAILABLE:
        return pdf_bytes

    try:
        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=A4)
        width, height = A4

        # Header bar
        c.setFillColor(Color(0.1, 0.18, 0.35, alpha=0.9))
        c.rect(0, height - 24, width, 24, fill=1, stroke=0)
        c.setFillColor(Color(1, 1, 1, alpha=1))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(10, height - 15, f"SECURE EXAM SYSTEM  |  {course_code}  |  {exam_date}")
        c.drawRightString(width - 10, height - 15, f"Authorized: {user_name}")

        c.save()
        packet.seek(0)
        header_bytes = packet.read()

        header_reader = pypdf.PdfReader(io.BytesIO(header_bytes))
        header_page = header_reader.pages[0]

        original_reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        writer = pypdf.PdfWriter()

        for page in original_reader.pages:
            page.merge_page(header_page)
            writer.add_page(page)

        output = io.BytesIO()
        writer.write(output)
        output.seek(0)
        return output.read()

    except Exception as e:
        print(f"[WATERMARK] Header/footer failed: {e}")
        return pdf_bytes
