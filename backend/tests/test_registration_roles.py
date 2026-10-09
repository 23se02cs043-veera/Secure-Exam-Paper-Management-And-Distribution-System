import unittest
from unittest.mock import patch

from app import create_app, db
from app.models.user import User


class RegistrationRoleTests(unittest.TestCase):
    def setUp(self):
        with patch('app.services.scheduler.init_scheduler'):
            self.app = create_app('testing')
        self.app.config['PUBLIC_REGISTRATION_ENABLED'] = True
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_public_registration_cannot_assign_privileged_role(self):
        response = self.client.post('/api/auth/register', json={
            'email': 'new-student@example.com',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'full_name': 'New Student',
            'role': 'coordinator',
        })

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()['user']['role'], 'student')
        with self.app.app_context():
            user = User.query.filter_by(email='new-student@example.com').one()
            self.assertEqual(user.role, 'student')

    def test_disabled_public_registration_rejects_new_users(self):
        self.app.config['PUBLIC_REGISTRATION_ENABLED'] = False
        response = self.client.post('/api/auth/register', json={
            'email': 'blocked@example.com',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'full_name': 'Blocked User',
        })

        self.assertEqual(response.status_code, 403)

    def test_bootstrap_command_creates_only_one_super_admin(self):
        runner = self.app.test_cli_runner()
        result = runner.invoke(
            args=['create-super-admin'],
            input='admin@example.com\nFirst Admin\nStrongPass123!\nStrongPass123!\n',
        )

        self.assertEqual(result.exit_code, 0, result.output)
        with self.app.app_context():
            admin = User.query.filter_by(email='admin@example.com').one()
            self.assertEqual(admin.role, 'super_admin')

        duplicate = runner.invoke(
            args=['create-super-admin'],
            input='second@example.com\nSecond Admin\nAnotherPass123!\nAnotherPass123!\n',
        )
        self.assertNotEqual(duplicate.exit_code, 0)

    def test_mock_oauth_cannot_change_an_existing_users_role(self):
        with self.app.app_context():
            user = User(
                email='admin@example.com',
                password_hash='unused',
                full_name='Existing Admin',
                role='super_admin',
                is_active=True,
            )
            db.session.add(user)
            db.session.commit()

        response = self.client.post(
            '/api/auth/oauth/google/callback',
            data={
                'email': 'admin@example.com',
                'name': 'Existing Admin',
                'role': 'student',
            },
        )

        self.assertEqual(response.status_code, 302)
        with self.app.app_context():
            user = User.query.filter_by(email='admin@example.com').one()
            self.assertEqual(user.role, 'super_admin')

    def test_production_rejects_mock_oauth(self):
        self.app.config['DEBUG'] = False
        response = self.client.get('/api/auth/oauth/google')
        self.assertEqual(response.status_code, 503)

        callback = self.client.post(
            '/api/auth/oauth/google/callback',
            data={'email': 'attacker@example.com', 'role': 'super_admin'},
        )
        self.assertEqual(callback.status_code, 503)


if __name__ == '__main__':
    unittest.main()
