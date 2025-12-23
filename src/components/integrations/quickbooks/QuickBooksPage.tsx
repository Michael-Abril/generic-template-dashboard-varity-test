"use client";

import React, { useState, useMemo } from 'react';
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
  Plus
} from 'lucide-react';

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
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-200 transition-all cursor-pointer"
          onClick={() => setActiveTab('invoices')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900">Total Income</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalIncome)}</p>
          <p className="text-sm text-gray-600 mt-2">{stats.paidInvoices} paid invoices</p>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-red-200 transition-all cursor-pointer"
          onClick={() => setActiveTab('expenses')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-bold text-gray-900">Total Expenses</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalExpenses)}</p>
          <p className="text-sm text-gray-600 mt-2">{stats.expenseCount} expenses</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900">Net Income</h3>
          </div>
          <p className={`text-3xl font-bold ${stats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(stats.netIncome))}
            {stats.netIncome < 0 && <span className="text-lg ml-1">(Loss)</span>}
          </p>
          <p className="text-sm text-gray-600 mt-2">Income minus expenses</p>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-200 transition-all cursor-pointer"
          onClick={() => setActiveTab('invoices')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900">Invoices</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.invoiceCount}</p>
          <div className="flex gap-2 mt-2 text-sm">
            <span className="text-green-600">{stats.paidInvoices} paid</span>
            <span className="text-gray-400">•</span>
            <span className="text-blue-600">{stats.openInvoices} open</span>
            {stats.overdueInvoices > 0 && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-red-600">{stats.overdueInvoices} overdue</span>
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

  // Render Invoices Tab
  const renderInvoices = () => {
    const invoices = data?.invoices || [];
    const filteredInvoices = searchQuery.trim()
      ? invoices.filter((inv: any) =>
          (inv.customer_name || inv.CustomerRef?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (inv.doc_number || inv.DocNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : invoices;

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
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">All Invoices ({filteredInvoices.length})</h2>
          </div>
          {filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Invoice #</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Due Date</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Balance</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((invoice: any, index: number) => {
                    const amount = invoice.total_amount ?? invoice.TotalAmt ?? 0;
                    const balance = invoice.balance ?? invoice.Balance ?? 0;
                    const dueDate = invoice.due_date || invoice.DueDate;
                    const isPaid = invoice.status === 'paid' || balance === 0;
                    const isOverdue = !isPaid && dueDate && new Date(dueDate) < new Date();

                    return (
                      <tr key={index} className="hover:bg-gray-50">
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
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            isPaid
                              ? 'bg-green-100 text-green-700'
                              : isOverdue
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Open'}
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
                {invoices.length === 0 ? 'Sync your QuickBooks data to see invoices' : 'Try a different search term'}
              </p>
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
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Vendor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Payment Method</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExpenses.map((expense: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
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
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Company</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Balance</th>
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
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Company</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Balance</th>
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
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">QuickBooks</h1>
              </div>

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
    </div>
  );
}
