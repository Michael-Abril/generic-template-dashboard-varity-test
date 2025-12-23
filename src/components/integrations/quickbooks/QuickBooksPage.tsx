"use client";

import React, { useState } from 'react';
import { RefreshCw, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Import simplified sub-components
import QuickBooksDashboard from './QuickBooksDashboard';
import InvoicesList from './InvoicesList';
import ExpensesList from './ExpensesList';

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

// Simple tab configuration for MVP
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'expenses', label: 'Expenses' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function QuickBooksPage({ walletAddress, data, onRefresh }: QuickBooksPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onRefresh?.();
    } finally {
      setIsSyncing(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <QuickBooksDashboard walletAddress={walletAddress} data={data} />;
      case 'invoices':
        return <InvoicesList walletAddress={walletAddress} invoices={data?.invoices || []} />;
      case 'expenses':
        return <ExpensesList walletAddress={walletAddress} expenses={data?.expenses || []} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">QuickBooks</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Accounting & Invoicing</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </Button>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.id === 'invoices' && data?.invoices?.length ? (
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                  {data.invoices.length}
                </span>
              ) : null}
              {tab.id === 'expenses' && data?.expenses?.length ? (
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                  {data.expenses.length}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {renderTabContent()}
      </div>
    </div>
  );
}
