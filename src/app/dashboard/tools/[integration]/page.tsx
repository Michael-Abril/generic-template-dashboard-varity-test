'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletSync } from '@/app/providers';
import { Layout } from '@/components/Layout';
import Link from 'next/link';
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
  Search
} from 'lucide-react';

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
    dataTypes: ['messages', 'channels', 'users']
  },
  google: {
    name: 'Google Workspace',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: '/logos/google.svg',
    dataTypes: ['emails', 'calendar', 'drive']
  },
  microsoft: {
    name: 'Microsoft 365',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: '/logos/microsoft.svg',
    dataTypes: ['emails', 'calendar', 'files']
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

  // Fetch data from Filecoin
  const fetchData = useCallback(async () => {
    if (!address || !integration) return;

    setLoading(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(
        `${apiBase}/api/v1/integrations/${integration}/data?wallet_address=${address}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to fetch data');
      }

      const result: SyncResult = await res.json();
      setData(result.data || []);

      // Get last sync time from the most recent data
      if (result.data && result.data.length > 0) {
        const mostRecent = result.data.reduce((latest, item) => {
          const itemDate = item.data?.synced_at || item.uploaded_at;
          const latestDate = latest.data?.synced_at || latest.uploaded_at;
          return new Date(itemDate) > new Date(latestDate) ? item : latest;
        });
        setLastSync(mostRecent.data?.synced_at || mostRecent.uploaded_at);
      }
    } catch (err) {
      console.error('Error fetching integration data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [address, integration]);

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

      // Refresh data after sync
      await fetchData();
      setLastSync(new Date().toISOString());
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">{config.name}</span>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${config.bgColor} rounded-xl flex items-center justify-center`}>
                <span className={`text-2xl font-bold ${config.color}`}>
                  {config.name.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{config.name}</h1>
                <p className="text-sm text-gray-500">
                  {lastSync
                    ? `Last synced: ${new Date(lastSync).toLocaleString()}`
                    : 'No data synced yet'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={syncData}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Data'}
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

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

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              {config.dataTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap capitalize transition-colors ${
                    activeTab === type
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {type}
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                    {getRecordsForType(type).length}
                  </span>
                </button>
              ))}
            </nav>
          </div>

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
