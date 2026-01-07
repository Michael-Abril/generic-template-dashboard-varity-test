'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletSync } from '@/app/providers';
import { useToast } from '@/components/ui/Toast';
import { Layout } from '@/components/Layout';
import { logger } from '@/lib/logger';
import { fetchLiveIntegrationData } from '@/lib/live-api-fetcher';
import Link from 'next/link';
import { SalesforcePage } from '@/components/integrations/salesforce';
import { SlackPage } from '@/components/integrations/slack';
import { HubSpotPage } from '@/components/integrations/hubspot';
import { QuickBooksPage } from '@/components/integrations/quickbooks';
import { GoogleWorkspacePage } from '@/components/integrations/google';
import { Microsoft365Page } from '@/components/integrations/microsoft';
import { IntegrationErrorBoundary } from '@/components/integrations/IntegrationErrorBoundary';
import { SyncHealthCard, SyncHealthData } from '@/components/integrations/SyncHealthCard';
import { IntegrationPageHeader, IntegrationTabs } from '@/components/integrations/IntegrationPageHeader';
import { StatusBadge, IntegrationStatus } from '@/components/ui/StatusBadge';
import {
  RefreshCw,
  FileText,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Building,
  CreditCard,
  ChevronRight,
  Download,
  Filter,
  Search,
  Plus,
  Receipt,
  Wallet,
  FileSpreadsheet,
  PieChart,
  Settings,
  HelpCircle,
  Bell,
  ChevronDown,
  Send,
  Banknote,
  ShoppingCart,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  CircleDollarSign,
  CreditCard as CardIcon,
  Package,
  Calculator,
  BookOpen,
  Landmark,
  X,
  Sparkles,
  MessageSquare,
  ExternalLink,
  ChevronLeft,
  Home,
  Briefcase,
  Car,
  FileCheck,
  FolderOpen,
  Grid3X3,
  List,
  LayoutDashboard,
  Star,
  Bookmark,
  MoreHorizontal,
  Upload,
  Paperclip,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Printer,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Percent,
  Tag,
  Layers,
  GitBranch,
  Database,
  Shield,
  Lock,
  Key,
  UserPlus,
  UserCheck,
  UsersRound,
  Building2,
  Factory,
  Store,
  Globe,
  Link as LinkIcon,
  Zap,
  Activity,
  Target,
  Award,
  TrendingUp as Growth,
  RotateCcw,
  History,
  Archive
} from 'lucide-react';
// ============================================================================
// GENERIC INTEGRATION PAGE (Original)
// ============================================================================

// Integration metadata
const INTEGRATION_CONFIG: Record<string, {
  name: string;
  color: string;
  bgColor: string;
  icon: string;
  dataTypes: string[];
}> = {
  quickbooks: {
    name: 'QuickBooks',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: '/logos/quickbooks.svg',
    dataTypes: ['invoices', 'expenses', 'customers', 'vendors', 'payments']
  },
  salesforce: {
    name: 'Salesforce',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: '/logos/salesforce.svg',
    dataTypes: ['leads', 'opportunities', 'contacts', 'accounts']
  },
  hubspot: {
    name: 'HubSpot',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: '/logos/hubspot.svg',
    dataTypes: ['contacts', 'deals', 'companies', 'tickets']
  },
  slack: {
    name: 'Slack',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: '/logos/slack.svg',
    // Live API data types
    dataTypes: ['channels', 'messages', 'users', 'files']
  },
  google: {
    name: 'Google Workspace',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: '/logos/google.svg',
    // Live API data types
    dataTypes: ['gmail', 'calendar', 'drive_files', 'contacts']
  },
  microsoft: {
    name: 'Microsoft 365',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: '/logos/microsoft.svg',
    // Live API data types
    dataTypes: ['mail', 'calendar', 'onedrive', 'contacts']
  }
};

interface IntegrationData {
  cid: string;
  data_type: string;
  data: {
    records?: Array<Record<string, unknown>>;
    record_count?: number;
    synced_at?: string;
    [key: string]: unknown;
  };
  uploaded_at: string;
}

interface SyncResult {
  success: boolean;
  integration: string;
  wallet_address: string;
  data_count: number;
  data: IntegrationData[];
}

export default function IntegrationToolPage() {
  const params = useParams();
  const integration = params.integration as string;
  const { authenticated, ready } = usePrivy();
  const { address } = useWalletSync();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [data, setData] = useState<IntegrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const config = INTEGRATION_CONFIG[integration] || {
    name: integration?.charAt(0).toUpperCase() + integration?.slice(1) || 'Integration',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    icon: '',
    dataTypes: []
  };

  // Cache key for localStorage
  const getCacheKey = useCallback(() => {
    return `varity_integration_${integration}_${address?.toLowerCase()}`;
  }, [integration, address]);

  // Save data to localStorage cache
  const saveToCache = useCallback((integrationData: IntegrationData[], syncTime: string | null) => {
    if (!address || !integration) return;
    try {
      const cacheData = {
        data: integrationData,
        lastSync: syncTime,
        cachedAt: new Date().toISOString()
      };
      localStorage.setItem(getCacheKey(), JSON.stringify(cacheData));
    } catch (e) {
      logger.warn('Failed to cache integration data', e);
    }
  }, [address, integration, getCacheKey]);

  // Load data from localStorage cache
  const loadFromCache = useCallback(() => {
    if (!address || !integration) return null;
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const cachedAt = new Date(cacheData.cachedAt);
      const now = new Date();
      const cacheAgeMinutes = (now.getTime() - cachedAt.getTime()) / (1000 * 60);

      // Cache valid for 15 minutes - Fix Dec 29, 2025 (data staleness)
      if (cacheAgeMinutes < 15 && cacheData.data?.length > 0) {
        return cacheData;
      }
      return null;
    } catch (e) {
      logger.warn('Failed to load cached integration data', e);
      return null;
    }
  }, [address, integration, getCacheKey]);

  // Fetch data using live API - CONCERN #1 (page display)
  // Direct calls to backend OAuth endpoints - NO data pipeline
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!address || !integration) return;

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        setData(cached.data);
        setLastSync(cached.lastSync);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      logger.debug(`Fetching live data for ${integration}`);

      // Fetch live data directly from OAuth API endpoints
      const result = await fetchLiveIntegrationData(integration, address);

      if (result.success && result.data.length > 0) {
        // Data is already in IntegrationData format from live-api-fetcher
        setData(result.data as IntegrationData[]);
        setLastSync(result.lastSync);

        // Save to cache
        saveToCache(result.data as IntegrationData[], result.lastSync);

        logger.debug(`${integration}: Loaded ${result.data.length} data types via live API`);
      } else if (result.error) {
        logger.warn(`${integration} live API error: ${result.error}`);
        setError(result.error);
      } else {
        logger.debug(`${integration}: No data returned from live API`);
        setData([]);
      }
    } catch (err) {
      logger.error('Error fetching integration data', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [address, integration, config.dataTypes, loadFromCache, saveToCache]);

  // Sync data from external service
  const syncData = async () => {
    if (!address || !integration) return;

    setSyncing(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(
        `${apiBase}/api/v1/integrations/${integration}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_address: address, force: true })
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Sync failed');
      }

      // Force refresh data after sync (bypass cache)
      await fetchData(true);
      setLastSync(new Date().toISOString());
    } catch (err) {
      logger.error('Sync error', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Force refresh data (bypass cache)
  const refreshData = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (authenticated && address && integration) {
      fetchData();
    }
  }, [authenticated, address, integration, fetchData]);

  // Get records for a specific data type
  const getRecordsForType = (dataType: string): Array<Record<string, unknown>> => {
    const typeData = data.find(d => d.data_type === dataType);
    return typeData?.data?.records || [];
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    const invoices = getRecordsForType('invoices');
    const expenses = getRecordsForType('expenses');
    const customers = getRecordsForType('customers');
    const payments = getRecordsForType('payments');

    const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.total_amount) || 0), 0);
    const outstandingBalance = invoices
      .filter(inv => inv.status === 'outstanding')
      .reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
    const totalPayments = payments.reduce((sum, pay) => sum + (Number(pay.total_amount) || 0), 0);

    return {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      outstandingBalance,
      totalPayments,
      invoiceCount: invoices.length,
      customerCount: customers.length,
      expenseCount: expenses.length
    };
  };

  const stats = getSummaryStats();

  // Filter records by search query
  const filterRecords = (records: Array<Record<string, unknown>>) => {
    if (!searchQuery) return records;
    const query = searchQuery.toLowerCase();
    return records.filter(record =>
      Object.values(record).some(value =>
        String(value).toLowerCase().includes(query)
      )
    );
  };

  // Render loading state
  if (!ready) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  // Render auth required state
  if (!authenticated || !address) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please sign in to view your {config.name} data.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Render simplified QuickBooks MVP UI
  if (integration === 'quickbooks') {
    // Transform data into format expected by QuickBooksPage
    // Backend stores: { data_type: "invoices", data: { records: [...] } }
    // Frontend expects: { invoices: [...], expenses: [...] }
    const quickbooksData = (data || []).reduce((acc, item) => {
      if (item && item.data_type) {
        // Extract records array from data object
        acc[item.data_type] = item.data?.records || item.data || [];
      }
      return acc;
    }, {} as Record<string, any>);

    return (
      <Layout>
        <IntegrationErrorBoundary integrationName="quickbooks" onRetry={refreshData}>
          <QuickBooksPage
            walletAddress={address}
            data={Object.keys(quickbooksData).length > 0 ? quickbooksData : null}
            onRefresh={syncData}
          />
        </IntegrationErrorBoundary>
      </Layout>
    );
  }

  // Render HubSpot CRM native UI for HubSpot integration
  if (integration === 'hubspot') {
    // HubSpot CRUD handlers
    const hubspotApiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/hubspot`;

    const handleCreateContact = async () => {
      alert('Create contact functionality coming soon. You can create contacts directly in HubSpot for now.');
    };

    const handleEditContact = async (contact: any) => {
      try {
        const response = await fetch(`${hubspotApiUrl}/contacts/${contact.id}?wallet_address=${address}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact)
        });
        if (!response.ok) throw new Error('Failed to update contact');
        refreshData();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    };

    const handleDeleteContact = async (contactId: string) => {
      if (!confirm('Are you sure you want to delete this contact?')) return;
      try {
        const response = await fetch(`${hubspotApiUrl}/contacts/${contactId}?wallet_address=${address}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete contact');
        refreshData();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    };

    const handleCreateCompany = async () => {
      alert('Create company functionality coming soon. You can create companies directly in HubSpot for now.');
    };

    const handleEditCompany = async (company: any) => {
      try {
        const response = await fetch(`${hubspotApiUrl}/companies/${company.id}?wallet_address=${address}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(company)
        });
        if (!response.ok) throw new Error('Failed to update company');
        refreshData();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    };

    const handleDeleteCompany = async (companyId: string) => {
      if (!confirm('Are you sure you want to delete this company?')) return;
      try {
        const response = await fetch(`${hubspotApiUrl}/companies/${companyId}?wallet_address=${address}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete company');
        refreshData();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    };

    const handleCreateDeal = async () => {
      alert('Create deal functionality coming soon. You can create deals directly in HubSpot for now.');
    };

    const handleEditDeal = async (deal: any) => {
      try {
        const response = await fetch(`${hubspotApiUrl}/deals/${deal.id}?wallet_address=${address}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deal)
        });
        if (!response.ok) throw new Error('Failed to update deal');
        refreshData();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    };

    const handleDeleteDeal = async (dealId: string) => {
      if (!confirm('Are you sure you want to delete this deal?')) return;
      try {
        const response = await fetch(`${hubspotApiUrl}/deals/${dealId}?wallet_address=${address}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete deal');
        refreshData();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    };

    const handleUpdateDealStage = async (dealId: string, newStage: string) => {
      try {
        const response = await fetch(`${hubspotApiUrl}/deals/${dealId}?wallet_address=${address}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealstage: newStage })
        });
        if (!response.ok) throw new Error('Failed to update deal stage');
        refreshData();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    };

    const handleCreateTicket = async () => {
      alert('Create ticket functionality coming soon. You can create tickets directly in HubSpot for now.');
    };

    const handleEditTicket = async (ticket: any) => {
      try {
        const response = await fetch(`${hubspotApiUrl}/tickets/${ticket.id}?wallet_address=${address}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ticket)
        });
        if (!response.ok) throw new Error('Failed to update ticket');
        refreshData();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    };

    const handleDeleteTicket = async (ticketId: string) => {
      if (!confirm('Are you sure you want to delete this ticket?')) return;
      try {
        const response = await fetch(`${hubspotApiUrl}/tickets/${ticketId}?wallet_address=${address}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete ticket');
        refreshData();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    };

    return (
      <Layout>
        <IntegrationErrorBoundary integrationName="hubspot" onRetry={refreshData}>
          <HubSpotPage
            walletAddress={address}
            data={data}
            loading={loading}
            syncing={syncing}
            error={error}
            lastSync={lastSync}
            onSync={syncData}
            onRefresh={refreshData}
            onCreateContact={handleCreateContact}
            onEditContact={handleEditContact}
            onDeleteContact={handleDeleteContact}
            onCreateCompany={handleCreateCompany}
            onEditCompany={handleEditCompany}
            onDeleteCompany={handleDeleteCompany}
            onCreateDeal={handleCreateDeal}
            onEditDeal={handleEditDeal}
            onDeleteDeal={handleDeleteDeal}
            onUpdateDealStage={handleUpdateDealStage}
            onCreateTicket={handleCreateTicket}
            onEditTicket={handleEditTicket}
            onDeleteTicket={handleDeleteTicket}
          />
        </IntegrationErrorBoundary>
      </Layout>
    );
  }

  // Render Salesforce CRM native UI for Salesforce integration
  if (integration === 'salesforce') {
    // Transform data into format expected by SalesforcePage
    const salesforceData = data.reduce((acc, item) => {
      acc[item.data_type] = item.data;
      return acc;
    }, {} as Record<string, any>);

    return (
      <Layout>
        <IntegrationErrorBoundary integrationName="salesforce" onRetry={refreshData}>
          <SalesforcePage
            walletAddress={address}
            data={salesforceData}
            onRefresh={refreshData}
          />
        </IntegrationErrorBoundary>
      </Layout>
    );
  }

  // Render Slack-native UI for Slack integration
  if (integration === 'slack') {
    // Transform data into format expected by SlackPage
    // MCP data fetcher returns data with routing: channels=live, messages=hybrid, users=rag
    // SlackWorkspaceData expects: { workspace?, channels?, users?, messages? }
    const slackData = data.reduce((acc, item) => {
      // Extract records from the data structure
      const records = item.data?.records ?? item.data;
      acc[item.data_type] = {
        data: records,
        source: item.data?.source, // Track if data came from live API
      };
      return acc;
    }, {} as Record<string, unknown>);

    return (
      <Layout>
        <IntegrationErrorBoundary integrationName="slack" onRetry={refreshData}>
          <SlackPage
            walletAddress={address}
            data={slackData as import('@/types/slack').SlackWorkspaceData}
          />
        </IntegrationErrorBoundary>
      </Layout>
    );
  }

  // Render Google Workspace native UI for Google integration
  if (integration === 'google' || integration === 'google_workspace' || integration === 'googleworkspace') {
    // Transform data into format expected by GoogleWorkspacePage
    // MCP data fetcher returns: { data_type: "gmail", data: { records: [...], source: "live" } }
    // Frontend expects: { gmail: { messages: [...] } }
    // NOTE: drive_files data may come in chunks, so we AGGREGATE them
    const dataTypeToPropertyMap: Record<string, string> = {
      'gmail': 'messages',
      'calendar': 'events',
      'drive_files': 'files',  // Updated to match MCP routing rules
      'drive': 'files',        // Keep backward compatibility
      'contacts': 'contacts'
    };

    const googleData = data.reduce((acc, item) => {
      // Normalize data_type name for property lookup
      const normalizedType = item.data_type === 'drive_files' ? 'drive' : item.data_type;
      const propertyName = dataTypeToPropertyMap[item.data_type] || 'records';
      const rawRecords = item.data?.records ?? item.data?.[propertyName];
      const newRecords: unknown[] = Array.isArray(rawRecords) ? rawRecords : [];

      // Use 'drive' as the key for backward compatibility with GoogleWorkspacePage
      const dataKey = item.data_type === 'drive_files' ? 'drive' : item.data_type;

      // AGGREGATE records when multiple chunks have the same data_type (e.g., Drive quarterly chunks)
      const existingRecords = acc[dataKey]?.[propertyName];
      if (Array.isArray(existingRecords)) {
        acc[dataKey][propertyName] = [...existingRecords, ...newRecords];
      } else {
        acc[dataKey] = {
          [propertyName]: newRecords,
          source: item.data?.source, // Track if data came from live API
        };
      }
      return acc;
    }, {} as Record<string, any>);

    return (
      <Layout>
        <IntegrationErrorBoundary integrationName="google" onRetry={refreshData}>
          <GoogleWorkspacePage
            walletAddress={address}
            data={googleData}
            onSync={syncData}
            onRefresh={refreshData}
            loading={loading}
          />
        </IntegrationErrorBoundary>
      </Layout>
    );
  }

  // Render Microsoft 365 native UI for Microsoft integration
  if (integration === 'microsoft' || integration === 'microsoft365') {
    // Transform data into format expected by Microsoft365Page
    // MCP data fetcher returns: { data_type: "mail", data: { records: [...], source: "live" } }
    // Frontend expects: { mail: { messages: [...] } }
    // NOTE: OneDrive data may come in multiple chunks, so we AGGREGATE them
    const msDataTypeToPropertyMap: Record<string, string> = {
      'mail': 'messages',
      'calendar': 'events',
      'onedrive': 'files',
      'contacts': 'contacts'
    };

    const microsoftData = data.reduce((acc, item) => {
      const propertyName = msDataTypeToPropertyMap[item.data_type] || 'records';
      const rawRecords = item.data?.records ?? item.data?.[propertyName];
      const newRecords: unknown[] = Array.isArray(rawRecords) ? rawRecords : [];

      // AGGREGATE records when multiple chunks have the same data_type
      const existingRecords = acc[item.data_type]?.[propertyName];
      if (Array.isArray(existingRecords)) {
        acc[item.data_type][propertyName] = [...existingRecords, ...newRecords];
      } else {
        acc[item.data_type] = {
          [propertyName]: newRecords,
          source: item.data?.source, // Track if data came from live API
        };
      }
      return acc;
    }, {} as Record<string, any>);

    return (
      <Layout>
        <IntegrationErrorBoundary integrationName="microsoft" onRetry={refreshData}>
          <Microsoft365Page
            walletAddress={address}
            data={microsoftData}
            onSync={syncData}
            onRefresh={refreshData}
            loading={loading}
          />
        </IntegrationErrorBoundary>
      </Layout>
    );
  }

  // Calculate sync health data for the SyncHealthCard
  const getSyncHealthData = (): SyncHealthData => {
    // Calculate total records across all data types
    const totalRecords = data.reduce((sum, item) => {
      const records = item.data?.records || [];
      return sum + (Array.isArray(records) ? records.length : 0);
    }, 0);

    // Build data types breakdown
    const dataTypesBreakdown = config.dataTypes.map(type => ({
      type,
      count: getRecordsForType(type).length,
      lastUpdated: lastSync || undefined,
    })).filter(dt => dt.count > 0);

    // Determine status
    let status: IntegrationStatus = 'connected';
    if (error) status = 'error';
    else if (syncing) status = 'syncing';
    else if (data.length === 0) status = 'attention';

    return {
      status,
      lastSync,
      recordsCount: totalRecords,
      errorMessage: error,
      dataTypes: dataTypesBreakdown,
    };
  };

  // Build tabs configuration
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sync-history', label: 'Sync History' },
    ...config.dataTypes.map(type => ({
      id: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      count: getRecordsForType(type).length,
    })),
    { id: 'settings', label: 'Settings' },
  ];

  // Generic integration UI for all other integrations
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* New Header Component */}
        <IntegrationPageHeader
          integrationName={config.name}
          integrationLogo={integration}
          status={error ? 'error' : data.length > 0 ? 'connected' : 'attention'}
          lastSync={lastSync}
          syncing={syncing}
          onSync={syncData}
          onExport={() => {
            // TODO: Implement export functionality
            toast.info('Export', 'Export functionality coming soon');
          }}
        />

        {/* Tab Navigation */}
        <IntegrationTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="px-4 sm:px-6 py-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-900 font-medium">Error</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Yet</h3>
              <p className="text-gray-600 mb-6">
                Click "Sync Data" to fetch your {config.name} data and store it securely on Filecoin.
              </p>
              <button
                onClick={syncData}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          ) : activeTab === 'overview' ? (
            /* Overview Tab */
            <div className="space-y-6">
              {/* Sync Health Card - New! */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SyncHealthCard
                    integrationName={config.name}
                    health={getSyncHealthData()}
                    onSyncNow={syncData}
                    syncing={syncing}
                  />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={syncData}
                      disabled={syncing}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-5 h-5 text-blue-600 ${syncing ? 'animate-spin' : ''}`} />
                      <span className="text-sm font-medium text-gray-700">
                        {syncing ? 'Syncing...' : 'Sync All Data'}
                      </span>
                    </button>
                    <button
                      onClick={() => toast.info('Export', 'Export functionality coming soon')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
                    >
                      <Download className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Export Data</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
                    >
                      <Settings className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Settings</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Total Revenue</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Total Expenses</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Outstanding</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats.outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Net Income</span>
                  </div>
                  <p className={`text-2xl font-bold ${stats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(stats.netIncome).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Invoices</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.invoiceCount}</p>
                    </div>
                    <FileText className="w-10 h-10 text-gray-300" />
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Customers</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.customerCount}</p>
                    </div>
                    <Users className="w-10 h-10 text-gray-300" />
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Expenses</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.expenseCount}</p>
                    </div>
                    <CreditCard className="w-10 h-10 text-gray-300" />
                  </div>
                </div>
              </div>

              {/* Data Storage Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Decentralized Storage Active</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Your {config.name} data is encrypted and stored on Filecoin/IPFS.
                      Even if {config.name}&apos;s servers go down, your data remains accessible through this dashboard.
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {data.length} files stored
                      </span>
                      <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        AES-256 encrypted
                      </span>
                      <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Wallet-based access control
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Data Type Tab */
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {activeTab === 'invoices' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </>
                        )}
                        {activeTab === 'expenses' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          </>
                        )}
                        {activeTab === 'customers' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                          </>
                        )}
                        {activeTab === 'vendors' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                          </>
                        )}
                        {activeTab === 'payments' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filterRecords(getRecordsForType(activeTab)).map((record, index) => (
                        <tr key={record.id as string || index} className="hover:bg-gray-50">
                          {activeTab === 'invoices' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {String(record.doc_number || record.id)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {String(record.customer_name || '-')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                ${Number(record.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {record.due_date ? new Date(String(record.due_date)).toLocaleDateString() : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  record.status === 'paid'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {String(record.status || 'pending')}
                                </span>
                              </td>
                            </>
                          )}
                          {activeTab === 'expenses' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {record.txn_date ? new Date(String(record.txn_date)).toLocaleDateString() : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {String(record.vendor_name || '-')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                ${Number(record.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {String(record.payment_type || '-')}
                              </td>
                            </>
                          )}
                          {activeTab === 'customers' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    <Building className="w-4 h-4 text-gray-500" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {String(record.display_name || record.company_name || '-')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {String(record.email || '-')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {String(record.phone || '-')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                ${Number(record.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </>
                          )}
                          {activeTab === 'vendors' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {String(record.display_name || record.company_name || '-')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {String(record.email || '-')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                ${Number(record.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </>
                          )}
                          {activeTab === 'payments' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {record.txn_date ? new Date(String(record.txn_date)).toLocaleDateString() : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {String(record.customer_name || '-')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                ${Number(record.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {String(record.payment_method || '-')}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filterRecords(getRecordsForType(activeTab)).length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No {activeTab} found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
