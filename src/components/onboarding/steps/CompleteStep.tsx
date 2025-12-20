'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  Check,
  Plus,
  BarChart3,
  PartyPopper,
  Copy,
  Gift,
} from 'lucide-react';

interface CompleteStepProps {
  companyName: string;
  integration: string | null;
  trialDays: number;
  walletAddress: string;
  onComplete: () => void;
}

export function CompleteStep({
  companyName,
  trialDays,
  walletAddress,
  onComplete,
}: CompleteStepProps) {
  const router = useRouter();
  const [showCelebration, setShowCelebration] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate referral link using wallet address prefix
  const referralCode = walletAddress?.slice(0, 8) || 'VARITY';
  const referralLink = `https://app.varity.so/onboarding?ref=${referralCode}`;

  useEffect(() => {
    const timer = setTimeout(() => setShowCelebration(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleGoToDashboard = async () => {
    await onComplete();
    router.push('/dashboard');
  };

  const handleNavigate = async (href: string) => {
    await onComplete();
    router.push(href);
  };

  return (
    <div className="px-6 py-6 sm:px-8 sm:py-8">
      {/* Success Header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <div className={`relative w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center transition-all duration-500 ${showCelebration ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
            <Check className="w-7 h-7 text-white" />
            <div className={`absolute -top-1.5 -right-1.5 transition-all duration-700 delay-300 ${showCelebration ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <PartyPopper className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>
        <h2 className={`text-xl font-semibold text-gray-900 mb-1 transition-all duration-500 delay-200 ${showCelebration ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          You&apos;re all set{companyName ? `, ${companyName}` : ''}!
        </h2>
        <p className={`text-gray-600 text-sm transition-all duration-500 delay-300 ${showCelebration ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Your <span className="font-semibold text-green-600">{trialDays}-day free trial</span> is active
        </p>
      </div>

      {/* Quick Start Options */}
      <div className="max-w-sm mx-auto mb-6">
        <p className="text-center text-xs text-gray-500 mb-3">Where would you like to start?</p>
        <div className="space-y-2">
          <button
            onClick={handleGoToDashboard}
            className="w-full flex items-center gap-3 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-sm">View Dashboard</p>
              <p className="text-xs text-blue-200">See your business overview</p>
            </div>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleNavigate('/ai-assistant')}
            className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-sm text-gray-900">Try AI Assistant</p>
              <p className="text-xs text-gray-500">Ask questions about your data</p>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('/marketplace')}
            className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-gray-600" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-sm text-gray-900">Connect More Tools</p>
              <p className="text-xs text-gray-500">Add additional integrations</p>
            </div>
          </button>
        </div>
      </div>

      {/* Referral Share Section */}
      <div className="max-w-sm mx-auto mt-6 pt-5 border-t border-gray-100">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-semibold text-gray-900">Share & Get More Time</p>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Give friends 30 days free, get +7 days per signup
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-600 truncate"
            />
            <button
              onClick={handleCopyReferralLink}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Trial Info */}
      <p className="text-center text-xs text-gray-400 mt-4">
        All features included • No credit card required
      </p>
    </div>
  );
}
