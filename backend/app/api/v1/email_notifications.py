"""
Email Notifications API Endpoints
Handles email notification sending and management
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, EmailStr

from app.services.email_service import email_service

router = APIRouter(prefix="/email", tags=["Email Notifications"])


class SendWelcomeEmailRequest(BaseModel):
    """Request model for sending welcome email"""
    to_email: EmailStr
    user_name: str


class SendReportEmailRequest(BaseModel):
    """Request model for sending report email"""
    to_email: EmailStr
    report_type: str  # daily, weekly, monthly
    report_data: Dict[str, Any]
    pdf_bytes: Optional[bytes] = None


class SendAlertEmailRequest(BaseModel):
    """Request model for sending alert email"""
    to_email: EmailStr
    alert_type: str  # error, warning, info, success
    alert_message: str
    alert_data: Optional[Dict[str, Any]] = None


class SendInvitationEmailRequest(BaseModel):
    """Request model for sending team invitation"""
    to_email: EmailStr
    inviter_name: str
    company_name: str
    role: str
    invitation_link: str


class SendBatchEmailsRequest(BaseModel):
    """Request model for sending batch emails"""
    recipients: List[EmailStr]
    subject: str
    html_content: str


class EmailSettingsRequest(BaseModel):
    """Request model for email settings"""
    enabled: bool
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = None


@router.post("/welcome")
async def send_welcome_email(request: SendWelcomeEmailRequest):
    """
    Send welcome email to new user

    Args:
        request: Welcome email request

    Returns:
        Success status
    """
    try:
        success = await email_service.send_welcome_email(
            request.to_email,
            request.user_name
        )

        return {
            "success": success,
            "to_email": request.to_email,
            "message": "Welcome email sent successfully" if success else "Email service disabled"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report")
async def send_report_email(request: SendReportEmailRequest):
    """
    Send report email with optional PDF attachment

    Args:
        request: Report email request

    Returns:
        Success status
    """
    try:
        success = await email_service.send_report_email(
            request.to_email,
            request.report_type,
            request.report_data,
            request.pdf_bytes
        )

        return {
            "success": success,
            "to_email": request.to_email,
            "report_type": request.report_type,
            "message": "Report email sent successfully" if success else "Email service disabled"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alert")
async def send_alert_email(request: SendAlertEmailRequest):
    """
    Send alert/notification email

    Args:
        request: Alert email request

    Returns:
        Success status
    """
    try:
        success = await email_service.send_alert_email(
            request.to_email,
            request.alert_type,
            request.alert_message,
            request.alert_data
        )

        return {
            "success": success,
            "to_email": request.to_email,
            "alert_type": request.alert_type,
            "message": "Alert email sent successfully" if success else "Email service disabled"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invitation")
async def send_invitation_email(request: SendInvitationEmailRequest):
    """
    Send team member invitation email

    Args:
        request: Invitation email request

    Returns:
        Success status
    """
    try:
        success = await email_service.send_team_invitation(
            request.to_email,
            request.inviter_name,
            request.company_name,
            request.role,
            request.invitation_link
        )

        return {
            "success": success,
            "to_email": request.to_email,
            "message": "Invitation email sent successfully" if success else "Email service disabled"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def send_batch_emails(request: SendBatchEmailsRequest):
    """
    Send batch emails to multiple recipients

    Args:
        request: Batch email request

    Returns:
        Delivery status for each recipient
    """
    try:
        results = await email_service.send_batch_emails(
            request.recipients,
            request.subject,
            request.html_content
        )

        success_count = sum(1 for r in results.values() if r)

        return {
            "total": len(request.recipients),
            "successful": success_count,
            "failed": len(request.recipients) - success_count,
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings")
async def get_email_settings():
    """
    Get current email service settings

    Returns:
        Email service configuration
    """
    return {
        "enabled": email_service.enabled,
        "from_email": email_service.from_email,
        "from_name": email_service.from_name,
        "client_configured": email_service.client is not None
    }


@router.post("/test")
async def send_test_email(to_email: EmailStr):
    """
    Send test email to verify configuration

    Args:
        to_email: Test recipient email

    Returns:
        Test result
    """
    try:
        success = await email_service.send_alert_email(
            to_email,
            "info",
            "This is a test email from the Varity Generic Template Dashboard",
            {
                "Test Time": "Now",
                "Service": "Email Notifications",
                "Status": "Operational"
            }
        )

        return {
            "success": success,
            "to_email": to_email,
            "message": "Test email sent successfully" if success else "Email service disabled - check configuration"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
