"use client";

import React, { useState, useMemo } from 'react';
import { Search, Receipt } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Expense {
  // Backend transformed format (snake_case)
  id?: string;
  vendor_name?: string;
  total_amount?: number;
  txn_date?: string;
  payment_type?: string;
  account?: string;
  doc_number?: string;
  // Original QuickBooks API format (for fallback)
  Id?: string;
  EntityRef?: { name?: string };
  AccountRef?: { name?: string };
  TxnDate?: string;
  TotalAmt?: number;
  PaymentType?: string;
  PaymentMethodRef?: { name?: string };
  PrivateNote?: string;
}

interface ExpensesListProps {
  walletAddress: string;
  expenses?: Expense[];
}

// Normalize expense data - handles both backend transformed and raw QB formats
function normalizeExpense(exp: Expense) {
  return {
    id: exp.id || exp.Id || String(Math.random()),
    vendor: exp.vendor_name || exp.EntityRef?.name || 'Unknown Vendor',
    category: exp.account || exp.AccountRef?.name || 'Uncategorized',
    date: exp.txn_date || exp.TxnDate || '',
    amount: exp.total_amount ?? exp.TotalAmt ?? 0,
    paymentMethod: exp.payment_type || exp.PaymentMethodRef?.name || exp.PaymentType || '-',
    memo: exp.PrivateNote || '',
  };
}

export default function ExpensesList({ walletAddress, expenses: rawExpenses = [] }: ExpensesListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize and filter expenses
  const expenses = useMemo(() => {
    const normalized = rawExpenses.map(normalizeExpense);

    if (!searchQuery.trim()) return normalized;

    const query = searchQuery.toLowerCase();
    return normalized.filter(exp =>
      exp.vendor.toLowerCase().includes(query) ||
      exp.category.toLowerCase().includes(query) ||
      exp.memo.toLowerCase().includes(query)
    );
  }, [rawExpenses, searchQuery]);

  // Calculate total
  const total = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search and Total */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by vendor, category, or memo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${total.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Expenses ({expenses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {rawExpenses.length === 0
                  ? 'No expenses synced yet'
                  : 'No expenses match your search'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Vendor
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Payment Method
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(expense.date)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                        {expense.vendor}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {expense.category}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {expense.paymentMethod}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                        ${expense.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
