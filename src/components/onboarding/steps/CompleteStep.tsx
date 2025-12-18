'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  MessageSquare,
  ArrowRight,
  Check,
  Plus,
  BarChart3,
  Users,
  Send,
} from 'lucide-react';

interface CompleteStepProps {
  companyName: string;
  integration: string | null;
  trialDays: number;
  walletAddress: string;
  onComplete: () => void;
}

const SAMPLE_QUERIES = [
  'Give me a summary of my business data',
  'What activity happened this week?',
  'Show me insights from my connected tools',
  'What should I focus on today?',
];

const NEXT_STEPS = [
  {
    id: 'dashboard',
    label: 'View your dashboard',
    description: 'See your business overview',
    icon: BarChart3,
    href: '/dashboard',
  },
  {
    id: 'ai',
    label: 'Try the AI assistant',
    description: 'Ask questions about your data',
    icon: MessageSquare,
    href: '/ai-assistant',
  },
  {
    id: 'integrations',
    label: 'Connect more tools',
    description: 'Add additional integrations',
    icon: Plus,
    href: '/marketplace',
  },
  {
    id: 'team',
    label: 'Invite your team',
    description: 'Add employees to your account',
    icon: Users,
    href: '/settings?tab=team',
  },
];

export function CompleteStep({
  companyName,
  integration,
  trialDays,
  walletAddress,
  onComplete,
}: CompleteStepProps) {
  const router = useRouter();
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const handleTryQuery = async (query: string) => {
    setSelectedQuery(query);
    setLoadingAi(true);
    setAiResponse(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(`${backendUrl}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          message: query,
          mode: 'standard',
        }),
      });

      const data = await response.json();

      if (data.response) {
        setAiResponse(data.response);
      } else {
        setAiResponse(
          "I'm ready to help! Once your data is fully synced, I'll be able to provide detailed insights about your business."
        );
      }
    } catch (err) {
      console.error('AI query error:', err);
      setAiResponse(
        "I'm here to help you understand your business better. Try asking me questions after your data finishes syncing!"
      );
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGoToDashboard = async () => {
    // Mark onboarding complete before navigating
    await onComplete();
    router.push('/dashboard');
  };

  const handleNavigate = async (href: string) => {
    await onComplete();
    router.push(href);
  };

  return (
    <div className="px-6 py-10 sm:px-10 sm:py-12">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center">
            <Check className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          You&apos;re all set, {companyName || 'there'}!
        </h2>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          Your <span className="font-semibold text-green-600">{trialDays}-day free trial</span> has started.
          {integration && ' Your first integration is connected.'}
        </p>
      </div>

      {/* Meet Your AI Assistant */}
      <div className="max-w-lg mx-auto mb-8">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Try Your AI Assistant</h3>
              <p className="text-xs text-gray-500">
                Ask questions about your business
              </p>
            </div>
          </div>

          {/* Sample Query Buttons */}
          <div className="grid sm:grid-cols-2 gap-2 mb-4">
            {SAMPLE_QUERIES.map((query) => (
              <button
                key={query}
                onClick={() => handleTryQuery(query)}
                disabled={loadingAi}
                className={`px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                  selectedQuery === query
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                } disabled:opacity-50`}
              >
                {query}
              </button>
            ))}
          </div>

          {/* AI Response Preview */}
          {(loadingAi || aiResponse) && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              {loadingAi ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ) : aiResponse ? (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {aiResponse}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Full AI Link */}
          <button
            onClick={() => handleNavigate('/ai-assistant')}
            className="mt-4 w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm py-2 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
            Open AI Assistant
          </button>
        </div>
      </div>

      {/* Next Steps */}
      <div className="max-w-lg mx-auto mb-8">
        <h3 className="font-semibold text-gray-900 mb-4 text-center text-sm">
          What would you like to do next?
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {NEXT_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => handleNavigate(step.href)}
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{step.label}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Go to Dashboard Button */}
      <div className="max-w-sm mx-auto">
        <button
          onClick={handleGoToDashboard}
          className="w-full bg-blue-600 text-white py-3 px-5 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Trial Info */}
      <div className="text-center mt-6">
        <p className="text-xs text-gray-500">
          {trialDays}-day trial • All features included • No credit card required
        </p>
      </div>
    </div>
  );
}
