'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search, ChevronRight, ChevronLeft, Check,
  FileText, Mail, Users, Calendar, DollarSign, Briefcase,
  X, Loader2, Folder, Cloud, Database, Building2,
  MessageSquare, HardDrive, ShoppingCart
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

// Integration display names and icons
const INTEGRATION_CONFIG: Record<string, { displayName: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  google: {
    displayName: 'Google Workspace',
    icon: <Cloud className="w-5 h-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100 border-red-200'
  },
  microsoft: {
    displayName: 'Microsoft 365',
    icon: <Cloud className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
  },
  quickbooks: {
    displayName: 'QuickBooks',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200'
  },
  salesforce: {
    displayName: 'Salesforce',
    icon: <Building2 className="w-5 h-5" />,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50 hover:bg-sky-100 border-sky-200'
  },
  hubspot: {
    displayName: 'HubSpot',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
  },
  slack: {
    displayName: 'Slack',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
  }
};

// Category display names and icons
const CATEGORY_CONFIG: Record<string, { displayName: string; icon: React.ReactNode }> = {
  gmail: { displayName: 'Email', icon: <Mail className="w-5 h-5" /> },
  mail: { displayName: 'Email', icon: <Mail className="w-5 h-5" /> },
  drive: { displayName: 'Drive Files', icon: <HardDrive className="w-5 h-5" /> },
  onedrive: { displayName: 'OneDrive', icon: <HardDrive className="w-5 h-5" /> },
  calendar: { displayName: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
  contacts: { displayName: 'Contacts', icon: <Users className="w-5 h-5" /> },
  invoices: { displayName: 'Invoices', icon: <FileText className="w-5 h-5" /> },
  expenses: { displayName: 'Expenses', icon: <DollarSign className="w-5 h-5" /> },
  customers: { displayName: 'Customers', icon: <Users className="w-5 h-5" /> },
  leads: { displayName: 'Leads', icon: <Briefcase className="w-5 h-5" /> },
  opportunities: { displayName: 'Opportunities', icon: <ShoppingCart className="w-5 h-5" /> },
  deals: { displayName: 'Deals', icon: <ShoppingCart className="w-5 h-5" /> },
  messages: { displayName: 'Messages', icon: <MessageSquare className="w-5 h-5" /> },
  channels: { displayName: 'Channels', icon: <MessageSquare className="w-5 h-5" /> }
};

type ViewType = 'integrations' | 'categories' | 'items';

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

  // Navigation state
  const [currentView, setCurrentView] = useState<ViewType>('integrations');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
      })
      .catch(error => {
        logger.error('Failed to fetch context items:', error);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  // Get unique integrations with item counts
  const integrations = useMemo(() => {
    const integrationMap: Record<string, { name: string; itemCount: number; categories: Set<string> }> = {};

    items.forEach(item => {
      if (!integrationMap[item.type]) {
        integrationMap[item.type] = { name: item.type, itemCount: 0, categories: new Set() };
      }
      integrationMap[item.type].itemCount++;
      integrationMap[item.type].categories.add(item.category);
    });

    return Object.values(integrationMap);
  }, [items]);

  // Get categories for selected integration
  const categories = useMemo(() => {
    if (!selectedIntegration) return [];

    const categoryMap: Record<string, { name: string; itemCount: number }> = {};

    items
      .filter(item => item.type === selectedIntegration)
      .forEach(item => {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = { name: item.category, itemCount: 0 };
        }
        categoryMap[item.category].itemCount++;
      });

    return Object.values(categoryMap);
  }, [items, selectedIntegration]);

  // Get items for selected category
  const filteredItems = useMemo(() => {
    let result = items;

    if (selectedIntegration) {
      result = result.filter(item => item.type === selectedIntegration);
    }

    if (selectedCategory) {
      result = result.filter(item => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query))
      );
    }

    return result;
  }, [items, selectedIntegration, selectedCategory, searchQuery]);

  const toggleItem = (itemId: string) => {
    if (selectedIds.includes(itemId)) {
      onSelectionChange(selectedIds.filter(id => id !== itemId));
    } else if (selectedIds.length < maxSelections) {
      onSelectionChange([...selectedIds, itemId]);
    }
  };

  const handleIntegrationClick = (integration: string) => {
    setSelectedIntegration(integration);
    setCurrentView('categories');
    setSearchQuery('');
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setCurrentView('items');
    setSearchQuery('');
  };

  const handleBack = () => {
    if (currentView === 'items') {
      setSelectedCategory(null);
      setCurrentView('categories');
    } else if (currentView === 'categories') {
      setSelectedIntegration(null);
      setCurrentView('integrations');
    }
    setSearchQuery('');
  };

  const getIntegrationConfig = (name: string) => {
    return INTEGRATION_CONFIG[name.toLowerCase()] || {
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      icon: <Folder className="w-5 h-5" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
    };
  };

  const getCategoryConfig = (name: string) => {
    return CATEGORY_CONFIG[name.toLowerCase()] || {
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      icon: <Database className="w-5 h-5" />
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-8">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="font-medium">Loading your data sources...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-h-[480px] flex flex-col overflow-hidden">
      {/* Header with Breadcrumb */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentView !== 'integrations' && (
              <button
                onClick={handleBack}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm">
              <button
                onClick={() => {
                  setSelectedIntegration(null);
                  setSelectedCategory(null);
                  setCurrentView('integrations');
                  setSearchQuery('');
                }}
                className={`font-medium ${currentView === 'integrations' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Data Sources
              </button>

              {selectedIntegration && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setCurrentView('categories');
                      setSearchQuery('');
                    }}
                    className={`font-medium ${currentView === 'categories' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {getIntegrationConfig(selectedIntegration).displayName}
                  </button>
                </>
              )}

              {selectedCategory && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {getCategoryConfig(selectedCategory).displayName}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                {selectedIds.length} selected
              </span>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search (only on items view) */}
      {currentView === 'items' && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Search in ${getCategoryConfig(selectedCategory || '').displayName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Integrations View */}
        {currentView === 'integrations' && (
          <div className="p-3 space-y-2">
            {integrations.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <p className="text-gray-600 font-medium">No data sources connected</p>
                <p className="text-sm text-gray-400 mt-1">
                  Connect integrations in the Marketplace to add context
                </p>
              </div>
            ) : (
              integrations.map((integration) => {
                const config = getIntegrationConfig(integration.name);
                const selectedCount = selectedIds.filter(id =>
                  items.find(item => item.id === id && item.type === integration.name)
                ).length;

                return (
                  <button
                    key={integration.name}
                    onClick={() => handleIntegrationClick(integration.name)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${config.bgColor}`}
                  >
                    <div className={`p-2.5 rounded-lg bg-white shadow-sm ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">{config.displayName}</p>
                      <p className="text-sm text-gray-500">
                        {integration.itemCount} items available
                      </p>
                    </div>
                    {selectedCount > 0 && (
                      <span className="text-xs font-medium bg-blue-600 text-white px-2 py-1 rounded-full">
                        {selectedCount}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Categories View */}
        {currentView === 'categories' && selectedIntegration && (
          <div className="p-3 space-y-2">
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <p className="text-gray-600 font-medium">No data categories available</p>
              </div>
            ) : (
              categories.map((category) => {
                const config = getCategoryConfig(category.name);
                const integrationConfig = getIntegrationConfig(selectedIntegration);
                const selectedCount = selectedIds.filter(id =>
                  items.find(item => item.id === id && item.type === selectedIntegration && item.category === category.name)
                ).length;

                return (
                  <button
                    key={category.name}
                    onClick={() => handleCategoryClick(category.name)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    <div className={`p-2.5 rounded-lg bg-gray-100 ${integrationConfig.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">{config.displayName}</p>
                      <p className="text-sm text-gray-500">
                        {category.itemCount} items
                      </p>
                    </div>
                    {selectedCount > 0 && (
                      <span className="text-xs font-medium bg-blue-600 text-white px-2 py-1 rounded-full">
                        {selectedCount}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Items View */}
        {currentView === 'items' && (
          <div className="p-3 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <p className="text-gray-600 font-medium">No items found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Try adjusting your search
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const config = getCategoryConfig(item.category);

                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    disabled={!isSelected && selectedIds.length >= maxSelections}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-2 border-blue-300'
                        : 'hover:bg-gray-50 border border-gray-100'
                    } ${!isSelected && selectedIds.length >= maxSelections ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div className="text-gray-400">
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                      item.source === 'indexed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.source === 'indexed' ? 'Indexed' : 'Live'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {currentView === 'items'
              ? `${filteredItems.length} items available`
              : 'Select items to include as context for your query'
            }
          </p>
          {selectedIds.length > 0 && onClose && (
            <button
              onClick={onClose}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContextPicker;
