"use client";

import React, { useState, useMemo } from 'react';
import { Search, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Invoice {
  // Backend transformed format (snake_case)
  id?: string;
  doc_number?: string;
  customer_name?: string;
  txn_date?: string;
  due_date?: string;
  total_amount?: number;
  balance?: number;
  status?: string;
  // Original QuickBooks API format (for fallback)
  DocNumber?: string;
  CustomerRef?: { name?: string; value?: string };
  TxnDate?: string;
  DueDate?: string;
  TotalAmt?: number;
  Balance?: number;
}

interface InvoicesListProps {
  walletAddress: string;
  invoices?: Invoice[];
}

// Normalize invoice data - handles both backend transformed and raw QB formats
function normalizeInvoice(inv: Invoice) {
  // Backend uses snake_case, QB API uses PascalCase
  const balance = inv.balance ?? inv.Balance ?? 0;
  const amount = inv.total_amount ?? inv.TotalAmt ?? 0;
  const dueDate = inv.due_date || inv.DueDate || '';
  const backendStatus = inv.status; // 'paid' or 'outstanding' from backend

  // Determine display status
  let status: 'paid' | 'open' | 'overdue' = 'open';
  if (backendStatus === 'paid' || (balance === 0 && amount > 0)) {
    status = 'paid';
  } else if (dueDate && new Date(dueDate) < new Date()) {
    status = 'overdue';
  }

  return {
    id: inv.id || String(Math.random()),
    number: inv.doc_number || inv.DocNumber || 'N/A',
    customer: inv.customer_name || inv.CustomerRef?.name || 'Unknown Customer',
    date: inv.txn_date || inv.TxnDate || '',
    dueDate,
    amount,
    balance,
    status,
  };
}

export default function InvoicesList({ walletAddress, invoices: rawInvoices = [] }: InvoicesListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize and filter invoices
  const invoices = useMemo(() => {
    const normalized = rawInvoices.map(normalizeInvoice);

    if (!searchQuery.trim()) return normalized;

    const query = searchQuery.toLowerCase();
    return normalized.filter(inv =>
      inv.customer.toLowerCase().includes(query) ||
      inv.number.toLowerCase().includes(query)
    );
  }, [rawInvoices, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Overdue</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Open</Badge>;
    }
  };

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
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by customer or invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Invoices ({invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {rawInvoices.length === 0
                  ? 'No invoices synced yet'
                  : 'No invoices match your search'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Invoice #
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Due Date
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Amount
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Balance
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                        {invoice.number}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {invoice.customer}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                        ${invoice.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                        ${invoice.balance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(invoice.status)}
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
