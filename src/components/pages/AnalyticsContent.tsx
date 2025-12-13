'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletSync } from '@/app/providers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/Toast';
import {
  FileSpreadsheet,
  FileText,
  DollarSign,
  Users,
  BarChart3,
  Target
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/**
 * Analytics Page Content
 *
 * Comprehensive business intelligence dashboard with:
 * - Revenue trends over time
 * - Expense breakdown by category
 * - Customer growth metrics
 * - Sales pipeline visualization
 * - Top products/services
 * - Time period filtering
 * - Export to PDF/CSV
 */

type TimePeriod = 'mtd' | 'qtd' | 'ytd' | 'custom';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

export default function AnalyticsContent() {
  const { authenticated } = usePrivy();
  const { address } = useWalletSync();
  const router = useRouter();
  const toast = useToast();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('mtd');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

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
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        // Keep mock data as fallback
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [address, timePeriod, customDateRange]);

  // Redirect if not authenticated
  if (!authenticated) {
    router.push('/');
    return null;
  }

  // Derived metrics from backend analytics data (no hard-coded demo data)
  const metrics = analyticsData?.metrics || {};
  const charts = analyticsData?.charts || {};

  const totalRevenue = typeof metrics.revenue === 'number' ? metrics.revenue : 0;
  const totalCustomers = typeof metrics.customers === 'number' ? metrics.customers : 0;
  const averageRevenue = typeof metrics.average_revenue === 'number' ? metrics.average_revenue : 0;
  const conversionRate = typeof metrics.conversion_rate === 'number' ? metrics.conversion_rate : 0;

  const revenueTrend: Array<{ label: string; value: number }> = Array.isArray(charts.revenue_trend)
    ? charts.revenue_trend.map((point: any) => ({
        label: point.month || point.label || '',
        value: Number(point.value || 0),
      }))
    : [];

  const expenseBreakdown: ChartData[] = Array.isArray(charts.expense_categories)
    ? charts.expense_categories.map((item: any) => ({
        label: item.category || item.label || '',
        value: Number(item.value || 0),
        color: 'bg-blue-500',
      }))
    : [];

  const customerGrowth: Array<{ label: string; value: number }> = Array.isArray(charts.customer_growth)
    ? charts.customer_growth.map((item: any) => ({
        label: item.month || item.label || '',
        value: Number(item.value || 0),
      }))
    : [];

  const totalExpenses = expenseBreakdown.reduce((sum, item) => sum + item.value, 0);
  const maxRevenue = revenueTrend.length > 0 ? Math.max(...revenueTrend.map(d => d.value)) || 1 : 1;
  const maxCustomers = customerGrowth.length > 0 ? Math.max(...customerGrowth.map(d => d.value)) || 1 : 1;

  // Pipeline data from backend or empty array
  const pipelineData: Array<{ label: string; value: number }> = Array.isArray(charts.pipeline)
    ? charts.pipeline.map((item: { stage?: string; label?: string; value?: number }) => ({
        label: item.stage || item.label || '',
        value: Number(item.value || 0),
      }))
    : [];
  const maxPipeline = pipelineData.length > 0 ? Math.max(...pipelineData.map(d => d.value)) || 1 : 1;

  // Top products data from backend or empty array
  const topProductsData: Array<{ label: string; value: number }> = Array.isArray(charts.top_products)
    ? charts.top_products.map((item: { product?: string; label?: string; value?: number }) => ({
        label: item.product || item.label || '',
        value: Number(item.value || 0),
      }))
    : [];

  const handleExportPDF = () => {
    toast.info('Coming soon', 'PDF export will be available in a future update.');
  };

  const handleExportCSV = () => {
    const csv = 'Revenue Data\n' + revenueTrend.map((d: { label: string; value: number }) => `${d.label},${d.value}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 py-6">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Analytics</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Business Analytics
                </h1>
                <p className="text-gray-600">
                  Comprehensive insights across all your business metrics
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-white border border-gray-200 transition-all text-sm font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4 inline mr-1" /> Export CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-white border border-gray-200 transition-all text-sm font-medium"
                >
                  <FileText className="w-4 h-4 inline mr-1" /> Export PDF
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
                <button
                  onClick={() => setTimePeriod('mtd')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timePeriod === 'mtd'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Month to Date
                </button>
                <button
                  onClick={() => setTimePeriod('qtd')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timePeriod === 'qtd'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Quarter to Date
                </button>
                <button
                  onClick={() => setTimePeriod('ytd')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timePeriod === 'ytd'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Year to Date
                </button>
                <button
                  onClick={() => setTimePeriod('custom')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timePeriod === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Custom Range
                </button>
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
                <button className="mt-5 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all">
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
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
                {metrics.revenue_change_percent != null
                  ? `↑ ${metrics.revenue_change_percent}% vs last period`
                  : 'Revenue change will appear after data sync'}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
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
                {metrics.customers_change_percent != null
                  ? `↑ ${metrics.customers_change_percent}% vs last period`
                  : 'Customer growth will appear after data sync'}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
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

            <div className="bg-white border border-gray-200 rounded-xl p-6">
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

          {/* Revenue Trend Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Revenue Trend</h3>
              <p className="text-sm text-gray-600">Monthly revenue over the last 12 months</p>
            </div>

            {revenueTrend.length > 0 ? (
              <div className="space-y-2">
                {revenueTrend.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-12 text-sm font-medium text-gray-700">{item.label}</div>
                    <div className="flex-1">
                      <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 flex items-center justify-end pr-3"
                          style={{ width: `${(item.value / maxRevenue) * 100}%` }}
                        >
                          <span className="text-white text-sm font-semibold">
                            ${(item.value / 1000).toFixed(1)}K
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <p className="text-sm">No revenue trend data available yet</p>
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

            {/* Expense Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Expense Breakdown</h3>
                <p className="text-sm text-gray-600">Distribution of expenses by category</p>
              </div>

              <div className="space-y-4">
                {expenseBreakdown.map((item, index) => {
                  const percentage = (item.value / totalExpenses) * 100;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                          <span className="text-sm font-medium text-gray-900">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">${(item.value / 1000).toFixed(1)}K</span>
                          <span className="text-xs text-gray-500 ml-2">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total Expenses</span>
                  <span className="text-lg font-bold text-gray-900">${(totalExpenses / 1000).toFixed(1)}K</span>
                </div>
              </div>
            </div>

            {/* Customer Growth */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Customer Growth</h3>
                <p className="text-sm text-gray-600">Total customers over the last 12 months</p>
              </div>

              <div className="space-y-2">
                {customerGrowth.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-12 text-sm font-medium text-gray-700">{item.label}</div>
                    <div className="flex-1">
                      <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 flex items-center justify-end pr-3"
                          style={{ width: `${(item.value / maxCustomers) * 100}%` }}
                        >
                          <span className="text-white text-xs font-semibold">
                            {item.value.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row - Pipeline and Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Sales Pipeline Funnel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Sales Pipeline</h3>
                <p className="text-sm text-gray-600">Conversion funnel from leads to customers</p>
              </div>

              <div className="space-y-3">
                {pipelineData.map((item, index) => {
                  const percentage = (item.value / maxPipeline) * 100;
                  const conversionRate = index > 0 ? (item.value / pipelineData[index - 1].value) * 100 : 100;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{item.label}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                          {index > 0 && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({conversionRate.toFixed(1)}% conv)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <div
                          className="bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 rounded-lg h-12 flex items-center justify-center text-white font-semibold transition-all duration-500"
                          style={{ width: `${percentage}%`, marginLeft: `${index * 5}%` }}
                        >
                          {item.value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {pipelineData.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Overall Conversion</span>
                    <span className="text-lg font-bold text-purple-600">
                      {pipelineData.length >= 2
                        ? ((pipelineData[pipelineData.length - 1].value / (pipelineData[0].value || 1)) * 100).toFixed(1)
                        : '0.0'}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Top Products/Services */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Top Products/Services</h3>
                <p className="text-sm text-gray-600">Best performing offerings by revenue</p>
              </div>

              <div className="space-y-4">
                {topProductsData.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{item.label}</span>
                        <span className="text-sm font-semibold text-gray-900">${(item.value / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                          style={{ width: `${topProductsData[0]?.value ? (item.value / topProductsData[0].value) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
