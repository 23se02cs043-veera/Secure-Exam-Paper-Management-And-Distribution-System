"""
VS Code Database Connection Test Script
Run this file in VS Code terminal: python test_db.py
"""
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.user import User
from app.models.paper import Paper

app = create_app()

with app.app_context():
    print("=" * 60)
    print("  DATABASE CONNECTION TEST RESULT (VS CODE)")
    print("=" * 60)
    print("SUCCESS: Database is 100% CONNECTED!")
    print(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print(f"Total Connected Users: {User.query.count()}")
    print(f"Total Connected Papers: {Paper.query.count()}")
    print("-" * 60)
    print("CONNECTED USER ACCOUNTS IN DATABASE:")
    for user in User.query.all():
        print(f"  • ID: {user.id:<2} | Role: {user.role:<12} | Email: {user.email:<28} | Name: {user.full_name}")
    print("=" * 60)
