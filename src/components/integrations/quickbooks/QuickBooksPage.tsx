"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  RefreshCw,
  Search,
  Settings,
  Bell,
  Home,
  FileText,
  Receipt,
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CloudDownload,
  X,
  Plus,
  ChevronDown,
  CheckCircle2,
  Clock,
  Calendar,
  Mail,
  Phone,
  CreditCard,
  ExternalLink
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://generic-template-dashboard-production.up.railway.app';

interface QuickBooksPageProps {
  walletAddress: string;
  data: {
    invoices?: any[];
    expenses?: any[];
    customers?: any[];
    vendors?: any[];
  } | null;
  onRefresh?: () => void;
}

type TabType = 'home' | 'invoices' | 'expenses' | 'customers' | 'vendors';

const TABS = [
  { id: 'home' as TabType, label: 'Overview', icon: Home },
  { id: 'invoices' as TabType, label: 'Invoices', icon: FileText },
  { id: 'expenses' as TabType, label: 'Expenses', icon: Receipt },
  { id: 'customers' as TabType, label: 'Customers', icon: Users },
  { id: 'vendors' as TabType, label: 'Vendors', icon: Building2 },
];

export default function QuickBooksPage({ walletAddress, data, onRefresh }: QuickBooksPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'open' | 'overdue'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [realmId, setRealmId] = useState<string | null>(null);

  // Fetch realm_id for native QuickBooks link
  useEffect(() => {
    const fetchRealmId = async () => {
      if (!walletAddress) return;
      try {
        const response = await fetch(
          `${API_URL}/api/v1/oauth/credentials/quickbooks?wallet_address=${walletAddress}`
        );
        const result = await response.json();
        if (result.success && result.realm_id) {
          setRealmId(result.realm_id);
        }
      } catch (err) {
        // Silently fail - link will fallback to generic QuickBooks URL
      }
    };
    fetchRealmId();
  }, [walletAddress]);

  // Calculate stats from real data
  const stats = useMemo(() => {
    const invoices = data?.invoices || [];
    const expenses = data?.expenses || [];
    const customers = data?.customers || [];
    const vendors = data?.vendors || [];

    const now = new Date();
    let totalIncome = 0;
    let openInvoices = 0;
    let overdueInvoices = 0;
    let paidInvoices = 0;
    let openAmount = 0;
    let overdueAmount = 0;

    invoices.forEach((inv: any) => {
      const balance = inv.balance ?? inv.Balance ?? 0;
      const amount = inv.total_amount ?? inv.TotalAmt ?? 0;
      const dueDate = inv.due_date || inv.DueDate;
      const backendStatus = inv.status;

      if (backendStatus === 'paid' || (balance === 0 && amount > 0)) {
        paidInvoices++;
        totalIncome += amount;
      } else if (dueDate && new Date(dueDate) < now) {
        overdueInvoices++;
        overdueAmount += balance;
      } else {
        openInvoices++;
        openAmount += balance;
      }
    });

    const totalExpenses = expenses.reduce((sum: number, exp: any) => {
      return sum + (exp.total_amount ?? exp.TotalAmt ?? 0);
    }, 0);

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      invoiceCount: invoices.length,
      expenseCount: expenses.length,
      customerCount: customers.length,
      vendorCount: vendors.length,
      openInvoices,
      overdueInvoices,
      paidInvoices,
      openAmount,
      overdueAmount,
    };
  }, [data]);

  const hasData = data && (
    (data.invoices?.length ?? 0) > 0 ||
    (data.expenses?.length ?? 0) > 0 ||
    (data.customers?.length ?? 0) > 0 ||
    (data.vendors?.length ?? 0) > 0
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onRefresh?.();
    } finally {
      setSyncing(false);
    }
  };

  const handleGlobalSearch = () => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();

    if (data?.invoices?.some((inv: any) =>
      (inv.customer_name || inv.CustomerRef?.name || '').toLowerCase().includes(query) ||
      (inv.doc_number || inv.DocNumber || '').toLowerCase().includes(query)
    )) {
      setActiveTab('invoices');
      return;
    }

    if (data?.expenses?.some((exp: any) =>
      (exp.vendor_name || exp.EntityRef?.name || '').toLowerCase().includes(query)
    )) {
      setActiveTab('expenses');
      return;
    }

    if (data?.customers?.some((cust: any) =>
      (cust.display_name || cust.DisplayName || '').toLowerCase().includes(query)
    )) {
      setActiveTab('customers');
      return;
    }

    setActiveTab('invoices');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Render Overview/Home Tab
  const renderHome = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-white rounded-lg border border-gray-200 p-5 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
          onClick={() => setActiveTab('invoices')}
        >
          <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500 group-hover:bg-emerald-600 transition-colors" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Total Income</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalIncome)}</p>
          <p className="text-sm text-gray-500 mt-2">{stats.paidInvoices} paid invoices</p>
        </div>

        <div
          className="bg-white rounded-lg border border-gray-200 p-5 hover:border-red-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
          onClick={() => setActiveTab('expenses')}
        >
          <div className="absolute left-0 top-0 w-1 h-full bg-red-500 group-hover:bg-red-600 transition-colors" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-md">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Total Expenses</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalExpenses)}</p>
          <p className="text-sm text-gray-500 mt-2">{stats.expenseCount} expenses</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute left-0 top-0 w-1 h-full bg-blue-500 group-hover:bg-blue-600 transition-colors" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-md">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Net Income</h3>
          </div>
          <p className={`text-2xl font-bold ${stats.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(stats.netIncome))}
            {stats.netIncome < 0 && <span className="text-base ml-1">(Loss)</span>}
          </p>
          <p className="text-sm text-gray-500 mt-2">Income minus expenses</p>
        </div>

        <div
          className="bg-white rounded-lg border border-gray-200 p-5 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
          onClick={() => setActiveTab('invoices')}
        >
          <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500 group-hover:bg-indigo-600 transition-colors" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-md">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Invoices</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.invoiceCount}</p>
          <div className="flex gap-2 mt-2 text-sm">
            <span className="text-emerald-600 font-medium">{stats.paidInvoices} paid</span>
            <span className="text-gray-300">•</span>
            <span className="text-blue-600 font-medium">{stats.openInvoices} open</span>
            {stats.overdueInvoices > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-red-600 font-medium">{stats.overdueInvoices} overdue</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {stats.overdueInvoices > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {stats.overdueInvoices} Overdue Invoice{stats.overdueInvoices > 1 ? 's' : ''} ({formatCurrency(stats.overdueAmount)})
              </h3>
              <p className="text-gray-600 mt-1">Follow up with customers to ensure timely payment.</p>
              <button
                onClick={() => setActiveTab('invoices')}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                View Overdue Invoices
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setActiveTab('customers')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.customerCount}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setActiveTab('vendors')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Vendors</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.vendorCount}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recent Invoices</h2>
          <button
            onClick={() => setActiveTab('invoices')}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            View All →
          </button>
        </div>
        {(data?.invoices?.length ?? 0) > 0 ? (
          <div className="divide-y divide-gray-100">
            {data?.invoices?.slice(0, 5).map((invoice: any, index: number) => {
              const amount = invoice.total_amount ?? invoice.TotalAmt ?? 0;
              const balance = invoice.balance ?? invoice.Balance ?? 0;
              const isPaid = invoice.status === 'paid' || balance === 0;

              return (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {invoice.customer_name || invoice.CustomerRef?.name || 'Unknown Customer'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Invoice #{invoice.doc_number || invoice.DocNumber || 'N/A'} • {formatDate(invoice.txn_date || invoice.TxnDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(amount)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {isPaid ? 'Paid' : 'Outstanding'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No invoices yet</p>
            <p className="text-sm text-gray-500 mt-1">Sync your QuickBooks data to see invoices</p>
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recent Expenses</h2>
          <button
            onClick={() => setActiveTab('expenses')}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            View All →
          </button>
        </div>
        {(data?.expenses?.length ?? 0) > 0 ? (
          <div className="divide-y divide-gray-100">
            {data?.expenses?.slice(0, 5).map((expense: any, index: number) => {
              const amount = expense.total_amount ?? expense.TotalAmt ?? 0;

              return (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {expense.vendor_name || expense.EntityRef?.name || 'Unknown Vendor'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {expense.account || expense.AccountRef?.name || 'Uncategorized'} • {formatDate(expense.txn_date || expense.TxnDate)}
                      </p>
                    </div>
                    <p className="font-bold text-red-600">-{formatCurrency(amount)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No expenses yet</p>
            <p className="text-sm text-gray-500 mt-1">Sync your QuickBooks data to see expenses</p>
          </div>
        )}
      </div>
    </div>
  );

  // Helper to get invoice status
  const getInvoiceStatus = (invoice: any): 'paid' | 'open' | 'overdue' => {
    const balance = invoice.balance ?? invoice.Balance ?? 0;
    const amount = invoice.total_amount ?? invoice.TotalAmt ?? 0;
    const dueDate = invoice.due_date || invoice.DueDate;
    const isPaid = invoice.status === 'paid' || (balance === 0 && amount > 0);
    if (isPaid) return 'paid';
    if (dueDate && new Date(dueDate) < new Date()) return 'overdue';
    return 'open';
  };

  // Render Invoices Tab
  const renderInvoices = () => {
    const invoices = data?.invoices || [];

    // Apply both search and status filter
    const filteredInvoices = invoices.filter((inv: any) => {
      // Search filter
      const matchesSearch = !searchQuery.trim() ||
        (inv.customer_name || inv.CustomerRef?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.doc_number || inv.DocNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const invoiceStatus = getInvoiceStatus(inv);
      const matchesStatus = statusFilter === 'all' || invoiceStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    const statusOptions = [
      { id: 'all' as const, label: 'All', count: invoices.length, color: 'gray' },
      { id: 'paid' as const, label: 'Paid', count: stats.paidInvoices, color: 'green' },
      { id: 'open' as const, label: 'Open', count: stats.openInvoices, color: 'blue' },
      { id: 'overdue' as const, label: 'Overdue', count: stats.overdueInvoices, color: 'red' },
    ];

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Invoiced</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount ?? inv.TotalAmt ?? 0), 0))}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Open</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(stats.openAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Overdue</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(stats.overdueAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Paid Count</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.paidInvoices}</p>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-bold text-gray-900">Invoices ({filteredInvoices.length})</h2>

            {/* Status Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <span>Status: {statusOptions.find(s => s.id === statusFilter)?.label}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showStatusDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowStatusDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                    {statusOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setStatusFilter(option.id);
                          setShowStatusDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                          statusFilter === option.id ? 'bg-gray-50 font-medium' : ''
                        }`}
                      >
                        <span className="text-gray-900">{option.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          option.color === 'green' ? 'bg-green-100 text-green-700' :
                          option.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                          option.color === 'red' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {option.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice #</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Balance</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((invoice: any, index: number) => {
                    const amount = invoice.total_amount ?? invoice.TotalAmt ?? 0;
                    const balance = invoice.balance ?? invoice.Balance ?? 0;
                    const dueDate = invoice.due_date || invoice.DueDate;
                    const status = getInvoiceStatus(invoice);

                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {invoice.doc_number || invoice.DocNumber || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          {invoice.customer_name || invoice.CustomerRef?.name || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {formatDate(invoice.txn_date || invoice.TxnDate)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {formatDate(dueDate)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(amount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(balance)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-md border ${
                            status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status === 'overdue'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Open'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No invoices found</p>
              <p className="text-sm text-gray-500 mt-1">
                {invoices.length === 0
                  ? 'Sync your QuickBooks data to see invoices'
                  : statusFilter !== 'all'
                    ? `No ${statusFilter} invoices match your search`
                    : 'Try a different search term'}
              </p>
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Clear status filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Expenses Tab
  const renderExpenses = () => {
    const expenses = data?.expenses || [];
    const filteredExpenses = searchQuery.trim()
      ? expenses.filter((exp: any) =>
          (exp.vendor_name || exp.EntityRef?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (exp.account || exp.AccountRef?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : expenses;

    const totalAmount = filteredExpenses.reduce((sum: number, exp: any) => sum + (exp.total_amount ?? exp.TotalAmt ?? 0), 0);

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="p-4 bg-red-100 rounded-xl">
              <Receipt className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">All Expenses ({filteredExpenses.length})</h2>
          </div>
          {filteredExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Method</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExpenses.map((expense: any, index: number) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedExpense(expense)}
                    >
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(expense.txn_date || expense.TxnDate)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {expense.vendor_name || expense.EntityRef?.name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {expense.account || expense.AccountRef?.name || 'Uncategorized'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {expense.payment_type || expense.PaymentType || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-red-600">
                        -{formatCurrency(expense.total_amount ?? expense.TotalAmt ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No expenses found</p>
              <p className="text-sm text-gray-500 mt-1">
                {expenses.length === 0 ? 'Sync your QuickBooks data to see expenses' : 'Try a different search term'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Customers Tab
  const renderCustomers = () => {
    const customers = data?.customers || [];
    const filteredCustomers = searchQuery.trim()
      ? customers.filter((cust: any) =>
          (cust.display_name || cust.DisplayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (cust.primary_email || cust.PrimaryEmailAddr?.Address || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : customers;

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{customers.length}</p>
            </div>
            <div className="p-4 bg-orange-100 rounded-xl">
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">All Customers ({filteredCustomers.length})</h2>
          </div>
          {filteredCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCustomers.map((customer: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {customer.display_name || customer.DisplayName || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {customer.primary_email || customer.PrimaryEmailAddr?.Address || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {customer.primary_phone || customer.PrimaryPhone?.FreeFormNumber || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {customer.company_name || customer.CompanyName || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(customer.balance ?? customer.Balance ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No customers found</p>
              <p className="text-sm text-gray-500 mt-1">
                {customers.length === 0 ? 'Sync your QuickBooks data to see customers' : 'Try a different search term'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Vendors Tab
  const renderVendors = () => {
    const vendors = data?.vendors || [];
    const filteredVendors = searchQuery.trim()
      ? vendors.filter((v: any) =>
          (v.display_name || v.DisplayName || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : vendors;

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Vendors</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{vendors.length}</p>
            </div>
            <div className="p-4 bg-indigo-100 rounded-xl">
              <Building2 className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">All Vendors ({filteredVendors.length})</h2>
          </div>
          {filteredVendors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVendors.map((vendor: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {vendor.display_name || vendor.DisplayName || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {vendor.primary_email || vendor.PrimaryEmailAddr?.Address || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {vendor.primary_phone || vendor.PrimaryPhone?.FreeFormNumber || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {vendor.company_name || vendor.CompanyName || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(vendor.balance ?? vendor.Balance ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No vendors found</p>
              <p className="text-sm text-gray-500 mt-1">
                {vendors.length === 0 ? 'Sync your QuickBooks data to see vendors' : 'Try a different search term'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return renderHome();
      case 'invoices':
        return renderInvoices();
      case 'expenses':
        return renderExpenses();
      case 'customers':
        return renderCustomers();
      case 'vendors':
        return renderVendors();
      default:
        return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href={realmId ? `https://app.qbo.intuit.com/app/homepage?companyId=${realmId}` : 'https://app.qbo.intuit.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                title="Open QuickBooks Online"
              >
                <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">QuickBooks</h1>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>

              {/* Search Bar */}
              <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 w-96 border border-gray-200 focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-100 transition-all">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search invoices, expenses, customers..."
                  className="bg-transparent border-none outline-none text-sm w-full text-gray-900 placeholder:text-gray-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGlobalSearch();
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync data from QuickBooks"
              >
                <CloudDownload className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
                <span className="font-medium">{syncing ? 'Syncing...' : 'Sync Data'}</span>
              </button>
              <button
                onClick={() => onRefresh?.()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 ${syncing ? 'animate-spin' : ''}`} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${showNotifications ? 'bg-gray-100' : ''}`}
                  title="Notifications"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {stats.overdueInvoices > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {stats.overdueInvoices}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-gray-100 rounded">
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                    {stats.overdueInvoices > 0 ? (
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">{stats.overdueInvoices} overdue invoice{stats.overdueInvoices > 1 ? 's' : ''}</p>
                            <p className="text-sm text-gray-500">Total: {formatCurrency(stats.overdueAmount)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No new notifications</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                  className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${showSettingsPanel ? 'bg-gray-100' : ''}`}
                  title="Settings"
                >
                  <Settings className="h-5 w-5 text-gray-600" />
                </button>
                {showSettingsPanel && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Settings</h3>
                      <button onClick={() => setShowSettingsPanel(false)} className="p-1 hover:bg-gray-100 rounded">
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => { setShowSettingsPanel(false); window.location.href = '/settings'; }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Account Settings
                      </button>
                      <button
                        onClick={() => { setShowSettingsPanel(false); window.location.href = '/integrations'; }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Manage Integrations
                      </button>
                      <div className="border-t my-1" />
                      <button
                        onClick={() => { setShowSettingsPanel(false); handleSync(); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Re-sync QuickBooks Data
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Tabs */}
          <div className="flex items-center gap-1 mt-4 border-b border-gray-200 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = tab.id === 'invoices' ? stats.invoiceCount
                : tab.id === 'expenses' ? stats.expenseCount
                : tab.id === 'customers' ? stats.customerCount
                : tab.id === 'vendors' ? stats.vendorCount
                : null;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all rounded-t-lg
                    ${isActive
                      ? 'border-green-600 text-green-700 bg-green-50 font-semibold'
                      : 'border-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium'
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-green-600' : ''}`} />
                  <span>{tab.label}</span>
                  {count != null && count > 0 && (
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                      isActive ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* No Data Banner */}
        {!hasData && !syncing && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No Data Synced Yet</h3>
                <p className="text-gray-600 mb-4">
                  Click <strong>"Sync Data"</strong> to fetch your invoices, expenses, customers, and vendors from QuickBooks.
                  Your data will be securely stored and available for AI-powered insights.
                </p>
                <button
                  onClick={handleSync}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CloudDownload className="h-4 w-4" />
                  <span className="font-medium">Sync My QuickBooks Data</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Syncing State */}
        {syncing && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <CloudDownload className="h-8 w-8 text-green-600 animate-pulse mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Syncing data from QuickBooks...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment. Please wait.</p>
            </div>
          </div>
        )}

        {!syncing && renderActiveTab()}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedInvoice(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Invoice #{selectedInvoice.doc_number || selectedInvoice.DocNumber || 'N/A'}
                    </h2>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      getInvoiceStatus(selectedInvoice) === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : getInvoiceStatus(selectedInvoice) === 'overdue'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      {getInvoiceStatus(selectedInvoice) === 'paid' ? 'Paid' :
                       getInvoiceStatus(selectedInvoice) === 'overdue' ? 'Overdue' : 'Open'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Customer Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Customer</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 text-lg">
                      {selectedInvoice.customer_name || selectedInvoice.CustomerRef?.name || 'Unknown Customer'}
                    </p>
                    {(selectedInvoice.customer_email || selectedInvoice.BillEmail?.Address) && (
                      <div className="flex items-center gap-2 mt-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{selectedInvoice.customer_email || selectedInvoice.BillEmail?.Address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Invoice Date</span>
                    </div>
                    <p className="text-gray-900 font-semibold">
                      {formatDate(selectedInvoice.txn_date || selectedInvoice.TxnDate)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Due Date</span>
                    </div>
                    <p className={`font-semibold ${
                      getInvoiceStatus(selectedInvoice) === 'overdue' ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {formatDate(selectedInvoice.due_date || selectedInvoice.DueDate)}
                    </p>
                  </div>
                </div>

                {/* Amount Details */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-200">
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-500">Invoice Amount</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                          {formatCurrency(selectedInvoice.total_amount ?? selectedInvoice.TotalAmt ?? 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-500">Balance Due</td>
                        <td className="px-4 py-3 text-sm font-bold text-right">
                          <span className={
                            (selectedInvoice.balance ?? selectedInvoice.Balance ?? 0) > 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }>
                            {formatCurrency(selectedInvoice.balance ?? selectedInvoice.Balance ?? 0)}
                          </span>
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-500">Payment Status</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {getInvoiceStatus(selectedInvoice) === 'paid' ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-600">Paid in Full</span>
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-600">
                                  {formatCurrency((selectedInvoice.total_amount ?? selectedInvoice.TotalAmt ?? 0) -
                                    (selectedInvoice.balance ?? selectedInvoice.Balance ?? 0))} received
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Memo/Notes */}
                {(selectedInvoice.private_note || selectedInvoice.PrivateNote ||
                  selectedInvoice.customer_memo || selectedInvoice.CustomerMemo?.value) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 text-sm">
                        {selectedInvoice.private_note || selectedInvoice.PrivateNote ||
                         selectedInvoice.customer_memo || selectedInvoice.CustomerMemo?.value}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedExpense(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Receipt className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Expense Details</h2>
                    <span className="text-sm text-gray-500">
                      {formatDate(selectedExpense.txn_date || selectedExpense.TxnDate)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedExpense(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Vendor Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Vendor</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 text-lg">
                      {selectedExpense.vendor_name || selectedExpense.EntityRef?.name || 'Unknown Vendor'}
                    </p>
                  </div>
                </div>

                {/* Expense Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Transaction Date</span>
                    </div>
                    <p className="text-gray-900 font-semibold">
                      {formatDate(selectedExpense.txn_date || selectedExpense.TxnDate)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm font-medium">Payment Method</span>
                    </div>
                    <p className="text-gray-900 font-semibold">
                      {selectedExpense.payment_type || selectedExpense.PaymentType || 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Amount Details */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-200">
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-500">Category</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          {selectedExpense.account || selectedExpense.AccountRef?.name || 'Uncategorized'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-500">Amount</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-lg font-bold text-red-600">
                            -{formatCurrency(selectedExpense.total_amount ?? selectedExpense.TotalAmt ?? 0)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Memo/Notes */}
                {(selectedExpense.private_note || selectedExpense.PrivateNote || selectedExpense.memo || selectedExpense.Memo) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 text-sm">
                        {selectedExpense.private_note || selectedExpense.PrivateNote ||
                         selectedExpense.memo || selectedExpense.Memo}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
