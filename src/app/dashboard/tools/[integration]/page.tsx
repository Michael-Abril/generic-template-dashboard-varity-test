'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  ExternalLink
} from 'lucide-react';

// ============================================================================
// QUICKBOOKS NATIVE UI COMPONENT
// Replicates the QuickBooks Online experience within the dashboard
// ============================================================================

interface QuickBooksToolPageProps {
  walletAddress: string;
  data: IntegrationData[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSync: string | null;
  onSync: () => void;
  onRefresh: () => void;
}

function QuickBooksToolPage({
  walletAddress,
  data,
  loading,
  syncing,
  error,
  lastSync,
  onSync,
  onRefresh
}: QuickBooksToolPageProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  // Close create menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setCreateMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get records for a specific data type
  const getRecordsForType = (dataType: string): Array<Record<string, unknown>> => {
    const typeData = data.find(d => d.data_type === dataType);
    return typeData?.data?.records || [];
  };

  // Calculate QuickBooks-style stats
  const invoices = getRecordsForType('invoices');
  const expenses = getRecordsForType('expenses');
  const customers = getRecordsForType('customers');
  const vendors = getRecordsForType('vendors');
  const payments = getRecordsForType('payments');

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const overdueInvoices = invoices.filter(inv => {
    if (inv.status === 'paid') return false;
    const dueDate = inv.due_date ? new Date(String(inv.due_date)) : null;
    return dueDate && dueDate < new Date();
  });
  const openInvoices = invoices.filter(inv => inv.status !== 'paid' && !overdueInvoices.includes(inv));

  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || Number(inv.total_amount) || 0), 0);
  const totalOpen = openInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || Number(inv.total_amount) || 0), 0);

  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.total_amount) || 0), 0);
  const netIncome = totalPaid - totalExpenses;

  // Quick Create Menu Items (matches QuickBooks Online)
  const createMenuItems = {
    customers: [
      { icon: FileText, label: 'Invoice', action: () => console.log('Create Invoice') },
      { icon: Receipt, label: 'Sales Receipt', action: () => console.log('Create Sales Receipt') },
      { icon: FileSpreadsheet, label: 'Estimate', action: () => console.log('Create Estimate') },
      { icon: CreditCard, label: 'Receive Payment', action: () => console.log('Receive Payment') },
      { icon: ArrowDownRight, label: 'Credit Memo', action: () => console.log('Create Credit Memo') },
    ],
    vendors: [
      { icon: Receipt, label: 'Expense', action: () => console.log('Create Expense') },
      { icon: Banknote, label: 'Check', action: () => console.log('Write Check') },
      { icon: FileText, label: 'Bill', action: () => console.log('Create Bill') },
      { icon: ShoppingCart, label: 'Purchase Order', action: () => console.log('Create PO') },
      { icon: ArrowUpRight, label: 'Vendor Credit', action: () => console.log('Vendor Credit') },
      { icon: CreditCard, label: 'Credit Card Credit', action: () => console.log('CC Credit') },
    ],
    other: [
      { icon: Landmark, label: 'Bank Deposit', action: () => console.log('Bank Deposit') },
      { icon: ArrowUpRight, label: 'Transfer', action: () => console.log('Transfer') },
      { icon: BookOpen, label: 'Journal Entry', action: () => console.log('Journal Entry') },
      { icon: Calculator, label: 'Inventory Qty Adjustment', action: () => console.log('Inventory Adj') },
    ]
  };

  // App Carousel Items (QuickBooks shortcuts)
  const appCarouselItems = [
    { icon: FileText, label: 'Invoice', color: 'bg-green-500', action: () => setActiveSection('invoices') },
    { icon: Receipt, label: 'Expense', color: 'bg-orange-500', action: () => setActiveSection('expenses') },
    { icon: Banknote, label: 'Check', color: 'bg-blue-500', action: () => console.log('Write Check') },
    { icon: FileSpreadsheet, label: 'Estimate', color: 'bg-purple-500', action: () => console.log('Estimate') },
    { icon: Users, label: 'Customers', color: 'bg-teal-500', action: () => setActiveSection('customers') },
    { icon: Truck, label: 'Vendors', color: 'bg-amber-500', action: () => setActiveSection('vendors') },
    { icon: Package, label: 'Products', color: 'bg-indigo-500', action: () => console.log('Products') },
    { icon: BarChart3, label: 'Reports', color: 'bg-pink-500', action: () => setActiveSection('reports') },
  ];

  // AI-Powered Business Feed Items
  const businessFeedItems = [
    ...(overdueInvoices.length > 0 ? [{
      type: 'alert',
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''}`,
      description: `$${totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })} needs attention`,
      action: () => setActiveSection('invoices'),
      actionLabel: 'View invoices'
    }] : []),
    ...(openInvoices.length > 0 ? [{
      type: 'info',
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      title: `${openInvoices.length} open invoice${openInvoices.length > 1 ? 's' : ''}`,
      description: `$${totalOpen.toLocaleString('en-US', { minimumFractionDigits: 2 })} awaiting payment`,
      action: () => setActiveSection('invoices'),
      actionLabel: 'Send reminders'
    }] : []),
    {
      type: 'sync',
      icon: RefreshCw,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      title: 'Data synced to Filecoin',
      description: lastSync ? `Last sync: ${new Date(lastSync).toLocaleString()}` : 'Sync your data for secure backup',
      action: onSync,
      actionLabel: 'Sync now'
    },
    {
      type: 'ai',
      icon: Sparkles,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      title: 'Ask AI about your finances',
      description: 'Get insights about cash flow, trends, and recommendations',
      action: () => router.push('/ai-assistant'),
      actionLabel: 'Open AI Assistant'
    }
  ];

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

  // Render Dashboard Overview (QuickBooks Home)
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* App Carousel - Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Shortcuts</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {appCarouselItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className="flex flex-col items-center gap-2 min-w-[72px] group"
            >
              <div className={`w-14 h-14 ${item.color} rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-600 group-hover:text-gray-900">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoices Widget */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Invoices</h3>
            <button
              onClick={() => setActiveSection('invoices')}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              See all
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Paid</span>
              </div>
              <span className="font-semibold text-gray-900">
                ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Open</span>
              </div>
              <span className="font-semibold text-gray-900">
                ${totalOpen.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {totalOverdue > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Overdue</span>
                </div>
                <span className="font-semibold text-red-600">
                  ${totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
              {totalInvoiced > 0 && (
                <>
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(totalPaid / totalInvoiced) * 100}%` }}
                  />
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${(totalOpen / totalInvoiced) * 100}%` }}
                  />
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${(totalOverdue / totalInvoiced) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expenses Widget */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Expenses</h3>
            <button
              onClick={() => setActiveSection('expenses')}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              See all
            </button>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-gray-500">Total expenses this period</p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{expenses.length} transactions</span>
                <span className="text-gray-500">
                  Avg: ${expenses.length > 0 ? (totalExpenses / expenses.length).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profit & Loss Widget */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Profit & Loss</h3>
            <button
              onClick={() => setActiveSection('reports')}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              View report
            </button>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Income</span>
                <span className="font-medium text-green-600">
                  +${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Expenses</span>
                <span className="font-medium text-red-600">
                  -${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="font-medium text-gray-900">Net Income</span>
                <span className={`text-xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netIncome >= 0 ? '+' : '-'}${Math.abs(netIncome).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Feed - AI Insights */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Business Feed</h3>
          </div>
          <span className="text-xs text-gray-500">Powered by AI</span>
        </div>
        <div className="divide-y divide-gray-100">
          {businessFeedItems.map((item, index) => (
            <div key={index} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
              <div className={`w-10 h-10 ${item.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <button
                onClick={item.action}
                className="text-sm text-green-600 hover:text-green-700 font-medium whitespace-nowrap"
              >
                {item.actionLabel}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">Customers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">Vendors</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">Invoices</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">Payments</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
        </div>
      </div>
    </div>
  );

  // Render Data Section (Invoices, Expenses, Customers, Vendors)
  const renderDataSection = (dataType: string, title: string) => {
    const records = filterRecords(getRecordsForType(dataType));

    return (
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {dataType === 'invoices' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice #</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </>
                  )}
                  {dataType === 'expenses' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payee</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </>
                  )}
                  {dataType === 'customers' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Open Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </>
                  )}
                  {dataType === 'vendors' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Open Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record, index) => (
                  <tr key={record.id as string || index} className="hover:bg-gray-50">
                    {dataType === 'invoices' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-green-600 hover:text-green-700 cursor-pointer">
                            #{String(record.doc_number || record.id)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {String(record.customer_name || '-')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${Number(record.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.due_date ? new Date(String(record.due_date)).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : overdueInvoices.some(inv => inv.id === record.id)
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {record.status === 'paid' ? 'Paid' : overdueInvoices.some(inv => inv.id === record.id) ? 'Overdue' : 'Open'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button className="text-gray-400 hover:text-green-600">
                              <Send className="w-4 h-4" />
                            </button>
                            <button className="text-gray-400 hover:text-gray-600">
                              <FileText className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                    {dataType === 'expenses' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.txn_date ? new Date(String(record.txn_date)).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {String(record.vendor_name || record.payee_name || '-')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {String(record.account_name || record.category || '-')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${Number(record.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="text-gray-400 hover:text-gray-600">
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                    {dataType === 'customers' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 text-sm font-medium">
                                {String(record.display_name || record.company_name || 'C').charAt(0)}
                              </span>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${Number(record.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                            Create invoice
                          </button>
                        </td>
                      </>
                    )}
                    {dataType === 'vendors' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                              <span className="text-amber-600 text-sm font-medium">
                                {String(record.display_name || record.company_name || 'V').charAt(0)}
                              </span>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${Number(record.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                            Create expense
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {records.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No {title.toLowerCase()} found</p>
                <button className="mt-4 text-green-600 hover:text-green-700 font-medium text-sm">
                  + Create your first {title.toLowerCase().slice(0, -1)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Reports Section
  const renderReports = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Profit and Loss', description: 'Income, costs, and expenses', icon: TrendingUp, category: 'Financial' },
          { name: 'Balance Sheet', description: 'Assets, liabilities, and equity', icon: PieChart, category: 'Financial' },
          { name: 'Cash Flow', description: 'Money in and out of business', icon: DollarSign, category: 'Financial' },
          { name: 'Accounts Receivable', description: 'Money owed to you', icon: ArrowDownRight, category: 'Sales' },
          { name: 'Accounts Payable', description: 'Money you owe', icon: ArrowUpRight, category: 'Expenses' },
          { name: 'Sales by Customer', description: 'Revenue by customer', icon: Users, category: 'Sales' },
          { name: 'Expenses by Vendor', description: 'Spending by vendor', icon: Truck, category: 'Expenses' },
          { name: 'Invoice Summary', description: 'All invoices overview', icon: FileText, category: 'Sales' },
          { name: 'Transaction List', description: 'All transactions', icon: FileSpreadsheet, category: 'Other' },
        ].map((report, index) => (
          <button
            key={index}
            className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-green-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100">
                <report.icon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-green-600">{report.name}</h4>
                <p className="text-sm text-gray-500">{report.description}</p>
                <span className="text-xs text-gray-400 mt-1 inline-block">{report.category}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* QuickBooks Header Bar */}
      <div className="bg-[#2CA01C] text-white">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Left: Company Name */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-semibold text-sm">Your Company</h1>
                <p className="text-xs text-white/70">QuickBooks Online</p>
              </div>
            </div>
          </div>

          {/* Center: Search */}
          <div className="flex-1 max-w-xl mx-8 hidden md:block">
            <div className={`relative transition-all ${searchFocused ? 'scale-105' : ''}`}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                placeholder="Search transactions, customers, and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onSync}
              disabled={syncing}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Sync Data"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Button + Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Create Button */}
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2CA01C] text-white rounded-lg hover:bg-[#248a17] transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Create
              <ChevronDown className={`w-4 h-4 transition-transform ${createMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Create Menu Dropdown */}
            {createMenuOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="p-4 grid grid-cols-2 gap-4">
                  {/* Customers Column */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customers</h4>
                    {createMenuItems.customers.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => { item.action(); setCreateMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        <item.icon className="w-4 h-4 text-gray-400" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {/* Vendors Column */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Vendors</h4>
                    {createMenuItems.vendors.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => { item.action(); setCreateMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        <item.icon className="w-4 h-4 text-gray-400" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Other Section */}
                <div className="border-t border-gray-100 p-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Other</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {createMenuItems.other.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => { item.action(); setCreateMenuOpen(false); }}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                      >
                        <item.icon className="w-4 h-4 text-gray-400" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section Navigation */}
          <nav className="flex items-center gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'invoices', label: 'Invoices', icon: FileText },
              { id: 'expenses', label: 'Expenses', icon: Receipt },
              { id: 'customers', label: 'Customers', icon: Users },
              { id: 'vendors', label: 'Vendors', icon: Truck },
              { id: 'reports', label: 'Reports', icon: PieChart },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => { setActiveSection(section.id); setSearchQuery(''); }}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <section.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{section.label}</span>
              </button>
            ))}
          </nav>

          {/* AI Assistant Quick Access */}
          <Link
            href="/ai-assistant"
            className="inline-flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm font-medium"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-900 font-medium">Sync Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button onClick={onRefresh} className="ml-auto text-red-600 hover:text-red-700">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading your QuickBooks data...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to QuickBooks</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Sync your QuickBooks data to see invoices, expenses, customers, and more.
              Your data is encrypted and stored securely on Filecoin.
            </p>
            <button
              onClick={onSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2CA01C] text-white rounded-lg hover:bg-[#248a17] transition-colors font-medium"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync QuickBooks Data'}
            </button>
          </div>
        ) : (
          /* Content Based on Active Section */
          <>
            {activeSection === 'dashboard' && renderDashboard()}
            {activeSection === 'invoices' && renderDataSection('invoices', 'Invoices')}
            {activeSection === 'expenses' && renderDataSection('expenses', 'Expenses')}
            {activeSection === 'customers' && renderDataSection('customers', 'Customers')}
            {activeSection === 'vendors' && renderDataSection('vendors', 'Vendors')}
            {activeSection === 'reports' && renderReports()}
          </>
        )}

        {/* Filecoin Storage Badge */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Your data is encrypted and stored on Filecoin/IPFS</span>
        </div>
      </div>
    </div>
  );
}

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

  // Render QuickBooks-native UI for QuickBooks integration
  if (integration === 'quickbooks') {
    return (
      <Layout>
        <QuickBooksToolPage
          walletAddress={address}
          data={data}
          loading={loading}
          syncing={syncing}
          error={error}
          lastSync={lastSync}
          onSync={syncData}
          onRefresh={fetchData}
        />
      </Layout>
    );
  }

  // Generic integration UI for all other integrations
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
