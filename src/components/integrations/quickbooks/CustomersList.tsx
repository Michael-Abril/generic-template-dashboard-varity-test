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
import CustomerForm from './CustomerForm';

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
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setShowCustomerForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quickbooks/customers/${customerId}?wallet_address=${walletAddress}`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      if (result.success) {
        alert('Customer deleted successfully');
        window.location.reload();
      } else {
        alert('Failed to delete customer: ' + (result.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    }
  };

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
        <Button onClick={handleCreateCustomer} className="bg-green-600 hover:bg-green-700">
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
                          <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteCustomer(customer.id)}
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
          </div>
        </CardContent>
      </Card>

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <CustomerForm
          customer={selectedCustomer ? {
            displayName: selectedCustomer.displayName,
            companyName: selectedCustomer.companyName,
            email: selectedCustomer.email,
            phone: selectedCustomer.phone
          } : undefined}
          onClose={() => {
            setShowCustomerForm(false);
            setSelectedCustomer(null);
          }}
          onSave={async (customerData) => {
            try {
              const url = selectedCustomer
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quickbooks/customers/${selectedCustomer.id}?wallet_address=${walletAddress}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/quickbooks/customers?wallet_address=${walletAddress}`;

              const method = selectedCustomer ? 'PATCH' : 'POST';

              const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
              });

              const result = await response.json();
              if (result.success) {
                setShowCustomerForm(false);
                setSelectedCustomer(null);
                window.location.reload();
              } else {
                alert('Failed to save customer: ' + (result.detail || 'Unknown error'));
              }
            } catch (error) {
              console.error('Error saving customer:', error);
              alert('Failed to save customer');
            }
          }}
        />
      )}
    </div>
  );
}
