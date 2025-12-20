'use client';

import { Sparkles, Shield, Zap, MessageSquare, ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
  trialDays: number;
  onNext: () => void;
}

export function WelcomeStep({ trialDays, onNext }: WelcomeStepProps) {
  const features = [
    {
      icon: Zap,
      title: 'Connect Tools',
      description: 'QuickBooks, Google, Slack & more',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600'
    },
    {
      icon: MessageSquare,
      title: 'AI Insights',
      description: 'Ask questions in plain English',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Your data stays encrypted',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    }
  ];

  return (
    <div className="px-6 py-6 sm:px-8 sm:py-8">
      {/* Hero Section */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          Welcome to Your Business Dashboard
        </h1>

        <p className="text-gray-600 text-sm max-w-md mx-auto">
          Connect your tools, get AI insights, and make better decisions—all in one place.
        </p>
      </div>

      {/* Features - Compact horizontal layout */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 max-w-2xl mx-auto">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex-1 bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center gap-3 sm:flex-col sm:text-center sm:p-4"
          >
            <div className={`w-9 h-9 ${feature.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <feature.icon className={`w-4 h-4 ${feature.iconColor}`} />
            </div>
            <div className="sm:space-y-0.5">
              <h3 className="font-medium text-gray-900 text-sm">{feature.title}</h3>
              <p className="text-xs text-gray-500">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div className="max-w-sm mx-auto">
        <button
          onClick={onNext}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Trial + Trust signals combined */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            {trialDays}-day free trial • No credit card required
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              SOC 2
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              256-bit Encryption
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
