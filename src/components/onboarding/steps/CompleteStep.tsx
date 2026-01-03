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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    setError(null);
    try {
      await onComplete();
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete setup';
      setError(errorMessage);
      setSaving(false);
    }
  };

  const handleNavigate = async (href: string) => {
    setSaving(true);
    setError(null);
    try {
      await onComplete();
      router.push(href);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete setup';
      setError(errorMessage);
      setSaving(false);
    }
  };

  return (
    <div className="px-6 py-10 sm:px-12 sm:py-12">
      {/* Success Header */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-5">
          <div className={`relative w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl flex items-center justify-center shadow-xl shadow-green-200 transition-all duration-500 ${showCelebration ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
            <Check className="w-10 h-10 text-white" />
            <div className={`absolute -top-2 -right-2 transition-all duration-700 delay-300 ${showCelebration ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <PartyPopper className="w-6 h-6 text-amber-500 drop-shadow-lg" />
            </div>
          </div>
        </div>
        <h2 className={`text-3xl sm:text-4xl font-bold text-gray-900 mb-3 transition-all duration-500 delay-200 ${showCelebration ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          You&apos;re all set{companyName ? `, ${companyName}` : ''}!
        </h2>
        <p className={`text-gray-600 text-lg transition-all duration-500 delay-300 ${showCelebration ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Your <span className="font-bold text-green-600">{trialDays}-day free trial</span> is active
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-lg mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Quick Start Options */}
      <div className="max-w-lg mx-auto mb-8">
        <p className="text-center text-sm text-gray-600 mb-4 font-medium">Where would you like to start?</p>
        <div className="space-y-3">
          <button
            onClick={handleGoToDashboard}
            disabled={saving}
            className={`w-full flex items-center gap-4 p-5 rounded-xl transition-all shadow-lg ${
              saving
                ? 'bg-gray-400 cursor-not-allowed shadow-gray-200'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-200/60'
            } text-white`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md ${saving ? 'bg-gray-500' : 'bg-blue-500'}`}>
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-base">{saving ? 'Setting up...' : 'View Dashboard'}</p>
              <p className="text-sm text-blue-100">See your business overview</p>
            </div>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => handleNavigate('/ai-assistant')}
            disabled={saving}
            className={`w-full flex items-center gap-4 p-5 bg-white border-2 border-gray-200 rounded-xl transition-all shadow-sm hover:shadow-md ${
              saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-base text-gray-900">Try AI Assistant</p>
              <p className="text-sm text-gray-600">Ask questions about your data</p>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('/marketplace')}
            disabled={saving}
            className={`w-full flex items-center gap-4 p-5 bg-white border-2 border-gray-200 rounded-xl transition-all shadow-sm hover:shadow-md ${
              saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center shadow-sm">
              <Plus className="w-6 h-6 text-gray-700" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-base text-gray-900">Connect More Tools</p>
              <p className="text-sm text-gray-600">Add additional integrations</p>
            </div>
          </button>
        </div>
      </div>

      {/* Referral Share Section */}
      <div className="max-w-lg mx-auto mt-8 pt-8 border-t border-gray-200">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-blue-600" />
            <p className="text-base font-bold text-gray-900">Share & Get More Time</p>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            Give friends 30 days free, get +7 days per signup
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl text-gray-700 shadow-sm"
            />
            <button
              onClick={handleCopyReferralLink}
              className={`px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm ${
                copied
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200/50'
              }`}
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Trial Info */}
      <p className="text-center text-sm text-gray-500 mt-6 font-medium">
        All features included • No credit card required
      </p>
    </div>
  );
}
