"""
Database seeder — creates test accounts and sample data.
Run: python -m database.seed  (from backend/ directory)
     OR: python database/seed.py
"""
import os
import sys
from datetime import datetime, timedelta

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app import create_app, db
from app.models.user import User
from app.models.paper import Paper
from app.models.paper_release import PaperRelease
from app.models.notification import Notification
from app.services.password_service import hash_password

app = create_app('development')

TEST_PASSWORD = 'TestPass123!'

USERS = [
    {
        'email': 'admin@university.edu',
        'full_name': 'Super Administrator',
        'phone': '+91-9999999901',
        'role': 'super_admin',
    },
    {
        'email': 'staff@university.edu',
        'full_name': 'Dr. Rajesh Kumar',
        'phone': '+91-9999999902',
        'role': 'staff',
    },
    {
        'email': 'coordinator@university.edu',
        'full_name': 'Prof. Priya Sharma',
        'phone': '+91-9999999903',
        'role': 'coordinator',
    },
    {
        'email': 'student@university.edu',
        'full_name': 'Arjun Reddy',
        'phone': '+91-9876543210',
        'role': 'student',
    },
    {
        'email': 'student2@university.edu',
        'full_name': 'Sneha Patel',
        'phone': '+91-9876543211',
        'role': 'student',
    },
]

with app.app_context():
    print("=" * 60)
    print("  SECURE EXAM SYSTEM - Database Seeder")
    print("=" * 60)

    # Create tables
    db.create_all()
    print("[OK] Tables created/verified")

    # Seed users
    created_users = {}
    for user_data in USERS:
        existing = User.query.filter_by(email=user_data['email']).first()
        if existing:
            existing.password_hash = hash_password(TEST_PASSWORD)
            existing.full_name = user_data['full_name']
            existing.phone = user_data['phone']
            existing.role = user_data['role']
            existing.is_active = True
            created_users[user_data['role']] = existing
            print(f"[RESET] Reset password/details for: {user_data['email']}")
        else:
            user = User(
                email=user_data['email'],
                password_hash=hash_password(TEST_PASSWORD),
                full_name=user_data['full_name'],
                phone=user_data['phone'],
                role=user_data['role'],
                is_active=True,
            )
            db.session.add(user)
            db.session.flush()
            created_users[user_data['role']] = user
            print(f"[NEW] Created user: {user_data['email']} ({user_data['role']})")

    db.session.commit()
    print("[OK] Users seeded/reset")

    # Seed sample papers (requires staff user)
    staff_user = created_users.get('staff')
    if staff_user:
        # Create a dummy encrypted file for demo purposes
        uploads_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'papers')
        os.makedirs(uploads_dir, exist_ok=True)

        sample_papers_data = [
            {
                'title': 'Database Systems Final Exam',
                'subject': 'Database Systems',
                'semester': 4,
                'course_code': 'CS-301',
            },
            {
                'title': 'Data Structures Mid-Term',
                'subject': 'Data Structures',
                'semester': 3,
                'course_code': 'CS-201',
            },
            {
                'title': 'Computer Networks Final',
                'subject': 'Computer Networks',
                'semester': 5,
                'course_code': 'CS-401',
            },
        ]

        created_papers = []
        for pd in sample_papers_data:
            existing_paper = Paper.query.filter_by(course_code=pd['course_code']).first()
            if existing_paper:
                print(f"[EXISTING] Paper already exists: {pd['course_code']}")
                created_papers.append(existing_paper)
                continue

            # Create dummy encrypted file
            dummy_path = os.path.join(uploads_dir, f"{pd['course_code']}_exam.pdf.enc")
            if not os.path.exists(dummy_path):
                # Create a real dummy encrypted PDF for demo
                dummy_content = f"SAMPLE EXAM PAPER\n{pd['title']}\nThis is a demo paper for testing.".encode()
                from app.services.encryption import encrypt_aes256gcm
                ciphertext, key_hex, nonce_hex = encrypt_aes256gcm(dummy_content)
                with open(dummy_path, 'wb') as f:
                    f.write(ciphertext)
            else:
                from app.services.encryption import encrypt_aes256gcm
                dummy_content = b"SAMPLE"
                ciphertext, key_hex, nonce_hex = encrypt_aes256gcm(dummy_content)

            from app.services.hash_verification import compute_sha256_bytes
            file_hash = compute_sha256_bytes(dummy_content)

            paper = Paper(
                title=pd['title'],
                subject=pd['subject'],
                semester=pd['semester'],
                course_code=pd['course_code'],
                uploaded_by_id=staff_user.id,
                file_path=dummy_path,
                original_filename=f"{pd['course_code']}_exam.pdf",
                file_hash=file_hash,
                encryption_type='aes256gcm',
                encryption_key=key_hex,
                encryption_nonce=nonce_hex,
                watermark_enabled=True,
                size_bytes=len(dummy_content),
            )
            db.session.add(paper)
            db.session.flush()
            created_papers.append(paper)
            print(f"[NEW] Created paper: {pd['course_code']}")

        db.session.commit()
        print(f"[OK] {len(created_papers)} papers seeded")

        # Seed a released paper (CS-201)
        if len(created_papers) >= 2:
            coordinator_user = created_users.get('coordinator')
            paper_to_release = created_papers[1]  # CS-201

            existing_release = PaperRelease.query.filter_by(
                paper_id=paper_to_release.id, is_released=True
            ).first()

            if not existing_release and coordinator_user:
                release = PaperRelease(
                    paper_id=paper_to_release.id,
                    scheduled_release_time=datetime.utcnow() - timedelta(hours=2),
                    actual_release_time=datetime.utcnow() - timedelta(hours=2),
                    released_by_id=coordinator_user.id,
                    expiry_time=datetime.utcnow() + timedelta(days=5),
                    is_released=True,
                )
                db.session.add(release)

                # Send notifications to students
                for role_key, user in created_users.items():
                    if role_key.startswith('student'):
                        notif = Notification(
                            user_id=user.id,
                            type='paper_released',
                            title=f'Paper Released: {paper_to_release.subject}',
                            message=f'{paper_to_release.subject} exam paper is now available.',
                            related_paper_id=paper_to_release.id,
                        )
                        db.session.add(notif)

                db.session.commit()
                print(f"[NEW] Released paper: {paper_to_release.course_code}")

            # Seed a scheduled (upcoming) release for CS-301
            paper_upcoming = created_papers[0]  # CS-301
            existing_upcoming = PaperRelease.query.filter_by(
                paper_id=paper_upcoming.id
            ).first()

            if not existing_upcoming and coordinator_user:
                future_release = PaperRelease(
                    paper_id=paper_upcoming.id,
                    scheduled_release_time=datetime.utcnow() + timedelta(days=7),
                    released_by_id=coordinator_user.id,
                    expiry_time=datetime.utcnow() + timedelta(days=14),
                    is_released=False,
                )
                db.session.add(future_release)
                db.session.commit()
                print(f"[NEW] Scheduled upcoming release: {paper_upcoming.course_code}")

    print()
    print("=" * 60)
    print("  SEEDING COMPLETE!")
    print("=" * 60)
    print()
    print("  Test Accounts (all use password: TestPass123!)")
    print()
    print("  Role             Email")
    print("  " + "-" * 45)
    for user_data in USERS:
        print(f"  {user_data['role']:<20} {user_data['email']}")
    print()
    print("  Start Flask: cd backend && python run.py")
    print("  Health check: http://localhost:5000/api/health")
    print("=" * 60)
