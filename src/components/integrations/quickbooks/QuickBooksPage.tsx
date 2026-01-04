"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  ExternalLink,
  Edit,
  BarChart3,
  Loader2,
  Trash2
} from 'lucide-react';
import InvoiceForm from './InvoiceForm';
import CustomerForm from './CustomerForm';
import ExpenseForm from './ExpenseForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://generic-template-dashboard-production.up.railway.app';

// Types for form data
interface CustomerFormData {
  displayName: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  notes?: string;
  taxExempt?: boolean;
}

interface ExpenseFormData {
  vendor?: string;
  category: string;
  date: string;
  amount: number;
  paymentMethod: string;
  paymentAccount?: string;
  referenceNumber?: string;
  memo?: string;
  billable?: boolean;
  customer?: string;
  receipt?: File | null;
}

interface VendorFormData {
  displayName: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  notes?: string;
  taxId?: string;
  terms?: string;
}

interface QuickBooksPageProps {
  walletAddress: string;
  data: {
    invoices?: QuickBooksInvoice[];
    expenses?: QuickBooksExpense[];
    customers?: QuickBooksCustomer[];
    vendors?: QuickBooksVendor[];
  } | null;
  onRefresh?: () => void;
}

// Type definitions for QuickBooks data
interface QuickBooksInvoice {
  id?: string;
  Id?: string;
  doc_number?: string;
  DocNumber?: string;
  customer_name?: string;
  CustomerRef?: { name?: string; value?: string };
  txn_date?: string;
  TxnDate?: string;
  due_date?: string;
  DueDate?: string;
  total_amount?: number;
  TotalAmt?: number;
  balance?: number;
  Balance?: number;
  status?: string;
  private_note?: string;
  PrivateNote?: string;
  customer_memo?: string;
  CustomerMemo?: { value?: string };
  customer_email?: string;
  BillEmail?: { Address?: string };
}

interface QuickBooksExpense {
  id?: string;
  Id?: string;
  vendor_name?: string;
  EntityRef?: { name?: string };
  txn_date?: string;
  TxnDate?: string;
  total_amount?: number;
  TotalAmt?: number;
  payment_type?: string;
  PaymentType?: string;
  account?: string;
  AccountRef?: { name?: string };
  private_note?: string;
  PrivateNote?: string;
  memo?: string;
  Memo?: string;
}

interface QuickBooksCustomer {
  id?: string;
  Id?: string;
  display_name?: string;
  DisplayName?: string;
  company_name?: string;
  CompanyName?: string;
  primary_email?: string;
  PrimaryEmailAddr?: { Address?: string };
  primary_phone?: string;
  PrimaryPhone?: { FreeFormNumber?: string };
  balance?: number;
  Balance?: number;
}

interface QuickBooksVendor {
  id?: string;
  Id?: string;
  display_name?: string;
  DisplayName?: string;
  company_name?: string;
  CompanyName?: string;
  primary_email?: string;
  PrimaryEmailAddr?: { Address?: string };
  primary_phone?: string;
  PrimaryPhone?: { FreeFormNumber?: string };
  balance?: number;
  Balance?: number;
}

type TabType = 'home' | 'invoices' | 'expenses' | 'customers' | 'vendors' | 'reports';

const TABS = [
  { id: 'home' as TabType, label: 'Overview', icon: Home },
  { id: 'invoices' as TabType, label: 'Invoices', icon: FileText },
  { id: 'expenses' as TabType, label: 'Expenses', icon: Receipt },
  { id: 'customers' as TabType, label: 'Customers', icon: Users },
  { id: 'vendors' as TabType, label: 'Vendors', icon: Building2 },
  { id: 'reports' as TabType, label: 'Reports', icon: BarChart3 },
];

export default function QuickBooksPage({ walletAddress, data, onRefresh }: QuickBooksPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<QuickBooksInvoice | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<QuickBooksExpense | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'open' | 'overdue'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [realmId, setRealmId] = useState<string | null>(null);

  // Form modal states
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);

  // Edit mode states
  const [editingInvoice, setEditingInvoice] = useState<QuickBooksInvoice | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<QuickBooksCustomer | null>(null);
  const [editingExpense, setEditingExpense] = useState<QuickBooksExpense | null>(null);
  const [editingVendor, setEditingVendor] = useState<QuickBooksVendor | null>(null);

  // Loading states for API operations
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Toast state (simple implementation)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live API data state
  const [liveData, setLiveData] = useState<{
    invoices: QuickBooksInvoice[];
    expenses: QuickBooksExpense[];
    customers: QuickBooksCustomer[];
    vendors: QuickBooksVendor[];
  } | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Show toast helper
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch live data from API
  const fetchLiveData = useCallback(async () => {
    if (!walletAddress) return;

    setLiveLoading(true);
    setLiveError(null);

    try {
      // Fetch all QuickBooks data in parallel from live API
      const [invoicesRes, expensesRes, customersRes, vendorsRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/v1/quickbooks/invoices?wallet_address=${walletAddress}`),
        fetch(`${API_URL}/api/v1/quickbooks/expenses?wallet_address=${walletAddress}`),
        fetch(`${API_URL}/api/v1/quickbooks/customers?wallet_address=${walletAddress}`),
        fetch(`${API_URL}/api/v1/quickbooks/vendors?wallet_address=${walletAddress}`)
      ]);

      const invoices: QuickBooksInvoice[] = [];
      const expenses: QuickBooksExpense[] = [];
      const customers: QuickBooksCustomer[] = [];
      const vendors: QuickBooksVendor[] = [];

      if (invoicesRes.status === 'fulfilled' && invoicesRes.value.ok) {
        const invoiceData = await invoicesRes.value.json();
        invoices.push(...(invoiceData.items || invoiceData.data || []));
      }

      if (expensesRes.status === 'fulfilled' && expensesRes.value.ok) {
        const expenseData = await expensesRes.value.json();
        expenses.push(...(expenseData.items || expenseData.data || []));
      }

      if (customersRes.status === 'fulfilled' && customersRes.value.ok) {
        const customerData = await customersRes.value.json();
        customers.push(...(customerData.items || customerData.data || []));
      }

      if (vendorsRes.status === 'fulfilled' && vendorsRes.value.ok) {
        const vendorData = await vendorsRes.value.json();
        vendors.push(...(vendorData.items || vendorData.data || []));
      }

      setLiveData({ invoices, expenses, customers, vendors });
    } catch (error) {
      console.error('Failed to fetch QuickBooks live data:', error);
      setLiveError('Unable to load live data');
      // Fall back to props data
    } finally {
      setLiveLoading(false);
    }
  }, [walletAddress]);

  // Fetch live data on mount and when wallet changes
  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  // Combine live data with props data (prefer live, fallback to props)
  const effectiveData = useMemo(() => ({
    invoices: liveData?.invoices?.length ? liveData.invoices : (data?.invoices || []),
    expenses: liveData?.expenses?.length ? liveData.expenses : (data?.expenses || []),
    customers: liveData?.customers?.length ? liveData.customers : (data?.customers || []),
    vendors: liveData?.vendors?.length ? liveData.vendors : (data?.vendors || []),
  }), [liveData, data]);

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

  // Calculate stats from effective data
  const stats = useMemo(() => {
    const { invoices, expenses, customers, vendors } = effectiveData;

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
  }, [effectiveData]);

  // Check if we have any data (from live API or props)
  const hasData = (
    effectiveData.invoices.length > 0 ||
    effectiveData.expenses.length > 0 ||
    effectiveData.customers.length > 0 ||
    effectiveData.vendors.length > 0
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onRefresh?.();
      // Also refresh live data after sync
      await fetchLiveData();
    } finally {
      setSyncing(false);
    }
  };

  const handleGlobalSearch = () => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();

    if (effectiveData.invoices.some((inv: any) =>
      (inv.customer_name || inv.CustomerRef?.name || '').toLowerCase().includes(query) ||
      (inv.doc_number || inv.DocNumber || '').toLowerCase().includes(query)
    )) {
      setActiveTab('invoices');
      return;
    }

    if (effectiveData.expenses.some((exp: any) =>
      (exp.vendor_name || exp.EntityRef?.name || '').toLowerCase().includes(query)
    )) {
      setActiveTab('expenses');
      return;
    }

    if (effectiveData.customers.some((cust: any) =>
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

  // ===== API HANDLERS FOR CRUD OPERATIONS =====

  // Invoice handlers
  const handleCreateInvoice = () => {
    setEditingInvoice(null);
    setShowInvoiceForm(true);
  };

  const handleEditInvoice = (invoice: QuickBooksInvoice) => {
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
  };

  const handleSaveInvoice = async (invoiceData: Record<string, unknown>) => {
    setFormLoading(true);
    try {
      const url = editingInvoice
        ? `${API_URL}/api/v1/quickbooks/invoices/${editingInvoice.id}?wallet_address=${walletAddress}`
        : `${API_URL}/api/v1/quickbooks/invoices?wallet_address=${walletAddress}`;

      const response = await fetch(url, {
        method: editingInvoice ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        showToast('success', editingInvoice ? 'Invoice updated successfully' : 'Invoice created successfully');
        setShowInvoiceForm(false);
        setEditingInvoice(null);
        onRefresh?.();
      } else {
        showToast('error', result.detail || 'Failed to save invoice');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      showToast('error', 'Failed to save invoice. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Customer handlers
  const handleCreateCustomer = () => {
    setEditingCustomer(null);
    setShowCustomerForm(true);
  };

  const handleEditCustomer = (customer: QuickBooksCustomer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleSaveCustomer = async (customerData: CustomerFormData) => {
    setFormLoading(true);
    try {
      const url = editingCustomer
        ? `${API_URL}/api/v1/quickbooks/customers/${editingCustomer.id || editingCustomer.Id}?wallet_address=${walletAddress}`
        : `${API_URL}/api/v1/quickbooks/customers?wallet_address=${walletAddress}`;

      const response = await fetch(url, {
        method: editingCustomer ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          DisplayName: customerData.displayName,
          CompanyName: customerData.companyName,
          GivenName: customerData.firstName,
          FamilyName: customerData.lastName,
          PrimaryEmailAddr: customerData.email ? { Address: customerData.email } : undefined,
          PrimaryPhone: customerData.phone ? { FreeFormNumber: customerData.phone } : undefined,
          Mobile: customerData.mobile ? { FreeFormNumber: customerData.mobile } : undefined,
          WebAddr: customerData.website ? { URI: customerData.website } : undefined,
          BillAddr: customerData.billingAddress ? {
            Line1: customerData.billingAddress.line1,
            City: customerData.billingAddress.city,
            CountrySubDivisionCode: customerData.billingAddress.state,
            PostalCode: customerData.billingAddress.postalCode,
            Country: customerData.billingAddress.country,
          } : undefined,
          Notes: customerData.notes,
        }),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        showToast('success', editingCustomer ? 'Customer updated successfully' : 'Customer created successfully');
        setShowCustomerForm(false);
        setEditingCustomer(null);
        onRefresh?.();
      } else {
        showToast('error', result.detail || 'Failed to save customer');
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      showToast('error', 'Failed to save customer. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    setDeleteLoading(customerId);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/quickbooks/customers/${customerId}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );
      const result = await response.json();

      if (result.success || response.ok) {
        showToast('success', 'Customer deleted successfully');
        onRefresh?.();
      } else {
        showToast('error', result.detail || 'Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      showToast('error', 'Failed to delete customer');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Expense handlers
  const handleCreateExpense = () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
  };

  const handleEditExpense = (expense: QuickBooksExpense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleSaveExpense = async (expenseData: ExpenseFormData) => {
    setFormLoading(true);
    try {
      const url = editingExpense
        ? `${API_URL}/api/v1/quickbooks/expenses/${editingExpense.id || editingExpense.Id}?wallet_address=${walletAddress}`
        : `${API_URL}/api/v1/quickbooks/expenses?wallet_address=${walletAddress}`;

      const response = await fetch(url, {
        method: editingExpense ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          EntityRef: expenseData.vendor ? { name: expenseData.vendor } : undefined,
          AccountRef: { name: expenseData.category },
          TxnDate: expenseData.date,
          TotalAmt: expenseData.amount,
          PaymentType: expenseData.paymentMethod,
          PrivateNote: expenseData.memo,
        }),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        showToast('success', editingExpense ? 'Expense updated successfully' : 'Expense created successfully');
        setShowExpenseForm(false);
        setEditingExpense(null);
        onRefresh?.();
      } else {
        showToast('error', result.detail || 'Failed to save expense');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      showToast('error', 'Failed to save expense. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Vendor handlers
  const handleCreateVendor = () => {
    setEditingVendor(null);
    setShowVendorForm(true);
  };

  const handleEditVendor = (vendor: QuickBooksVendor) => {
    setEditingVendor(vendor);
    setShowVendorForm(true);
  };

  const handleSaveVendor = async (vendorData: VendorFormData) => {
    setFormLoading(true);
    try {
      const url = editingVendor
        ? `${API_URL}/api/v1/quickbooks/vendors/${editingVendor.id || editingVendor.Id}?wallet_address=${walletAddress}`
        : `${API_URL}/api/v1/quickbooks/vendors?wallet_address=${walletAddress}`;

      const response = await fetch(url, {
        method: editingVendor ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          DisplayName: vendorData.displayName,
          CompanyName: vendorData.companyName,
          GivenName: vendorData.firstName,
          FamilyName: vendorData.lastName,
          PrimaryEmailAddr: vendorData.email ? { Address: vendorData.email } : undefined,
          PrimaryPhone: vendorData.phone ? { FreeFormNumber: vendorData.phone } : undefined,
          Mobile: vendorData.mobile ? { FreeFormNumber: vendorData.mobile } : undefined,
          WebAddr: vendorData.website ? { URI: vendorData.website } : undefined,
          BillAddr: vendorData.billingAddress ? {
            Line1: vendorData.billingAddress.line1,
            City: vendorData.billingAddress.city,
            CountrySubDivisionCode: vendorData.billingAddress.state,
            PostalCode: vendorData.billingAddress.postalCode,
            Country: vendorData.billingAddress.country,
          } : undefined,
          Notes: vendorData.notes,
        }),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        showToast('success', editingVendor ? 'Vendor updated successfully' : 'Vendor created successfully');
        setShowVendorForm(false);
        setEditingVendor(null);
        onRefresh?.();
      } else {
        showToast('error', result.detail || 'Failed to save vendor');
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
      showToast('error', 'Failed to save vendor. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;

    setDeleteLoading(vendorId);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/quickbooks/vendors/${vendorId}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );
      const result = await response.json();

      if (result.success || response.ok) {
        showToast('success', 'Vendor deleted successfully');
        onRefresh?.();
      } else {
        showToast('error', result.detail || 'Failed to delete vendor');
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      showToast('error', 'Failed to delete vendor');
    } finally {
      setDeleteLoading(null);
    }
  };

  // ===== END API HANDLERS =====

  // Render Overview/Home Tab
  const renderHome = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all cursor-pointer"
          onClick={() => setActiveTab('invoices')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Total Income</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalIncome)}</p>
          <p className="text-sm text-gray-500 mt-2">{stats.paidInvoices} paid invoices</p>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all cursor-pointer"
          onClick={() => setActiveTab('expenses')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Total Expenses</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalExpenses)}</p>
          <p className="text-sm text-gray-500 mt-2">{stats.expenseCount} expenses</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Net Income</h3>
          </div>
          <p className={`text-3xl font-bold ${stats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(stats.netIncome))}
            {stats.netIncome < 0 && <span className="text-lg ml-1">(Loss)</span>}
          </p>
          <p className="text-sm text-gray-500 mt-2">Income minus expenses</p>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all cursor-pointer"
          onClick={() => setActiveTab('invoices')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Invoices</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.invoiceCount}</p>
          <div className="flex gap-2 mt-2 text-sm">
            <span className="text-green-600 font-medium">{stats.paidInvoices} paid</span>
            <span className="text-gray-400">•</span>
            <span className="text-blue-600 font-medium">{stats.openInvoices} open</span>
            {stats.overdueInvoices > 0 && (
              <>
                <span className="text-gray-400">•</span>
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
        {(effectiveData.invoices?.length ?? 0) > 0 ? (
          <div className="divide-y divide-gray-100">
            {effectiveData.invoices?.slice(0, 5).map((invoice: any, index: number) => {
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
        {(effectiveData.expenses?.length ?? 0) > 0 ? (
          <div className="divide-y divide-gray-100">
            {effectiveData.expenses?.slice(0, 5).map((expense: any, index: number) => {
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
    const invoices = effectiveData.invoices || [];

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
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-gray-900">Invoices ({filteredInvoices.length})</h2>
              <button
                onClick={handleCreateInvoice}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                New Invoice
              </button>
            </div>

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
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Invoice #</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Due Date</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Balance</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
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
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : status === 'overdue'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}>
                            {status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Open'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditInvoice(invoice);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit invoice"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </button>
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
              {invoices.length === 0 && (
                <button
                  onClick={handleCreateInvoice}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Invoice
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
    const expenses = effectiveData.expenses || [];
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
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">All Expenses ({filteredExpenses.length})</h2>
            <button
              onClick={handleCreateExpense}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              New Expense
            </button>
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
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExpenses.map((expense: QuickBooksExpense, index: number) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedExpense(expense)}
                    >
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(expense.txn_date || expense.TxnDate || '')}
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
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditExpense(expense);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit expense"
                        >
                          <Edit className="h-4 w-4 text-gray-600" />
                        </button>
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
              {expenses.length === 0 && (
                <button
                  onClick={handleCreateExpense}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Record Your First Expense
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Customers Tab
  const renderCustomers = () => {
    const customers = effectiveData.customers || [];
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
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">All Customers ({filteredCustomers.length})</h2>
            <button
              onClick={handleCreateCustomer}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              New Customer
            </button>
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
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCustomers.map((customer: QuickBooksCustomer, index: number) => {
                    const customerId = customer.id || customer.Id || String(index);
                    return (
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
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditCustomer(customer)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit customer"
                            >
                              <Edit className="h-4 w-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(customerId)}
                              disabled={deleteLoading === customerId}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete customer"
                            >
                              {deleteLoading === customerId ? (
                                <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-600" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
              {customers.length === 0 && (
                <button
                  onClick={handleCreateCustomer}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Customer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Vendors Tab
  const renderVendors = () => {
    const vendors = effectiveData.vendors || [];
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
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">All Vendors ({filteredVendors.length})</h2>
            <button
              onClick={handleCreateVendor}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              New Vendor
            </button>
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
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVendors.map((vendor: QuickBooksVendor, index: number) => {
                    const vendorId = vendor.id || vendor.Id || String(index);
                    return (
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
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditVendor(vendor)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit vendor"
                            >
                              <Edit className="h-4 w-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteVendor(vendorId)}
                              disabled={deleteLoading === vendorId}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete vendor"
                            >
                              {deleteLoading === vendorId ? (
                                <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-600" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
              {vendors.length === 0 && (
                <button
                  onClick={handleCreateVendor}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Vendor
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Reports Tab
  const renderReports = () => {
    const invoices = effectiveData.invoices || [];
    const expenses = effectiveData.expenses || [];

    // Calculate report data from actual synced data
    const totalIncome = invoices.reduce((sum, inv) => {
      const balance = inv.balance ?? inv.Balance ?? 0;
      const amount = inv.total_amount ?? inv.TotalAmt ?? 0;
      const isPaid = inv.status === 'paid' || (balance === 0 && amount > 0);
      return sum + (isPaid ? amount : 0);
    }, 0);

    const totalExpenses = expenses.reduce((sum, exp) => {
      return sum + (exp.total_amount ?? exp.TotalAmt ?? 0);
    }, 0);

    const grossProfit = totalIncome;
    const netIncome = totalIncome - totalExpenses;

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach(exp => {
      const category = exp.account || exp.AccountRef?.name || 'Uncategorized';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + (exp.total_amount ?? exp.TotalAmt ?? 0);
    });

    return (
      <div className="space-y-6">
        {/* Report Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Net Income</p>
                <p className={`text-2xl font-bold mt-1 ${netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(netIncome))}
                  {netIncome < 0 && <span className="text-sm ml-1">(Loss)</span>}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Profit & Loss Report */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Profit and Loss Summary</h2>
            <p className="text-sm text-gray-500 mt-1">Based on synced QuickBooks data</p>
          </div>
          <div className="p-6 space-y-6">
            {/* Income Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Income</h3>
              <div className="space-y-2 ml-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Revenue (Paid Invoices)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total Income</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(totalIncome)}</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="font-bold text-gray-900">GROSS PROFIT</span>
                <span className="font-bold text-green-600">{formatCurrency(grossProfit)}</span>
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Expenses</h3>
              <div className="space-y-2 ml-4">
                {Object.entries(expensesByCategory).length > 0 ? (
                  <>
                    {Object.entries(expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([category, amount]) => (
                        <div key={category} className="flex justify-between text-sm">
                          <span className="text-gray-600">{category}</span>
                          <span className="font-medium text-gray-900">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">Total Expenses</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(totalExpenses)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No expenses recorded</p>
                )}
              </div>
            </div>

            {/* Net Income */}
            <div className={`p-4 rounded-lg ${netIncome >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
              <div className="flex justify-between">
                <span className="font-bold text-xl text-gray-900">NET INCOME</span>
                <span className={`font-bold text-xl ${netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(netIncome))}
                  {netIncome < 0 && <span className="text-lg ml-1">(Loss)</span>}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* No Data Notice */}
        {invoices.length === 0 && expenses.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No Data Available</h3>
                <p className="text-gray-600 mt-1">
                  Sync your QuickBooks data to see financial reports. Click the Sync button above to get started.
                </p>
              </div>
            </div>
          </div>
        )}
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
      case 'reports':
        return renderReports();
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
                      ? 'border-blue-600 text-blue-700 bg-blue-50 font-semibold'
                      : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : ''}`} />
                  <span>{tab.label}</span>
                  {count != null && count > 0 && (
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
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
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-blue-600" />
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
                      {formatDate(selectedInvoice.txn_date || selectedInvoice.TxnDate || '')}
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
                      {formatDate(selectedInvoice.due_date || selectedInvoice.DueDate || '')}
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
                      {formatDate(selectedExpense.txn_date || selectedExpense.TxnDate || '')}
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
                      {formatDate(selectedExpense.txn_date || selectedExpense.TxnDate || '')}
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

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <InvoiceForm
          invoice={editingInvoice ? {
            id: editingInvoice.id || editingInvoice.Id || '',
            customer: editingInvoice.customer_name || editingInvoice.CustomerRef?.name || '',
            number: editingInvoice.doc_number || editingInvoice.DocNumber || '',
            date: editingInvoice.txn_date || editingInvoice.TxnDate || new Date().toISOString().split('T')[0],
            dueDate: editingInvoice.due_date || editingInvoice.DueDate || '',
            lineItems: [],
            notes: editingInvoice.private_note || editingInvoice.PrivateNote || '',
          } : undefined}
          customers={(effectiveData.customers || []).map(c => ({
            id: c.id || c.Id || '',
            name: c.display_name || c.DisplayName || 'Unknown',
          }))}
          onClose={() => {
            setShowInvoiceForm(false);
            setEditingInvoice(null);
          }}
          onSave={handleSaveInvoice}
        />
      )}

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <CustomerForm
          customer={editingCustomer ? {
            displayName: editingCustomer.display_name || editingCustomer.DisplayName || '',
            companyName: editingCustomer.company_name || editingCustomer.CompanyName || '',
            email: editingCustomer.primary_email || editingCustomer.PrimaryEmailAddr?.Address || '',
            phone: editingCustomer.primary_phone || editingCustomer.PrimaryPhone?.FreeFormNumber || '',
          } : undefined}
          onClose={() => {
            setShowCustomerForm(false);
            setEditingCustomer(null);
          }}
          onSave={handleSaveCustomer}
        />
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          expense={editingExpense ? {
            vendor: editingExpense.vendor_name || editingExpense.EntityRef?.name || '',
            category: editingExpense.account || editingExpense.AccountRef?.name || '',
            date: editingExpense.txn_date || editingExpense.TxnDate || new Date().toISOString().split('T')[0],
            amount: editingExpense.total_amount ?? editingExpense.TotalAmt ?? 0,
            paymentMethod: editingExpense.payment_type || editingExpense.PaymentType || '',
            memo: editingExpense.private_note || editingExpense.PrivateNote || '',
          } : undefined}
          vendors={(effectiveData.vendors || []).map(v => ({
            id: v.id || v.Id || '',
            name: v.display_name || v.DisplayName || 'Unknown',
          }))}
          onClose={() => {
            setShowExpenseForm(false);
            setEditingExpense(null);
          }}
          onSave={handleSaveExpense}
        />
      )}

      {/* Vendor Form Modal */}
      {showVendorForm && (
        <VendorForm
          vendor={editingVendor ? {
            displayName: editingVendor.display_name || editingVendor.DisplayName || '',
            companyName: editingVendor.company_name || editingVendor.CompanyName || '',
            email: editingVendor.primary_email || editingVendor.PrimaryEmailAddr?.Address || '',
            phone: editingVendor.primary_phone || editingVendor.PrimaryPhone?.FreeFormNumber || '',
          } : undefined}
          onClose={() => {
            setShowVendorForm(false);
            setEditingVendor(null);
          }}
          onSave={handleSaveVendor}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p className={`text-sm font-medium ${
              toast.type === 'success' ? 'text-green-900' : 'text-red-900'
            }`}>
              {toast.message}
            </p>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// VendorForm Component (inline since it's similar to CustomerForm)
interface VendorFormProps {
  vendor?: {
    displayName: string;
    companyName?: string;
    email?: string;
    phone?: string;
  };
  onClose: () => void;
  onSave: (data: VendorFormData) => Promise<void>;
}

function VendorForm({ vendor, onClose, onSave }: VendorFormProps) {
  const [formData, setFormData] = useState<VendorFormData>({
    displayName: vendor?.displayName || '',
    companyName: vendor?.companyName || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                {vendor ? 'Edit Vendor' : 'New Vendor'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.displayName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter vendor name"
              />
              {errors.displayName && (
                <p className="text-red-500 text-sm mt-1">{errors.displayName}</p>
              )}
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formData.companyName || ''}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter company name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="vendor@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  vendor ? 'Update Vendor' : 'Create Vendor'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
