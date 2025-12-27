"use client";

import React, { useState } from 'react';
import { Download, Printer, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportViewerProps {
  walletAddress: string;
}

const REPORT_TYPES = [
  { id: 'profit-loss', label: 'Profit and Loss' },
  { id: 'balance-sheet', label: 'Balance Sheet' },
  { id: 'cash-flow', label: 'Cash Flow Statement' },
  { id: 'ar-aging', label: 'A/R Aging Summary' },
  { id: 'ap-aging', label: 'A/P Aging Summary' },
  { id: 'sales-by-customer', label: 'Sales by Customer' },
  { id: 'expenses-by-vendor', label: 'Expenses by Vendor' },
  { id: 'general-ledger', label: 'General Ledger' },
  { id: 'trial-balance', label: 'Trial Balance' },
];

export default function ReportViewer({ walletAddress }: ReportViewerProps) {
  const [selectedReport, setSelectedReport] = useState('profit-loss');
  const [dateRange, setDateRange] = useState('this-year');

  const renderProfitLoss = () => (
    <div className="space-y-6">
      <div className="text-center py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profit and Loss</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          January 1 - December 17, 2025
        </p>
      </div>

      <div className="space-y-4">
        {/* Income Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">INCOME</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Sales</span>
              <span className="font-medium text-gray-900 dark:text-white">$145,000.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Service Revenue</span>
              <span className="font-medium text-gray-900 dark:text-white">$14,500.00</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">Total Income</span>
              <span className="font-semibold text-gray-900 dark:text-white">$159,500.00</span>
            </div>
          </div>
        </div>

        {/* Cost of Goods Sold */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">COST OF GOODS SOLD</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Cost of Materials</span>
              <span className="font-medium text-gray-900 dark:text-white">$28,000.00</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">Total COGS</span>
              <span className="font-semibold text-gray-900 dark:text-white">$28,000.00</span>
            </div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="flex justify-between">
            <span className="font-bold text-gray-900 dark:text-white">GROSS PROFIT</span>
            <span className="font-bold text-green-600 dark:text-green-400">$131,500.00</span>
          </div>
        </div>

        {/* Expenses */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">EXPENSES</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Advertising</span>
              <span className="font-medium text-gray-900 dark:text-white">$3,200.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Office Supplies</span>
              <span className="font-medium text-gray-900 dark:text-white">$1,250.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Software & Subscriptions</span>
              <span className="font-medium text-gray-900 dark:text-white">$4,800.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Utilities</span>
              <span className="font-medium text-gray-900 dark:text-white">$2,100.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Rent</span>
              <span className="font-medium text-gray-900 dark:text-white">$12,000.00</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">Total Expenses</span>
              <span className="font-semibold text-gray-900 dark:text-white">$23,350.00</span>
            </div>
          </div>
        </div>

        {/* Net Income */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex justify-between">
            <span className="font-bold text-xl text-gray-900 dark:text-white">NET INCOME</span>
            <span className="font-bold text-xl text-blue-600 dark:text-blue-400">$108,150.00</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBalanceSheet = () => (
    <div className="space-y-6">
      <div className="text-center py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Balance Sheet</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">As of December 17, 2025</p>
      </div>

      <div className="space-y-4">
        {/* Assets */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">ASSETS</h3>
          <div className="space-y-3 ml-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Current Assets</p>
              <div className="space-y-1 ml-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Bank Accounts</span>
                  <span className="font-medium text-gray-900 dark:text-white">$170,678.90</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Accounts Receivable</span>
                  <span className="font-medium text-gray-900 dark:text-white">$42,700.00</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">Total Assets</span>
              <span className="font-semibold text-gray-900 dark:text-white">$213,378.90</span>
            </div>
          </div>
        </div>

        {/* Liabilities */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">LIABILITIES</h3>
          <div className="space-y-1 ml-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Accounts Payable</span>
              <span className="font-medium text-gray-900 dark:text-white">$6,200.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Credit Cards</span>
              <span className="font-medium text-gray-900 dark:text-white">$3,456.78</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">Total Liabilities</span>
              <span className="font-semibold text-gray-900 dark:text-white">$9,656.78</span>
            </div>
          </div>
        </div>

        {/* Equity */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">EQUITY</h3>
          <div className="space-y-1 ml-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Retained Earnings</span>
              <span className="font-medium text-gray-900 dark:text-white">$95,572.12</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Net Income</span>
              <span className="font-medium text-gray-900 dark:text-white">$108,150.00</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">Total Equity</span>
              <span className="font-semibold text-gray-900 dark:text-white">$203,722.12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View and analyze your financial reports
        </p>
      </div>

      {/* Report Selector and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Report List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Report Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {REPORT_TYPES.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                  selectedReport === report.id
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {report.label}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Report Display */}
        <div className="lg:col-span-3 space-y-4">
          {/* Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="this-quarter">This Quarter</option>
                    <option value="this-year">This Year</option>
                    <option value="last-year">Last Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Customize
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Content */}
          <Card>
            <CardContent className="pt-6">
              {selectedReport === 'profit-loss' && renderProfitLoss()}
              {selectedReport === 'balance-sheet' && renderBalanceSheet()}
              {selectedReport !== 'profit-loss' && selectedReport !== 'balance-sheet' && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    {REPORT_TYPES.find(r => r.id === selectedReport)?.label} report will be displayed here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
