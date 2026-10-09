import click

from . import db
from .models.user import User
from .services.password_service import hash_password
from .utils.validators import validate_email, validate_password


def register_commands(app):
    @app.cli.command('create-super-admin')
    @click.option('--email', prompt=True)
    @click.option('--name', prompt='Full name')
    @click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True)
    def create_super_admin(email, name, password):
        """Create the first administrator using an interactive password prompt."""
        if User.query.filter_by(role='super_admin').first():
            raise click.ClickException('A super administrator already exists.')

        email = email.strip().lower()
        valid, error = validate_email(email)
        if not valid:
            raise click.ClickException(error)

        name = name.strip()
        if not name:
            raise click.ClickException('Full name is required.')

        valid, error = validate_password(password)
        if not valid:
            raise click.ClickException(error)

        if User.query.filter_by(email=email).first():
            raise click.ClickException('An account with that email already exists.')

        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=name,
            role='super_admin',
            is_active=True,
        )
        db.session.add(user)
        db.session.commit()
        click.echo(f'Created initial administrator: {email}')
