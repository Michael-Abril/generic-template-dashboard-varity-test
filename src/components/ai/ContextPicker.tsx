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

// Integration display names, logos, and colors (minimal icon-first design)
const INTEGRATION_CONFIG: Record<string, { displayName: string; icon: React.ReactNode; color: string; bgColor: string; logoColor: string }> = {
  google: {
    displayName: 'Google Workspace',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100 border-red-200',
    logoColor: 'bg-white'
  },
  microsoft: {
    displayName: 'Microsoft 365',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
      </svg>
    ),
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    logoColor: 'bg-white'
  },
  quickbooks: {
    displayName: 'QuickBooks',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#2CA01C">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6H7v-2h2V7h2v2h2v2h-2v6zm6-4h-2v-2h2v2z"/>
      </svg>
    ),
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
    logoColor: 'bg-green-600'
  },
  salesforce: {
    displayName: 'Salesforce',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#00A1E0">
        <path d="M10.06 5.32c.91-.89 2.16-1.44 3.55-1.44 1.98 0 3.71 1.17 4.48 2.88.67-.29 1.4-.45 2.17-.45 3.02 0 5.47 2.46 5.47 5.49 0 3.03-2.45 5.49-5.47 5.49-.35 0-.69-.03-1.02-.09-.67 1.6-2.24 2.73-4.08 2.73-1.04 0-2-.36-2.76-.96-.76 1.45-2.28 2.44-4.02 2.44-2.52 0-4.56-2.05-4.56-4.58 0-.39.05-.77.14-1.13C2.18 14.82.73 12.9.73 10.65c0-2.94 2.38-5.32 5.31-5.32 1.46 0 2.78.59 3.74 1.54"/>
      </svg>
    ),
    color: 'text-sky-600',
    bgColor: 'bg-sky-50 hover:bg-sky-100 border-sky-200',
    logoColor: 'bg-sky-500'
  },
  hubspot: {
    displayName: 'HubSpot',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FF7A59">
        <path d="M18.16 7.58v-2.2a1.9 1.9 0 001.12-1.74 1.92 1.92 0 10-3.84 0 1.9 1.9 0 001.12 1.74v2.2a5.29 5.29 0 00-2.56 1.2l-6.84-5.32a2.36 2.36 0 10-1.2 1.55l6.67 5.19a5.35 5.35 0 00-.05.71 5.35 5.35 0 10 10.7 0 5.35 5.35 0 00-5.12-5.33z"/>
      </svg>
    ),
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    logoColor: 'bg-orange-500'
  },
  slack: {
    displayName: 'Slack',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#E01E5A" d="M5.04 15.04a2.5 2.5 0 01-2.5 2.5 2.5 2.5 0 01-2.5-2.5 2.5 2.5 0 012.5-2.5h2.5v2.5zm1.27 0a2.5 2.5 0 012.5-2.5 2.5 2.5 0 012.5 2.5v6.27a2.5 2.5 0 01-2.5 2.5 2.5 2.5 0 01-2.5-2.5v-6.27z"/>
        <path fill="#36C5F0" d="M8.81 5.04a2.5 2.5 0 01-2.5-2.5 2.5 2.5 0 012.5-2.5 2.5 2.5 0 012.5 2.5v2.5H8.81zm0 1.27a2.5 2.5 0 012.5 2.5 2.5 2.5 0 01-2.5 2.5H2.54a2.5 2.5 0 01-2.5-2.5 2.5 2.5 0 012.5-2.5h6.27z"/>
        <path fill="#2EB67D" d="M18.96 8.81a2.5 2.5 0 012.5 2.5 2.5 2.5 0 01-2.5 2.5h-2.5V8.81h2.5zm-1.27 0a2.5 2.5 0 01-2.5 2.5 2.5 2.5 0 01-2.5-2.5V2.54a2.5 2.5 0 012.5-2.5 2.5 2.5 0 012.5 2.5v6.27z"/>
        <path fill="#ECB22E" d="M15.19 18.96a2.5 2.5 0 012.5 2.5 2.5 2.5 0 01-2.5 2.5 2.5 2.5 0 01-2.5-2.5v-2.5h2.5zm0-1.27a2.5 2.5 0 01-2.5-2.5 2.5 2.5 0 012.5-2.5h6.27a2.5 2.5 0 012.5 2.5 2.5 2.5 0 01-2.5 2.5h-6.27z"/>
      </svg>
    ),
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    logoColor: 'bg-purple-600'
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-h-[420px] w-80 flex flex-col overflow-hidden">
      {/* Minimal Header */}
      <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {currentView !== 'integrations' && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
            )}

            {/* Compact Breadcrumb */}
            <div className="flex items-center gap-1 text-xs">
              {currentView === 'integrations' ? (
                <span className="font-medium text-gray-700">Select Context</span>
              ) : (
                <>
                  {selectedIntegration && (
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setCurrentView('categories');
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-1"
                    >
                      <div className="w-4 h-4">
                        {getIntegrationConfig(selectedIntegration).icon}
                      </div>
                      <span className={`font-medium ${currentView === 'categories' ? 'text-gray-700' : 'text-gray-500'}`}>
                        {getIntegrationConfig(selectedIntegration).displayName}
                      </span>
                    </button>
                  )}
                  {selectedCategory && (
                    <>
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                      <span className="font-medium text-gray-700">
                        {getCategoryConfig(selectedCategory).displayName}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {selectedIds.length}
              </span>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Compact Search (only on items view) */}
      {currentView === 'items' && (
        <div className="px-2 py-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Integrations View - Minimal Logo Grid */}
        {currentView === 'integrations' && (
          <div className="p-4">
            {integrations.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-gray-600 font-medium text-sm">No data sources connected</p>
                <p className="text-xs text-gray-400 mt-1">
                  Connect integrations in the Marketplace
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3 text-center">Select a data source</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {integrations.map((integration) => {
                    const config = getIntegrationConfig(integration.name);
                    const selectedCount = selectedIds.filter(id =>
                      items.find(item => item.id === id && item.type === integration.name)
                    ).length;

                    return (
                      <div key={integration.name} className="relative group">
                        <button
                          onClick={() => handleIntegrationClick(integration.name)}
                          className="w-14 h-14 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex items-center justify-center relative"
                        >
                          <div className="w-7 h-7 flex items-center justify-center">
                            {config.icon}
                          </div>
                          {selectedCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                              {selectedCount}
                            </span>
                          )}
                        </button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          <span className="font-medium">{config.displayName}</span>
                          <span className="text-gray-400 ml-1">· {integration.itemCount} items</span>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Categories View - Compact List */}
        {currentView === 'categories' && selectedIntegration && (
          <div className="p-2">
            {categories.length === 0 ? (
              <div className="text-center py-8">
                <Database className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-gray-500 text-sm">No data available</p>
              </div>
            ) : (
              <div className="space-y-1">
                {categories.map((category) => {
                  const config = getCategoryConfig(category.name);
                  const integrationConfig = getIntegrationConfig(selectedIntegration);
                  const selectedCount = selectedIds.filter(id =>
                    items.find(item => item.id === id && item.type === selectedIntegration && item.category === category.name)
                  ).length;

                  return (
                    <button
                      key={category.name}
                      onClick={() => handleCategoryClick(category.name)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-all group"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center ${integrationConfig.color}`}>
                        <div className="w-4 h-4">{config.icon}</div>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-700">{config.displayName}</p>
                        <p className="text-[10px] text-gray-400">
                          {category.itemCount} items
                        </p>
                      </div>
                      {selectedCount > 0 && (
                        <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                          {selectedCount}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Items View - Compact Checklist */}
        {currentView === 'items' && (
          <div className="p-2 space-y-0.5">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-gray-500 text-sm">No items found</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    disabled={!isSelected && selectedIds.length >= maxSelections}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    } ${!isSelected && selectedIds.length >= maxSelections ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {item.title}
                      </p>
                    </div>
                    {item.source === 'live' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-medium">
                        Live
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Minimal Footer */}
      {(selectedIds.length > 0 || currentView === 'items') && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              {currentView === 'items' && `${filteredItems.length} items`}
            </p>
            {selectedIds.length > 0 && onClose && (
              <button
                onClick={onClose}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-md hover:bg-blue-50 transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ContextPicker;
