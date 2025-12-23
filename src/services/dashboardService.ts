import { logger } from '@/lib/logger';
/**
 * Dashboard API Service
 * Handles all API calls to the dashboard backend
 *
 * Supports dynamic KPIs from all 6 integrations:
 * - QuickBooks, Google Workspace, Microsoft 365, Slack, Salesforce, HubSpot
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// KPI Interfaces - Dynamic format from backend
export interface KPIData {
  id: string;
  title: string;
  value: string;
  change: {
    value: number;
    period: string;
  };
  icon: string;
  source: string;
  trend: 'up' | 'down' | 'neutral';
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red';
}

export interface KPIResponse {
  kpis: KPIData[];
  data_sources: string[];
  has_data: boolean;
  last_updated: string;
}

// Revenue Trend Interfaces
export interface RevenueTrendDataPoint {
  month: string;
  value: number;
  max: number;
}

export interface RevenueTrendResponse {
  data: RevenueTrendDataPoint[];
  period: string;
  total_revenue: number;
  average_revenue: number;
}

// Recent Activity Interfaces
export interface ActivityItem {
  id: string;
  type: string;
  icon: string;
  title: string;
  description: string;
  amount?: string;
  time: string;
  color: string;
  source: string;
}

export interface RecentActivityResponse {
  activities: ActivityItem[];
  count: number;
}

// Top Customers Interfaces
export interface TopCustomer {
  name: string;
  revenue: string;
  percent: number;
}

export interface TopCustomersResponse {
  customers: TopCustomer[];
  total_revenue: number;
  count: number;
}

/**
 * Fetch dashboard KPIs
 * Returns dynamic KPIs from all connected integrations
 */
export async function getKPIs(walletAddress: string): Promise<KPIResponse> {
  try {
    const params = new URLSearchParams();
    params.append('wallet_address', walletAddress);

    const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/kpis?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Transform backend KPIs to frontend format
    const kpis: KPIData[] = (data.kpis || []).map((kpi: {
      id: string;
      title: string;
      value: string;
      change_value: number;
      change_period: string;
      icon: string;
      source: string;
      trend: string;
      color: string;
    }) => ({
      id: kpi.id,
      title: kpi.title,
      value: kpi.value,
      change: {
        value: kpi.change_value || 0,
        period: kpi.change_period || ''
      },
      icon: kpi.icon,
      source: kpi.source,
      trend: kpi.trend as 'up' | 'down' | 'neutral',
      color: kpi.color as 'blue' | 'green' | 'orange' | 'purple' | 'red'
    }));

    return {
      kpis,
      data_sources: data.data_sources || [],
      has_data: data.has_data || false,
      last_updated: data.last_updated || new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error fetching KPIs:', error);
    throw error;
  }
}

/**
 * Fetch revenue trend data
 */
export async function getRevenueTrend(walletAddress: string): Promise<RevenueTrendResponse> {
  try {
    const params = new URLSearchParams();
    params.append('wallet_address', walletAddress);

    const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/revenue-trend?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error fetching revenue trend:', error);
    throw error;
  }
}

// Activity type to icon/color mapping
const ACTIVITY_TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  invoice: { icon: '📄', color: 'text-green-600' },
  email: { icon: '📧', color: 'text-blue-600' },
  event: { icon: '📅', color: 'text-purple-600' },
  message: { icon: '💬', color: 'text-pink-600' },
  opportunity: { icon: '🎯', color: 'text-green-600' },
  deal: { icon: '🤝', color: 'text-orange-600' },
  lead: { icon: '👤', color: 'text-blue-600' },
  order: { icon: '🛒', color: 'text-green-600' },
  contact: { icon: '📇', color: 'text-blue-600' },
};

/**
 * Fetch recent activity from all integrations
 */
export async function getRecentActivity(limit: number = 10, walletAddress: string): Promise<RecentActivityResponse> {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('wallet_address', walletAddress);

    const url = `${API_BASE_URL}/api/v1/dashboard/recent-activity?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Transform backend activities to frontend format
    const activities: ActivityItem[] = (data.activities || []).map((activity: {
      id: string;
      type: string;
      title: string;
      description: string;
      amount?: number;
      timestamp: string;
      source: string;
    }) => {
      const config = ACTIVITY_TYPE_CONFIG[activity.type] || { icon: '📌', color: 'text-gray-600' };
      return {
        id: activity.id,
        type: activity.type,
        icon: config.icon,
        title: activity.title,
        description: activity.description,
        amount: activity.amount ? `$${activity.amount.toLocaleString()}` : undefined,
        time: activity.timestamp,
        color: config.color,
        source: activity.source,
      };
    });

    return {
      activities,
      count: data.total_count || activities.length,
    };
  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    throw error;
  }
}

/**
 * Fetch top customers
 */
export async function getTopCustomers(limit: number = 5, walletAddress: string): Promise<TopCustomersResponse> {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('wallet_address', walletAddress);

    const url = `${API_BASE_URL}/api/v1/dashboard/top-customers?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error fetching top customers:', error);
    throw error;
  }
}

export default {
  getKPIs,
  getRevenueTrend,
  getRecentActivity,
  getTopCustomers,
};
