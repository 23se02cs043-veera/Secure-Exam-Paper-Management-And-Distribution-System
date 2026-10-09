"""Auth middleware — loads authenticated user before each request."""
from flask import g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity


def load_current_user():
    """Before-request hook to load the current user into Flask g."""
    g.current_user = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            from ..models.user import User
            g.current_user = User.query.get(int(user_id))
    except Exception:
        g.current_user = None
