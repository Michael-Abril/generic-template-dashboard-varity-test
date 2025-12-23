'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { KPICard } from '@/components/KPICard';
import { useWalletSync } from '@/hooks/useWalletSync';
import { logger } from '@/lib/logger';
import {
  getKPIs,
  getRevenueTrend,
  getRecentActivity,
  KPIResponse,
  RevenueTrendResponse,
  RecentActivityResponse,
} from '@/services/dashboardService';
import {
  Plug,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { FeedbackNotification } from '@/components/feedback';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function DashboardContent() {
  const { authenticated, ready } = usePrivy();
  const { address } = useWalletSync();
  const router = useRouter();

  // State management for dashboard data
  const [kpisData, setKpisData] = useState<KPIResponse | null>(null);
  const [revenueTrendData, setRevenueTrendData] = useState<RevenueTrendResponse | null>(null);
  const [recentActivityData, setRecentActivityData] = useState<RecentActivityResponse | null>(null);

  // User settings for feedback notifications
  const [userSettings, setUserSettings] = useState<{
    companyName?: string;
    trialStartDate?: string;
    trialDays?: number;
  } | null>(null);

  // Loading states
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Error states
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Check if any integration is connected (has data) - use has_data from backend
  const hasIntegrations = kpisData?.has_data || false;
  const connectedSources = kpisData?.data_sources || [];

  // Redirect to login if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [authenticated, ready, router]);

  // Fetch dashboard data on mount
  useEffect(() => {
    if (authenticated && ready) {
      fetchDashboardData();
    }
  }, [authenticated, ready]);

  const fetchDashboardData = async () => {
    fetchKPIs();
    fetchRevenueTrend();
    fetchRecentActivity();
    fetchUserSettings();
  };

  const fetchKPIs = async () => {
    if (!address) return;
    setIsLoadingKPIs(true);
    setKpisError(null);
    try {
      const data = await getKPIs(address);
      setKpisData(data);
      setLastUpdated(new Date());
    } catch (error) {
      logger.error('Error fetching KPIs:', error);
      setKpisError('Unable to load KPIs. Please try again.');
    } finally {
      setIsLoadingKPIs(false);
    }
  };

  const fetchRevenueTrend = async () => {
    if (!address) return;
    setIsLoadingRevenue(true);
    setRevenueError(null);
    try {
      const data = await getRevenueTrend(address);
      setRevenueTrendData(data);
    } catch (error) {
      logger.error('Error fetching revenue trend:', error);
      setRevenueError('Unable to load revenue trend.');
    } finally {
      setIsLoadingRevenue(false);
    }
  };

  const fetchRecentActivity = async () => {
    if (!address) return;
    setIsLoadingActivity(true);
    setActivityError(null);
    try {
      const data = await getRecentActivity(10, address);
      setRecentActivityData(data);
    } catch (error) {
      logger.error('Error fetching recent activity:', error);
      setActivityError('Unable to load recent activity.');
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const fetchUserSettings = async () => {
    if (!address) return;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBase}/api/v1/settings?wallet_address=${address}`);
      if (res.ok) {
        const data = await res.json();
        setUserSettings(data);
      }
    } catch (error) {
      logger.error('Error fetching user settings:', error);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Calculate AI insight based on KPI data
  const getAIInsight = () => {
    if (!kpisData || !kpisData.has_data || kpisData.kpis.length === 0) return null;

    // Check for revenue KPI first (QuickBooks)
    const revenueKPI = kpisData.kpis.find(k => k.title.toLowerCase().includes('revenue') && k.title.toLowerCase().includes('total'));
    if (revenueKPI && revenueKPI.change) {
      const change = revenueKPI.change.value;
      if (change > 0) {
        return {
          text: `Your revenue is up ${change.toFixed(1)}% compared to last month.`,
          trend: 'up' as const,
        };
      } else if (change < 0) {
        return {
          text: `Your revenue is down ${Math.abs(change).toFixed(1)}% compared to last month.`,
          trend: 'down' as const,
        };
      }
    }

    // If no revenue, show summary of connected integrations
    const sources = connectedSources.join(', ');
    const kpiCount = kpisData.kpis.length;
    return {
      text: `${kpiCount} metrics synced from ${sources}. Ask AI Assistant for detailed analysis.`,
      trend: 'neutral' as const,
    };
  };

  const aiInsight = getAIInsight();

  // Loading state while checking authentication
  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Empty state when no integrations connected
  if (!isLoadingKPIs && !hasIntegrations) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plug className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Welcome to Your Dashboard
            </h1>
            <p className="text-gray-600 mb-8">
              Connect your first business tool to start seeing real-time insights,
              KPIs, and AI-powered analytics.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 hover:shadow-lg transition-all duration-200"
            >
              Connect Your First Integration
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-sm text-gray-500 mt-6">
              Popular integrations: QuickBooks, Google Workspace, Salesforce
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Business Overview
              </h1>
              {lastUpdated && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoadingKPIs}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingKPIs ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Feedback Notification - Shows at Day 7, 25, 30 of trial */}
          {address && userSettings?.trialStartDate && (
            <FeedbackNotification
              walletAddress={address}
              companyName={userSettings.companyName}
              trialStartDate={userSettings.trialStartDate}
              trialDays={userSettings.trialDays}
            />
          )}

          {/* KPI Cards - Clickable to Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {isLoadingKPIs ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </>
            ) : kpisData && kpisData.kpis && kpisData.kpis.length > 0 ? (
              kpisData.kpis.map((kpi, index) => (
                <Link key={index} href="/analytics" className="block group">
                  <KPICard
                    title={kpi.title}
                    value={kpi.value}
                    change={kpi.change}
                    icon={kpi.icon}
                    source={kpi.source}
                    trend={kpi.trend as 'up' | 'down' | 'neutral'}
                    color={kpi.color as 'blue' | 'green' | 'orange' | 'purple' | 'red'}
                  />
                </Link>
              ))
            ) : null}
          </div>

          {/* Error notification for KPIs */}
          {kpisError && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">{kpisError}</p>
                <button
                  onClick={fetchKPIs}
                  className="ml-auto text-sm text-yellow-700 hover:text-yellow-800 font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* AI Insight Widget + Revenue Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* AI Insight Widget */}
            <div className="lg:col-span-1 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold">AI Insight</h3>
              </div>
              {aiInsight ? (
                <>
                  <div className="flex items-start gap-2 mb-4">
                    {aiInsight.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />}
                    {aiInsight.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />}
                    <p className="text-sm text-white/90">{aiInsight.text}</p>
                  </div>
                  <Link
                    href="/ai-assistant"
                    className="inline-flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white transition-colors"
                  >
                    Ask AI for more insights
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              ) : (
                <p className="text-sm text-white/80">Connect integrations to get AI-powered insights.</p>
              )}
            </div>

            {/* Revenue Trend Chart */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Revenue Trend</h3>
                  <p className="text-sm text-gray-500">
                    {revenueTrendData ? revenueTrendData.period : 'Last 6 months'}
                  </p>
                </div>
                <Link
                  href="/analytics"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View details
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {isLoadingRevenue ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="flex items-end gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="w-10 bg-gray-200 animate-pulse rounded-t" style={{ height: `${30 + i * 12}px` }} />
                    ))}
                  </div>
                </div>
              ) : revenueTrendData && revenueTrendData.data.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueTrendData.data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                        width={50}
                      />
                      <Tooltip
                        formatter={(value) => [`$${(value ?? 0).toLocaleString()}`, 'Revenue']}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                        {revenueTrendData.data.map((_, index, arr) => (
                          <Cell key={`cell-${index}`} fill={index === arr.length - 1 ? '#3b82f6' : '#e5e7eb'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No revenue data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent Activity</h3>
              <Link
                href="/analytics"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoadingActivity ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : recentActivityData && recentActivityData.activities.length > 0 ? (
              <div className="space-y-2">
                {recentActivityData.activities.slice(0, 7).map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                      <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                    </div>
                    {activity.amount && (
                      <span className={`text-sm font-semibold ${activity.color} flex-shrink-0`}>
                        {activity.amount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400">
                <ClipboardList className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}

            {activityError && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <p className="text-xs text-yellow-800">{activityError}</p>
                  <button onClick={fetchRecentActivity} className="ml-auto text-xs text-yellow-700 font-medium">
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
