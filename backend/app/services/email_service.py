"""Email notification service using Flask-Mail."""
from threading import Thread
from flask import current_app


def send_async_email(app, msg):
    """Send email in a background thread."""
    with app.app_context():
        try:
            from .. import mail
            mail.send(msg)
        except Exception as e:
            print(f"[EMAIL] Failed to send email: {e}")


def _send_email(subject: str, recipients: list, html_body: str):
    """Internal helper to create and send a message."""
    try:
        from flask_mail import Message
        from .. import mail
        app = current_app._get_current_object()
        msg = Message(subject=subject, recipients=recipients, html=html_body)
        thread = Thread(target=send_async_email, args=(app, msg))
        thread.daemon = True
        thread.start()
    except Exception as e:
        print(f"[EMAIL] Error creating email: {e}")


def send_paper_release_notification(student_email: str, student_name: str,
                                     paper_title: str, course_code: str,
                                     expiry_time=None):
    """Send paper release notification to a student."""
    expiry_str = expiry_time.strftime('%B %d, %Y at %H:%M UTC') if expiry_time else 'No expiry'
    frontend_url = current_app.config['FRONTEND_URL']
    html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
      <div style="background: linear-gradient(135deg, #1a2F5A, #4169E1); padding: 30px; text-align: center;">
        <h1 style="color: #FFD700; margin: 0; font-size: 24px;">🔓 Exam Paper Released</h1>
      </div>
      <div style="padding: 30px; background: white;">
        <p style="color: #333; font-size: 16px;">Dear <strong>{student_name}</strong>,</p>
        <p style="color: #555;">An exam paper has been released for your access:</p>
        <div style="background: #f0f4ff; border-left: 4px solid #4169E1; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #1a2F5A; font-weight: bold; font-size: 18px;">{paper_title}</p>
          <p style="margin: 5px 0 0; color: #555;">Course: {course_code}</p>
        </div>
        <p style="color: #888; font-size: 14px;">⏰ Available until: {expiry_str}</p>
        <a href="{frontend_url}/student/papers"
           style="display: inline-block; background: linear-gradient(135deg, #1a2F5A, #4169E1); color: white;
                  padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
          View Paper →
        </a>
      </div>
      <div style="background: #1a2F5A; padding: 15px; text-align: center;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">
          Secure Exam Paper Management System | University Examination Cell
        </p>
      </div>
    </div>
    """
    _send_email(f'Exam Paper Released: {course_code}', [student_email], html)


def send_registration_email(user_email: str, user_name: str):
    """Send welcome email on registration."""
    frontend_url = current_app.config['FRONTEND_URL']
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1a2F5A, #4169E1); padding: 30px; text-align: center;">
        <h1 style="color: #FFD700; margin: 0;">Welcome to SecureExam!</h1>
      </div>
      <div style="padding: 30px; background: white;">
        <p>Dear <strong>{user_name}</strong>,</p>
        <p>Your account has been successfully created. You can now log in to the Secure Exam Paper Management System.</p>
        <a href="{frontend_url}/login"
           style="display: inline-block; background: linear-gradient(135deg, #1a2F5A, #4169E1); color: white;
                  padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Login Now →
        </a>
      </div>
    </div>
    """
    _send_email('Welcome to SecureExam Platform', [user_email], html)


def send_security_alert_email(admin_email: str, alert_type: str,
                               description: str, user_info: str = ''):
    """Send security alert to admin."""
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc3545; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">⚠️ Security Alert</h1>
      </div>
      <div style="padding: 30px; background: white;">
        <p><strong>Alert Type:</strong> {alert_type}</p>
        <p><strong>Description:</strong> {description}</p>
        <p><strong>User:</strong> {user_info or 'Unknown'}</p>
        <p style="color: #888; font-size: 12px;">Time: {__import__('datetime').datetime.utcnow().isoformat()} UTC</p>
      </div>
    </div>
    """
    _send_email(f'[SECURITY ALERT] {alert_type}', [admin_email], html)
