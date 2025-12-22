'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Plus,
  Loader2,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Lightbulb,
  ChevronRight,
  AreaChart
} from 'lucide-react';

interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'kpi';
  title: string;
  data: Array<{ label: string; value: number; [key: string]: unknown }>;
  config: {
    xAxisLabel?: string;
    yAxisLabel?: string;
    colors?: string[];
    showLegend?: boolean;
    valuePrefix?: string;
    valueSuffix?: string;
  };
  summary?: string;
  suggested_queries?: string[];
}

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddChart: (chart: ChartConfig) => void;
  walletAddress: string;
  connectedIntegrations: string[];
}

interface Suggestion {
  query: string;
  type: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function AISidebar({
  isOpen,
  onClose,
  onAddChart,
  walletAddress,
  connectedIntegrations
}: AISidebarProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedChart, setGeneratedChart] = useState<ChartConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions on mount
  useEffect(() => {
    if (isOpen && connectedIntegrations.length > 0) {
      fetchSuggestions();
    }
  }, [isOpen, connectedIntegrations]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const fetchSuggestions = async () => {
    try {
      const integrationsParam = connectedIntegrations.join(',');
      const response = await fetch(
        `${API_BASE_URL}/api/v1/ai/analytics/chart-suggestions?wallet_address=${walletAddress}&integrations=${integrationsParam}`
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      // Use default suggestions
      setSuggestions([
        { query: 'Show monthly revenue trend', type: 'line' },
        { query: 'Compare quarterly performance', type: 'bar' },
        { query: 'Display expense breakdown', type: 'pie' }
      ]);
    }
  };

  const generateChart = async (queryText: string) => {
    if (!queryText.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedChart(null);
    setShowSuggestions(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/analytics/generate-chart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          wallet_address: walletAddress,
          integrations: connectedIntegrations.length > 0 ? connectedIntegrations : null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate chart');
      }

      const data = await response.json();

      if (data.success && data.chart) {
        setGeneratedChart(data.chart);
      } else {
        setError(data.error || 'Failed to generate chart');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateChart(query);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setQuery(suggestion.query);
    generateChart(suggestion.query);
  };

  const handleAddToDashboard = () => {
    if (generatedChart) {
      onAddChart(generatedChart);
      setGeneratedChart(null);
      setQuery('');
      setShowSuggestions(true);
    }
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'line':
        return <LineChart className="w-4 h-4" />;
      case 'bar':
        return <BarChart3 className="w-4 h-4" />;
      case 'pie':
      case 'donut':
        return <PieChart className="w-4 h-4" />;
      case 'area':
        return <AreaChart className="w-4 h-4" />;
      case 'kpi':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  const renderChartPreview = (chart: ChartConfig) => {
    // Simple preview based on chart type
    const colors = chart.config.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    if (chart.type === 'kpi' && chart.data.length > 0) {
      const item = chart.data[0];
      return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">{chart.title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {chart.config.valuePrefix || ''}
            {item.value.toLocaleString()}
            {chart.config.valueSuffix || ''}
          </p>
          {typeof item.change === 'number' && (
            <p className={`text-sm mt-1 ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {item.change >= 0 ? '+' : ''}{item.change}%
            </p>
          )}
        </div>
      );
    }

    if (chart.type === 'pie' || chart.type === 'donut') {
      // Simple pie chart preview with segments
      const total = chart.data.reduce((sum, item) => sum + item.value, 0);
      return (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">{chart.title}</p>
          <div className="flex items-center justify-center mb-3">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 via-green-500 to-yellow-500" />
          </div>
          <div className="space-y-1">
            {chart.data.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colors[idx % colors.length] }}
                  />
                  <span className="text-gray-600">{item.label}</span>
                </div>
                <span className="font-medium">
                  {((item.value / total) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Bar/Line/Area preview
    const maxValue = Math.max(...chart.data.map(d => d.value));
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">{chart.title}</p>
        <div className="flex items-end justify-between gap-1 h-20">
          {chart.data.slice(0, 8).map((item, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: colors[idx % colors.length],
                  minHeight: '4px'
                }}
              />
              <span className="text-[10px] text-gray-500 mt-1 truncate max-w-full">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">AI Chart Generator</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-60px)]">
          {/* Input Section */}
          <div className="p-4 border-b">
            <form onSubmit={handleSubmit} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Create a chart... (e.g., 'Show revenue by month')"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-100 animate-pulse" />
                  <Sparkles className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                </div>
                <p className="text-sm text-gray-500 mt-4">Generating your chart...</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={() => generateChart(query)}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Generated Chart Preview */}
            {generatedChart && !isLoading && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  {getChartIcon(generatedChart.type)}
                  <span>Generated Chart</span>
                </div>

                {/* Chart Preview */}
                {renderChartPreview(generatedChart)}

                {/* Summary */}
                {generatedChart.summary && (
                  <p className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
                    {generatedChart.summary}
                  </p>
                )}

                {/* Add to Dashboard Button */}
                <button
                  onClick={handleAddToDashboard}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add to Dashboard
                </button>

                {/* Suggested Follow-ups */}
                {generatedChart.suggested_queries && generatedChart.suggested_queries.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      Try also:
                    </p>
                    <div className="space-y-2">
                      {generatedChart.suggested_queries.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setQuery(q);
                            generateChart(q);
                          }}
                          className="w-full text-left text-sm px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between group"
                        >
                          <span className="text-gray-700">{q}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Suggestions (Initial State) */}
            {showSuggestions && !isLoading && !generatedChart && !error && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <Sparkles className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Create Any Chart</h3>
                  <p className="text-sm text-gray-500">
                    Describe what you want to visualize and AI will create it
                  </p>
                </div>

                {suggestions.length > 0 && (
                  <>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      Suggestions based on your data:
                    </p>
                    <div className="space-y-2">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-3 group"
                        >
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            {getChartIcon(suggestion.type)}
                          </div>
                          <span className="flex-1 text-sm text-gray-700">{suggestion.query}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Quick Templates */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-3">Quick Templates:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Revenue Trend', type: 'line', query: 'Show monthly revenue trend' },
                      { label: 'Expense Breakdown', type: 'pie', query: 'Show expense breakdown by category' },
                      { label: 'Sales Pipeline', type: 'bar', query: 'Show sales pipeline by stage' },
                      { label: 'Growth KPI', type: 'kpi', query: 'What is total revenue this month?' }
                    ].map((template, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuery(template.query);
                          generateChart(template.query);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-sm"
                      >
                        {getChartIcon(template.type)}
                        <span className="text-gray-700">{template.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
