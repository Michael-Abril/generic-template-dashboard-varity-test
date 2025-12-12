"""
Email Service for Varity Dashboard
Handles all email notifications using SendGrid
"""
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, Attachment, FileContent, FileName, FileType

logger = logging.getLogger(__name__)


class EmailService:
    """
    Email service for sending notifications, reports, and alerts
    """

    def __init__(self):
        """Initialize SendGrid client"""
        self.api_key = os.getenv('SENDGRID_API_KEY')
        self.from_email = os.getenv('EMAIL_FROM_ADDRESS', 'noreply@varity-dashboard.io')
        self.from_name = os.getenv('EMAIL_FROM_NAME', 'Varity Dashboard')
        self.enabled = os.getenv('EMAIL_ENABLED', 'false').lower() == 'true'

        if self.enabled and self.api_key and self.api_key != 'your_sendgrid_api_key_here':
            self.client = SendGridAPIClient(self.api_key)
            logger.info("Email service initialized successfully with SendGrid")
        else:
            self.client = None
            logger.warning("Email service disabled or not configured")

    async def send_welcome_email(self, to_email: str, user_name: str) -> bool:
        """
        Send welcome email to new user

        Args:
            to_email: Recipient email address
            user_name: User's name

        Returns:
            Success status
        """
        if not self.client:
            logger.warning("Email service not configured - skipping welcome email")
            return False

        subject = "Welcome to Varity Dashboard"
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Welcome to Varity Dashboard, {user_name}!</h1>
            <p>Your AI-powered business dashboard is ready to use.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Getting Started:</h3>
                <ul>
                    <li>Connect your business integrations</li>
                    <li>Configure your dashboard widgets</li>
                    <li>Set up automated reports</li>
                    <li>Explore AI insights</li>
                </ul>
            </div>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Powered by Varity - Decentralized AI Dashboards
            </p>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_content)

    async def send_report_email(
        self,
        to_email: str,
        report_type: str,
        report_data: Dict[str, Any],
        pdf_bytes: Optional[bytes] = None
    ) -> bool:
        """
        Send report email with optional PDF attachment

        Args:
            to_email: Recipient email address
            report_type: Type of report (daily, weekly, monthly)
            report_data: Report data dictionary
            pdf_bytes: Optional PDF file bytes

        Returns:
            Success status
        """
        if not self.client:
            logger.warning("Email service not configured - skipping report email")
            return False

        subject = f"Your {report_type.title()} Business Report"

        # Format report data into HTML
        metrics_html = ""
        for key, value in report_data.get('metrics', {}).items():
            metrics_html += f"<li><strong>{key}:</strong> {value}</li>"

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>{report_type.title()} Business Report</h1>
            <p>Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Key Metrics:</h3>
                <ul>{metrics_html}</ul>
            </div>

            <p>{'PDF report attached for detailed analysis.' if pdf_bytes else 'View your dashboard for detailed analysis.'}</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Powered by Varity - Decentralized AI Dashboards
            </p>
        </body>
        </html>
        """

        # Create attachment if PDF provided
        attachments = []
        if pdf_bytes:
            attachment = Attachment(
                FileContent(pdf_bytes),
                FileName(f'{report_type}_report_{datetime.now().strftime("%Y%m%d")}.pdf'),
                FileType('application/pdf')
            )
            attachments.append(attachment)

        return await self._send_email(to_email, subject, html_content, attachments)

    async def send_alert_email(
        self,
        to_email: str,
        alert_type: str,
        alert_message: str,
        alert_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Send alert/notification email

        Args:
            to_email: Recipient email address
            alert_type: Type of alert (error, warning, info)
            alert_message: Alert message
            alert_data: Optional additional data

        Returns:
            Success status
        """
        if not self.client:
            logger.warning("Email service not configured - skipping alert email")
            return False

        # Set color based on alert type
        color_map = {
            'error': '#d32f2f',
            'warning': '#f57c00',
            'info': '#1976d2',
            'success': '#388e3c'
        }
        alert_color = color_map.get(alert_type, '#666')

        subject = f"[{alert_type.upper()}] Dashboard Alert"

        # Format additional data if provided
        data_html = ""
        if alert_data:
            for key, value in alert_data.items():
                data_html += f"<tr><td style='padding: 5px; border: 1px solid #ddd;'><strong>{key}:</strong></td><td style='padding: 5px; border: 1px solid #ddd;'>{value}</td></tr>"

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="border-left: 4px solid {alert_color}; padding-left: 15px;">
                <h2 style="color: {alert_color};">{alert_type.title()} Alert</h2>
                <p>{alert_message}</p>
            </div>

            {f'<table style="border-collapse: collapse; margin-top: 20px;">{data_html}</table>' if data_html else ''}

            <p style="margin-top: 20px;">
                <a href="https://dashboard.varity.io" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    View Dashboard
                </a>
            </p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Powered by Varity - Decentralized AI Dashboards
            </p>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_content)

    async def send_team_invitation(
        self,
        to_email: str,
        inviter_name: str,
        company_name: str,
        role: str,
        invitation_link: str
    ) -> bool:
        """
        Send team member invitation email

        Args:
            to_email: Invitee email address
            inviter_name: Name of person sending invitation
            company_name: Company name
            role: Invited role
            invitation_link: Link to accept invitation

        Returns:
            Success status
        """
        if not self.client:
            logger.warning("Email service not configured - skipping invitation email")
            return False

        subject = f"You're invited to join {company_name} on Varity Dashboard"

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Team Invitation</h1>
            <p>{inviter_name} has invited you to join <strong>{company_name}</strong> on Varity Dashboard as a <strong>{role}</strong>.</p>

            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
                <p>Click below to accept your invitation:</p>
                <a href="{invitation_link}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
                    Accept Invitation
                </a>
            </div>

            <p>This invitation will expire in 7 days.</p>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Powered by Varity - Decentralized AI Dashboards
            </p>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_content)

    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        attachments: Optional[List[Attachment]] = None
    ) -> bool:
        """
        Internal method to send email via SendGrid

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content
            attachments: Optional list of attachments

        Returns:
            Success status
        """
        if not self.client:
            return False

        try:
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )

            # Add attachments if provided
            if attachments:
                for attachment in attachments:
                    message.add_attachment(attachment)

            # Send email
            response = self.client.send(message)

            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email. Status: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return False

    async def send_batch_emails(
        self,
        recipients: List[str],
        subject: str,
        html_content: str
    ) -> Dict[str, bool]:
        """
        Send batch emails to multiple recipients

        Args:
            recipients: List of email addresses
            subject: Email subject
            html_content: HTML content

        Returns:
            Dictionary of email -> success status
        """
        results = {}
        for email in recipients:
            results[email] = await self._send_email(email, subject, html_content)
        return results


# Singleton instance
email_service = EmailService()