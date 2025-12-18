'use client';

import { Sparkles, Shield, Zap, MessageSquare, ArrowRight, TrendingUp, Clock, Lock } from 'lucide-react';

interface WelcomeStepProps {
  trialDays: number;
  onNext: () => void;
}

export function WelcomeStep({ trialDays, onNext }: WelcomeStepProps) {
  const features = [
    {
      icon: Zap,
      title: 'Connect Your Tools',
      description: 'Link QuickBooks, Google, Slack, and 20+ business tools in one dashboard',
      color: 'from-amber-400 to-orange-500'
    },
    {
      icon: MessageSquare,
      title: 'AI-Powered Insights',
      description: 'Ask questions in plain English and get instant answers about your business',
      color: 'from-blue-400 to-indigo-500'
    },
    {
      icon: Shield,
      title: 'Bank-Level Security',
      description: 'Your data is encrypted with your unique key. Only you can access it.',
      color: 'from-emerald-400 to-teal-500'
    }
  ];

  const stats = [
    { value: '20+', label: 'Integrations', icon: TrendingUp },
    { value: '2 min', label: 'Setup Time', icon: Clock },
    { value: '256-bit', label: 'Encryption', icon: Lock },
  ];

  return (
    <div className="p-8 sm:p-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-3xl blur-xl animate-pulse"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          Welcome to Your{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Business Dashboard
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Your central hub to manage all business operations. Connect your tools,
          get AI-powered insights, and make better decisions in minutes.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="flex justify-center gap-8 mb-10">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
              <stat.icon className="w-3 h-3" />
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {features.map((feature, index) => (
          <div
            key={index}
            className="group bg-white border border-gray-100 rounded-2xl p-6 text-center hover:shadow-lg hover:border-gray-200 transition-all duration-300"
          >
            <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
              <feature.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-lg">{feature.title}</h3>
            <p className="text-gray-600 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* What you'll do section */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-2xl p-6 sm:p-8 mb-8">
        <h3 className="font-bold text-gray-900 mb-5 text-lg">Quick Setup in 3 Simple Steps:</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-md">1</div>
            <div>
              <span className="font-medium text-gray-900">Tell us about your company</span>
              <p className="text-sm text-gray-500">Personalize your AI assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-md">2</div>
            <div>
              <span className="font-medium text-gray-900">Connect your first business tool</span>
              <p className="text-sm text-gray-500">QuickBooks, Google, Slack & more</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-md">3</div>
            <div>
              <span className="font-medium text-gray-900">Start asking your AI assistant</span>
              <p className="text-sm text-gray-500">Get instant answers about your business</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={onNext}
        className="group w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl shadow-lg flex items-center justify-center gap-3"
      >
        <span>Get Started</span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Trial note */}
      <div className="text-center mt-6">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          {trialDays} days free trial • No credit card required
        </div>
      </div>
    </div>
  );
}
