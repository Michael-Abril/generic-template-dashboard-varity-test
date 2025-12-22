'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletSync } from '@/app/providers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { useToast } from '@/components/ui/Toast';
import {
  FileSpreadsheet,
  FileText,
  DollarSign,
  Users,
  BarChart3,
  Target,
  Sparkles,
  Settings2,
  Save,
  RotateCcw,
  Plus,
  LayoutGrid
} from 'lucide-react';
import { Layout as GridLayout } from 'react-grid-layout';
import { AISidebar, DashboardGrid } from '@/components/analytics';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

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

interface Widget {
  id: string;
  chart: ChartConfig;
  layout: GridLayout;
}

type TimePeriod = 'mtd' | 'qtd' | 'ytd' | 'custom';

export default function AnalyticsContent() {
  const { authenticated } = usePrivy();
  const { address } = useWalletSync();
  const router = useRouter();
  const toast = useToast();

  // Time period state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('mtd');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  // Analytics state
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);

  // AI Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dashboard customization state
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isEditing, setIsEditing] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);

  // Load saved layout from localStorage on mount
  useEffect(() => {
    if (address) {
      const savedWidgets = localStorage.getItem(`analytics_widgets_${address}`);
      if (savedWidgets) {
        try {
          setWidgets(JSON.parse(savedWidgets));
        } catch (e) {
          console.error('Failed to parse saved widgets:', e);
        }
      }

      // Fetch connected integrations
      fetchConnectedIntegrations();
    }
  }, [address]);

  const fetchConnectedIntegrations = async () => {
    if (!address) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/integrations/installed?wallet_address=${address}`
      );
      if (response.ok) {
        const data = await response.json();
        const integrations = data.integrations?.map((i: { provider?: string; name?: string }) => i.provider || i.name) || [];
        setConnectedIntegrations(integrations);
      }
    } catch (e) {
      console.error('Failed to fetch integrations:', e);
    }
  };

  // Fetch analytics data when time period changes
  useEffect(() => {
    if (!address) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          wallet_address: address,
          period: timePeriod,
        });

        if (timePeriod === 'custom' && customDateRange.start && customDateRange.end) {
          params.append('start_date', customDateRange.start);
          params.append('end_date', customDateRange.end);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/v1/dashboard/analytics?${params}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [address, timePeriod, customDateRange]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push('/');
    }
  }, [authenticated, router]);

  // Handle adding a chart from AI sidebar
  const handleAddChart = useCallback((chart: ChartConfig) => {
    const newWidget: Widget = {
      id: chart.id,
      chart,
      layout: {
        i: chart.id,
        x: (widgets.length % 2) * 6,
        y: Math.floor(widgets.length / 2) * 3,
        w: chart.type === 'kpi' ? 3 : 6,
        h: chart.type === 'kpi' ? 2 : 3,
        minW: 3,
        minH: 2
      }
    };
    setWidgets(prev => [...prev, newWidget]);
    setHasChanges(true);
    toast.success('Chart added to dashboard');
  }, [widgets, toast]);

  // Handle layout changes from drag/resize
  const handleLayoutChange = useCallback((newLayout: GridLayout[]) => {
    setWidgets(prev =>
      prev.map(widget => {
        const layoutItem = newLayout.find(l => l.i === widget.id);
        if (layoutItem) {
          return { ...widget, layout: layoutItem };
        }
        return widget;
      })
    );
    setHasChanges(true);
  }, []);

  // Handle removing a widget
  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    setHasChanges(true);
    toast.info('Chart removed from dashboard');
  }, [toast]);

  // Save layout
  const handleSaveLayout = useCallback(async () => {
    if (!address) return;

    try {
      // Save to localStorage for now (MVP)
      localStorage.setItem(`analytics_widgets_${address}`, JSON.stringify(widgets));

      // Also save to backend (if available)
      try {
        await fetch(`${API_BASE_URL}/api/v1/ai/analytics/layouts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: address,
            name: 'Default Layout',
            widgets: widgets.map(w => ({
              id: w.id,
              chart_config: w.chart,
              ...w.layout
            })),
            is_default: true
          })
        });
      } catch (e) {
        // Backend save is optional for MVP
        console.log('Backend layout save not available');
      }

      setHasChanges(false);
      toast.success('Layout saved successfully');
    } catch (error) {
      toast.error('Failed to save layout');
    }
  }, [address, widgets, toast]);

  // Reset layout
  const handleResetLayout = useCallback(() => {
    setWidgets([]);
    setHasChanges(true);
    toast.info('Layout reset');
  }, [toast]);

  // Export functions
  const handleExportPDF = () => {
    toast.info('Coming soon', 'PDF export will be available in a future update.');
  };

  const handleExportCSV = () => {
    if (widgets.length === 0) {
      toast.info('No data to export', 'Add some charts first.');
      return;
    }
    const allData = widgets.flatMap(w =>
      w.chart.data.map(d => `${w.chart.title},${d.label},${d.value}`)
    );
    const csv = 'Chart,Label,Value\n' + allData.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Show loading while checking authentication
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Derived metrics from backend analytics data
  const metrics = (analyticsData as { metrics?: Record<string, number> })?.metrics || {};
  const totalRevenue = typeof metrics.revenue === 'number' ? metrics.revenue : 0;
  const totalCustomers = typeof metrics.customers === 'number' ? metrics.customers : 0;
  const averageRevenue = typeof metrics.average_revenue === 'number' ? metrics.average_revenue : 0;
  const conversionRate = typeof metrics.conversion_rate === 'number' ? metrics.conversion_rate : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/dashboard" className="hover:text-gray-700 transition-colors duration-150">Dashboard</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Analytics</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  AI-Powered Analytics
                </h1>
                <p className="text-gray-600">
                  Create custom visualizations with AI - just describe what you want to see
                </p>
              </div>

              <div className="flex items-center gap-3">
                {hasChanges && (
                  <button
                    onClick={handleSaveLayout}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Layout
                  </button>
                )}
                <button
                  onClick={handleExportCSV}
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-white border border-gray-200 transition-all text-sm font-medium flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-white border border-gray-200 transition-all text-sm font-medium flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  <Sparkles className="w-4 h-4" />
                  Create Chart with AI
                </button>
              </div>
            </div>
          </div>

          {/* Time Period Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Time Period</h3>
                <p className="text-sm text-gray-600">Select the time range for your analytics</p>
              </div>

              <div className="flex items-center gap-2">
                {(['mtd', 'qtd', 'ytd', 'custom'] as TimePeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      timePeriod === period
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {period === 'mtd' && 'Month to Date'}
                    {period === 'qtd' && 'Quarter to Date'}
                    {period === 'ytd' && 'Year to Date'}
                    {period === 'custom' && 'Custom Range'}
                  </button>
                ))}
              </div>
            </div>

            {timePeriod === 'custom' && (
              <div className="mt-4 flex items-center gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalRevenue ? `$${(totalRevenue / 1000).toFixed(1)}K` : '—'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-green-600 font-medium">
                {(metrics as { revenue_change_percent?: number }).revenue_change_percent != null
                  ? `${(metrics as { revenue_change_percent: number }).revenue_change_percent}% vs last period`
                  : 'Connect integrations for data'}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalCustomers ? totalCustomers.toLocaleString() : '—'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-blue-600 font-medium">
                {(metrics as { customers_change_percent?: number }).customers_change_percent != null
                  ? `${(metrics as { customers_change_percent: number }).customers_change_percent}% vs last period`
                  : 'Connect integrations for data'}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {averageRevenue ? `$${(averageRevenue / 1000).toFixed(1)}K` : '—'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-orange-600 font-medium">Per month average</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {conversionRate ? `${conversionRate.toFixed(1)}%` : '—'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-purple-600 font-medium">Lead to customer</p>
            </div>
          </div>

          {/* Dashboard Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Custom Dashboard</h2>
              <span className="text-sm text-gray-500">
                {widgets.length} chart{widgets.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isEditing
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                {isEditing ? 'Editing' : 'Edit Layout'}
              </button>
              {widgets.length > 0 && (
                <button
                  onClick={handleResetLayout}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
            {widgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <LayoutGrid className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Build Your Custom Dashboard</h3>
                <p className="text-gray-500 text-center max-w-md mb-6">
                  Use AI to create any visualization you need. Just describe what you want to see,
                  and AI will generate the perfect chart.
                </p>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  <Sparkles className="w-5 h-5" />
                  Create Your First Chart
                </button>
                <p className="text-sm text-gray-400 mt-4">
                  Try: "Show monthly revenue trend" or "Compare expenses by category"
                </p>
              </div>
            ) : (
              <DashboardGrid
                widgets={widgets}
                onLayoutChange={handleLayoutChange}
                onRemoveWidget={handleRemoveWidget}
                isEditing={isEditing}
              />
            )}
          </div>

          {/* Quick Add Button (Floating) */}
          {widgets.length > 0 && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-xl shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center z-30"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* AI Sidebar */}
      <AISidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onAddChart={handleAddChart}
        walletAddress={address || ''}
        connectedIntegrations={connectedIntegrations}
      />
    </Layout>
  );
}
