"""
Feedback Database Models

Models for storing user feedback during trial milestones (Day 7, 25, 30).
Used for GTM analysis and product improvement.
"""

from datetime import datetime
from sqlalchemy import Column, String, Integer, JSON, DateTime, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class FeedbackType(str, enum.Enum):
    """Feedback milestone types"""
    DAY7 = "day7"      # Week 1 check-in
    DAY25 = "day25"    # Pre-trial end (5 days left)
    DAY30 = "day30"    # Trial ending


class Feedback(Base):
    """User feedback submitted during trial milestones"""
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String, index=True, nullable=False)

    # Feedback metadata
    feedback_type = Column(String, nullable=False)  # day7, day25, day30
    trial_days_remaining = Column(Integer, nullable=True)

    # Company context (for analysis)
    company_name = Column(String, nullable=True)
    industry = Column(String, nullable=True)

    # Responses stored as JSON for flexibility
    # Structure varies by feedback_type:
    # - day7: {satisfaction: 1-5, blockers: str, features: str}
    # - day25: {most_useful: str, likelihood: str, improvements: str}
    # - day30: {nps: 0-10, decision: str, final_feedback: str}
    responses = Column(JSON, nullable=False)

    # Timestamps
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Analytics fields
    session_duration_days = Column(Integer, nullable=True)  # Days since trial start
    integrations_connected = Column(Integer, nullable=True)  # Number of integrations at time of feedback


class FeedbackSummary(Base):
    """Aggregated feedback statistics for admin dashboard"""
    __tablename__ = "feedback_summary"

    id = Column(Integer, primary_key=True, index=True)

    # Time period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)

    # Aggregated metrics
    feedback_type = Column(String, nullable=False)
    total_submissions = Column(Integer, default=0)

    # NPS metrics (for day30)
    avg_nps_score = Column(Integer, nullable=True)
    promoters_count = Column(Integer, nullable=True)  # NPS 9-10
    passives_count = Column(Integer, nullable=True)   # NPS 7-8
    detractors_count = Column(Integer, nullable=True) # NPS 0-6

    # Satisfaction metrics (for day7)
    avg_satisfaction = Column(Integer, nullable=True)  # 1-5 scale

    # Decision metrics (for day30)
    upgrade_count = Column(Integer, nullable=True)
    need_more_time_count = Column(Integer, nullable=True)
    not_right_fit_count = Column(Integer, nullable=True)
    too_expensive_count = Column(Integer, nullable=True)

    # Generated timestamp
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
