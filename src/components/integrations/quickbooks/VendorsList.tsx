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

interface Vendor {
  id?: string;
  Id?: string;
  displayName?: string;
  DisplayName?: string;
  companyName?: string;
  CompanyName?: string;
  email?: string;
  PrimaryEmailAddr?: { Address?: string };
  phone?: string;
  PrimaryPhone?: { FreeFormNumber?: string };
  balance?: number;
  Balance?: number;
  openBills?: number;
}

interface VendorsListProps {
  walletAddress: string;
  vendors?: Vendor[];
}

// Helper function to normalize vendor data from QuickBooks API format
function normalizeVendor(vendor: Vendor): {
  id: string;
  displayName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  balance: number;
  openBills: number;
} {
  return {
    id: vendor.id || vendor.Id || String(Math.random()),
    displayName: vendor.displayName || vendor.DisplayName || 'Unknown',
    companyName: vendor.companyName || vendor.CompanyName,
    email: vendor.email || vendor.PrimaryEmailAddr?.Address,
    phone: vendor.phone || vendor.PrimaryPhone?.FreeFormNumber,
    balance: vendor.balance ?? vendor.Balance ?? 0,
    openBills: vendor.openBills ?? 0
  };
}

export default function VendorsList({ walletAddress, vendors: rawVendors = [] }: VendorsListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize vendors from QuickBooks API format
  const vendors = rawVendors.map(normalizeVendor);

  const filteredVendors = vendors.filter(vendor =>
    vendor.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (vendor.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendors</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your vendor contacts and relationships
          </p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          New Vendor
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Vendors ({filteredVendors.length})</CardTitle>
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
                    Open Bills
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {vendor.displayName}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {vendor.companyName || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="space-y-1">
                        {vendor.email && (
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Mail className="w-3 h-3 mr-2" />
                            {vendor.email}
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Phone className="w-3 h-3 mr-2" />
                            {vendor.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                      ${vendor.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-gray-600 dark:text-gray-400">
                      {vendor.openBills}
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
