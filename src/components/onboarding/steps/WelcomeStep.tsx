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
    <div className="px-6 py-10 sm:px-12 sm:py-12">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">
          Welcome to Your Business Dashboard
        </h1>

        <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          Connect your tools, get AI insights, and make better decisions—all in one place.
        </p>
      </div>

      {/* Features - Compact horizontal layout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-5 text-center hover:bg-gray-100/50 transition-colors"
          >
            <div className={`w-11 h-11 ${feature.iconBg} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm`}>
              <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">{feature.title}</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div className="max-w-md mx-auto">
        <button
          onClick={onNext}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-base hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-200/60 flex items-center justify-center gap-2"
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Trial + Trust signals combined */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-700 font-medium">
            {trialDays}-day free trial • No credit card required
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-green-600" />
              SOC 2 Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-green-600" />
              256-bit Encryption
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
