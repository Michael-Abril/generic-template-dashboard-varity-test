"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Download, Printer, Calendar, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ReportViewerProps {
  walletAddress: string;
}

// QuickBooks report structure types
interface ColData {
  value?: string;
  id?: string;
}

interface ReportRow {
  Header?: { ColData: ColData[] };
  ColData?: ColData[];
  Rows?: { Row: ReportRow[] };
  Summary?: { ColData: ColData[] };
  type?: string;
  group?: string;
}

interface ReportHeader {
  Time?: string;
  ReportName?: string;
  StartPeriod?: string;
  EndPeriod?: string;
  Currency?: string;
  ReportBasis?: string;
}

interface QuickBooksReport {
  Header?: ReportHeader;
  Columns?: { Column: Array<{ ColTitle: string; ColType: string }> };
  Rows?: { Row: ReportRow[] };
}

interface ReportResponse {
  success: boolean;
  report_type: string;
  report: QuickBooksReport;
  is_live: boolean;
  fetched_at: string;
}

// Map frontend report IDs to backend report types
const REPORT_TYPE_MAP: Record<string, string> = {
  'profit-loss': 'ProfitAndLoss',
  'balance-sheet': 'BalanceSheet',
  'cash-flow': 'CashFlow',
  'ar-aging': 'AgedReceivables',
  'ap-aging': 'AgedPayables',
  'sales-by-customer': 'CustomerSales',
  'expenses-by-vendor': 'VendorExpenses',
  'general-ledger': 'GeneralLedger',
  'trial-balance': 'TrialBalance',
};

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

// Helper to format currency values
const formatCurrency = (value: string | number | undefined): string => {
  if (value === undefined || value === '' || value === null) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Get date range based on selection
const getDateRange = (range: string): { start_date?: string; end_date?: string } => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (range) {
    case 'this-month':
      return {
        start_date: new Date(year, month, 1).toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
      };
    case 'last-month':
      return {
        start_date: new Date(year, month - 1, 1).toISOString().split('T')[0],
        end_date: new Date(year, month, 0).toISOString().split('T')[0],
      };
    case 'this-quarter':
      const quarterStart = new Date(year, Math.floor(month / 3) * 3, 1);
      return {
        start_date: quarterStart.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
      };
    case 'this-year':
      return {
        start_date: `${year}-01-01`,
        end_date: now.toISOString().split('T')[0],
      };
    case 'last-year':
      return {
        start_date: `${year - 1}-01-01`,
        end_date: `${year - 1}-12-31`,
      };
    default:
      return {};
  }
};

export default function ReportViewer({ walletAddress }: ReportViewerProps) {
  const [selectedReport, setSelectedReport] = useState('profit-loss');
  const [dateRange, setDateRange] = useState('this-year');
  const [report, setReport] = useState<QuickBooksReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      const reportType = REPORT_TYPE_MAP[selectedReport];
      if (!reportType) {
        throw new Error('Invalid report type');
      }

      const dates = getDateRange(dateRange);
      const params = new URLSearchParams({
        wallet_address: walletAddress,
      });
      if (dates.start_date) params.append('start_date', dates.start_date);
      if (dates.end_date) params.append('end_date', dates.end_date);

      const response = await fetch(
        `${API_URL}/api/v1/quickbooks/reports/${reportType}?${params.toString()}`
      );

      if (response.status === 401) {
        throw new Error('QuickBooks session expired. Please reconnect from Marketplace.');
      }
      if (response.status === 403) {
        throw new Error('QuickBooks access denied. Please check your permissions.');
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch report');
      }

      const data: ReportResponse = await response.json();
      setReport(data.report);
      setFetchedAt(data.fetched_at);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load report';
      console.error('Report fetch error:', err);
      setError(message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, selectedReport, dateRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Recursive renderer for QuickBooks report rows
  const renderReportRows = (rows: ReportRow[] | undefined, depth: number = 0): React.ReactNode => {
    if (!rows || rows.length === 0) return null;

    return rows.map((row, idx) => {
      const key = `row-${depth}-${idx}`;
      const indent = depth * 16;

      // Section header (e.g., "Income", "Expenses")
      if (row.Header?.ColData) {
        const headerValue = row.Header.ColData[0]?.value || '';
        const headerAmount = row.Header.ColData[1]?.value;

        return (
          <div key={key} className="space-y-2">
            <h3
              className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2"
              style={{ marginLeft: indent }}
            >
              {headerValue.toUpperCase()}
            </h3>
            {row.Rows?.Row && renderReportRows(row.Rows.Row, depth + 1)}
            {row.Summary?.ColData && (
              <div
                className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700"
                style={{ marginLeft: indent }}
              >
                <span className="font-semibold text-gray-900 dark:text-white">
                  {row.Summary.ColData[0]?.value || 'Total'}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(row.Summary.ColData[1]?.value)}
                </span>
              </div>
            )}
          </div>
        );
      }

      // Data row (e.g., "Sales: $145,000")
      if (row.ColData) {
        const label = row.ColData[0]?.value || '';
        const amount = row.ColData[1]?.value;

        // Skip empty rows
        if (!label && !amount) return null;

        return (
          <div
            key={key}
            className="flex justify-between text-sm"
            style={{ marginLeft: indent }}
          >
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(amount)}
            </span>
          </div>
        );
      }

      return null;
    });
  };

  // Render the main report content
  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading report...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Report
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={fetchReport}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    if (!report) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Select a report type and date range to view data
          </p>
        </div>
      );
    }

    const header = report.Header;
    const rows = report.Rows?.Row;

    // Find special summary rows for P&L and Balance Sheet
    const findSummaryRow = (groupName: string): ReportRow | undefined => {
      return rows?.find(row =>
        row.group?.toLowerCase() === groupName.toLowerCase() ||
        row.Header?.ColData?.[0]?.value?.toLowerCase().includes(groupName.toLowerCase())
      );
    };

    // For P&L: Find Net Income row
    const netIncomeRow = rows?.find(row =>
      row.type === 'Section' &&
      row.Summary?.ColData?.[0]?.value?.toLowerCase().includes('net income')
    );
    const netIncome = netIncomeRow?.Summary?.ColData?.[1]?.value;

    // For P&L: Find Gross Profit row
    const grossProfitRow = rows?.find(row =>
      row.Summary?.ColData?.[0]?.value?.toLowerCase().includes('gross profit')
    );
    const grossProfit = grossProfitRow?.Summary?.ColData?.[1]?.value;

    return (
      <div className="space-y-6">
        {/* Report Header */}
        <div className="text-center py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {header?.ReportName || REPORT_TYPES.find(r => r.id === selectedReport)?.label}
          </h2>
          {header?.StartPeriod && header?.EndPeriod && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {header.StartPeriod} - {header.EndPeriod}
            </p>
          )}
          {fetchedAt && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Live data as of {new Date(fetchedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Report Rows */}
        <div className="space-y-4">
          {renderReportRows(rows)}

          {/* Special highlighted sections for P&L */}
          {selectedReport === 'profit-loss' && grossProfit && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="font-bold text-gray-900 dark:text-white">GROSS PROFIT</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(grossProfit)}
                </span>
              </div>
            </div>
          )}

          {selectedReport === 'profit-loss' && netIncome && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="font-bold text-xl text-gray-900 dark:text-white">NET INCOME</span>
                <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                  {formatCurrency(netIncome)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Empty state if no rows */}
        {(!rows || rows.length === 0) && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No data available for this report and date range.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View and analyze your financial reports from QuickBooks
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
            {REPORT_TYPES.map((reportItem) => (
              <button
                key={reportItem.id}
                onClick={() => setSelectedReport(reportItem.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                  selectedReport === reportItem.id
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {reportItem.label}
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
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" disabled={!report}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" disabled={!report}>
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
              {renderReportContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
