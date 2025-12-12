'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { KPICard } from '@/components/KPICard';
import { AIChat } from '@/components/AIChat';
import { useWalletSync } from '@/hooks/useWalletSync';
import { logger } from '@/lib/logger';
import {
  getKPIs,
  getRevenueTrend,
  getRecentActivity,
  getTopCustomers,
  KPIResponse,
  RevenueTrendResponse,
  RecentActivityResponse,
  TopCustomersResponse,
} from '@/services/dashboardService';
import {
  Plug,
  AlertTriangle,
  Shield,
  Check,
  Settings,
  BarChart3,
  MessageSquare,
  ClipboardList,
  Users,
  ArrowRight
} from 'lucide-react';

export default function DashboardContent() {
  const { authenticated, ready, login } = usePrivy();
  const { address } = useWalletSync();
  const router = useRouter();

  // State management for dashboard data
  const [kpisData, setKpisData] = useState<KPIResponse | null>(null);
  const [revenueTrendData, setRevenueTrendData] = useState<RevenueTrendResponse | null>(null);
  const [recentActivityData, setRecentActivityData] = useState<RecentActivityResponse | null>(null);
  const [topCustomersData, setTopCustomersData] = useState<TopCustomersResponse | null>(null);

  // Loading states
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  // Error states
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [customersError, setCustomersError] = useState<string | null>(null);

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
    // Fetch KPIs
    fetchKPIs();
    // Fetch Revenue Trend
    fetchRevenueTrend();
    // Fetch Recent Activity
    fetchRecentActivity();
    // Fetch Top Customers
    fetchTopCustomers();
  };

  const fetchKPIs = async () => {
    if (!address) return;
    try {
      setIsLoadingKPIs(true);
      setKpisError(null);
      const data = await getKPIs(address);
      setKpisData(data);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      setKpisError('Failed to load KPIs from backend.');
    } finally {
      setIsLoadingKPIs(false);
    }
  };

  const fetchRevenueTrend = async () => {
    if (!address) return;
    try {
      setIsLoadingRevenue(true);
      setRevenueError(null);
      const data = await getRevenueTrend(address);
      setRevenueTrendData(data);
    } catch (error) {
      console.error('Error fetching revenue trend:', error);
      setRevenueError('Failed to load revenue data from backend.');
    } finally {
      setIsLoadingRevenue(false);
    }
  };

  const fetchRecentActivity = async () => {
    if (!address) return;
    try {
      setIsLoadingActivity(true);
      setActivityError(null);
      const data = await getRecentActivity(4, address);
      setRecentActivityData(data);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setActivityError('Failed to load recent activity from backend.');
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const fetchTopCustomers = async () => {
    if (!address) return;
    try {
      setIsLoadingCustomers(true);
      setCustomersError(null);
      const data = await getTopCustomers(5, address);
      setTopCustomersData(data);
    } catch (error) {
      console.error('Error fetching top customers:', error);
      setCustomersError('Failed to load customer data from backend.');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Business Overview
            </h1>
            <p className="text-gray-600">
              Your unified view across all connected tools
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {isLoadingKPIs ? (
              // Loading state for KPIs
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </>
            ) : kpisData && kpisData.kpis.length > 0 ? (
              // Success state - render dynamic KPIs
              kpisData.kpis.map((kpi, index) => (
                <KPICard
                  key={index}
                  title={kpi.title}
                  value={kpi.value}
                  change={kpi.change}
                  icon={kpi.icon}
                  source={kpi.source}
                  trend={kpi.trend as 'up' | 'down' | 'neutral'}
                  color={kpi.color as 'blue' | 'green' | 'orange' | 'purple' | 'red'}
                />
              ))
            ) : (
              // Empty state - no integrations connected
              <div className="col-span-4 bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                <div className="flex justify-center mb-3">
                  <Plug className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  No Integrations Connected
                </h3>
                <p className="text-gray-600 mb-4">
                  Connect your business tools to see real-time KPIs and insights
                </p>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Browse Integrations
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Error notification for KPIs */}
          {kpisError && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">{kpisError}</p>
                <button
                  onClick={fetchKPIs}
                  className="ml-auto text-sm text-yellow-700 hover:text-yellow-800 font-semibold"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Security & Quick Actions Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Security Status Widget */}
            <div className="lg:col-span-1 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6" />
                <h2 className="text-lg font-bold">Data Security</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-300" />
                  <span>End-to-End Encrypted</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-300" />
                  <span>Distributed Secure Storage</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-300" />
                  <span>License Verified</span>
                </div>
              </div>
              <Link
                href="/integrations"
                className="mt-4 block w-full bg-white/20 hover:bg-white/30 text-center py-2 rounded-lg text-sm font-semibold transition-all"
              >
                View Security Details
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link
                  href="/integrations"
                  className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <Settings className="w-6 h-6 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">My Integrations</span>
                </Link>
                <Link
                  href="/marketplace"
                  className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Plug className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Add Integration</span>
                </Link>
                <Link
                  href="/analytics"
                  className="flex flex-col items-center gap-2 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">View Analytics</span>
                </Link>
                <Link
                  href="/ai-assistant"
                  className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <MessageSquare className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-green-700">AI Assistant</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Revenue Trend</h2>
                <p className="text-sm text-gray-600">
                  {revenueTrendData ? revenueTrendData.period : 'Last 6 months performance'}
                </p>
              </div>
              <Link
                href="/analytics"
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1"
              >
                View Full Analytics
                <span>→</span>
              </Link>
            </div>

            {isLoadingRevenue ? (
              // Loading state
              <div className="flex items-end justify-between gap-2 h-48">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center" style={{ height: '160px' }}>
                      <div className="w-full rounded-t-lg bg-gray-200 animate-pulse" style={{ height: `${Math.random() * 70 + 30}%` }}></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-8 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : revenueTrendData && revenueTrendData.data.length > 0 ? (
              // Success state - dynamic data
              <div className="flex items-end justify-between gap-2 h-48">
                {revenueTrendData.data.map((item, i) => {
                  const heightPercent = (item.value / item.max) * 100;
                  const isCurrentMonth = i === revenueTrendData.data.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex items-end justify-center" style={{ height: '160px' }}>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isCurrentMonth
                              ? 'bg-gradient-to-t from-blue-500 to-blue-600'
                              : 'bg-gradient-to-t from-gray-300 to-gray-400'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-gray-700">{item.month}</p>
                        <p className="text-xs text-gray-500">${(item.value / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Empty or error state without fallback data
              <div className="flex items-center justify-center h-48 text-gray-400">
                <div className="text-center">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">
                    {revenueError ? 'Unable to load revenue data' : 'No revenue data available'}
                  </p>
                </div>
              </div>
            )}

            {/* Error notification for Revenue */}
            {revenueError && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <p className="text-xs text-yellow-800">{revenueError}</p>
                  <button
                    onClick={fetchRevenueTrend}
                    className="ml-auto text-xs text-yellow-700 hover:text-yellow-800 font-semibold"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>

              {isLoadingActivity ? (
                // Loading state
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivityData && recentActivityData.activities.length > 0 ? (
                // Success state - dynamic data
                <div className="space-y-4">
                  {recentActivityData.activities.map((activity, i) => (
                    <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                        {activity.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                            <p className="text-sm text-gray-600">{activity.description}</p>
                          </div>
                          {activity.amount && (
                            <span className={`text-sm font-semibold ${activity.color} flex-shrink-0`}>
                              {activity.amount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Empty or error state without fallback data
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <ClipboardList className="w-10 h-10 mb-2" />
                  <p className="text-sm">
                    {activityError ? 'Unable to load recent activity' : 'No recent activity'}
                  </p>
                </div>
              )}

              {/* Error notification for Activity */}
              {activityError && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs text-yellow-800">{activityError}</p>
                    <button
                      onClick={fetchRecentActivity}
                      className="ml-auto text-xs text-yellow-700 hover:text-yellow-800 font-semibold"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Top Customers */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Top Customers</h2>

              {isLoadingCustomers ? (
                // Loading state
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center justify-between mb-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-gray-200 h-2 rounded-full" style={{ width: '50%' }}></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-1/4 mt-1"></div>
                    </div>
                  ))}
                </div>
              ) : topCustomersData && topCustomersData.customers.length > 0 ? (
                // Success state - dynamic data
                <div className="space-y-4">
                  {topCustomersData.customers.map((customer, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                        <span className="text-sm font-semibold text-gray-900">{customer.revenue}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${customer.percent}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{customer.percent}% of total revenue</p>
                    </div>
                  ))}
                </div>
              ) : (
                // Empty or error state without fallback data
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Users className="w-10 h-10 mb-2" />
                  <p className="text-sm">
                    {customersError ? 'Unable to load customer data' : 'No customer data available'}
                  </p>
                </div>
              )}

              {/* Error notification for Customers */}
              {customersError && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs text-yellow-800">{customersError}</p>
                    <button
                      onClick={fetchTopCustomers}
                      className="ml-auto text-xs text-yellow-700 hover:text-yellow-800 font-semibold"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Chat Assistant */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">AI Business Assistant</h2>
            <AIChat />
          </div>

          {/* Footer CTA */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-8 text-white">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold mb-2">
                Unlock More Insights with Additional Integrations
              </h2>
              <p className="text-blue-100 mb-6">
                Connect more business tools to get a complete view of your operations. Our AI assistant becomes smarter with each integration.
              </p>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                <span>Browse Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
