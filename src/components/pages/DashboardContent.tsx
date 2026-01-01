'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { useWalletSync } from '@/hooks/useWalletSync';
import { logger } from '@/lib/logger';
import {
  getKPIs,
  getRecentActivity,
  KPIResponse,
  RecentActivityResponse,
} from '@/services/dashboardService';
import {
  Plug,
  AlertTriangle,
  ClipboardList,
  ArrowRight,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { getIntegrationIcon } from '@/components/ui/IntegrationIcons';
import { FeedbackNotification } from '@/components/feedback';
import { TasksWidget } from '@/components/planning';
import { AIInsightWidget, IntegrationHealthCards, EnhancedKPICard, DashboardQuickActions } from '@/components/dashboard';

// Default KPIs matching requirements: Revenue MTD, Cash Flow, Open Tasks, Unread Emails
const getDefaultKPIs = () => [
  {
    id: 'revenue-mtd',
    title: 'Revenue MTD',
    value: '$0',
    change: { value: 0, period: 'vs last month' },
    icon: '💰',
    source: 'QuickBooks',
    trend: 'neutral' as const,
    color: 'green' as const,
    helpText: 'Monthly revenue from QuickBooks',
  },
  {
    id: 'cash-flow',
    title: 'Cash Flow',
    value: '$0',
    change: { value: 0, period: 'vs last month' },
    icon: '📊',
    source: 'QuickBooks',
    trend: 'neutral' as const,
    color: 'blue' as const,
    helpText: 'Net cash flow from QuickBooks',
  },
  {
    id: 'open-tasks',
    title: 'Open Tasks',
    value: '0',
    change: { value: 0, period: '0 overdue' },
    icon: '✅',
    source: 'Varity Tasks',
    trend: 'neutral' as const,
    color: 'purple' as const,
    helpText: 'Active tasks from your task list',
  },
  {
    id: 'unread-emails',
    title: 'Unread Emails',
    value: '0',
    change: { value: 0, period: '0 urgent' },
    icon: '📧',
    source: 'Gmail',
    trend: 'neutral' as const,
    color: 'orange' as const,
    helpText: 'Unread emails from Gmail',
  },
];

export default function DashboardContent() {
  const { authenticated, ready, user } = usePrivy();
  const walletSync = useWalletSync();
  const address = walletSync?.address ?? null;
  const router = useRouter();

  // State management for dashboard data
  const [kpisData, setKpisData] = useState<KPIResponse | null>(null);
  const [recentActivityData, setRecentActivityData] = useState<RecentActivityResponse | null>(null);

  // User settings for feedback notifications
  const [userSettings, setUserSettings] = useState<{
    companyName?: string;
    trialStartDate?: string;
    trialDays?: number;
  } | null>(null);

  // Loading states
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Error states
  const [kpisError, setKpisError] = useState<string | null>(null);
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

  // Fetch dashboard data when authenticated AND wallet address is available
  // CRITICAL: address must be in dependency array - it starts as null while wallet syncs
  useEffect(() => {
    if (authenticated && ready && address) {
      fetchDashboardData();
    }
  }, [authenticated, ready, address]);

  const fetchDashboardData = async () => {
    fetchKPIs();
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  };

  // Format relative time from last updated
  const formatLastUpdated = () => {
    if (!lastUpdated) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return lastUpdated.toLocaleTimeString();
  };

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get integration-specific brand icon for activity
  const getActivityBrandIcon = (type: string, source: string) => {
    const Icon = getIntegrationIcon(type, source);

    // Background colors based on source
    const sourceLC = source?.toLowerCase() || '';
    let bg = 'bg-gray-50';

    if (sourceLC.includes('google') || sourceLC.includes('gmail')) bg = 'bg-red-50';
    else if (sourceLC.includes('microsoft') || sourceLC.includes('outlook') || sourceLC.includes('teams')) bg = 'bg-blue-50';
    else if (sourceLC.includes('slack')) bg = 'bg-purple-50';
    else if (sourceLC.includes('quickbooks')) bg = 'bg-green-50';
    else if (sourceLC.includes('salesforce')) bg = 'bg-sky-50';
    else if (sourceLC.includes('hubspot')) bg = 'bg-orange-50';

    return { Icon, bg };
  };

  // Get user's display name from Privy
  const getUserDisplayName = (): string => {
    if (!user) return 'there';

    // Check Google account for name
    if (user.google?.name) {
      return user.google.name.split(' ')[0]; // First name only
    }

    // Check email and extract name part
    if (user.email?.address) {
      const emailName = user.email.address.split('@')[0];
      // Capitalize first letter and clean up
      return emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase();
    }

    // Check Google email as fallback
    if (user.google?.email) {
      const emailName = user.google.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase();
    }

    // Check company name from settings as last resort
    if (userSettings?.companyName) {
      return userSettings.companyName.split(' ')[0];
    }

    return 'there';
  };

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
          {/* Header with Personalized Greeting */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getGreeting()}, {getUserDisplayName()}
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Here&apos;s your business at a glance
              </p>
              <div className="flex items-center gap-4 mt-1">
                {lastUpdated && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Last synced: {formatLastUpdated()}
                  </p>
                )}
                {connectedSources.length > 0 && (
                  <p className="text-sm text-gray-400">
                    {connectedSources.length} source{connectedSources.length > 1 ? 's' : ''} connected
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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

          {/* Quick Actions Bar */}
          {address && (
            <DashboardQuickActions
              walletAddress={address}
              className="mb-6"
            />
          )}

          {/* KPI Cards Row - Single row of 4 cards matching requirements */}
          <div className="mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="grid grid-cols-4 gap-4 min-w-[800px] sm:min-w-0">
              {isLoadingKPIs ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-20 mb-1" />
                          <div className="h-2 bg-gray-200 rounded w-12" />
                        </div>
                      </div>
                      <div className="h-8 bg-gray-200 rounded w-24 mb-3" />
                      <div className="h-4 bg-gray-200 rounded w-16 mb-3" />
                      <div className="h-9 bg-gray-200 rounded w-full" />
                    </div>
                  ))}
                </>
              ) : kpisData && kpisData.kpis && kpisData.kpis.length > 0 ? (
                // Show exactly 4 KPIs - use first 4 from backend or pad with placeholders
                [...kpisData.kpis.slice(0, 4), ...getDefaultKPIs()].slice(0, 4).map((kpi, index) => (
                  <Link key={index} href="/analytics" className="block">
                    <EnhancedKPICard
                      title={kpi.title}
                      value={kpi.value}
                      change={kpi.change}
                      icon={kpi.icon}
                      source={kpi.source}
                      trend={kpi.trend as 'up' | 'down' | 'neutral'}
                      color={kpi.color as 'blue' | 'green' | 'orange' | 'purple' | 'red'}
                      lastSynced={kpisData.last_updated}
                      helpText={`Data from ${kpi.source || 'connected integrations'}`}
                    />
                  </Link>
                ))
              ) : (
                // Show default KPIs when no data
                getDefaultKPIs().map((kpi, index) => (
                  <Link key={index} href="/analytics" className="block">
                    <EnhancedKPICard
                      title={kpi.title}
                      value={kpi.value}
                      change={kpi.change}
                      icon={kpi.icon}
                      source={kpi.source}
                      trend={kpi.trend}
                      color={kpi.color}
                      helpText={kpi.helpText}
                    />
                  </Link>
                ))
              )}
            </div>
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

          {/* Row 3: AI Insight (1/2) + Recent Activity (1/2) - Per Requirements Wireframe */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* AI Insight Widget - 50% width */}
            {address && (
              <AIInsightWidget
                walletAddress={address}
                kpiData={kpisData}
                recentActivity={recentActivityData?.activities}
                onRefresh={handleRefresh}
                isLoading={isRefreshing}
              />
            )}

            {/* Recent Activity - 50% width */}
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
              ) : recentActivityData && recentActivityData.activities && recentActivityData.activities.length > 0 ? (
                <div className="space-y-2">
                  {recentActivityData.activities.slice(0, 7).map((activity, i) => {
                    const { Icon: BrandIcon, bg } = getActivityBrandIcon(activity.type, activity.source);
                    return (
                      <div key={i} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-100`}>
                          <BrandIcon size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {activity.description}
                            {activity.source && (
                              <span className="ml-1 text-gray-400">
                                · {activity.source}
                              </span>
                            )}
                          </p>
                        </div>
                        {activity.amount && (
                          <span className="text-sm font-semibold text-green-600 flex-shrink-0">
                            {activity.amount}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
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

          {/* Row 4: My Tasks (1/2) + Integration Health (1/2) - Per Requirements Wireframe */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tasks Widget - 50% width */}
            {address && <TasksWidget walletAddress={address} />}

            {/* Integration Health Cards - 50% width */}
            {address && (
              <IntegrationHealthCards
                walletAddress={address}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
