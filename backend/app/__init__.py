"""
Flask Application Factory
Secure Question Paper Distribution & Management System
"""
import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail
from flask_migrate import Migrate

# Extension instances (created here, initialized in create_app)
db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
migrate = Migrate()


def create_app(config_name: str = None) -> Flask:
    """Application factory pattern."""
    app = Flask(__name__, instance_relative_config=False)

    # Load configuration
    from .config import config_by_name
    env = config_name or os.getenv('FLASK_ENV', 'development')
    config_class = config_by_name.get(env, config_by_name['default'])
    app.config.from_object(config_class)

    # Ensure upload and instance folders exist
    basedir = os.path.dirname(os.path.dirname(__file__))
    upload_folder = os.path.join(basedir, app.config['UPLOAD_FOLDER'])
    instance_folder = os.path.join(basedir, 'instance')
    os.makedirs(upload_folder, exist_ok=True)
    os.makedirs(instance_folder, exist_ok=True)
    app.config['UPLOAD_FOLDER_ABS'] = upload_folder

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    migrate.init_app(app, db)

    # Initialize database tables and default seed data
    with app.app_context():
        try:
            db.create_all()
            from ..models.user import User
            if User.query.count() == 0:
                from database.seed import seed_database
                seed_database()
        except Exception as db_init_err:
            print(f"[DB INIT WARNING] {db_init_err}")

    # CORS — allow all localhost origins in development
    origins_setting = "*" if app.debug else app.config['CORS_ORIGINS']
    CORS(app,
         resources={r"/api/*": {"origins": origins_setting}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

    # JWT callbacks
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired', 'code': 'token_expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token', 'code': 'invalid_token'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization token required', 'code': 'authorization_required'}), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has been revoked', 'code': 'token_revoked'}), 401

    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        from .models.user_session import UserSession
        jti = jwt_payload.get('jti')
        if not jti:
            return False
        import hashlib
        token_hash = hashlib.sha256(jti.encode()).hexdigest()
        session = UserSession.query.filter_by(token_hash=token_hash, is_blacklisted=True).first()
        return session is not None

    # Register blueprints
    from .routes.health import health_bp
    from .routes.auth import auth_bp
    from .routes.admin import admin_bp
    from .routes.staff import staff_bp
    from .routes.coordinator import coordinator_bp
    from .routes.student import student_bp
    from .routes.notifications import notifications_bp
    from .routes.users import users_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(staff_bp)
    app.register_blueprint(coordinator_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(users_bp)

    from .commands import register_commands
    register_commands(app)

    # Register error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'error': 'Bad request', 'details': str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({'error': 'Unauthorized', 'details': str(e)}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'error': 'Forbidden - insufficient permissions'}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(413)
    def file_too_large(e):
        return jsonify({'error': 'File too large. Maximum size is 100MB'}), 413

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({'error': 'Unprocessable entity', 'details': str(e)}), 422

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

    # Before request: load authenticated user
    from .middleware.auth_middleware import load_current_user
    app.before_request(load_current_user)

    # Initialize scheduler
    with app.app_context():
        try:
            from .services.scheduler import init_scheduler
            init_scheduler(app)
        except Exception as sched_err:
            print(f"[WARNING] Scheduler init failed: {sched_err}")

    return app
