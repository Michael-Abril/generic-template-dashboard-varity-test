"use client";

import React, { useState } from 'react';
import { Plus, Search, Mail, Phone, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CustomersListProps {
  walletAddress: string;
}

interface Customer {
  id: string;
  displayName: string;
  companyName: string;
  email?: string;
  phone?: string;
  balance: number;
  openInvoices: number;
}

export default function CustomersList({ walletAddress }: CustomersListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data
  const customers: Customer[] = [
    {
      id: '1',
      displayName: 'John Smith',
      companyName: 'Acme Corporation',
      email: 'john@acme.com',
      phone: '555-0123',
      balance: 5000,
      openInvoices: 2
    },
    {
      id: '2',
      displayName: 'Sarah Johnson',
      companyName: 'Tech Solutions Inc',
      email: 'sarah@techsolutions.com',
      phone: '555-0456',
      balance: 0,
      openInvoices: 0
    },
    {
      id: '3',
      displayName: 'Mike Davis',
      companyName: 'Global Enterprises',
      email: 'mike@global.com',
      phone: '555-0789',
      balance: 8200,
      openInvoices: 1
    },
  ];

  const filteredCustomers = customers.filter(customer =>
    customer.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your customer contacts and relationships
          </p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          New Customer
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Company
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Contact
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Open Balance
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Open Invoices
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {customer.displayName}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {customer.companyName}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Mail className="w-3 h-3 mr-2" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Phone className="w-3 h-3 mr-2" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                      ${customer.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-gray-600 dark:text-gray-400">
                      {customer.openInvoices}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
