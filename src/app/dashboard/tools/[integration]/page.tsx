'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletSync } from '@/app/providers';
import { Layout } from '@/components/Layout';
import Link from 'next/link';
import { SalesforcePage } from '@/components/integrations/salesforce';
import { SlackPage } from '@/components/integrations/slack';
import { HubSpotPage } from '@/components/integrations/hubspot';
import { QuickBooksPage } from '@/components/integrations/quickbooks';
import { GoogleWorkspacePage } from '@/components/integrations/google';
import { Microsoft365Page } from '@/components/integrations/microsoft';
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
// QUICKBOOKS NATIVE UI COMPONENT
// Exact replica of QuickBooks Online interface within the dashboard
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

// QuickBooks Left Sidebar Navigation Items (exactly like QB Online)
const QB_SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'bookmarks', label: 'Bookmarks', icon: Star, badge: null },
  { id: 'banking', label: 'Banking', icon: Landmark },
  {
    id: 'sales',
    label: 'Sales',
    icon: DollarSign,
    submenu: [
      { id: 'overview', label: 'Overview' },
      { id: 'all-sales', label: 'All Sales' },
      { id: 'invoices', label: 'Invoices' },
      { id: 'payment-links', label: 'Payment Links' },
      { id: 'customers', label: 'Customers' },
      { id: 'products', label: 'Products & Services' },
    ]
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: Receipt,
    submenu: [
      { id: 'expenses-list', label: 'Expenses' },
      { id: 'vendors', label: 'Vendors' },
      { id: 'bills', label: 'Bills' },
    ]
  },
  { id: 'projects', label: 'Projects', icon: Briefcase },
  {
    id: 'workers',
    label: 'Workers',
    icon: UsersRound,
    submenu: [
      { id: 'payroll', label: 'Payroll' },
      { id: 'contractors', label: 'Contractors' },
    ]
  },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'taxes', label: 'Taxes', icon: FileCheck },
  { id: 'mileage', label: 'Mileage', icon: Car },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: BookOpen,
    submenu: [
      { id: 'chart-of-accounts', label: 'Chart of Accounts' },
      { id: 'reconcile', label: 'Reconcile' },
    ]
  },
  { id: 'my-accountant', label: 'My Accountant', icon: UserCheck },
  { id: 'apps', label: 'Apps', icon: Grid3X3 },
];

// Gear Menu Items (exactly like QB Online)
const GEAR_MENU_ITEMS = {
  yourCompany: [
    { id: 'account-settings', label: 'Account and Settings', icon: Settings },
    { id: 'manage-users', label: 'Manage Users', icon: UsersRound },
    { id: 'custom-form-styles', label: 'Custom Form Styles', icon: FileText },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  ],
  lists: [
    { id: 'all-lists', label: 'All Lists', icon: List },
    { id: 'products-services', label: 'Products and Services', icon: Package },
    { id: 'recurring-transactions', label: 'Recurring Transactions', icon: RotateCcw },
    { id: 'attachments', label: 'Attachments', icon: Paperclip },
    { id: 'chart-of-accounts-gear', label: 'Chart of Accounts', icon: BookOpen },
    { id: 'payroll-items', label: 'Payroll Items', icon: DollarSign },
    { id: 'tags', label: 'Tags', icon: Tag },
  ],
  tools: [
    { id: 'import-data', label: 'Import Data', icon: Upload },
    { id: 'export-data', label: 'Export Data', icon: Download },
    { id: 'reconcile-gear', label: 'Reconcile', icon: CheckCircle },
    { id: 'budgeting', label: 'Budgeting', icon: Target },
    { id: 'audit-log', label: 'Audit Log', icon: History },
    { id: 'smart-look', label: 'SmartLook', icon: Eye },
    { id: 'resolution-center', label: 'Resolution Center', icon: Shield },
  ],
  profile: [
    { id: 'user-profile', label: 'User Profile', icon: UserCheck },
    { id: 'switch-company', label: 'Switch Company', icon: Building2 },
    { id: 'sign-out', label: 'Sign Out', icon: ArrowUpRight },
  ]
};

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
  const [activeSubSection, setActiveSubSection] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['sales', 'expenses']);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [gearMenuOpen, setGearMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const gearMenuRef = useRef<HTMLDivElement>(null);

  // Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: '',
    customerEmail: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    terms: 'Net 30',
    lineItems: [{ description: '', quantity: 1, rate: 0 }],
    notes: ''
  });

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    vendorId: '',
    paymentAccount: 'Business Checking',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Check',
    refNo: '',
    lineItems: [{ category: 'Office Supplies & Software', description: '', amount: 0 }]
  });

  // Reset forms when modals close
  useEffect(() => {
    if (!showInvoiceForm) {
      setInvoiceForm({
        customerId: '',
        customerEmail: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        terms: 'Net 30',
        lineItems: [{ description: '', quantity: 1, rate: 0 }],
        notes: ''
      });
    }
  }, [showInvoiceForm]);

  useEffect(() => {
    if (!showExpenseForm) {
      setExpenseForm({
        vendorId: '',
        paymentAccount: 'Business Checking',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Check',
        refNo: '',
        lineItems: [{ category: 'Office Supplies & Software', description: '', amount: 0 }]
      });
    }
  }, [showExpenseForm]);

  // Invoice Line Items Management
  const addInvoiceLineItem = () => {
    setInvoiceForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, rate: 0 }]
    }));
  };

  const updateInvoiceLineItem = (index: number, field: string, value: string | number) => {
    setInvoiceForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeInvoiceLineItem = (index: number) => {
    if (invoiceForm.lineItems.length > 1) {
      setInvoiceForm(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index)
      }));
    }
  };

  // Expense Line Items Management
  const addExpenseLineItem = () => {
    setExpenseForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { category: 'Office Supplies & Software', description: '', amount: 0 }]
    }));
  };

  const updateExpenseLineItem = (index: number, field: string, value: string | number) => {
    setExpenseForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeExpenseLineItem = (index: number) => {
    if (expenseForm.lineItems.length > 1) {
      setExpenseForm(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index)
      }));
    }
  };

  // Calculate Invoice Totals
  const invoiceSubtotal = invoiceForm.lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.rate), 0
  );
  const invoiceTax = 0;
  const invoiceTotal = invoiceSubtotal + invoiceTax;

  // Calculate Expense Total
  const expenseTotal = expenseForm.lineItems.reduce(
    (sum, item) => sum + item.amount, 0
  );

  // Save Invoice Handler
  const handleSaveInvoice = async (sendAfterSave: boolean = false) => {
    if (!invoiceForm.customerId) {
      alert('Please select a customer');
      return;
    }
    if (!invoiceForm.dueDate) {
      alert('Please enter a due date');
      return;
    }
    if (invoiceForm.lineItems.every(item => !item.description || item.rate === 0)) {
      alert('Please add at least one line item');
      return;
    }

    setSavingInvoice(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(
        `${apiUrl}/api/v1/quickbooks/invoices?wallet_address=${walletAddress}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: invoiceForm.customerId,
            invoice_date: invoiceForm.invoiceDate,
            due_date: invoiceForm.dueDate,
            terms: invoiceForm.terms,
            line_items: invoiceForm.lineItems.filter(item => item.description || item.rate > 0).map(item => ({
              description: item.description,
              quantity: item.quantity,
              rate: item.rate
            })),
            notes: invoiceForm.notes || undefined
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create invoice: ${response.status}`);
      }

      const result = await response.json();

      if (sendAfterSave && result.id) {
        const sendResponse = await fetch(
          `${apiUrl}/api/v1/quickbooks/invoices/${result.id}/send?wallet_address=${walletAddress}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: invoiceForm.customerEmail || undefined })
          }
        );

        if (!sendResponse.ok) {
          alert(`Invoice created (${result.doc_number || result.id}) but failed to send.`);
        } else {
          alert(`Invoice ${result.doc_number || result.id} created and sent!`);
        }
      } else {
        alert(`Invoice ${result.doc_number || result.id} created successfully!`);
      }

      setShowInvoiceForm(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Failed to save invoice:', error);
      alert(error instanceof Error ? error.message : 'Failed to create invoice');
    } finally {
      setSavingInvoice(false);
    }
  };

  // Save Expense Handler
  const handleSaveExpense = async () => {
    const validItems = expenseForm.lineItems.filter(item => item.amount > 0);
    if (validItems.length === 0) {
      alert('Please add at least one expense line item with an amount');
      return;
    }

    setSavingExpense(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      // Create an expense for each line item with amount > 0
      const results = [];
      for (const item of validItems) {
        const response = await fetch(
          `${apiUrl}/api/v1/quickbooks/expenses?wallet_address=${walletAddress}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vendor_id: expenseForm.vendorId || undefined,
              category: item.category,
              date: expenseForm.paymentDate,
              amount: item.amount,
              payment_method: expenseForm.paymentMethod,
              payment_account: expenseForm.paymentAccount,
              reference_number: expenseForm.refNo || undefined,
              memo: item.description || undefined
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Failed to create expense: ${response.status}`);
        }

        const result = await response.json();
        results.push(result);
      }

      if (results.length === 1) {
        alert(`Expense ${results[0].doc_number || results[0].id} created successfully!`);
      } else {
        alert(`${results.length} expenses created successfully!`);
      }
      setShowExpenseForm(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Failed to save expense:', error);
      alert(error instanceof Error ? error.message : 'Failed to create expense');
    } finally {
      setSavingExpense(false);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setCreateMenuOpen(false);
      }
      if (gearMenuRef.current && !gearMenuRef.current.contains(event.target as Node)) {
        setGearMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle sidebar menu expansion
  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Star className="w-4 h-4" />
          </button>
          <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Customize
          </button>
        </div>
      </div>

      {/* Report Categories */}
      <div className="space-y-6">
        {/* Favorites */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Favorites
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'Profit and Loss', description: 'Income, costs, and expenses', icon: TrendingUp },
              { name: 'Balance Sheet', description: 'Assets, liabilities, and equity', icon: PieChart },
            ].map((report, index) => (
              <button
                key={index}
                className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-green-500 hover:shadow-sm transition-all group flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100 flex-shrink-0">
                  <report.icon className="w-5 h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-gray-900 group-hover:text-green-600 truncate">{report.name}</h4>
                  <p className="text-xs text-gray-500 truncate">{report.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Business Overview */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Business Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'Profit and Loss', description: 'Income, costs, and expenses', icon: TrendingUp },
              { name: 'Profit and Loss Detail', description: 'Detailed P&L breakdown', icon: FileSpreadsheet },
              { name: 'Balance Sheet', description: 'Assets, liabilities, and equity', icon: PieChart },
              { name: 'Balance Sheet Detail', description: 'Detailed balance sheet', icon: FileSpreadsheet },
              { name: 'Statement of Cash Flows', description: 'Cash flow analysis', icon: DollarSign },
              { name: 'Business Snapshot', description: 'Quick business overview', icon: BarChart3 },
            ].map((report, index) => (
              <button
                key={index}
                className="bg-white rounded-lg border border-gray-200 p-3 text-left hover:border-green-500 hover:shadow-sm transition-all group flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-gray-50 rounded flex items-center justify-center group-hover:bg-green-50 flex-shrink-0">
                  <report.icon className="w-4 h-4 text-gray-500 group-hover:text-green-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-green-600 truncate">{report.name}</h4>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Who Owes You */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Who Owes You</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'Accounts Receivable Aging Summary', icon: Clock },
              { name: 'Accounts Receivable Aging Detail', icon: FileSpreadsheet },
              { name: 'Invoice List', icon: FileText },
              { name: 'Customer Balance Summary', icon: Users },
              { name: 'Customer Balance Detail', icon: FileSpreadsheet },
              { name: 'Unbilled Charges', icon: AlertCircle },
            ].map((report, index) => (
              <button
                key={index}
                className="bg-white rounded-lg border border-gray-200 p-3 text-left hover:border-green-500 hover:shadow-sm transition-all group flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-gray-50 rounded flex items-center justify-center group-hover:bg-green-50 flex-shrink-0">
                  <report.icon className="w-4 h-4 text-gray-500 group-hover:text-green-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-green-600 truncate">{report.name}</h4>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* What You Owe */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">What You Owe</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'Accounts Payable Aging Summary', icon: Clock },
              { name: 'Accounts Payable Aging Detail', icon: FileSpreadsheet },
              { name: 'Bill Payment List', icon: Banknote },
              { name: 'Vendor Balance Summary', icon: Truck },
              { name: 'Vendor Balance Detail', icon: FileSpreadsheet },
              { name: '1099 Contractor Balance', icon: UserCheck },
            ].map((report, index) => (
              <button
                key={index}
                className="bg-white rounded-lg border border-gray-200 p-3 text-left hover:border-green-500 hover:shadow-sm transition-all group flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-gray-50 rounded flex items-center justify-center group-hover:bg-green-50 flex-shrink-0">
                  <report.icon className="w-4 h-4 text-gray-500 group-hover:text-green-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-green-600 truncate">{report.name}</h4>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sales and Customers */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Sales and Customers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'Sales by Customer Summary', icon: Users },
              { name: 'Sales by Product/Service Summary', icon: Package },
              { name: 'Deposit Detail', icon: Landmark },
              { name: 'Estimates by Customer', icon: FileSpreadsheet },
              { name: 'Sales by Customer Detail', icon: FileSpreadsheet },
            ].map((report, index) => (
              <button
                key={index}
                className="bg-white rounded-lg border border-gray-200 p-3 text-left hover:border-green-500 hover:shadow-sm transition-all group flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-gray-50 rounded flex items-center justify-center group-hover:bg-green-50 flex-shrink-0">
                  <report.icon className="w-4 h-4 text-gray-500 group-hover:text-green-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-green-600 truncate">{report.name}</h4>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Banking Section (NEW - matches QB Banking center)
  const renderBanking = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Banking</h2>
        <button className="px-4 py-2 bg-[#2CA01C] text-white rounded-lg hover:bg-[#248a17] text-sm font-medium">
          Connect account
        </button>
      </div>

      {/* Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Landmark className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Business Checking</h3>
                <p className="text-xs text-gray-500">Connected • Updated today</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            $24,500.00
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-amber-600">
              <Clock className="w-4 h-4" />
              12 to review
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              45 categorized
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Business Credit Card</h3>
                <p className="text-xs text-gray-500">Connected • Updated today</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="text-2xl font-bold text-red-600 mb-2">
            -$3,200.00
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-amber-600">
              <Clock className="w-4 h-4" />
              8 to review
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              32 categorized
            </span>
          </div>
        </div>

        {/* Add Account Card */}
        <button className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-5 hover:bg-gray-100 hover:border-gray-400 transition-all flex flex-col items-center justify-center min-h-[140px]">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-2 border border-gray-200">
            <Plus className="w-5 h-5 text-gray-400" />
          </div>
          <span className="text-sm font-medium text-gray-600">Connect account</span>
        </button>
      </div>

      {/* Transactions to Review */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">For Review</h3>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">20 items</span>
            <button className="text-sm text-green-600 hover:text-green-700 font-medium">View all</button>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { date: 'Dec 15', description: 'Amazon Web Services', amount: -129.99, category: 'Software' },
            { date: 'Dec 14', description: 'Stripe Payment', amount: 2450.00, category: 'Income' },
            { date: 'Dec 14', description: 'Office Supplies Co', amount: -89.50, category: 'Office Expenses' },
            { date: 'Dec 13', description: 'Client Payment - Acme Corp', amount: 5000.00, category: 'Income' },
            { date: 'Dec 12', description: 'Adobe Creative Cloud', amount: -54.99, category: 'Software' },
          ].map((txn, index) => (
            <div key={index} className="p-4 flex items-center gap-4 hover:bg-gray-50">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {txn.amount > 0 ? (
                  <ArrowDownRight className="w-5 h-5 text-green-600" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{txn.description}</p>
                <p className="text-sm text-gray-500">{txn.date}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${txn.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {txn.amount > 0 ? '+' : ''}${Math.abs(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">{txn.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Products & Services Section (NEW)
  const renderProducts = () => {
    const products = [
      { id: 1, name: 'Consulting Services', type: 'Service', price: 150.00, income_account: 'Services' },
      { id: 2, name: 'Software Development', type: 'Service', price: 200.00, income_account: 'Services' },
      { id: 3, name: 'Training Session', type: 'Service', price: 500.00, income_account: 'Services' },
      { id: 4, name: 'Product License', type: 'Non-inventory', price: 999.00, income_account: 'Sales of Product Income' },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Products and Services</h2>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
              More
            </button>
            <button className="px-4 py-2 bg-[#2CA01C] text-white rounded-lg hover:bg-[#248a17] text-sm font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products and services"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            />
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900">
            <option>All Types</option>
            <option>Service</option>
            <option>Non-inventory</option>
            <option>Inventory</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900">
            <option>Active</option>
            <option>Inactive</option>
            <option>All</option>
          </select>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sales Price</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Income Account</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                        <Package className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.type}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.income_account}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-gray-600">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Chart of Accounts Section (NEW)
  const renderChartOfAccounts = () => {
    const accounts = [
      { id: 1, name: 'Business Checking', type: 'Bank', detail: 'Checking', balance: 24500.00 },
      { id: 2, name: 'Accounts Receivable (A/R)', type: 'Accounts Receivable', detail: 'Accounts Receivable', balance: 12500.00 },
      { id: 3, name: 'Inventory Asset', type: 'Other Current Assets', detail: 'Inventory', balance: 8500.00 },
      { id: 4, name: 'Accounts Payable (A/P)', type: 'Accounts Payable', detail: 'Accounts Payable', balance: -4200.00 },
      { id: 5, name: 'Sales of Product Income', type: 'Income', detail: 'Sales of Product Income', balance: 45000.00 },
      { id: 6, name: 'Services', type: 'Income', detail: 'Service/Fee Income', balance: 32000.00 },
      { id: 7, name: 'Advertising & Marketing', type: 'Expenses', detail: 'Advertising/Promotional', balance: -2500.00 },
      { id: 8, name: 'Office Supplies & Software', type: 'Expenses', detail: 'Office/General Administrative Expenses', balance: -1800.00 },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Chart of Accounts</h2>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Account Numbering
            </button>
            <button className="px-4 py-2 bg-[#2CA01C] text-white rounded-lg hover:bg-[#248a17] text-sm font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search accounts"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>All Account Types</option>
            <option>Bank</option>
            <option>Accounts Receivable</option>
            <option>Other Current Assets</option>
            <option>Accounts Payable</option>
            <option>Income</option>
            <option>Expenses</option>
          </select>
        </div>

        {/* Accounts Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Detail Type</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">QuickBooks Balance</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-green-600 hover:text-green-700 cursor-pointer">{account.name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{account.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{account.detail}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <span className={account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}>
                      ${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-gray-600">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Handle sidebar navigation
  const handleSidebarClick = (itemId: string, subId?: string) => {
    if (subId) {
      setActiveSubSection(subId);
      // Map subsection IDs to section display
      if (subId === 'invoices' || subId === 'customers' || subId === 'products') {
        setActiveSection(subId === 'products' ? 'products' : subId);
      } else if (subId === 'expenses-list' || subId === 'vendors' || subId === 'bills') {
        setActiveSection(subId === 'expenses-list' ? 'expenses' : subId);
      } else if (subId === 'chart-of-accounts') {
        setActiveSection('chart-of-accounts');
      }
    } else {
      setActiveSection(itemId);
      setActiveSubSection(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* QuickBooks Header Bar - Exact QB Online style */}
      <header className="bg-[#2CA01C] text-white flex-shrink-0">
        <div className="px-4 py-2 flex items-center justify-between">
          {/* Left: Logo + Company */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors lg:hidden"
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-[#2CA01C] font-bold text-lg">qb</span>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1">
                  <h1 className="font-semibold text-sm">Your Company</h1>
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </div>
              </div>
            </div>
          </div>

          {/* Center: Search */}
          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className={`relative transition-all ${searchFocused ? 'scale-[1.02]' : ''}`}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                placeholder="Search transactions, reports, and help"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full pl-10 pr-4 py-2 bg-white/15 border border-white/20 rounded-md text-white placeholder-white/60 focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 focus:outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {/* Create Button */}
            <div className="relative" ref={createMenuRef}>
              <button
                onClick={() => setCreateMenuOpen(!createMenuOpen)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-md transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>

              {/* Create Menu Dropdown */}
              {createMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customers</h4>
                      {createMenuItems.customers.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            if (item.label === 'Invoice') setShowInvoiceForm(true);
                            item.action();
                            setCreateMenuOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                        >
                          <item.icon className="w-4 h-4 text-gray-400" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Vendors</h4>
                      {createMenuItems.vendors.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            if (item.label === 'Expense') setShowExpenseForm(true);
                            item.action();
                            setCreateMenuOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                        >
                          <item.icon className="w-4 h-4 text-gray-400" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
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

            <button
              onClick={onSync}
              disabled={syncing}
              className="p-2 hover:bg-white/20 rounded-md transition-colors"
              title="Sync to Filecoin"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 hover:bg-white/20 rounded-md transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Gear Menu */}
            <div className="relative" ref={gearMenuRef}>
              <button
                onClick={() => setGearMenuOpen(!gearMenuOpen)}
                className="p-2 hover:bg-white/20 rounded-md transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>

              {gearMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="p-3 grid grid-cols-2 gap-3">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Your Company</h4>
                      {GEAR_MENU_ITEMS.yourCompany.map((item) => (
                        <button
                          key={item.id}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                        >
                          <item.icon className="w-4 h-4 text-gray-400" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Lists</h4>
                      {GEAR_MENU_ITEMS.lists.slice(0, 4).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.id === 'products-services') {
                              setActiveSection('products');
                              setGearMenuOpen(false);
                            } else if (item.id === 'chart-of-accounts-gear') {
                              setActiveSection('chart-of-accounts');
                              setGearMenuOpen(false);
                            }
                          }}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                        >
                          <item.icon className="w-4 h-4 text-gray-400" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 p-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Tools</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {GEAR_MENU_ITEMS.tools.slice(0, 4).map((item) => (
                        <button
                          key={item.id}
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

            <button className="p-2 hover:bg-white/20 rounded-md transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation - Exact QB Online style */}
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-56'} bg-[#1c1c1c] text-white flex-shrink-0 overflow-y-auto transition-all duration-200 hidden lg:block`}>
          <nav className="py-2">
            {QB_SIDEBAR_ITEMS.map((item) => (
              <div key={item.id}>
                {/* Main Menu Item */}
                <button
                  onClick={() => {
                    if ('submenu' in item && item.submenu) {
                      toggleMenu(item.id);
                    } else {
                      handleSidebarClick(item.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    activeSection === item.id || (activeSubSection && 'submenu' in item && item.submenu?.some(s => s.id === activeSubSection))
                      ? 'bg-white/10 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {'submenu' in item && item.submenu && (
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenus.includes(item.id) ? 'rotate-180' : ''}`} />
                      )}
                    </>
                  )}
                </button>

                {/* Submenu Items */}
                {'submenu' in item && item.submenu && expandedMenus.includes(item.id) && !sidebarCollapsed && (
                  <div className="bg-black/20">
                    {item.submenu.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleSidebarClick(item.id, sub.id)}
                        className={`w-full flex items-center gap-3 pl-12 pr-4 py-2 text-sm transition-colors ${
                          activeSubSection === sub.id
                            ? 'bg-white/10 text-white'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Filecoin/AI Section */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <Link
                href="/ai-assistant"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 transition-colors"
              >
                <Sparkles className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>AI Assistant</span>}
              </Link>
              <div className="px-4 py-2.5 flex items-center gap-3 text-sm text-gray-500">
                <Database className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2">
                    <span>Filecoin</span>
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  </div>
                )}
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-900 font-medium">Sync Error</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                  <button onClick={onRefresh} className="text-red-600 hover:text-red-700">
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
                {activeSection === 'banking' && renderBanking()}
                {activeSection === 'invoices' && renderDataSection('invoices', 'Invoices')}
                {activeSection === 'expenses' && renderDataSection('expenses', 'Expenses')}
                {activeSection === 'customers' && renderDataSection('customers', 'Customers')}
                {activeSection === 'vendors' && renderDataSection('vendors', 'Vendors')}
                {activeSection === 'reports' && renderReports()}
                {activeSection === 'products' && renderProducts()}
                {activeSection === 'chart-of-accounts' && renderChartOfAccounts()}
              </>
            )}
          </div>

          {/* Filecoin Storage Badge */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Your data is encrypted with AES-256 and stored on Filecoin/IPFS</span>
              {lastSync && (
                <span className="text-gray-400">• Last sync: {new Date(lastSync).toLocaleString()}</span>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-[#2CA01C] text-white px-6 py-4 flex items-center justify-between">
              <h2 className="font-semibold">Invoice</h2>
              <button onClick={() => setShowInvoiceForm(false)} className="p-1 hover:bg-white/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Invoice Form - QB Style */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    value={invoiceForm.customerId}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, customerId: e.target.value }))}
                  >
                    <option value="">Select a customer</option>
                    {customers.map((c, i) => (
                      <option key={i} value={String(c.id)}>{String(c.display_name || c.company_name)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="customer@email.com"
                    value={invoiceForm.customerEmail}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={invoiceForm.invoiceDate}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={invoiceForm.terms}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, terms: e.target.value }))}
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Due on receipt">Due on receipt</option>
                  </select>
                </div>
              </div>
              {/* Line Items */}
              <div className="mb-6">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 w-24">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 w-32">Rate</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 w-32">Amount</th>
                      <th className="px-4 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceForm.lineItems.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2">
                          <input
                            className="w-full px-2 py-1 border rounded"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateInvoiceLineItem(index, 'description', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            className="w-full px-2 py-1 border rounded text-right"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full px-2 py-1 border rounded text-right"
                            placeholder="0.00"
                            value={item.rate || ''}
                            onChange={(e) => updateInvoiceLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          ${(item.quantity * item.rate).toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          {invoiceForm.lineItems.length > 1 && (
                            <button
                              onClick={() => removeInvoiceLineItem(index)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={addInvoiceLineItem}
                  className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add line
                </button>
              </div>
              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${invoiceSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (0%)</span>
                    <span>${invoiceTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>${invoiceTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex items-center justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowInvoiceForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                disabled={savingInvoice}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveInvoice(false)}
                disabled={savingInvoice}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                {savingInvoice ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => handleSaveInvoice(true)}
                disabled={savingInvoice}
                className="px-4 py-2 bg-[#2CA01C] text-white rounded-lg hover:bg-[#248a17] disabled:opacity-50"
              >
                {savingInvoice ? 'Saving...' : 'Save and send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="bg-[#2CA01C] text-white px-6 py-4 flex items-center justify-between">
              <h2 className="font-semibold">Expense</h2>
              <button onClick={() => setShowExpenseForm(false)} className="p-1 hover:bg-white/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payee</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={expenseForm.vendorId}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, vendorId: e.target.value }))}
                  >
                    <option value="">Select a payee (optional)</option>
                    {vendors.map((v, i) => (
                      <option key={i} value={String(v.id)}>{String(v.display_name || v.company_name)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment account</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={expenseForm.paymentAccount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, paymentAccount: e.target.value }))}
                  >
                    <option value="Business Checking">Business Checking</option>
                    <option value="Business Credit Card">Business Credit Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={expenseForm.paymentDate}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <option value="Check">Check</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ref no.</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Optional"
                    value={expenseForm.refNo}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, refNo: e.target.value }))}
                  />
                </div>
              </div>
              {/* Category/Amount */}
              <div className="mb-6">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 w-32">Amount</th>
                      <th className="px-4 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseForm.lineItems.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2">
                          <select
                            className="w-full px-2 py-1 border rounded"
                            value={item.category}
                            onChange={(e) => updateExpenseLineItem(index, 'category', e.target.value)}
                          >
                            <option value="Office Supplies & Software">Office Supplies & Software</option>
                            <option value="Advertising & Marketing">Advertising & Marketing</option>
                            <option value="Travel">Travel</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Rent">Rent</option>
                            <option value="Insurance">Insurance</option>
                            <option value="Professional Services">Professional Services</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            className="w-full px-2 py-1 border rounded"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateExpenseLineItem(index, 'description', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full px-2 py-1 border rounded text-right"
                            placeholder="0.00"
                            value={item.amount || ''}
                            onChange={(e) => updateExpenseLineItem(index, 'amount', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          {expenseForm.lineItems.length > 1 && (
                            <button
                              onClick={() => removeExpenseLineItem(index)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={addExpenseLineItem}
                  className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add line
                </button>
              </div>
              {/* Total */}
              <div className="flex justify-end">
                <div className="w-48">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>${expenseTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4 flex items-center justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowExpenseForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                disabled={savingExpense}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExpense}
                disabled={savingExpense}
                className="px-4 py-2 bg-[#2CA01C] text-white rounded-lg hover:bg-[#248a17] disabled:opacity-50"
              >
                {savingExpense ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
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
      console.warn('Failed to cache integration data:', e);
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

      // Cache valid for 60 minutes
      if (cacheAgeMinutes < 60 && cacheData.data?.length > 0) {
        return cacheData;
      }
      return null;
    } catch (e) {
      console.warn('Failed to load cached integration data:', e);
      return null;
    }
  }, [address, integration, getCacheKey]);

  // Fetch data from Filecoin
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
      let syncTime: string | null = null;
      if (result.data && result.data.length > 0) {
        const mostRecent = result.data.reduce((latest, item) => {
          const itemDate = item.data?.synced_at || item.uploaded_at;
          const latestDate = latest.data?.synced_at || latest.uploaded_at;
          return new Date(itemDate) > new Date(latestDate) ? item : latest;
        });
        syncTime = mostRecent.data?.synced_at || mostRecent.uploaded_at;
        setLastSync(syncTime);
      }

      // Save to cache
      saveToCache(result.data || [], syncTime);
    } catch (err) {
      console.error('Error fetching integration data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [address, integration, loadFromCache, saveToCache]);

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
      console.error('Sync error:', err);
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
        <QuickBooksPage
          walletAddress={address}
          data={Object.keys(quickbooksData).length > 0 ? quickbooksData : null}
          onRefresh={syncData}
        />
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
        <SalesforcePage
          walletAddress={address}
          data={salesforceData}
          onRefresh={refreshData}
        />
      </Layout>
    );
  }

  // Render Slack-native UI for Slack integration
  if (integration === 'slack') {
    // Transform data into format expected by SlackPage
    const slackData = {
      data: data.reduce((acc, item) => {
        acc[item.data_type] = item.data;
        return acc;
      }, {} as Record<string, any>)
    };

    return (
      <Layout>
        <SlackPage
          walletAddress={address}
          data={slackData}
        />
      </Layout>
    );
  }

  // Render Google Workspace native UI for Google integration
  if (integration === 'google' || integration === 'google_workspace' || integration === 'googleworkspace') {
    // Transform data into format expected by GoogleWorkspacePage
    // Backend stores: { data_type: "gmail", data: { records: [...] } }
    // Frontend expects: { gmail: { messages: [...] } }
    const dataTypeToPropertyMap: Record<string, string> = {
      'gmail': 'messages',
      'calendar': 'events',
      'drive': 'files',
      'contacts': 'contacts'
    };

    const googleData = data.reduce((acc, item) => {
      const propertyName = dataTypeToPropertyMap[item.data_type] || 'records';
      // Transform records array to expected property name
      acc[item.data_type] = {
        [propertyName]: item.data?.records || item.data?.[propertyName] || []
      };
      return acc;
    }, {} as Record<string, any>);

    return (
      <Layout>
        <GoogleWorkspacePage
          walletAddress={address}
          data={googleData}
          onSync={syncData}
          onRefresh={refreshData}
          loading={loading}
        />
      </Layout>
    );
  }

  // Render Microsoft 365 native UI for Microsoft integration
  if (integration === 'microsoft' || integration === 'microsoft365') {
    // Transform data into format expected by Microsoft365Page
    // Backend stores: { data_type: "mail", data: { records: [...] } }
    // Frontend expects: { mail: { messages: [...] } }
    const msDataTypeToPropertyMap: Record<string, string> = {
      'mail': 'messages',
      'calendar': 'events',
      'onedrive': 'files',
      'contacts': 'contacts'
    };

    const microsoftData = data.reduce((acc, item) => {
      const propertyName = msDataTypeToPropertyMap[item.data_type] || 'records';
      // Transform records array to expected property name
      acc[item.data_type] = {
        [propertyName]: item.data?.records || item.data?.[propertyName] || []
      };
      return acc;
    }, {} as Record<string, any>);

    return (
      <Layout>
        <Microsoft365Page
          walletAddress={address}
          data={microsoftData}
          onSync={syncData}
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
