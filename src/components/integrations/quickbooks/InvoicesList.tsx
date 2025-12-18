"use client";

import React, { useState } from 'react';
import { Plus, Search, Filter, Download, Mail, MoreHorizontal, Eye, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import InvoiceForm from './InvoiceForm';

interface InvoicesListProps {
  walletAddress: string;
}

interface Invoice {
  id: string;
  number: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  balance: number;
  status: 'paid' | 'open' | 'overdue' | 'draft';
}

export default function InvoicesList({ walletAddress }: InvoicesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Mock data - will be replaced with API call
  const invoices: Invoice[] = [
    {
      id: '1',
      number: 'INV-1001',
      customer: 'Acme Corporation',
      date: '2025-12-01',
      dueDate: '2025-12-31',
      amount: 5000,
      balance: 5000,
      status: 'open'
    },
    {
      id: '2',
      number: 'INV-1002',
      customer: 'Tech Solutions Inc',
      date: '2025-11-15',
      dueDate: '2025-12-15',
      amount: 3500,
      balance: 0,
      status: 'paid'
    },
    {
      id: '3',
      number: 'INV-1003',
      customer: 'Global Enterprises',
      date: '2025-10-20',
      dueDate: '2025-11-20',
      amount: 8200,
      balance: 8200,
      status: 'overdue'
    },
    {
      id: '4',
      number: 'INV-1004',
      customer: 'Startup Co',
      date: '2025-12-10',
      dueDate: '2026-01-10',
      amount: 2100,
      balance: 2100,
      status: 'open'
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      paid: { variant: 'default', label: 'Paid' },
      open: { variant: 'secondary', label: 'Open' },
      overdue: { variant: 'destructive', label: 'Overdue' },
      draft: { variant: 'outline', label: 'Draft' }
    };

    const config = variants[status] || variants.open;
    return (
      <Badge variant={config.variant as any} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setShowInvoiceForm(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceForm(true);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quickbooks/invoices/${invoiceId}?wallet_address=${walletAddress}`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      if (result.success) {
        alert('Invoice deleted successfully');
        window.location.reload();
      } else {
        alert('Failed to delete invoice: ' + (result.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quickbooks/invoices/${invoiceId}/send?wallet_address=${walletAddress}`,
        {
          method: 'POST'
        }
      );
      const result = await response.json();
      if (result.success) {
        alert('Invoice sent successfully');
      } else {
        alert('Failed to send invoice: ' + (result.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Failed to send invoice');
    }
  };

  const handleDownloadPDF = (invoiceId: string) => {
    // QuickBooks doesn't have a direct PDF download API
    // This would typically open the invoice in QuickBooks
    alert('PDF download feature coming soon');
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         invoice.number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    open: invoices.filter(inv => inv.status === 'open').reduce((sum, inv) => sum + inv.balance, 0),
    overdue: invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.balance, 0),
    paid: invoices.filter(inv => inv.status === 'paid').length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and track all your invoices
          </p>
        </div>
        <Button onClick={handleCreateInvoice} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Invoiced</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              ${stats.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Open</div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              ${stats.open.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Overdue</div>
            <div className="text-2xl font-bold text-red-600 mt-2">
              ${stats.overdue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Paid</div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {stats.paid}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
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
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
                <option value="draft">Draft</option>
              </select>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleEditInvoice(invoice)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        {invoice.number}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {invoice.customer}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(invoice.dueDate).toLocaleDateString()}
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
                    <td className="py-3 px-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendInvoice(invoice.id)}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPDF(invoice.id)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCreateInvoice()}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredInvoices.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No invoices found. Create your first invoice to get started.
                </p>
                <Button onClick={handleCreateInvoice} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <InvoiceForm
          invoice={selectedInvoice ? {
            customer: selectedInvoice.customer,
            number: selectedInvoice.number,
            date: selectedInvoice.date,
            dueDate: selectedInvoice.dueDate
          } : undefined}
          onClose={() => {
            setShowInvoiceForm(false);
            setSelectedInvoice(null);
          }}
          onSave={async (invoiceData) => {
            try {
              const url = selectedInvoice
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quickbooks/invoices/${selectedInvoice.id}?wallet_address=${walletAddress}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quickbooks/invoices?wallet_address=${walletAddress}`;

              const method = selectedInvoice ? 'PATCH' : 'POST';

              const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
              });

              const result = await response.json();
              if (result.success) {
                setShowInvoiceForm(false);
                setSelectedInvoice(null);
                window.location.reload();
              } else {
                alert('Failed to save invoice: ' + (result.detail || 'Unknown error'));
              }
            } catch (error) {
              console.error('Error saving invoice:', error);
              alert('Failed to save invoice');
            }
          }}
        />
      )}
    </div>
  );
}
