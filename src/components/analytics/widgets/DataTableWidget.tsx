'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  Download,
  MoreHorizontal
} from 'lucide-react';

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'date' | 'status';
  sortable?: boolean;
  width?: string;
}

interface DataTableWidgetProps {
  title?: string;
  columns: Column[];
  data: Record<string, unknown>[];
  pageSize?: number;
  showSearch?: boolean;
  showExport?: boolean;
  onRowClick?: (row: Record<string, unknown>) => void;
}

export default function DataTableWidget({
  title,
  columns,
  data,
  pageSize = 10,
  showSearch = true,
  showExport = true,
  onRowClick
}: DataTableWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(row =>
        columns.some(col => {
          const value = row[col.key];
          return value && String(value).toLowerCase().includes(query);
        })
      );
    }

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, columns, searchQuery, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const formatValue = (value: unknown, type?: string) => {
    if (value === null || value === undefined) return '—';

    switch (type) {
      case 'currency':
        return `$${Number(value).toLocaleString()}`;
      case 'date':
        return new Date(String(value)).toLocaleDateString();
      case 'status':
        const status = String(value).toLowerCase();
        const statusColors: Record<string, string> = {
          active: 'bg-green-100 text-green-700',
          pending: 'bg-yellow-100 text-yellow-700',
          completed: 'bg-blue-100 text-blue-700',
          cancelled: 'bg-red-100 text-red-700',
          paid: 'bg-green-100 text-green-700',
          overdue: 'bg-red-100 text-red-700',
          draft: 'bg-gray-100 text-gray-700',
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
            {String(value)}
          </span>
        );
      default:
        return String(value);
    }
  };

  const handleExport = () => {
    const csv = [
      columns.map(c => c.label).join(','),
      ...processedData.map(row =>
        columns.map(c => {
          const val = row[c.key];
          return typeof val === 'string' && val.includes(',')
            ? `"${val}"`
            : String(val ?? '');
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'data'}-export.csv`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search..."
                className="pl-7 pr-3 py-1 text-xs border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none w-32"
              />
            </div>
          )}
          {showExport && (
            <button
              onClick={handleExport}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable !== false && sortColumn === column.key && (
                      sortDirection === 'asc'
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2 whitespace-nowrap text-gray-900">
                      {formatValue(row[column.key], column.type)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, processedData.length)} of {processedData.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Prev
            </button>
            <span className="px-2 text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
