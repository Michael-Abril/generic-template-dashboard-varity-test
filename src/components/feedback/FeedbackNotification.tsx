'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, X, ChevronRight, Sparkles } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

interface FeedbackNotificationProps {
  walletAddress: string;
  companyName?: string;
  trialStartDate?: Date | string;
  trialDays?: number;
}

type FeedbackMilestone = 'day7' | 'day25' | 'day30' | null;

const MILESTONE_CONFIG = {
  day7: {
    dayRange: [6, 9], // Show between day 6-9
    title: 'Quick check-in',
    message: "You're 1 week in! Share your thoughts and help us improve.",
    color: 'blue',
    icon: '💬',
  },
  day25: {
    dayRange: [24, 27], // Show between day 24-27
    title: '5 days left',
    message: 'Your trial is almost over. Tell us about your experience!',
    color: 'amber',
    icon: '⏰',
  },
  day30: {
    dayRange: [29, 32], // Show on day 29-32 (trial end)
    title: 'Trial ending',
    message: "Before you go, we'd love your final feedback.",
    color: 'purple',
    icon: '🎯',
  },
};

export function FeedbackNotification({
  walletAddress,
  companyName,
  trialStartDate,
  trialDays = 30,
}: FeedbackNotificationProps) {
  const [currentMilestone, setCurrentMilestone] = useState<FeedbackMilestone>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(trialDays);

  useEffect(() => {
    if (!trialStartDate || !walletAddress) return;

    // Calculate days since trial started
    const startDate = new Date(trialStartDate);
    const today = new Date();
    const daysSinceStart = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const remaining = Math.max(0, trialDays - daysSinceStart);
    setTrialDaysRemaining(remaining);

    // Determine which milestone (if any) to show
    let milestone: FeedbackMilestone = null;

    for (const [key, config] of Object.entries(MILESTONE_CONFIG)) {
      const [minDay, maxDay] = config.dayRange;
      if (daysSinceStart >= minDay && daysSinceStart <= maxDay) {
        milestone = key as FeedbackMilestone;
        break;
      }
    }

    if (!milestone) {
      setCurrentMilestone(null);
      return;
    }

    // Check if feedback was already given for this milestone
    const feedbackKey = `varity_feedback_${milestone}_${walletAddress}`;
    const alreadyGiven = localStorage.getItem(feedbackKey);
    if (alreadyGiven) {
      setCurrentMilestone(null);
      return;
    }

    // Check if this notification was dismissed today
    const dismissKey = `varity_feedback_dismissed_${milestone}_${walletAddress}`;
    const dismissedAt = localStorage.getItem(dismissKey);
    if (dismissedAt) {
      const dismissDate = new Date(dismissedAt);
      const hoursSinceDismiss =
        (today.getTime() - dismissDate.getTime()) / (1000 * 60 * 60);
      // Only show again after 24 hours
      if (hoursSinceDismiss < 24) {
        setCurrentMilestone(null);
        return;
      }
    }

    setCurrentMilestone(milestone);
  }, [trialStartDate, trialDays, walletAddress]);

  const handleDismiss = () => {
    if (currentMilestone) {
      const dismissKey = `varity_feedback_dismissed_${currentMilestone}_${walletAddress}`;
      localStorage.setItem(dismissKey, new Date().toISOString());
    }
    setDismissed(true);
  };

  const handleOpenFeedback = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // After closing modal (whether submitted or not), hide the notification
    setDismissed(true);
  };

  if (!currentMilestone || dismissed) return null;

  const config = MILESTONE_CONFIG[currentMilestone];
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      button: 'bg-white text-blue-600 hover:bg-blue-50',
      dismiss: 'text-blue-100 hover:text-white hover:bg-blue-600/30',
    },
    amber: {
      bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
      button: 'bg-white text-amber-600 hover:bg-amber-50',
      dismiss: 'text-amber-100 hover:text-white hover:bg-amber-600/30',
    },
    purple: {
      bg: 'bg-gradient-to-r from-purple-500 to-pink-600',
      button: 'bg-white text-purple-600 hover:bg-purple-50',
      dismiss: 'text-purple-100 hover:text-white hover:bg-purple-600/30',
    },
  };

  const colors = colorClasses[config.color as keyof typeof colorClasses];

  return (
    <>
      {/* Notification Banner */}
      <div
        className={`${colors.bg} rounded-xl shadow-lg mb-6 overflow-hidden`}
        role="alert"
        aria-live="polite"
      >
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {/* Icon */}
              <div className="hidden sm:flex w-10 h-10 bg-white/20 rounded-xl items-center justify-center flex-shrink-0">
                <span className="text-xl">{config.icon}</span>
              </div>

              {/* Content */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm sm:text-base">
                    {config.title}
                  </h4>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-xs text-white/90">
                    <Sparkles className="w-3 h-3" />
                    2 min
                  </span>
                </div>
                <p className="text-white/90 text-xs sm:text-sm truncate">
                  {config.message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleOpenFeedback}
                className={`${colors.button} px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all shadow-sm`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Share Feedback</span>
                <span className="sm:hidden">Share</span>
                <ChevronRight className="w-4 h-4 hidden sm:block" />
              </button>

              <button
                onClick={handleDismiss}
                className={`${colors.dismiss} p-2 rounded-lg transition-all`}
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showModal}
        onClose={handleCloseModal}
        feedbackType={currentMilestone}
        walletAddress={walletAddress}
        companyName={companyName}
        trialDaysRemaining={trialDaysRemaining}
      />
    </>
  );
}
