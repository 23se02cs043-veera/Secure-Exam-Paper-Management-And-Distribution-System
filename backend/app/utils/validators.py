"""Input validators for all API endpoints."""
import re
from typing import Tuple

VALID_ROLES = {'super_admin', 'staff', 'coordinator', 'student'}
ALLOWED_EXTENSIONS = {'pdf'}


def validate_email(email: str) -> Tuple[bool, str]:
    """RFC 5322-compliant email validation."""
    if not email or not isinstance(email, str):
        return False, 'Email is required'
    email = email.strip().lower()
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, 'Invalid email format'
    if len(email) > 255:
        return False, 'Email too long (max 255 characters)'
    return True, ''


def validate_password(password: str) -> Tuple[bool, str]:
    """
    Password must be:
    - At least 8 characters
    - One uppercase letter
    - One lowercase letter
    - One digit
    - One special character
    """
    if not password:
        return False, 'Password is required'
    if len(password) < 8:
        return False, 'Password must be at least 8 characters'
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter'
    if not re.search(r'[a-z]', password):
        return False, 'Password must contain at least one lowercase letter'
    if not re.search(r'\d', password):
        return False, 'Password must contain at least one digit'
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password):
        return False, 'Password must contain at least one special character'
    return True, ''


def validate_phone(phone: str) -> Tuple[bool, str]:
    """Validate phone number. Accepts +91-XXXXXXXXXX or raw digits."""
    if not phone:
        return True, ''  # Phone is optional
    phone = phone.strip()
    # Remove spaces, dashes, parentheses for validation
    digits_only = re.sub(r'[\s\-\(\)\+]', '', phone)
    if not digits_only.isdigit():
        return False, 'Phone number must contain only digits, spaces, dashes, and +'
    if len(digits_only) < 7 or len(digits_only) > 15:
        return False, 'Phone number must be 7-15 digits'
    return True, ''


def validate_role(role: str) -> Tuple[bool, str]:
    """Validate role is an allowed enum value."""
    if not role:
        return False, 'Role is required'
    if role not in VALID_ROLES:
        return False, f'Invalid role. Must be one of: {", ".join(VALID_ROLES)}'
    return True, ''


def validate_course_code(code: str) -> Tuple[bool, str]:
    """Course code: alphanumeric + hyphens, 3-20 chars."""
    if not code:
        return False, 'Course code is required'
    code = code.strip().upper()
    if not re.match(r'^[A-Z0-9\-]{3,20}$', code):
        return False, 'Course code must be 3-20 alphanumeric characters (hyphens allowed)'
    return True, ''


def validate_file_extension(filename: str, allowed: set = None) -> Tuple[bool, str]:
    """Check that file has an allowed extension."""
    if allowed is None:
        allowed = ALLOWED_EXTENSIONS
    if not filename:
        return False, 'Filename is required'
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if ext not in allowed:
        return False, f'Invalid file type. Allowed: {", ".join(allowed).upper()}'
    return True, ''


def sanitize_string(s: str, max_length: int = 255) -> str:
    """Strip whitespace and limit string length."""
    if not s:
        return ''
    return str(s).strip()[:max_length]
