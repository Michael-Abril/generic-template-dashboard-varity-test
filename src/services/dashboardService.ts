import { logger } from '@/lib/logger';
/**
 * Dashboard API Service
 * Handles all API calls to the dashboard backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// KPI Interfaces
export interface KPIData {
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
  icon: string;
  title: string;
  description: string;
  amount?: string;
  time: string;
  color: string;
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
    return data;
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

/**
 * Fetch recent activity
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
    return data;
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
