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
      description: 'Link QuickBooks, Google, Slack, and 20+ business tools in one dashboard'
    },
    {
      icon: MessageSquare,
      title: 'AI-Powered Insights',
      description: 'Ask questions in plain English and get instant answers about your business'
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Your data is encrypted with your unique key. Only you can access it.'
    }
  ];

  return (
    <div className="p-8">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Welcome to Your Business Dashboard
        </h1>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Your central hub to manage all business operations. Connect your tools,
          get AI-powered insights, and make better decisions in minutes.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-xl p-6 text-center hover:bg-gray-100 transition-colors"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <feature.icon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* What you'll do section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Setup (2 minutes):</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <span className="text-gray-700">Tell us about your company</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <span className="text-gray-700">Connect your first business tool</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <span className="text-gray-700">Start asking questions to your AI assistant</span>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={onNext}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
      >
        <span>Get Started</span>
        <ArrowRight className="w-5 h-5" />
      </button>

      {/* Trial note */}
      <p className="text-center text-sm text-gray-500 mt-4">
        {trialDays} days free. No credit card required.
      </p>
    </div>
  );
}
