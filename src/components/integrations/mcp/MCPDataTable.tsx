'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface MCPDataTableProps<T extends { id?: string | number }> {
  data: T[];
  columns?: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  onRefresh?: () => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

// Auto-generated column type
interface AutoColumn {
  key: string;
  label: string;
  sortable: boolean;
  className?: string;
  render?: undefined;
}

/**
 * MCPDataTable - Auto-detecting data table for MCP data
 *
 * Features:
 * - Auto-detects columns from data shape if not provided
 * - Built-in search/filter
 * - Pagination
 * - Sortable columns
 * - Click handlers
 */
export function MCPDataTable<T extends { id?: string | number }>({
  data,
  columns: providedColumns,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  onRefresh,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
}: MCPDataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Auto-detect columns from data if not provided
  const columns: (Column<T> | AutoColumn)[] = useMemo(() => {
    if (providedColumns) return providedColumns;

    if (data.length === 0) return [];

    // Get keys from first item
    const firstItem = data[0];
    const keys = Object.keys(firstItem as object).filter(
      (key) =>
        // Filter out internal/complex fields
        !key.startsWith('_') &&
        typeof (firstItem as Record<string, unknown>)[key] !== 'object'
    );

    return keys.map((key): AutoColumn => ({
      key,
      label: formatColumnLabel(key),
      sortable: true,
    }));
  }, [data, providedColumns]);

  // Filter data by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((row) =>
      Object.values(row as object).some(
        (value) =>
          value &&
          String(value).toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortColumn];
      const bVal = (b as Record<string, unknown>)[sortColumn];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  // Handle sort
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Handle search change
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {searchable && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={String(col.key)}
                      scope="col"
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        col.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      } ${col.className || ''}`}
                      onClick={() => col.sortable && handleSort(String(col.key))}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortColumn === String(col.key) && (
                          <span className="text-xs">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((row, idx) => (
                  <tr
                    key={(row as { id?: string | number }).id || idx}
                    className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${col.className || ''}`}
                      >
                        {col.render
                          ? col.render(
                              (row as Record<string, unknown>)[String(col.key)],
                              row
                            )
                          : formatCellValue(
                              (row as Record<string, unknown>)[String(col.key)]
                            )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {currentPage * pageSize + 1} to{' '}
                {Math.min((currentPage + 1) * pageSize, sortedData.length)} of{' '}
                {sortedData.length} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Format column key to readable label
 * e.g., 'created_at' -> 'Created At'
 */
function formatColumnLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * Format cell value for display
 */
function formatCellValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">-</span>;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    // Format as currency if looks like money
    if (value > 100) {
      return value.toLocaleString();
    }
    return String(value);
  }

  if (typeof value === 'string') {
    // Check if ISO date
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }
    }
    // Truncate long strings
    if (value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value;
  }

  return String(value);
}

export default MCPDataTable;
