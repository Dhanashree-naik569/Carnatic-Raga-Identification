"""
email_utils.py — sends transactional emails (verification, password reset).

HONEST NOTE: this project has no real SMTP credentials configured (that
requires a real mail provider account — Gmail SMTP, SendGrid, SES, etc.,
which are per-deployment secrets, not something that can be bundled).
`send_email()` below will use real SMTP if you configure the environment
variables below; otherwise it falls back to logging the email to the
console AND to backend/logs/emails.log, so the verification/reset links
are still fully visible and usable during local development.

To send real emails in production, set these environment variables:
    SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM
"""
import os
import smtplib
import ssl
from email.message import EmailMessage
from datetime import datetime

LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "logs", "emails.log")

SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
SMTP_FROM = os.environ.get("SMTP_FROM", "no-reply@ragavani.local")


def _log_locally(to, subject, body):
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"\n--- {datetime.utcnow().isoformat()} ---\n")
        f.write(f"To: {to}\nSubject: {subject}\n\n{body}\n")
    print(f"[email_utils] (simulated) email to {to}: {subject}\n{body}\n")


def send_email(to, subject, body):
    if SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD:
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = SMTP_FROM
            msg["To"] = to
            msg.set_content(body)
            context = ssl.create_default_context()
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls(context=context)
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"[email_utils] SMTP send failed, falling back to local log: {e}")
    _log_locally(to, subject, body)
    return False


def send_verification_email(to, token, frontend_url="http://localhost:5173"):
    link = f"{frontend_url}/verify-email?token={token}"
    send_email(
        to,
        "Verify your RagaVani account",
        f"Welcome to RagaVani!\n\nPlease verify your email by visiting:\n{link}\n\n"
        f"This link expires in 48 hours.",
    )


def send_password_reset_email(to, token, frontend_url="http://localhost:5173"):
    link = f"{frontend_url}/reset-password?token={token}"
    send_email(
        to,
        "Reset your RagaVani password",
        f"We received a request to reset your password.\n\nReset it here:\n{link}\n\n"
        f"This link expires in 1 hour. If you didn't request this, you can ignore this email.",
    )
