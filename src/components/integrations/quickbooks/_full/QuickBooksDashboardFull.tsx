"use client";

import React, { useMemo } from 'react';
import { DollarSign, Receipt, TrendingUp, Users, FileText, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuickBooksDashboardProps {
  walletAddress: string;
  data: {
    invoices?: any[];
    expenses?: any[];
    customers?: any[];
    vendors?: any[];
    payments?: any[];
  } | null;
}

export default function QuickBooksDashboard({ walletAddress, data }: QuickBooksDashboardProps) {
  // Calculate dashboard stats from real data
  const dashboardData = useMemo(() => {
    const invoices = data?.invoices || [];
    const expenses = data?.expenses || [];
    const customers = data?.customers || [];
    const vendors = data?.vendors || [];

    // Calculate invoice stats
    // Backend uses snake_case: total_amount, due_date, balance, status
    const now = new Date();
    const invoiceStats = invoices.reduce(
      (acc, inv) => {
        const balance = inv.balance ?? inv.Balance ?? 0;
        const amount = inv.total_amount ?? inv.amount ?? inv.TotalAmt ?? 0;
        const dueDate = inv.due_date || inv.dueDate || inv.DueDate;
        const backendStatus = inv.status; // 'paid' or 'outstanding' from backend

        if (backendStatus === 'paid' || (balance === 0 && amount > 0)) {
          acc.paid.count++;
          acc.paid.amount += amount;
        } else if (dueDate && new Date(dueDate) < now) {
          acc.overdue.count++;
          acc.overdue.amount += balance;
        } else {
          acc.open.count++;
          acc.open.amount += balance;
        }
        return acc;
      },
      {
        paid: { count: 0, amount: 0 },
        open: { count: 0, amount: 0 },
        overdue: { count: 0, amount: 0 }
      }
    );

    // Calculate expense stats
    // Backend uses snake_case: total_amount, txn_date
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const expenseStats = expenses.reduce(
      (acc, exp) => {
        const amount = exp.total_amount ?? exp.amount ?? exp.TotalAmt ?? 0;
        const txnDate = exp.txn_date || exp.date || exp.TxnDate;
        acc.total += amount;
        acc.count++;
        if (txnDate && new Date(txnDate) >= thisMonth) {
          acc.thisMonth += amount;
        }
        return acc;
      },
      { total: 0, thisMonth: 0, count: 0 }
    );

    // Calculate total income (paid invoices)
    const totalIncome = invoiceStats.paid.amount;
    const netIncome = totalIncome - expenseStats.total;

    return {
      invoices: invoiceStats,
      expenses: expenseStats,
      customers: {
        total: customers.length,
        new: 0 // Would need creation date to calculate
      },
      vendors: {
        total: vendors.length,
        active: vendors.length
      },
      bankAccounts: [], // Bank accounts would come from a separate API
      totalIncome,
      netIncome,
      hasData: invoices.length > 0 || expenses.length > 0 || customers.length > 0 || vendors.length > 0
    };
  }, [data]);

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
                <p className="text-lg font-bold text-green-600">
                  ${dashboardData.totalIncome.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expenses</p>
                <p className="text-lg font-bold text-red-600">
                  ${dashboardData.expenses.total.toLocaleString()}
                </p>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Net Income</p>
                <p className={`text-xl font-bold ${dashboardData.netIncome >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>
                  ${Math.abs(dashboardData.netIncome).toLocaleString()}
                  {dashboardData.netIncome < 0 && <span className="text-xs ml-1">(Loss)</span>}
                </p>
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
          {dashboardData.bankAccounts.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.bankAccounts.map((account: { name: string; balance: number; lastUpdated: string }, index: number) => (
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
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No bank accounts connected yet.</p>
              <p className="text-xs mt-1">Connect your bank to see real-time balances.</p>
            </div>
          )}
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
            {/* No Data Notice */}
            {!dashboardData.hasData && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                    No QuickBooks data synced yet
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Trigger a sync from the Marketplace to see your real data here.
                  </p>
                </div>
              </div>
            )}

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

            {/* Data Summary */}
            {dashboardData.hasData && (
              <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    Business Summary
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {dashboardData.customers.total} customers, {dashboardData.vendors.total} vendors, {dashboardData.invoices.paid.count + dashboardData.invoices.open.count + dashboardData.invoices.overdue.count} invoices
                  </p>
                </div>
              </div>
            )}

            {/* Sync Status */}
            {dashboardData.hasData && (
              <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-200">
                    Data synced to Filecoin
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Your QuickBooks data is securely stored.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
