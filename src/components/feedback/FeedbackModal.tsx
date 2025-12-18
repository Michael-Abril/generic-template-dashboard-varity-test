'use client';

import { useState } from 'react';
import {
  X,
  Send,
  Star,
  Loader2,
  CheckCircle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Meh,
} from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedbackType: 'day7' | 'day25' | 'day30';
  walletAddress: string;
  companyName?: string;
  trialDaysRemaining: number;
}

// Web3Forms access key - set this in environment variables
const WEB3FORMS_ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || '';

// Backend API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const FEEDBACK_CONFIG = {
  day7: {
    title: 'How are things going?',
    subtitle: "You're 1 week into your trial. We'd love to hear your thoughts!",
    questions: [
      {
        id: 'satisfaction',
        type: 'rating',
        question: 'How satisfied are you with the dashboard so far?',
      },
      {
        id: 'blockers',
        type: 'text',
        question: "What's preventing you from getting more value?",
        placeholder: 'e.g., Need help connecting integrations, UI is confusing...',
      },
      {
        id: 'features',
        type: 'text',
        question: 'What feature would help you most right now?',
        placeholder: 'e.g., Better reports, more integrations...',
      },
    ],
  },
  day25: {
    title: 'Almost there!',
    subtitle: '5 days left in your trial. Help us understand your experience.',
    questions: [
      {
        id: 'most_useful',
        type: 'text',
        question: 'What feature have you found most useful?',
        placeholder: 'e.g., AI Assistant, QuickBooks sync...',
      },
      {
        id: 'likelihood',
        type: 'sentiment',
        question: 'How likely are you to continue after the trial?',
      },
      {
        id: 'improvements',
        type: 'text',
        question: 'What would make you more likely to upgrade?',
        placeholder: 'e.g., Lower price, more features, team access...',
      },
    ],
  },
  day30: {
    title: 'Your trial is ending',
    subtitle: "Before you go, we'd love your final thoughts.",
    questions: [
      {
        id: 'nps',
        type: 'nps',
        question: 'How likely are you to recommend Varity to a colleague?',
      },
      {
        id: 'decision',
        type: 'choice',
        question: "What's your decision?",
        options: [
          { value: 'upgrade', label: "I'm ready to upgrade!" },
          { value: 'need_more_time', label: 'I need more time to decide' },
          { value: 'not_right_fit', label: "It's not the right fit for me" },
          { value: 'too_expensive', label: 'Pricing is a concern' },
        ],
      },
      {
        id: 'final_feedback',
        type: 'text',
        question: 'Any final thoughts or suggestions?',
        placeholder: 'Your feedback helps us improve...',
      },
    ],
  },
};

export function FeedbackModal({
  isOpen,
  onClose,
  feedbackType,
  walletAddress,
  companyName,
  trialDaysRemaining,
}: FeedbackModalProps) {
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = FEEDBACK_CONFIG[feedbackType];

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // 1. Submit to backend API (primary storage)
      const backendResponse = await fetch(
        `${API_BASE_URL}/api/v1/feedback?wallet_address=${encodeURIComponent(walletAddress)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            feedback_type: feedbackType,
            trial_days_remaining: trialDaysRemaining,
            responses: responses,
          }),
        }
      );

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({}));
        // If it's a duplicate submission, treat as success
        if (backendResponse.status === 409) {
          console.log('Feedback already submitted for this milestone');
        } else {
          console.error('Backend feedback submission failed:', errorData);
          // Don't throw - try Web3Forms as backup
        }
      }

      // 2. Also submit to Web3Forms for email notifications (if API key is set)
      if (WEB3FORMS_ACCESS_KEY) {
        try {
          const formData = {
            access_key: WEB3FORMS_ACCESS_KEY,
            subject: `Varity Dashboard Feedback - ${feedbackType.toUpperCase()}`,
            from_name: companyName || 'Dashboard User',
            wallet_address: walletAddress,
            feedback_type: feedbackType,
            trial_days_remaining: trialDaysRemaining,
            submitted_at: new Date().toISOString(),
            ...responses,
          };

          await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          });
        } catch (web3Error) {
          // Web3Forms is secondary - log but don't fail
          console.error('Web3Forms submission failed (non-critical):', web3Error);
        }
      }

      // Mark as successfully submitted
      setSubmitted(true);

      // Store that feedback was given for this milestone
      if (typeof window !== 'undefined') {
        const feedbackKey = `varity_feedback_${feedbackType}_${walletAddress}`;
        localStorage.setItem(feedbackKey, new Date().toISOString());
      }
    } catch (err) {
      console.error('Feedback submission error:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateResponse = (questionId: string, value: string | number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10"
          aria-label="Close feedback modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          // Success state
          <div className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Thank you for your feedback!
            </h3>
            <p className="text-gray-600 mb-6">
              Your input helps us build a better product for businesses like yours.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          // Form state
          <div className="overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-6 h-6" />
                <span className="text-sm font-medium opacity-90">
                  {feedbackType === 'day7' && 'Week 1 Check-in'}
                  {feedbackType === 'day25' && 'Pre-Trial End'}
                  {feedbackType === 'day30' && 'Trial Ending'}
                </span>
              </div>
              <h2 className="text-2xl font-bold">{config.title}</h2>
              <p className="text-blue-100 mt-1">{config.subtitle}</p>
            </div>

            {/* Questions */}
            <div className="p-6 space-y-6">
              {config.questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    {q.question}
                  </label>

                  {/* Star Rating */}
                  {q.type === 'rating' && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => updateResponse(q.id, star)}
                          className={`p-2 rounded-lg transition-all ${
                            (responses[q.id] as number) >= star
                              ? 'text-yellow-400'
                              : 'text-gray-300 hover:text-yellow-300'
                          }`}
                        >
                          <Star
                            className="w-8 h-8"
                            fill={(responses[q.id] as number) >= star ? 'currentColor' : 'none'}
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sentiment (Thumbs) */}
                  {q.type === 'sentiment' && (
                    <div className="flex gap-3">
                      {[
                        { value: 'unlikely', icon: ThumbsDown, label: 'Unlikely', color: 'red' },
                        { value: 'unsure', icon: Meh, label: 'Unsure', color: 'yellow' },
                        { value: 'likely', icon: ThumbsUp, label: 'Likely', color: 'green' },
                      ].map((option) => {
                        const Icon = option.icon;
                        const isSelected = responses[q.id] === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => updateResponse(q.id, option.value)}
                            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                              isSelected
                                ? option.color === 'red'
                                  ? 'border-red-400 bg-red-50'
                                  : option.color === 'yellow'
                                  ? 'border-yellow-400 bg-yellow-50'
                                  : 'border-green-400 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Icon
                              className={`w-8 h-8 ${
                                isSelected
                                  ? option.color === 'red'
                                    ? 'text-red-500'
                                    : option.color === 'yellow'
                                    ? 'text-yellow-500'
                                    : 'text-green-500'
                                  : 'text-gray-400'
                              }`}
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* NPS (0-10) */}
                  {q.type === 'nps' && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            onClick={() => updateResponse(q.id, num)}
                            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                              responses[q.id] === num
                                ? num <= 6
                                  ? 'bg-red-500 text-white'
                                  : num <= 8
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Not likely</span>
                        <span>Very likely</span>
                      </div>
                    </div>
                  )}

                  {/* Multiple Choice */}
                  {q.type === 'choice' && 'options' in q && (
                    <div className="space-y-2">
                      {q.options?.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateResponse(q.id, option.value)}
                          className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                            responses[q.id] === option.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="font-medium text-gray-700">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Text Input */}
                  {q.type === 'text' && (
                    <textarea
                      value={(responses[q.id] as string) || ''}
                      onChange={(e) => updateResponse(q.id, e.target.value)}
                      placeholder={'placeholder' in q ? q.placeholder : ''}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  )}
                </div>
              ))}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition-all"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
