"use client";

import React from 'react';
import { DollarSign, Receipt, TrendingUp, Users, FileText, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuickBooksDashboardProps {
  walletAddress: string;
  data: any;
}

export default function QuickBooksDashboard({ walletAddress, data }: QuickBooksDashboardProps) {
  // Mock data - will be replaced with real API data
  const dashboardData = {
    invoices: {
      paid: { count: 45, amount: 125000 },
      open: { count: 12, amount: 34500 },
      overdue: { count: 3, amount: 8200 }
    },
    expenses: {
      total: 42300,
      thisMonth: 8500,
      count: 156
    },
    customers: {
      total: 87,
      new: 5
    },
    vendors: {
      total: 34,
      active: 28
    },
    bankAccounts: [
      { name: 'Business Checking', balance: 45678.90, lastUpdated: '2 hours ago' },
      { name: 'Savings Account', balance: 125000.00, lastUpdated: '1 day ago' },
      { name: 'Credit Card', balance: -3456.78, lastUpdated: '3 hours ago' }
    ]
  };

  const shortcuts = [
    { icon: FileText, label: 'Invoice', color: 'bg-blue-500' },
    { icon: Receipt, label: 'Expense', color: 'bg-green-500' },
    { icon: DollarSign, label: 'Sales Receipt', color: 'bg-purple-500' },
    { icon: Users, label: 'Customer', color: 'bg-orange-500' },
    { icon: FileText, label: 'Estimate', color: 'bg-pink-500' },
    { icon: Clock, label: 'Time Entry', color: 'bg-yellow-500' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      {/* Shortcuts Carousel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {shortcuts.map((shortcut, index) => (
              <button
                key={index}
                className="flex-shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className={`${shortcut.color} p-3 rounded-full mb-2`}>
                  <shortcut.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300 text-center">
                  {shortcut.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Invoices Widget */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Paid</span>
              <span className="text-sm font-semibold text-green-600">
                ${dashboardData.invoices.paid.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Open</span>
              <span className="text-sm font-semibold text-blue-600">
                ${dashboardData.invoices.open.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Overdue</span>
              <span className="text-sm font-semibold text-red-600">
                ${dashboardData.invoices.overdue.amount.toLocaleString()}
              </span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2">
              View All Invoices
            </Button>
          </CardContent>
        </Card>

        {/* Expenses Widget */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${dashboardData.expenses.total.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total this year</p>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This month: <span className="font-semibold">${dashboardData.expenses.thisMonth.toLocaleString()}</span>
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              View Expenses
            </Button>
          </CardContent>
        </Card>

        {/* Profit & Loss Widget */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Profit & Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Income</p>
                <p className="text-lg font-bold text-green-600">$159,500</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expenses</p>
                <p className="text-lg font-bold text-red-600">$42,300</p>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Net Income</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">$117,200</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Widget */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Customers</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {dashboardData.customers.total}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Vendors</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {dashboardData.vendors.total}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Open Invoices</span>
              <span className="text-sm font-semibold text-blue-600">
                {dashboardData.invoices.open.count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Overdue</span>
              <span className="text-sm font-semibold text-red-600">
                {dashboardData.invoices.overdue.count}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.bankAccounts.map((account, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{account.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Updated {account.lastUpdated}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    account.balance < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'
                  }`}>
                    ${Math.abs(account.balance).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  {account.balance < 0 && (
                    <span className="text-xs text-red-600">Credit</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            Connect Bank Account
          </Button>
        </CardContent>
      </Card>

      {/* Business Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Overdue Invoices Alert */}
            {dashboardData.invoices.overdue.count > 0 && (
              <div className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-200">
                    {dashboardData.invoices.overdue.count} Overdue Invoices
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Total: ${dashboardData.invoices.overdue.amount.toLocaleString()}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="flex-shrink-0">
                  View
                </Button>
              </div>
            )}

            {/* Recent Activity */}
            <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Sales are up 15% this month
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Great job! Keep up the momentum.
                </p>
              </div>
            </div>

            {/* Sync Status */}
            <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-200">
                  All data synced to Filecoin
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Last sync: 5 minutes ago
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
