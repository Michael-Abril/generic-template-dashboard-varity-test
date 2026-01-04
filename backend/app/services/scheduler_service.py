"""
OAuth Token Auto-Refresh Scheduler Service

This service uses APScheduler (lightweight in-process scheduler) to proactively
refresh OAuth tokens before they expire. This prevents the "Failed to load" errors
users see when tokens expire.

CRITICAL FIX (January 4, 2026):
- Celery was causing Railway OOM crashes (512MB limit)
- APScheduler runs in-process with ~5MB memory overhead
- Tokens are refreshed 10 minutes BEFORE expiration

Architecture:
    APScheduler → Query expiring tokens → Call refresh endpoint → Update database
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler: Optional["AsyncIOScheduler"] = None


async def refresh_expiring_tokens():
    """
    Proactively refresh OAuth tokens that are expiring within the next 10 minutes.

    This runs every 5 minutes to ensure tokens are always fresh.
    """
    from sqlalchemy import select, and_
    from app.core.database import AsyncSessionLocal
    from app.models.purchase import OAuthToken
    from app.api.v1.integrations import refresh_oauth_token

    logger.info("🔄 Scheduler: Checking for expiring OAuth tokens...")

    try:
        async with AsyncSessionLocal() as db:
            # Find tokens expiring in next 10 minutes
            now = datetime.utcnow()
            expiry_threshold = now + timedelta(minutes=10)

            query = select(OAuthToken).where(
                and_(
                    OAuthToken.is_active == True,
                    OAuthToken.expires_at != None,
                    OAuthToken.expires_at < expiry_threshold,
                    OAuthToken.expires_at > now  # Not already expired
                )
            )

            result = await db.execute(query)
            expiring_tokens = result.scalars().all()

            if not expiring_tokens:
                logger.info("✅ Scheduler: No tokens expiring soon")
                return

            logger.info(f"🔄 Scheduler: Found {len(expiring_tokens)} tokens expiring soon")

            # Refresh each token
            refreshed = 0
            failed = 0

            for token in expiring_tokens:
                try:
                    # Set auth context for token access
                    OAuthToken.set_auth_context(token.user_address)

                    success = await refresh_oauth_token(token, token.provider, db)

                    if success:
                        refreshed += 1
                        logger.info(
                            f"✅ Scheduler: Refreshed {token.provider} token for "
                            f"{token.user_address[:10]}..."
                        )
                    else:
                        failed += 1
                        logger.warning(
                            f"⚠️ Scheduler: Failed to refresh {token.provider} token for "
                            f"{token.user_address[:10]}..."
                        )
                except Exception as e:
                    failed += 1
                    logger.error(
                        f"❌ Scheduler: Error refreshing {token.provider} token: {e}"
                    )
                finally:
                    OAuthToken.clear_auth_context()

            logger.info(
                f"✅ Scheduler: Token refresh complete - "
                f"{refreshed} refreshed, {failed} failed"
            )

    except Exception as e:
        logger.error(f"❌ Scheduler: Error in token refresh job: {e}")


async def cleanup_expired_tokens():
    """
    Mark tokens that have been expired for more than 7 days as inactive.

    This runs hourly to clean up stale tokens.
    """
    from sqlalchemy import update, and_
    from app.core.database import AsyncSessionLocal
    from app.models.purchase import OAuthToken

    logger.info("🧹 Scheduler: Cleaning up expired tokens...")

    try:
        async with AsyncSessionLocal() as db:
            # Find tokens expired for more than 7 days
            cutoff = datetime.utcnow() - timedelta(days=7)

            stmt = (
                update(OAuthToken)
                .where(
                    and_(
                        OAuthToken.is_active == True,
                        OAuthToken.expires_at != None,
                        OAuthToken.expires_at < cutoff
                    )
                )
                .values(is_active=False)
            )

            result = await db.execute(stmt)
            await db.commit()

            if result.rowcount > 0:
                logger.info(f"🧹 Scheduler: Deactivated {result.rowcount} stale tokens")
            else:
                logger.info("✅ Scheduler: No stale tokens to clean up")

    except Exception as e:
        logger.error(f"❌ Scheduler: Error in token cleanup job: {e}")


def get_scheduler() -> Optional["AsyncIOScheduler"]:
    """Get the global scheduler instance."""
    return _scheduler


async def start_scheduler():
    """
    Start the APScheduler for OAuth token auto-refresh.

    This should be called during application startup.
    Memory impact: ~5MB (vs ~250MB for Celery)
    """
    global _scheduler

    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.interval import IntervalTrigger

        logger.info("🚀 Initializing OAuth token auto-refresh scheduler...")

        _scheduler = AsyncIOScheduler(
            job_defaults={
                'coalesce': True,  # Combine missed executions
                'max_instances': 1,  # Only one instance of each job
                'misfire_grace_time': 60  # Allow 60s grace for misfires
            }
        )

        # Job 1: Refresh expiring tokens every 5 minutes
        _scheduler.add_job(
            refresh_expiring_tokens,
            trigger=IntervalTrigger(minutes=5),
            id='refresh_expiring_tokens',
            name='OAuth Token Auto-Refresh',
            replace_existing=True
        )

        # Job 2: Clean up expired tokens every hour
        _scheduler.add_job(
            cleanup_expired_tokens,
            trigger=IntervalTrigger(hours=1),
            id='cleanup_expired_tokens',
            name='OAuth Token Cleanup',
            replace_existing=True
        )

        _scheduler.start()

        logger.info("✅ OAuth token auto-refresh scheduler started")
        logger.info("   - Token refresh: every 5 minutes (10-min before expiry)")
        logger.info("   - Token cleanup: every 1 hour (7-day old expired tokens)")

        return True

    except ImportError:
        logger.warning(
            "⚠️ APScheduler not installed. OAuth token auto-refresh disabled. "
            "Install with: pip install apscheduler"
        )
        return False
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {e}")
        return False


async def stop_scheduler():
    """
    Stop the APScheduler gracefully.

    This should be called during application shutdown.
    """
    global _scheduler

    if _scheduler is not None:
        try:
            _scheduler.shutdown(wait=True)
            logger.info("✅ OAuth token auto-refresh scheduler stopped")
        except Exception as e:
            logger.error(f"❌ Error stopping scheduler: {e}")
        finally:
            _scheduler = None
