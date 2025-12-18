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
      title: 'Connect Your Tools',
      description: 'Link QuickBooks, Google, Slack, and more business tools in one dashboard',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600'
    },
    {
      icon: MessageSquare,
      title: 'AI-Powered Insights',
      description: 'Ask questions in plain English and get instant answers about your business',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Your data is encrypted with your unique key. Only you can access it.',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    }
  ];

  return (
    <div className="px-6 py-10 sm:px-10 sm:py-12">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3">
          Welcome to Your Business Dashboard
        </h1>

        <p className="text-gray-600 max-w-lg mx-auto">
          Connect your business tools, get AI-powered insights, and make better decisions—all in one place.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-center"
          >
            <div className={`w-11 h-11 ${feature.iconBg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
              <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">{feature.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Setup Steps */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 sm:p-6 mb-8 max-w-xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Quick Setup</h3>
          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">~2 min</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0">1</div>
            <div>
              <span className="font-medium text-gray-900 text-sm">Enter your company details</span>
              <p className="text-xs text-gray-500">Helps personalize your dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0">2</div>
            <div>
              <span className="font-medium text-gray-900 text-sm">Connect a business tool</span>
              <p className="text-xs text-gray-500">QuickBooks, Google, Slack, and more</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0">3</div>
            <div>
              <span className="font-medium text-gray-900 text-sm">Access your AI-powered dashboard</span>
              <p className="text-xs text-gray-500">Get insights from your connected data</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="max-w-md mx-auto">
        <button
          onClick={onNext}
          className="w-full bg-blue-600 text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Trial note */}
        <p className="text-center mt-4 text-sm text-gray-500">
          {trialDays}-day free trial • No credit card required
        </p>

        {/* Trust signals */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-center text-xs text-gray-400 mb-3">Trusted by growing businesses</p>
          <div className="flex items-center justify-center gap-5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-gray-400" />
              SOC 2 Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-gray-400" />
              256-bit Encryption
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
