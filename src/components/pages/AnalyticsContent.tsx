'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletSync } from '@/app/providers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { useToast } from '@/components/ui/Toast';
import { logger } from '@/lib/logger';
import {
  FileSpreadsheet,
  FileText,
  Sparkles,
  Settings2,
  Save,
  RotateCcw,
  Plus,
  LayoutGrid,
  Library,
  Grid3X3
} from 'lucide-react';
import { Layout as GridLayout, LayoutItem } from 'react-grid-layout';
import {
  AISidebar,
  DashboardGrid,
  TabBar,
  WidgetLibrary,
  DynamicChart,
  KPIWidget,
  DataTableWidget,
  ListWidget,
  TextWidget
} from '@/components/analytics';
import type { DashboardTab, WidgetTemplate } from '@/components/analytics';
import LayoutTemplates, { LAYOUT_TEMPLATES, LayoutTemplate } from '@/components/analytics/LayoutTemplates';

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
  type: 'chart' | 'kpi' | 'table' | 'list' | 'text' | 'metric';
  subtype?: string;
  title: string;
  chart?: ChartConfig;
  config?: Record<string, unknown>;
  layout: LayoutItem;
}

interface TabLayout {
  tabId: string;
  widgets: Widget[];
}

type TimePeriod = 'mtd' | 'qtd' | 'ytd' | 'custom';

// Sample data generators for different widget types (fallback when no real data)
const generateSampleKPIData = (subtype?: string, realMetrics?: Record<string, number>) => {
  // Use real data if available
  if (realMetrics && subtype && realMetrics[subtype] !== undefined) {
    const value = realMetrics[subtype];
    const prefixes: Record<string, string> = { revenue: '$', profit: '$', pipeline: '$' };
    const suffixes: Record<string, string> = { conversion: '%', margin: '%', growth: '%' };
    return {
      value,
      change: realMetrics[`${subtype}_change`] || 0,
      prefix: prefixes[subtype],
      suffix: suffixes[subtype],
      isRealData: true
    };
  }

  // Fallback to sample data
  const samples: Record<string, { value: number; change: number; prefix?: string; suffix?: string; isRealData?: boolean }> = {
    revenue: { value: 125000, change: 12.5, prefix: '$', isRealData: false },
    customers: { value: 1234, change: 8.3, isRealData: false },
    orders: { value: 567, change: -2.1, isRealData: false },
    conversion: { value: 3.4, change: 0.5, suffix: '%', isRealData: false },
    profit: { value: 45000, change: 15.2, prefix: '$', isRealData: false },
    margin: { value: 32.5, change: 2.1, suffix: '%', isRealData: false },
    pipeline: { value: 890000, change: 18.7, prefix: '$', isRealData: false },
    deals: { value: 45, change: 5.0, isRealData: false },
    growth: { value: 24.5, change: 3.2, suffix: '%', isRealData: false },
  };
  return samples[subtype || 'revenue'] || samples.revenue;
};

const generateSampleListData = (subtype?: string) => {
  const lists: Record<string, Array<{ id: string; title: string; subtitle?: string; value?: string | number; change?: number }>> = {
    customers: [
      { id: '1', title: 'Acme Corp', subtitle: 'Enterprise', value: '$45,000', change: 12 },
      { id: '2', title: 'TechStart Inc', subtitle: 'Growth', value: '$32,000', change: 8 },
      { id: '3', title: 'Global Industries', subtitle: 'Enterprise', value: '$28,000', change: -3 },
      { id: '4', title: 'Innovation Labs', subtitle: 'Startup', value: '$21,000', change: 25 },
      { id: '5', title: 'Digital Solutions', subtitle: 'Growth', value: '$18,000', change: 5 },
    ],
    products: [
      { id: '1', title: 'Pro Plan', subtitle: '450 sales', value: '$89,100' },
      { id: '2', title: 'Enterprise Plan', subtitle: '120 sales', value: '$71,880' },
      { id: '3', title: 'Starter Plan', subtitle: '890 sales', value: '$44,500' },
      { id: '4', title: 'Add-on: Analytics', subtitle: '320 sales', value: '$15,680' },
      { id: '5', title: 'Add-on: API Access', subtitle: '210 sales', value: '$10,290' },
    ],
    activity: [
      { id: '1', title: 'New customer signed up', subtitle: 'Acme Corp', value: '2 min ago' },
      { id: '2', title: 'Invoice paid', subtitle: '#INV-2024-0892', value: '15 min ago' },
      { id: '3', title: 'Deal closed', subtitle: 'TechStart Inc - $32,000', value: '1 hr ago' },
      { id: '4', title: 'Meeting scheduled', subtitle: 'With Global Industries', value: '2 hrs ago' },
      { id: '5', title: 'Email campaign sent', subtitle: 'Q4 Newsletter', value: '3 hrs ago' },
    ],
    deals: [
      { id: '1', title: 'Enterprise Deal', subtitle: 'Negotiating', value: '$125,000', change: 75 },
      { id: '2', title: 'Growth Package', subtitle: 'Proposal Sent', value: '$45,000', change: 50 },
      { id: '3', title: 'Starter Bundle', subtitle: 'Demo Scheduled', value: '$12,000', change: 25 },
    ],
  };
  return lists[subtype || 'customers'] || lists.customers;
};

const generateSampleTableData = () => ({
  columns: [
    { key: 'name', label: 'Name', type: 'text' as const },
    { key: 'amount', label: 'Amount', type: 'currency' as const },
    { key: 'date', label: 'Date', type: 'date' as const },
    { key: 'status', label: 'Status', type: 'status' as const },
  ],
  data: [
    { id: '1', name: 'Invoice #001', amount: 2500, date: '2024-12-15', status: 'success' },
    { id: '2', name: 'Invoice #002', amount: 1800, date: '2024-12-14', status: 'warning' },
    { id: '3', name: 'Invoice #003', amount: 3200, date: '2024-12-13', status: 'success' },
    { id: '4', name: 'Invoice #004', amount: 950, date: '2024-12-12', status: 'error' },
    { id: '5', name: 'Invoice #005', amount: 4100, date: '2024-12-11', status: 'success' },
  ],
});

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

  // Tab state
  const [tabs, setTabs] = useState<DashboardTab[]>([
    { id: 'default', name: 'Overview', isDefault: true, createdAt: new Date().toISOString() }
  ]);
  const [activeTabId, setActiveTabId] = useState('default');

  // Sidebar states
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [widgetLibraryOpen, setWidgetLibraryOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Dashboard customization state
  const [tabLayouts, setTabLayouts] = useState<TabLayout[]>([
    { tabId: 'default', widgets: [] }
  ]);
  const [isEditing, setIsEditing] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);

  // Get current tab's widgets
  const currentWidgets = useMemo(() => {
    const layout = tabLayouts.find(l => l.tabId === activeTabId);
    return layout?.widgets || [];
  }, [tabLayouts, activeTabId]);

  // Load saved layout from localStorage on mount
  useEffect(() => {
    if (address) {
      // Load tabs
      const savedTabs = localStorage.getItem(`analytics_tabs_${address}`);
      if (savedTabs) {
        try {
          const parsed = JSON.parse(savedTabs);
          setTabs(parsed);
          if (parsed.length > 0) {
            setActiveTabId(parsed[0].id);
          }
        } catch (e) {
          logger.error('Failed to parse saved tabs', e);
        }
      }

      // Load layouts
      const savedLayouts = localStorage.getItem(`analytics_layouts_${address}`);
      if (savedLayouts) {
        try {
          setTabLayouts(JSON.parse(savedLayouts));
        } catch (e) {
          logger.error('Failed to parse saved layouts', e);
        }
      }

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
      logger.error('Failed to fetch integrations', e);
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
        logger.error('Error fetching analytics', error);
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

  // Tab handlers
  const handleAddTab = useCallback(() => {
    const newTab: DashboardTab = {
      id: `tab-${Date.now()}`,
      name: `Dashboard ${tabs.length + 1}`,
      createdAt: new Date().toISOString()
    };
    setTabs(prev => [...prev, newTab]);
    setTabLayouts(prev => [...prev, { tabId: newTab.id, widgets: [] }]);
    setActiveTabId(newTab.id);
    setHasChanges(true);
  }, [tabs.length]);

  const handleRenameTab = useCallback((tabId: string, newName: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, name: newName } : t));
    setHasChanges(true);
  }, []);

  const handleDeleteTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) {
      toast.error('Cannot delete the last tab');
      return;
    }
    setTabs(prev => prev.filter(t => t.id !== tabId));
    setTabLayouts(prev => prev.filter(l => l.tabId !== tabId));
    if (activeTabId === tabId) {
      setActiveTabId(tabs[0].id === tabId ? tabs[1]?.id : tabs[0].id);
    }
    setHasChanges(true);
  }, [tabs, activeTabId, toast]);

  const handleDuplicateTab = useCallback((tabId: string) => {
    const originalTab = tabs.find(t => t.id === tabId);
    const originalLayout = tabLayouts.find(l => l.tabId === tabId);
    if (!originalTab) return;

    const newTabId = `tab-${Date.now()}`;
    const newTab: DashboardTab = {
      id: newTabId,
      name: `${originalTab.name} (Copy)`,
      createdAt: new Date().toISOString()
    };

    setTabs(prev => [...prev, newTab]);
    setTabLayouts(prev => [...prev, {
      tabId: newTabId,
      widgets: originalLayout?.widgets.map(w => ({
        ...w,
        id: `${w.id}-${Date.now()}`,
        layout: { ...w.layout, i: `${w.id}-${Date.now()}` }
      })) || []
    }]);
    setActiveTabId(newTabId);
    setHasChanges(true);
  }, [tabs, tabLayouts]);

  const handleReorderTabs = useCallback((newTabs: DashboardTab[]) => {
    setTabs(newTabs);
    setHasChanges(true);
  }, []);

  // Handle adding a chart from AI sidebar
  const handleAddChartFromAI = useCallback((chart: ChartConfig) => {
    const newWidget: Widget = {
      id: chart.id,
      type: 'chart',
      title: chart.title,
      chart,
      layout: {
        i: chart.id,
        x: (currentWidgets.length % 2) * 6,
        y: Math.floor(currentWidgets.length / 2) * 3,
        w: chart.type === 'kpi' ? 3 : 6,
        h: chart.type === 'kpi' ? 2 : 3,
        minW: 3,
        minH: 2
      }
    };

    setTabLayouts(prev => prev.map(l =>
      l.tabId === activeTabId
        ? { ...l, widgets: [...l.widgets, newWidget] }
        : l
    ));
    setHasChanges(true);
    toast.success('Chart added to dashboard');
  }, [currentWidgets.length, activeTabId, toast]);

  // Handle adding widget from library
  const handleAddWidgetFromLibrary = useCallback((template: WidgetTemplate) => {
    const widgetId = `widget-${Date.now()}`;
    const newWidget: Widget = {
      id: widgetId,
      type: template.type,
      subtype: template.subtype,
      title: template.name,
      config: template.config,
      layout: {
        i: widgetId,
        x: (currentWidgets.length % 2) * 6,
        y: Math.floor(currentWidgets.length / 2) * 3,
        w: template.defaultSize.w,
        h: template.defaultSize.h,
        minW: 3,
        minH: 2
      }
    };

    setTabLayouts(prev => prev.map(l =>
      l.tabId === activeTabId
        ? { ...l, widgets: [...l.widgets, newWidget] }
        : l
    ));
    setHasChanges(true);
    toast.success(`${template.name} added to dashboard`);
  }, [currentWidgets.length, activeTabId, toast]);

  // Handle applying a layout template
  const handleApplyTemplate = useCallback((template: LayoutTemplate) => {
    const newWidgets: Widget[] = template.widgets.map((tw, index) => {
      const widgetId = `widget-${Date.now()}-${index}`;
      return {
        id: widgetId,
        type: tw.type as Widget['type'],
        subtype: tw.subtype,
        title: tw.title,
        config: tw.config,
        layout: {
          i: widgetId,
          x: tw.x,
          y: tw.y,
          w: tw.w,
          h: tw.h,
          minW: 3,
          minH: 2
        }
      };
    });

    setTabLayouts(prev => prev.map(l =>
      l.tabId === activeTabId
        ? { ...l, widgets: newWidgets }
        : l
    ));
    setHasChanges(true);
    toast.success(`Applied "${template.name}" template`);
  }, [activeTabId, toast]);

  // Handle layout changes from drag/resize
  const handleLayoutChange = useCallback((newLayout: GridLayout) => {
    setTabLayouts(prev => prev.map(l => {
      if (l.tabId !== activeTabId) return l;
      return {
        ...l,
        widgets: l.widgets.map(widget => {
          const layoutItem = newLayout.find(item => item.i === widget.id);
          if (layoutItem) {
            return { ...widget, layout: layoutItem };
          }
          return widget;
        })
      };
    }));
    setHasChanges(true);
  }, [activeTabId]);

  // Handle removing a widget
  const handleRemoveWidget = useCallback((widgetId: string) => {
    setTabLayouts(prev => prev.map(l =>
      l.tabId === activeTabId
        ? { ...l, widgets: l.widgets.filter(w => w.id !== widgetId) }
        : l
    ));
    setHasChanges(true);
    toast.info('Widget removed from dashboard');
  }, [activeTabId, toast]);

  // Save layout
  const handleSaveLayout = useCallback(async () => {
    if (!address) return;

    try {
      localStorage.setItem(`analytics_tabs_${address}`, JSON.stringify(tabs));
      localStorage.setItem(`analytics_layouts_${address}`, JSON.stringify(tabLayouts));

      // Also save to backend (if available)
      try {
        await fetch(`${API_BASE_URL}/api/v1/ai/analytics/layouts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: address,
            tabs,
            layouts: tabLayouts
          })
        });
      } catch (e) {
        logger.debug('Backend layout save not available');
      }

      setHasChanges(false);
      toast.success('Layout saved successfully');
    } catch (error) {
      toast.error('Failed to save layout');
    }
  }, [address, tabs, tabLayouts, toast]);

  // Reset current tab's layout
  const handleResetLayout = useCallback(() => {
    setTabLayouts(prev => prev.map(l =>
      l.tabId === activeTabId ? { ...l, widgets: [] } : l
    ));
    setHasChanges(true);
    toast.info('Layout reset');
  }, [activeTabId, toast]);

  // Export functions
  const handleExportPDF = () => {
    toast.info('Coming soon', 'PDF export will be available in a future update.');
  };

  const handleExportCSV = () => {
    if (currentWidgets.length === 0) {
      toast.info('No data to export', 'Add some widgets first.');
      return;
    }
    const chartWidgets = currentWidgets.filter(w => w.chart);
    const allData = chartWidgets.flatMap(w =>
      w.chart?.data.map(d => `${w.title},${d.label},${d.value}`) || []
    );
    const csv = 'Chart,Label,Value\n' + allData.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Render individual widget based on type
  const renderWidget = useCallback((widget: Widget) => {
    switch (widget.type) {
      case 'chart':
        if (widget.chart) {
          return <DynamicChart chart={widget.chart} />;
        }
        return <div className="flex items-center justify-center h-full text-gray-500">No chart data</div>;

      case 'kpi':
      case 'metric': {
        // Pass real metrics from analyticsData when available
        const realMetrics = analyticsData?.metrics as Record<string, number> | undefined;
        const kpiData = generateSampleKPIData(widget.subtype, realMetrics);
        return (
          <div className="relative h-full">
            {!kpiData.isRealData && (
              <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">
                Demo Data
              </div>
            )}
            <KPIWidget
              title={widget.title}
              value={kpiData.value}
              change={kpiData.change}
              prefix={kpiData.prefix}
              suffix={kpiData.suffix}
              sparklineData={[100, 120, 110, 140, 130, kpiData.value / 1000]}
            />
          </div>
        );
      }

      case 'table': {
        const tableData = generateSampleTableData();
        return (
          <div className="relative h-full">
            <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded z-10">
              Demo Data
            </div>
            <DataTableWidget
              title={widget.title}
              columns={tableData.columns}
              data={tableData.data}
              pageSize={5}
            />
          </div>
        );
      }

      case 'list': {
        const listData = generateSampleListData(widget.subtype);
        return (
          <div className="relative h-full">
            <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded z-10">
              Demo Data
            </div>
            <ListWidget
              title={widget.title}
              items={listData}
              variant={widget.subtype === 'activity' ? 'activity' : 'ranked'}
              maxItems={5}
            />
          </div>
        );
      }

      case 'text':
        return (
          <TextWidget
            content={(widget.config?.content as string) || ''}
            onChange={(content) => {
              setTabLayouts(prev => prev.map(l =>
                l.tabId === activeTabId
                  ? {
                      ...l,
                      widgets: l.widgets.map(w =>
                        w.id === widget.id
                          ? { ...w, config: { ...w.config, content } }
                          : w
                      )
                    }
                  : l
              ));
              setHasChanges(true);
            }}
            variant={(widget.config?.variant as 'note' | 'header' | 'markdown') || 'note'}
          />
        );

      default:
        return <div className="flex items-center justify-center h-full text-gray-500">Unknown widget type</div>;
    }
  }, [activeTabId, analyticsData]);

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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 py-6">
          {/* Header */}
          <div className="mb-6">
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
                  Create custom visualizations with AI - drag, drop, and customize your dashboards
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
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
            onAddTab={handleAddTab}
            onRenameTab={handleRenameTab}
            onDeleteTab={handleDeleteTab}
            onDuplicateTab={handleDuplicateTab}
            onReorderTabs={handleReorderTabs}
            onOpenTemplates={() => setTemplatesOpen(true)}
          />

          {/* Time Period & Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Time Period Selector */}
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
                    {period === 'mtd' && 'MTD'}
                    {period === 'qtd' && 'QTD'}
                    {period === 'ytd' && 'YTD'}
                    {period === 'custom' && 'Custom'}
                  </button>
                ))}

                {timePeriod === 'custom' && (
                  <div className="flex items-center gap-2 ml-2">
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWidgetLibraryOpen(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <Library className="w-4 h-4" />
                  Widget Library
                </button>
                <button
                  onClick={() => setTemplatesOpen(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <Grid3X3 className="w-4 h-4" />
                  Templates
                </button>
                <button
                  onClick={() => setAiSidebarOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  <Sparkles className="w-4 h-4" />
                  Create with AI
                </button>
              </div>
            </div>
          </div>

          {/* Dashboard Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {currentWidgets.length} widget{currentWidgets.length !== 1 ? 's' : ''}
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
                {isEditing ? 'Editing' : 'Edit'}
              </button>
              {currentWidgets.length > 0 && (
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 min-h-[500px]">
            {currentWidgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <LayoutGrid className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Build Your Custom Dashboard</h3>
                <p className="text-gray-500 text-center max-w-md mb-6">
                  Add widgets from the library, use AI to generate charts, or start from a template.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTemplatesOpen(true)}
                    className="px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all font-medium flex items-center gap-2 text-gray-700"
                  >
                    <Grid3X3 className="w-5 h-5" />
                    Use Template
                  </button>
                  <button
                    onClick={() => setWidgetLibraryOpen(true)}
                    className="px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all font-medium flex items-center gap-2 text-gray-700"
                  >
                    <Library className="w-5 h-5" />
                    Add Widget
                  </button>
                  <button
                    onClick={() => setAiSidebarOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25"
                  >
                    <Sparkles className="w-5 h-5" />
                    Create with AI
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-4">
                  Try: "Show monthly revenue trend" or "Compare expenses by category"
                </p>
              </div>
            ) : (
              <DashboardGrid
                widgets={currentWidgets.map(w => ({
                  id: w.id,
                  chart: w.chart || {
                    id: w.id,
                    type: 'bar' as const,
                    title: w.title,
                    data: [],
                    config: {}
                  },
                  layout: w.layout
                }))}
                onLayoutChange={handleLayoutChange}
                onRemoveWidget={handleRemoveWidget}
                isEditing={isEditing}
                renderWidget={(widget) => {
                  const fullWidget = currentWidgets.find(w => w.id === widget.id);
                  if (fullWidget) {
                    return renderWidget(fullWidget);
                  }
                  return null;
                }}
              />
            )}
          </div>

          {/* Quick Add Button (Floating) */}
          {currentWidgets.length > 0 && (
            <button
              onClick={() => setWidgetLibraryOpen(true)}
              className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-xl shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center z-30"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* AI Sidebar */}
      <AISidebar
        isOpen={aiSidebarOpen}
        onClose={() => setAiSidebarOpen(false)}
        onAddChart={handleAddChartFromAI}
        walletAddress={address || ''}
        connectedIntegrations={connectedIntegrations}
      />

      {/* Widget Library Sidebar */}
      <WidgetLibrary
        isOpen={widgetLibraryOpen}
        onClose={() => setWidgetLibraryOpen(false)}
        onAddWidget={handleAddWidgetFromLibrary}
      />

      {/* Layout Templates Modal */}
      <LayoutTemplates
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onApplyTemplate={handleApplyTemplate}
      />
    </Layout>
  );
}
