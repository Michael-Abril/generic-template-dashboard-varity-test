"use client";

import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface QuickBooksDashboardProps {
  walletAddress: string;
  data: {
    invoices?: any[];
    expenses?: any[];
    customers?: any[];
    vendors?: any[];
  } | null;
}

export default function QuickBooksDashboard({ walletAddress, data }: QuickBooksDashboardProps) {
  // Calculate dashboard stats from real data
  const stats = useMemo(() => {
    const invoices = data?.invoices || [];
    const expenses = data?.expenses || [];

    // Calculate invoice stats
    const now = new Date();
    let totalIncome = 0;
    let openInvoices = 0;
    let overdueInvoices = 0;
    let paidInvoices = 0;

    invoices.forEach((inv: any) => {
      // Backend uses snake_case: total_amount, due_date, status
      const balance = inv.balance ?? inv.Balance ?? 0;
      const amount = inv.total_amount ?? inv.TotalAmt ?? 0;
      const dueDate = inv.due_date || inv.DueDate;
      const backendStatus = inv.status; // 'paid' or 'outstanding'

      if (backendStatus === 'paid' || (balance === 0 && amount > 0)) {
        paidInvoices++;
        totalIncome += amount;
      } else if (dueDate && new Date(dueDate) < now) {
        overdueInvoices++;
      } else {
        openInvoices++;
      }
    });

    // Calculate expense stats - backend uses total_amount
    const totalExpenses = expenses.reduce((sum: number, exp: any) => {
      return sum + (exp.total_amount ?? exp.TotalAmt ?? 0);
    }, 0);

    const netIncome = totalIncome - totalExpenses;
    const hasData = invoices.length > 0 || expenses.length > 0;

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      invoiceCount: invoices.length,
      openInvoices,
      overdueInvoices,
      paidInvoices,
      hasData,
    };
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      {/* No Data Notice */}
      {!stats.hasData && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  No QuickBooks data synced yet
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Click the Sync button above to fetch your QuickBooks data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Income</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ${stats.totalIncome.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  From {stats.paidInvoices} paid invoices
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ${stats.totalExpenses.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {data?.expenses?.length || 0} expenses recorded
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Income */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Income</p>
                <p className={`text-2xl font-bold mt-1 ${
                  stats.netIncome >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  ${Math.abs(stats.netIncome).toLocaleString()}
                  {stats.netIncome < 0 && <span className="text-sm ml-1">(Loss)</span>}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Income minus expenses
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoices</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.invoiceCount}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-green-600">{stats.paidInvoices} paid</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-blue-600">{stats.openInvoices} open</span>
                  {stats.overdueInvoices > 0 && (
                    <>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs text-red-600">{stats.overdueInvoices} overdue</span>
                    </>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {stats.overdueInvoices > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-200">
                  You have {stats.overdueInvoices} overdue invoice{stats.overdueInvoices > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  View the Invoices tab to see details and follow up with customers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
