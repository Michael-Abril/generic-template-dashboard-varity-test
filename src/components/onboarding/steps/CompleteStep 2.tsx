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
  'Show my overdue invoices',
  'Who are my top customers?',
  "What's my cash flow this month?",
  'Summarize my recent transactions',
];

const NEXT_STEPS = [
  {
    id: 'integrations',
    label: 'Connect more integrations',
    description: 'Sync more of your business tools',
    icon: Plus,
    href: '/marketplace',
  },
  {
    id: 'dashboard',
    label: 'Explore the dashboard',
    description: 'View your KPIs and insights',
    icon: BarChart3,
    href: '/dashboard',
  },
  {
    id: 'ai',
    label: 'Ask your first AI question',
    description: 'Try the AI assistant now',
    icon: MessageSquare,
    href: '/ai-assistant',
  },
  {
    id: 'team',
    label: 'Invite team members',
    description: 'Collaborate with your team',
    icon: Users,
    href: '/settings',
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
            className="mt-5 w-full flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 font-semibold text-sm py-2 hover:bg-purple-50 rounded-lg transition-all"
          >
            <Send className="w-4 h-4" />
            Open full AI Assistant
          </button>
        </div>
      </div>

      {/* Next Steps */}
      <div className="max-w-2xl mx-auto mb-10">
        <h3 className="font-bold text-gray-900 mb-5 text-center text-lg">
          What would you like to do next?
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {NEXT_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => handleNavigate(step.href)}
                className="group flex items-center gap-4 p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-lg transition-all text-left"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-indigo-200 transition-all">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{step.label}</p>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Go to Dashboard Button */}
      <div className="max-w-md mx-auto">
        <button
          onClick={handleGoToDashboard}
          className="group w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] shadow-xl hover:shadow-2xl flex items-center justify-center gap-3"
        >
          <span>Go to Your Dashboard</span>
          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Trial Info */}
      <div className="text-center mt-8">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-5 py-2.5 rounded-full text-sm font-medium border border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Your {trialDays}-day trial includes all features • No credit card needed
        </div>
      </div>
    </div>
  );
}
