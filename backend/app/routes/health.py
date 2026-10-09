"""Health check route."""
import time
from datetime import datetime
from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__)
START_TIME = time.time()


@health_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint — verify DB connection and return status."""
    db_status = 'disconnected'
    db_error = None

    try:
        from .. import db
        db.session.execute(db.text('SELECT 1'))
        db_status = 'connected'
    except Exception as e:
        db_error = str(e)

    uptime_seconds = int(time.time() - START_TIME)
    hours, remainder = divmod(uptime_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    response = {
        'status': 'ok' if db_status == 'connected' else 'degraded',
        'database': db_status,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'uptime': f'{hours}h {minutes}m {seconds}s',
        'uptime_seconds': uptime_seconds,
        'version': '1.0.0',
        'service': 'Secure Exam Paper Management System',
    }

    if db_error:
        response['db_error'] = db_error

    return jsonify(response), 200


@health_bp.route('/api/ping', methods=['GET'])
def ping():
    """Simple ping endpoint."""
    return jsonify({'ping': 'pong', 'timestamp': datetime.utcnow().isoformat()}), 200
