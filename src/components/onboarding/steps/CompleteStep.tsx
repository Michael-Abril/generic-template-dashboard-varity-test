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
  { text: 'Show my overdue invoices', icon: '📋' },
  { text: 'Who are my top customers?', icon: '👥' },
  { text: "What's my cash flow this month?", icon: '💰' },
  { text: 'Summarize my recent transactions', icon: '📊' },
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
    <div className="p-8">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Check className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          You&apos;re all set, {companyName || 'there'}!
        </h2>
        <p className="text-gray-600 text-lg">
          Your {trialDays}-day free trial has started.
          {integration && ' Your first integration is connected.'}
        </p>
      </div>

      {/* Meet Your AI Assistant */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Meet Your AI Assistant</h3>
              <p className="text-sm text-gray-600">
                Ask questions about your business in plain English
              </p>
            </div>
          </div>

          {/* Sample Query Buttons */}
          <div className="grid sm:grid-cols-2 gap-2 mb-4">
            {SAMPLE_QUERIES.map((query) => (
              <button
                key={query.text}
                onClick={() => handleTryQuery(query.text)}
                disabled={loadingAi}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-left transition-all ${
                  selectedQuery === query.text
                    ? 'bg-purple-600 text-white'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                } disabled:opacity-50`}
              >
                <span className="text-lg">{query.icon}</span>
                <span className="text-sm font-medium">{query.text}</span>
              </button>
            ))}
          </div>

          {/* AI Response Preview */}
          {(loadingAi || aiResponse) && (
            <div className="bg-white rounded-lg p-4 border border-purple-100">
              {loadingAi ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ) : aiResponse ? (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {aiResponse}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Full AI Link */}
          <button
            onClick={() => handleNavigate('/ai-assistant')}
            className="mt-4 w-full flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm"
          >
            <Send className="w-4 h-4" />
            Open full AI Assistant
          </button>
        </div>
      </div>

      {/* Next Steps */}
      <div className="max-w-2xl mx-auto mb-8">
        <h3 className="font-semibold text-gray-900 mb-4 text-center">
          What would you like to do next?
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {NEXT_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => handleNavigate(step.href)}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{step.label}</p>
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
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
        >
          <span>Go to Your Dashboard</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Trial Info */}
      <p className="text-center text-sm text-gray-500 mt-6">
        Your {trialDays}-day trial includes all features. No credit card needed.
      </p>
    </div>
  );
}
