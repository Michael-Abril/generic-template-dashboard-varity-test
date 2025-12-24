'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Database, Search, ChevronDown, ChevronRight, Check,
  FileText, Mail, Users, Calendar, DollarSign, Briefcase,
  X, Loader2, RefreshCw
} from 'lucide-react';
import { logger } from '@/lib/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface ContextItem {
  id: string;
  type: string;  // Integration type (google, quickbooks, etc.)
  category: string;  // Data category (drive, gmail, invoices, etc.)
  title: string;
  description?: string;
  source: 'indexed' | 'live';
  metadata: Record<string, unknown>;
}

interface ContextPickerProps {
  walletAddress: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onClose?: () => void;
  maxSelections?: number;
}

// Icon mapping for different categories
const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'drive':
      return <FileText className="w-4 h-4" />;
    case 'gmail':
    case 'mail':
      return <Mail className="w-4 h-4" />;
    case 'contacts':
      return <Users className="w-4 h-4" />;
    case 'calendar':
      return <Calendar className="w-4 h-4" />;
    case 'invoices':
    case 'expenses':
      return <DollarSign className="w-4 h-4" />;
    case 'customers':
    case 'leads':
    case 'opportunities':
      return <Briefcase className="w-4 h-4" />;
    default:
      return <Database className="w-4 h-4" />;
  }
};

// Color mapping for integrations
const getIntegrationColor = (integration: string) => {
  switch (integration.toLowerCase()) {
    case 'google':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'quickbooks':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'salesforce':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'hubspot':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'slack':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'microsoft':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export function ContextPicker({
  walletAddress,
  selectedIds,
  onSelectionChange,
  onClose,
  maxSelections = 10
}: ContextPickerProps) {
  const [items, setItems] = useState<ContextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIntegrations, setExpandedIntegrations] = useState<Set<string>>(new Set());

  // Fetch available context items
  useEffect(() => {
    if (!walletAddress) return;

    setLoading(true);
    fetch(`${API_BASE_URL}/api/v1/ai/context/items?wallet_address=${encodeURIComponent(walletAddress)}&limit=100`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch context items');
        return res.json();
      })
      .then(data => {
        setItems(data.items || []);
        // Expand all integrations by default
        const integrations = new Set<string>(data.items?.map((item: ContextItem) => item.type) || []);
        setExpandedIntegrations(integrations);
      })
      .catch(error => {
        logger.error('Failed to fetch context items:', error);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  // Group items by integration
  const groupedItems = useMemo(() => {
    const groups: Record<string, ContextItem[]> = {};

    const filteredItems = items.filter(item => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
      );
    });

    filteredItems.forEach(item => {
      if (!groups[item.type]) {
        groups[item.type] = [];
      }
      groups[item.type].push(item);
    });

    return groups;
  }, [items, searchQuery]);

  const toggleIntegration = (integration: string) => {
    setExpandedIntegrations(prev => {
      const next = new Set(prev);
      if (next.has(integration)) {
        next.delete(integration);
      } else {
        next.add(integration);
      }
      return next;
    });
  };

  const toggleItem = (itemId: string) => {
    if (selectedIds.includes(itemId)) {
      onSelectionChange(selectedIds.filter(id => id !== itemId));
    } else if (selectedIds.length < maxSelections) {
      onSelectionChange([...selectedIds, itemId]);
    }
  };

  const selectAll = () => {
    const allIds = items.slice(0, maxSelections).map(item => item.id);
    onSelectionChange(allIds);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading available context...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg max-h-[500px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Select Context</h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {selectedIds.length}/{maxSelections} selected
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files, emails, data..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-b border-gray-100 flex gap-2">
        <button
          onClick={selectAll}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Select All
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={clearAll}
          className="text-xs text-gray-600 hover:text-gray-800 font-medium"
        >
          Clear All
        </button>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No context items available</p>
            <p className="text-xs text-gray-400 mt-1">
              Connect integrations and sync data to add context
            </p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([integration, integrationItems]) => (
            <div key={integration} className="mb-2">
              {/* Integration Header */}
              <button
                onClick={() => toggleIntegration(integration)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${getIntegrationColor(integration)}`}
              >
                {expandedIntegrations.has(integration) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span className="font-medium capitalize">{integration}</span>
                <span className="text-xs opacity-70">({integrationItems.length} items)</span>
              </button>

              {/* Items */}
              {expandedIntegrations.has(integration) && (
                <div className="ml-4 mt-1 space-y-1">
                  {integrationItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedIds.includes(item.id)
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        selectedIds.includes(item.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedIds.includes(item.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getCategoryIcon(item.category)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.source === 'indexed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.source}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
        <p className="text-xs text-gray-500 text-center">
          Selected items will be used as context for your AI query
        </p>
      </div>
    </div>
  );
}

export default ContextPicker;
