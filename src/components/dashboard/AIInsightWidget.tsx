'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Send,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface AIInsightWidgetProps {
  walletAddress: string;
  kpiData?: {
    kpis: Array<{
      title: string;
      value: string;
      change?: { value: number; period: string };
      source?: string;
    }>;
    data_sources: string[];
    has_data: boolean;
  } | null;
  recentActivity?: Array<{
    title: string;
    description: string;
    amount?: string;
    source: string;
  }>;
  onRefresh?: () => void;
  isLoading?: boolean;
}

interface AIInsightResponse {
  summary: string;
  status: 'healthy' | 'attention' | 'critical';
  highlights: Array<{
    type: 'positive' | 'warning' | 'negative';
    text: string;
  }>;
  suggestions: string[];
}

export function AIInsightWidget({
  walletAddress,
  kpiData,
  recentActivity,
  onRefresh,
  isLoading = false,
}: AIInsightWidgetProps) {
  const [insight, setInsight] = useState<AIInsightResponse | null>(null);
  const [quickQuestion, setQuickQuestion] = useState('');
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [quickAnswer, setQuickAnswer] = useState<string | null>(null);

  // Generate AI insight based on KPI data
  useEffect(() => {
    if (kpiData?.has_data && kpiData.kpis.length > 0) {
      generateInsight();
    }
  }, [kpiData]);

  const generateInsight = () => {
    if (!kpiData?.has_data || !kpiData.kpis || kpiData.kpis.length === 0) {
      setInsight(null);
      return;
    }

    setIsGeneratingInsight(true);

    // Analyze KPI data to generate insights
    const insights: AIInsightResponse = {
      summary: '',
      status: 'healthy',
      highlights: [],
      suggestions: [],
    };

    // Analyze revenue KPI
    const revenueKPI = kpiData.kpis.find(k =>
      k.title.toLowerCase().includes('revenue') ||
      k.title.toLowerCase().includes('total revenue')
    );

    // Analyze cash/balance KPIs
    const cashKPI = kpiData.kpis.find(k =>
      k.title.toLowerCase().includes('cash') ||
      k.title.toLowerCase().includes('balance')
    );

    // Analyze customer/client KPIs
    const customerKPI = kpiData.kpis.find(k =>
      k.title.toLowerCase().includes('customer') ||
      k.title.toLowerCase().includes('client')
    );

    // Analyze invoice/AR KPIs
    const invoiceKPI = kpiData.kpis.find(k =>
      k.title.toLowerCase().includes('invoice') ||
      k.title.toLowerCase().includes('receivable') ||
      k.title.toLowerCase().includes('overdue')
    );

    // Build summary
    const summaryParts: string[] = [];
    let hasWarnings = false;
    let hasCritical = false;

    if (revenueKPI && revenueKPI.change) {
      const change = revenueKPI.change.value;
      if (change > 0) {
        summaryParts.push(`Revenue is up ${change.toFixed(1)}%`);
        insights.highlights.push({
          type: 'positive',
          text: `Revenue increased ${change.toFixed(1)}% ${revenueKPI.change.period}`,
        });
      } else if (change < 0) {
        summaryParts.push(`Revenue is down ${Math.abs(change).toFixed(1)}%`);
        hasWarnings = true;
        insights.highlights.push({
          type: 'warning',
          text: `Revenue decreased ${Math.abs(change).toFixed(1)}% ${revenueKPI.change.period}`,
        });
        insights.suggestions.push('Review pricing strategy and customer retention efforts');
      }
    }

    if (customerKPI && customerKPI.change) {
      const change = customerKPI.change.value;
      if (change > 5) {
        summaryParts.push(`driven by ${Math.round(change)}% more customers`);
        insights.highlights.push({
          type: 'positive',
          text: `Customer base grew ${change.toFixed(0)}%`,
        });
      } else if (change < -5) {
        hasWarnings = true;
        insights.highlights.push({
          type: 'warning',
          text: `Customer base declined ${Math.abs(change).toFixed(0)}%`,
        });
        insights.suggestions.push('Implement customer retention programs');
      }
    }

    if (cashKPI) {
      insights.highlights.push({
        type: 'positive',
        text: `Cash position: ${cashKPI.value}`,
      });
    }

    if (invoiceKPI) {
      const value = invoiceKPI.value.toString();
      const hasOverdue = invoiceKPI.title.toLowerCase().includes('overdue');
      if (hasOverdue) {
        hasCritical = true;
        insights.highlights.push({
          type: 'negative',
          text: `${value} in overdue invoices need attention`,
        });
        insights.suggestions.push('Follow up on overdue invoices to improve cash flow');
      }
    }

    // Set status
    if (hasCritical) {
      insights.status = 'critical';
    } else if (hasWarnings) {
      insights.status = 'attention';
    } else {
      insights.status = 'healthy';
    }

    // Build final summary
    if (summaryParts.length > 0) {
      insights.summary = summaryParts.join(' ') + '.';
    } else {
      const sources = kpiData.data_sources.join(', ');
      insights.summary = `${kpiData.kpis.length} metrics synced from ${sources}. Your business data is up to date.`;
    }

    // Add default suggestions if none
    if (insights.suggestions.length === 0) {
      insights.suggestions.push('Ask the AI Assistant for deeper analysis');
    }

    setInsight(insights);
    setIsGeneratingInsight(false);
  };

  const handleQuickQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuestion.trim() || isAskingQuestion) return;

    setIsAskingQuestion(true);
    setQuickAnswer(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/api/v1/ai/chat/general`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: quickQuestion,
          wallet_address: walletAddress,
          mode: 'quick',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuickAnswer(data.response || data.message || 'No response received.');
      } else {
        setQuickAnswer('Unable to get answer. Try the AI Assistant for detailed analysis.');
      }
    } catch (error) {
      logger.error('Error asking quick question:', error);
      setQuickAnswer('Unable to connect. Please try again.');
    } finally {
      setIsAskingQuestion(false);
    }
  };

  const getStatusConfig = (status: AIInsightResponse['status']) => {
    switch (status) {
      case 'healthy':
        return {
          borderColor: 'border-l-emerald-500',
          icon: CheckCircle,
          iconColor: 'text-emerald-600',
          badge: 'Healthy',
          badgeBg: 'bg-emerald-50',
          badgeText: 'text-emerald-700',
          accentColor: 'text-emerald-600',
        };
      case 'attention':
        return {
          borderColor: 'border-l-amber-500',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          badge: 'Needs Attention',
          badgeBg: 'bg-amber-50',
          badgeText: 'text-amber-700',
          accentColor: 'text-amber-600',
        };
      case 'critical':
        return {
          borderColor: 'border-l-red-500',
          icon: AlertCircle,
          iconColor: 'text-red-600',
          badge: 'Action Required',
          badgeBg: 'bg-red-50',
          badgeText: 'text-red-700',
          accentColor: 'text-red-600',
        };
      default:
        return {
          borderColor: 'border-l-blue-500',
          icon: Sparkles,
          iconColor: 'text-blue-600',
          badge: 'AI Insight',
          badgeBg: 'bg-blue-50',
          badgeText: 'text-blue-700',
          accentColor: 'text-blue-600',
        };
    }
  };

  // Empty state - no data
  if (!kpiData?.has_data) {
    return (
      <div className="bg-white border border-gray-200 border-l-4 border-l-blue-500 rounded-xl p-6 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">AI Business Insight</h3>
          </div>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Connect your business tools to get AI-powered insights about your performance.
        </p>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Connect Integration
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const config = insight ? getStatusConfig(insight.status) : getStatusConfig('healthy');
  const StatusIcon = config.icon;

  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${config.borderColor} rounded-xl p-6 h-full flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-5 h-5 ${config.iconColor}`} />
          <h3 className="font-semibold text-gray-900">AI Business Insight</h3>
        </div>
        <div className="flex items-center gap-2">
          {insight && (
            <span className={`text-xs font-medium px-2 py-1 rounded ${config.badgeBg} ${config.badgeText}`}>
              {config.badge}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading || isGeneratingInsight}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 text-gray-500"
              aria-label="Refresh insights"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading || isGeneratingInsight ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isGeneratingInsight ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-2 ${config.iconColor}`} />
            <p className="text-sm text-gray-600">Analyzing your business data...</p>
          </div>
        </div>
      ) : insight ? (
        <>
          {/* Summary */}
          <div className="flex items-start gap-3 mb-4">
            <StatusIcon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
            <p className="text-sm text-gray-700 leading-relaxed">{insight.summary}</p>
          </div>

          {/* Highlights */}
          {insight.highlights.length > 0 && (
            <div className="space-y-2 mb-4">
              {insight.highlights.slice(0, 3).map((highlight, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {highlight.type === 'positive' && <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  {highlight.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                  {highlight.type === 'negative' && <TrendingDown className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  <span className="text-gray-600">{highlight.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Answer */}
          {quickAnswer && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">{quickAnswer}</p>
            </div>
          )}

          {/* Quick Question Input */}
          <form onSubmit={handleQuickQuestion} className="mt-auto">
            <div className="relative">
              <input
                type="text"
                value={quickQuestion}
                onChange={(e) => setQuickQuestion(e.target.value)}
                placeholder="Ask a quick question..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-4 pr-10 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isAskingQuestion || !quickQuestion.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 text-gray-500"
              >
                {isAskingQuestion ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>

          {/* Link to full AI Assistant */}
          <Link
            href="/ai-assistant"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors mt-3"
          >
            Open AI Assistant for detailed analysis
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </>
      ) : (
        <p className="text-sm text-gray-600">Loading insights...</p>
      )}
    </div>
  );
}

export default AIInsightWidget;
