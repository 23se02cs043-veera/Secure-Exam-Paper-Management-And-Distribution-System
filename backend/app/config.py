import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def normalize_database_url(url):
    if url and url.startswith('postgres://'):
        return f'postgresql://{url[len("postgres://"):]}'
    return url


class BaseConfig:
    """Base configuration shared across all environments."""

    SECRET_KEY = os.getenv('SECRET_KEY') or 'super-secure-production-secret-key-2026-exam-system-8841'
    DEBUG = False
    TESTING = False

    # Database
    db_url = os.getenv('DATABASE_URL')
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    if not db_url or 'instance/secure_exam.db' in db_url:
        sqlite_db_path = os.path.join(basedir, 'instance', 'secure_exam.db')
        db_url = f"sqlite:///{sqlite_db_path.replace(os.sep, '/')}"
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_POOL_RECYCLE = 280
    SQLALCHEMY_POOL_PRE_PING = True
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'max_overflow': 20,
        'pool_timeout': 30,
    }

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY') or 'super-secure-jwt-secret-key-2026-exam-system-9942'
    JWT_ALGORITHM = 'HS256'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 1800)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 604800)))
    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ['access', 'refresh']
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'

    # File Upload
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads/papers')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 104857600))  # 100MB
    ALLOWED_EXTENSIONS = {'pdf'}

    # Encryption
    MASTER_ENCRYPTION_KEY = os.getenv('MASTER_ENCRYPTION_KEY', 'dGhpcy1pcy1hLXRlc3Qta2V5LW5lZWRzLWNoYW5naW5n')

    # Mail
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USE_SSL = False
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@university.edu')
    MAIL_SUPPRESS_SEND = os.getenv('MAIL_SUPPRESS_SEND', 'False').lower() == 'true'

    # CORS
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')
    PUBLIC_REGISTRATION_ENABLED = os.getenv('PUBLIC_REGISTRATION_ENABLED', 'true').lower() == 'true'
    CORS_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3002',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        os.getenv('FRONTEND_URL', 'http://localhost:3000')
    ]

    # APScheduler
    SCHEDULER_API_ENABLED = True
    SCHEDULER_TIMEZONE = 'UTC'

    # Pagination
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100

    # Security
    FAILED_LOGIN_THRESHOLD = 5
    LOCKOUT_MINUTES = 30
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

    # OAuth
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
    GITHUB_CLIENT_ID = os.getenv('GITHUB_CLIENT_ID', '')
    GITHUB_CLIENT_SECRET = os.getenv('GITHUB_CLIENT_SECRET', '')


class DevelopmentConfig(BaseConfig):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_ECHO = False
    MAIL_SUPPRESS_SEND = True  # Don't send real emails in dev


class TestingConfig(BaseConfig):
    """Testing configuration."""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_ENGINE_OPTIONS = {}
    JWT_SECRET_KEY = 'test-jwt-secret-key-for-unit-tests-only'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    MAIL_SUPPRESS_SEND = True
    WTF_CSRF_ENABLED = False


class ProductionConfig(BaseConfig):
    """Production configuration."""
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SQLALCHEMY_ECHO = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or BaseConfig.SECRET_KEY
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or BaseConfig.JWT_SECRET_KEY
    db_env = os.environ.get('DATABASE_URL')
    if db_env:
        SQLALCHEMY_DATABASE_URI = normalize_database_url(db_env)
    else:
        basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
        sqlite_db_path = os.path.join(basedir, 'instance', 'secure_exam.db')
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{sqlite_db_path.replace(os.sep, '/')}"
    MASTER_ENCRYPTION_KEY = os.environ.get('MASTER_ENCRYPTION_KEY') or BaseConfig.MASTER_ENCRYPTION_KEY
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://secure-exam-frontend.onrender.com')
    BACKEND_URL = os.environ.get('BACKEND_URL', 'https://secure-exam-api.onrender.com')
    PUBLIC_REGISTRATION_ENABLED = os.environ.get('PUBLIC_REGISTRATION_ENABLED', 'true').lower() == 'true'
    CORS_ORIGINS = ['*', FRONTEND_URL]


config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}
