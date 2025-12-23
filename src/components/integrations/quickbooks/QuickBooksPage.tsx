"use client";

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Landmark, DollarSign, Receipt,
  UsersRound, BarChart3, FileCheck,
  ChevronDown, ChevronRight, Plus, Settings, Search, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Import sub-components (to be created)
import QuickBooksDashboard from './QuickBooksDashboard';
import InvoicesList from './InvoicesList';
import CustomersList from './CustomersList';
import ExpensesList from './ExpensesList';
import VendorsList from './VendorsList';
import ReportViewer from './ReportViewer';
import InvoiceForm from './InvoiceForm';
import CustomerForm from './CustomerForm';
import ExpenseForm from './ExpenseForm';

interface QuickBooksPageProps {
  walletAddress: string;
  data: any;
  onRefresh?: () => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  submenu?: Array<{ id: string; label: string }>;
  comingSoon?: boolean;
}

// Simplified sidebar for SMBs - core features that small businesses use daily
const QB_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'sales',
    label: 'Sales',
    icon: DollarSign,
    submenu: [
      { id: 'invoices', label: 'Invoices' },
      { id: 'customers', label: 'Customers' },
    ]
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: Receipt,
    submenu: [
      { id: 'expenses-list', label: 'Expenses' },
      { id: 'vendors', label: 'Vendors' },
    ]
  },
  // Coming Soon - core features businesses expect
  { id: 'banking', label: 'Banking', icon: Landmark, comingSoon: true },
  { id: 'reports', label: 'Reports', icon: BarChart3, comingSoon: true },
  { id: 'taxes', label: 'Taxes', icon: FileCheck, comingSoon: true },
  { id: 'payroll', label: 'Payroll', icon: UsersRound, comingSoon: true },
  // Hidden: Bookmarks, Projects, Mileage, Accounting, My Accountant, Apps (enterprise features)
];

const CREATE_MENU_ITEMS = {
  customers: [
    { label: 'Invoice', value: 'invoice' },
    { label: 'Sales Receipt', value: 'sales-receipt' },
    { label: 'Estimate', value: 'estimate' },
    { label: 'Receive Payment', value: 'receive-payment' },
    { label: 'Credit Memo', value: 'credit-memo' },
  ],
  vendors: [
    { label: 'Expense', value: 'expense' },
    { label: 'Check', value: 'check' },
    { label: 'Bill', value: 'bill' },
    { label: 'Purchase Order', value: 'purchase-order' },
    { label: 'Vendor Credit', value: 'vendor-credit' },
  ],
  other: [
    { label: 'Bank Deposit', value: 'bank-deposit' },
    { label: 'Transfer', value: 'transfer' },
    { label: 'Journal Entry', value: 'journal-entry' },
  ]
};

export default function QuickBooksPage({ walletAddress, data, onRefresh }: QuickBooksPageProps) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [expandedItems, setExpandedItems] = useState<string[]>(['sales', 'expenses', 'accounting']);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleNavigation = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const handleCreateAction = (action: string) => {
    setShowCreateMenu(false);

    // Open appropriate form based on action
    switch(action) {
      case 'invoice':
        setShowInvoiceForm(true);
        break;
      case 'expense':
        setShowExpenseForm(true);
        break;
      // Additional actions can be mapped here
      default:
        console.log('Create action:', action);
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <QuickBooksDashboard walletAddress={walletAddress} data={data} />;

      case 'invoices':
        return <InvoicesList walletAddress={walletAddress} invoices={data?.invoices || []} />;

      case 'customers':
        return <CustomersList walletAddress={walletAddress} customers={data?.customers || []} />;

      case 'expenses-list':
        return <ExpensesList walletAddress={walletAddress} expenses={data?.expenses || []} />;

      case 'vendors':
        return <VendorsList walletAddress={walletAddress} vendors={data?.vendors || []} />;

      case 'reports':
        return <ReportViewer walletAddress={walletAddress} />;

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {activeSection.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                This section is under construction
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Left Sidebar - QuickBooks Navigation */}
      <aside className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Company Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">QB</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                My Company
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                QuickBooks Online
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          {QB_SIDEBAR_ITEMS.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.comingSoon) return; // Disabled for coming soon items
                  if (item.submenu) {
                    toggleExpanded(item.id);
                  } else {
                    handleNavigation(item.id);
                  }
                }}
                disabled={item.comingSoon}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm ${
                  item.comingSoon
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : activeSection === item.id
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className={`w-5 h-5 ${item.comingSoon ? 'text-gray-300 dark:text-gray-600' : ''}`} />
                  <span>{item.label}</span>
                </div>
                {item.comingSoon && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Soon
                  </span>
                )}
                {item.submenu && !item.comingSoon && (
                  expandedItems.includes(item.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )
                )}
              </button>

              {/* Submenu */}
              {item.submenu && expandedItems.includes(item.id) && !item.comingSoon && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.submenu.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => handleNavigation(subItem.id)}
                      className={`w-full text-left px-4 py-1.5 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded ${
                        activeSection === subItem.id
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => console.log('Feedback')}
          >
            Give Feedback
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search transactions, customers, vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-4">
              {/* Create Button (+ Menu) */}
              <div className="relative">
                <Button
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </Button>

                {/* Create Dropdown Menu */}
                {showCreateMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-2">
                      <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Customers
                      </p>
                      {CREATE_MENU_ITEMS.customers.map((item) => (
                        <button
                          key={item.value}
                          onClick={() => handleCreateAction(item.value)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {item.label}
                        </button>
                      ))}

                      <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

                      <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Vendors
                      </p>
                      {CREATE_MENU_ITEMS.vendors.map((item) => (
                        <button
                          key={item.value}
                          onClick={() => handleCreateAction(item.value)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {item.label}
                        </button>
                      ))}

                      <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

                      <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Other
                      </p>
                      {CREATE_MENU_ITEMS.other.map((item) => (
                        <button
                          key={item.value}
                          onClick={() => handleCreateAction(item.value)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              {/* Settings */}
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {renderActiveSection()}
        </div>
      </main>

      {/* Form Modals */}
      {showInvoiceForm && (
        <InvoiceForm
          onClose={() => setShowInvoiceForm(false)}
          onSave={async (invoiceData) => {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quickbooks/invoices?wallet_address=${walletAddress}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(invoiceData)
                }
              );
              const result = await response.json();
              if (result.success) {
                setShowInvoiceForm(false);
                // Refresh data after creating invoice
                onRefresh?.();
              } else {
                alert('Failed to create invoice: ' + (result.detail || 'Unknown error'));
              }
            } catch (error) {
              console.error('Error creating invoice:', error);
              alert('Failed to create invoice');
            }
          }}
        />
      )}

      {showCustomerForm && (
        <CustomerForm
          onClose={() => setShowCustomerForm(false)}
          onSave={async (customerData) => {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quickbooks/customers?wallet_address=${walletAddress}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(customerData)
                }
              );
              const result = await response.json();
              if (result.success) {
                setShowCustomerForm(false);
                // Refresh data after creating customer
                onRefresh?.();
              } else {
                alert('Failed to create customer: ' + (result.detail || 'Unknown error'));
              }
            } catch (error) {
              console.error('Error creating customer:', error);
              alert('Failed to create customer');
            }
          }}
        />
      )}

      {showExpenseForm && (
        <ExpenseForm
          onClose={() => setShowExpenseForm(false)}
          onSave={async (expenseData) => {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quickbooks/expenses?wallet_address=${walletAddress}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(expenseData)
                }
              );
              const result = await response.json();
              if (result.success) {
                setShowExpenseForm(false);
                // Refresh data after creating expense
                onRefresh?.();
              } else {
                alert('Failed to create expense: ' + (result.detail || 'Unknown error'));
              }
            } catch (error) {
              console.error('Error creating expense:', error);
              alert('Failed to create expense');
            }
          }}
        />
      )}
    </div>
  );
}
