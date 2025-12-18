'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface SignupProgressBarProps {
  /** Total number of early adopter spots */
  earlyAdopterSpots?: number;
  /** API endpoint to fetch current signup count */
  apiEndpoint?: string;
  /** Polling interval in milliseconds (default: 30 seconds) */
  pollingInterval?: number;
  /** Custom class name for styling */
  className?: string;
  /** Variant: 'default' for landing page, 'compact' for other pages */
  variant?: 'default' | 'compact';
}

interface SignupStats {
  count: number;
  total: number;
  lastUpdated: string;
}

/**
 * Professional signup progress bar optimized for conversions (2025 best practices).
 *
 * Strategy: Tiered free trial offer with conversion-focused design
 * - First 100 businesses: 1 MONTH FREE (early adopter bonus)
 * - After 100: 14-day free trial (still attractive, no ceiling on growth)
 *
 * Research-backed design (2025):
 * - Shows exact numbers (23% more effective than generic labels)
 * - Progress bars with scarcity increase conversions 30%
 * - CTA button directly in component (reduces friction)
 * - Trust signals reduce signup anxiety
 * - Animated urgency elements draw attention
 * - Professional styling (no emojis, ages 18-60)
 */
export function SignupProgressBar({
  earlyAdopterSpots = 100,
  apiEndpoint = '/api/v1/stats/signups',
  pollingInterval = 30000,
  className = '',
  variant = 'default',
}: SignupProgressBarProps) {
  const { login, authenticated } = usePrivy();
  const [stats, setStats] = useState<SignupStats>({
    count: 0,
    total: earlyAdopterSpots,
    lastUpdated: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);

  const fetchSignupCount = useCallback(async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
      const response = await fetch(`${backendUrl}${apiEndpoint}`);

      if (!response.ok) {
        if (response.status === 404) {
          setStats({
            count: 0,
            total: earlyAdopterSpots,
            lastUpdated: new Date().toISOString(),
          });
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setStats({
        count: data.count ?? 0,
        total: data.total ?? earlyAdopterSpots,
        lastUpdated: data.lastUpdated ?? new Date().toISOString(),
      });
    } catch (err) {
      console.debug('Signup stats fetch error:', err);
      setStats({
        count: 0,
        total: earlyAdopterSpots,
        lastUpdated: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, earlyAdopterSpots]);

  useEffect(() => {
    fetchSignupCount();
    const interval = setInterval(fetchSignupCount, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchSignupCount, pollingInterval]);

  const earlyAdoptersClaimed = Math.min(stats.count, earlyAdopterSpots);
  const percentage = Math.min(100, Math.round((earlyAdoptersClaimed / earlyAdopterSpots) * 100));
  const spotsRemaining = Math.max(0, earlyAdopterSpots - stats.count);
  const earlyAdopterPhaseComplete = stats.count >= earlyAdopterSpots;
  const isUrgent = spotsRemaining <= 20 && !earlyAdopterPhaseComplete;
  const isCritical = spotsRemaining <= 10 && !earlyAdopterPhaseComplete;

  // Progress bar color based on urgency
  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-brand-500';
    return 'bg-gradient-to-r from-brand-500 to-electric-400';
  };

  // Handle CTA click
  const handleSignupClick = () => {
    if (!authenticated) {
      login();
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-background-secondary rounded w-48 mb-2" />
        <div className="h-3 bg-background-secondary rounded w-full mb-2" />
        <div className="h-3 bg-background-secondary rounded w-32" />
      </div>
    );
  }

  // Compact variant for headers/sidebars
  if (variant === 'compact') {
    if (earlyAdopterPhaseComplete) {
      return (
        <div className={`flex items-center gap-2 ${className}`}>
          <span className="text-sm text-foreground-secondary">
            Join {stats.count} businesses - 14-day free trial
          </span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1 h-2 bg-background-secondary rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-sm whitespace-nowrap ${isUrgent ? 'text-red-400 font-medium' : 'text-foreground-secondary'}`}>
          {spotsRemaining} spots left
        </span>
      </div>
    );
  }

  // After 100 signups - show social proof, still convert
  if (earlyAdopterPhaseComplete) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-foreground">
              {stats.count} businesses have joined
            </span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-r from-brand-500/10 to-electric-400/10 border border-brand-500/20">
          <p className="text-sm font-medium text-foreground mb-2">
            Start your 14-day free trial
          </p>

          {/* CTA Button */}
          <button
            onClick={handleSignupClick}
            className="w-full mb-3 py-2.5 px-4 bg-gradient-to-r from-brand-500 to-electric-400 text-slate-950 font-semibold rounded-lg hover:opacity-90 transition-all duration-200 shadow-lg shadow-brand-500/25"
          >
            {authenticated ? 'Go to Dashboard' : 'Get Started Free'}
          </button>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              No credit card
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              2 min setup
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Cancel anytime
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default: Show early adopter progress bar with CTA
  return (
    <div className={`${className}`}>
      {/* Early Adopter Badge with Urgency */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-gradient-to-r from-brand-500 to-electric-400 text-slate-950">
            EARLY ADOPTER BONUS
          </span>
        </div>
        {isUrgent && (
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${isCritical ? 'bg-red-500 text-white animate-pulse' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            Only {spotsRemaining} left!
          </span>
        )}
      </div>

      {/* Value Proposition Highlight */}
      <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-brand-500/5 to-electric-400/5 border border-brand-500/10">
        <p className="text-base font-semibold text-foreground mb-0.5">
          Get <span className="text-brand-400">1 month free</span> - Save up to $199
        </p>
        <p className="text-sm text-foreground-muted">
          Join the first 100 businesses and unlock your free month
        </p>
      </div>

      {/* Progress bar with enhanced styling */}
      <div className="relative h-4 bg-background-secondary rounded-full overflow-hidden mb-2">
        <div
          className={`absolute inset-y-0 left-0 ${getProgressColor()} transition-all duration-700 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
        {/* Shimmer effect for visual interest */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
             style={{ backgroundSize: '200% 100%' }} />
      </div>

      {/* Stats line */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-foreground">
          <span className="font-bold text-base">{earlyAdoptersClaimed}</span>
          <span className="text-foreground-muted"> of {earlyAdopterSpots} spots claimed</span>
        </span>
        <span className={`text-sm font-medium ${percentage >= 75 ? 'text-orange-400' : 'text-foreground-muted'}`}>
          {percentage}% full
        </span>
      </div>

      {/* CTA Button - Primary conversion action */}
      <button
        onClick={handleSignupClick}
        className={`w-full py-3 px-4 font-semibold rounded-lg transition-all duration-200 shadow-lg ${
          isCritical
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/25 animate-pulse'
            : 'bg-gradient-to-r from-brand-500 to-electric-400 hover:opacity-90 text-slate-950 shadow-brand-500/25'
        }`}
      >
        {authenticated ? 'Go to Dashboard' : isCritical ? 'Claim Your Spot Now' : 'Get Started Free'}
      </button>

      {/* Trust Signals */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          No credit card
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          2 min setup
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Cancel anytime
        </span>
      </div>

      {/* Tiered offer explanation - responsive for mobile */}
      <div className="mt-4 pt-3 border-t border-background-secondary">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-2 text-xs text-foreground-muted">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-brand-400"></div>
            <span>First 100: <span className="text-brand-400 font-medium">1 month free</span></span>
          </div>
          <span className="text-foreground-muted/50 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-foreground-muted/30"></div>
            <span>After: 14-day trial</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupProgressBar;
