"""bcrypt password hashing service."""
import bcrypt
import secrets
import string


def hash_password(password: str) -> str:
    """Hash password using bcrypt with 12 rounds. Returns string."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False


def generate_secure_password(length: int = 12) -> str:
    """Generate a cryptographically secure random password."""
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
    while True:
        pwd = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Ensure at least one of each required type
        if (any(c.islower() for c in pwd) and
                any(c.isupper() for c in pwd) and
                any(c.isdigit() for c in pwd) and
                any(c in '!@#$%^&*' for c in pwd)):
            return pwd


def check_password_strength(password: str) -> dict:
    """
    Check password strength.
    Returns: {strong: bool, score: int (0-5), feedback: list[str]}
    """
    feedback = []
    score = 0

    if len(password) >= 8:
        score += 1
    else:
        feedback.append('Password must be at least 8 characters')

    if any(c.isupper() for c in password):
        score += 1
    else:
        feedback.append('Must contain at least one uppercase letter')

    if any(c.islower() for c in password):
        score += 1
    else:
        feedback.append('Must contain at least one lowercase letter')

    if any(c.isdigit() for c in password):
        score += 1
    else:
        feedback.append('Must contain at least one digit')

    if any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password):
        score += 1
    else:
        feedback.append('Must contain at least one special character (!@#$%^&*)')

    return {
        'strong': score == 5,
        'score': score,
        'feedback': feedback,
    }
