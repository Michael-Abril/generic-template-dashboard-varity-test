'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Home,
  BarChart3,
  MessageSquare,
  Settings,
  Plug,
  Link as LinkIcon,
  Mail,
  Calendar,
  FileText,
  DollarSign,
  Users,
  Clock,
  Command,
  ArrowRight,
  X
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'recent' | 'pages' | 'actions' | 'integrations';
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  installedTools?: string[];
}

export function CommandPalette({ isOpen, onClose, installedTools = [] }: CommandPaletteProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent items from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('commandPalette_recent');
      if (stored) {
        try {
          setRecentItems(JSON.parse(stored));
        } catch {
          setRecentItems([]);
        }
      }
    }
  }, []);

  // Save to recent items
  const addToRecent = useCallback((id: string) => {
    setRecentItems(prev => {
      const filtered = prev.filter(item => item !== id);
      const updated = [id, ...filtered].slice(0, 5);
      if (typeof window !== 'undefined') {
        localStorage.setItem('commandPalette_recent', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Navigate helper
  const navigate = useCallback((path: string, id: string) => {
    addToRecent(id);
    router.push(path);
    onClose();
  }, [router, onClose, addToRecent]);

  // Define all command items
  const allItems: CommandItem[] = useMemo(() => {
    const pages: CommandItem[] = [
      {
        id: 'dashboard',
        title: 'Dashboard',
        subtitle: 'Overview and KPIs',
        icon: Home,
        category: 'pages',
        action: () => navigate('/dashboard', 'dashboard'),
        keywords: ['home', 'overview', 'main']
      },
      {
        id: 'ai-assistant',
        title: 'AI Assistant',
        subtitle: 'Chat with your business data',
        icon: MessageSquare,
        category: 'pages',
        action: () => navigate('/ai-assistant', 'ai-assistant'),
        keywords: ['chat', 'ai', 'assistant', 'help', 'query']
      },
      {
        id: 'analytics',
        title: 'Analytics',
        subtitle: 'Charts and reports',
        icon: BarChart3,
        category: 'pages',
        action: () => navigate('/analytics', 'analytics'),
        keywords: ['charts', 'reports', 'data', 'metrics']
      },
      {
        id: 'integrations',
        title: 'Integrations',
        subtitle: 'Manage connected services',
        icon: LinkIcon,
        category: 'pages',
        action: () => navigate('/integrations', 'integrations'),
        keywords: ['connections', 'oauth', 'sync']
      },
      {
        id: 'marketplace',
        title: 'Marketplace',
        subtitle: 'Connect new tools',
        icon: Plug,
        category: 'pages',
        action: () => navigate('/marketplace', 'marketplace'),
        keywords: ['apps', 'tools', 'connect', 'install']
      },
      {
        id: 'settings',
        title: 'Settings',
        subtitle: 'Account and preferences',
        icon: Settings,
        category: 'pages',
        action: () => navigate('/settings', 'settings'),
        keywords: ['account', 'preferences', 'profile', 'config']
      }
    ];

    // Add integration-specific pages based on installed tools
    const integrationPages: CommandItem[] = [];

    if (installedTools.some(t => t.toLowerCase().includes('google'))) {
      integrationPages.push(
        {
          id: 'google-gmail',
          title: 'Gmail',
          subtitle: 'Google Workspace',
          icon: Mail,
          category: 'integrations',
          action: () => navigate('/dashboard/tools/googleworkspace?tab=gmail', 'google-gmail'),
          keywords: ['email', 'inbox', 'google', 'mail']
        },
        {
          id: 'google-calendar',
          title: 'Calendar',
          subtitle: 'Google Workspace',
          icon: Calendar,
          category: 'integrations',
          action: () => navigate('/dashboard/tools/googleworkspace?tab=calendar', 'google-calendar'),
          keywords: ['events', 'schedule', 'meetings', 'google']
        },
        {
          id: 'google-drive',
          title: 'Drive',
          subtitle: 'Google Workspace',
          icon: FileText,
          category: 'integrations',
          action: () => navigate('/dashboard/tools/googleworkspace?tab=drive', 'google-drive'),
          keywords: ['files', 'documents', 'storage', 'google']
        }
      );
    }

    if (installedTools.some(t => t.toLowerCase().includes('quickbooks'))) {
      integrationPages.push(
        {
          id: 'quickbooks-invoices',
          title: 'Invoices',
          subtitle: 'QuickBooks',
          icon: DollarSign,
          category: 'integrations',
          action: () => navigate('/dashboard/tools/quickbooks?tab=invoices', 'quickbooks-invoices'),
          keywords: ['billing', 'payments', 'accounting']
        },
        {
          id: 'quickbooks-customers',
          title: 'Customers',
          subtitle: 'QuickBooks',
          icon: Users,
          category: 'integrations',
          action: () => navigate('/dashboard/tools/quickbooks?tab=customers', 'quickbooks-customers'),
          keywords: ['clients', 'contacts', 'accounting']
        }
      );
    }

    if (installedTools.some(t => t.toLowerCase().includes('slack'))) {
      integrationPages.push({
        id: 'slack',
        title: 'Slack',
        subtitle: 'Channels and messages',
        icon: MessageSquare,
        category: 'integrations',
        action: () => navigate('/dashboard/tools/slack', 'slack'),
        keywords: ['chat', 'channels', 'team', 'messages']
      });
    }

    // Actions
    const actions: CommandItem[] = [
      {
        id: 'action-email',
        title: 'Compose new email',
        subtitle: 'Open email composer',
        icon: Mail,
        category: 'actions',
        action: () => navigate('/ai-assistant?action=compose-email', 'action-email'),
        keywords: ['send', 'write', 'email', 'compose']
      },
      {
        id: 'action-event',
        title: 'Create calendar event',
        subtitle: 'Schedule a new event',
        icon: Calendar,
        category: 'actions',
        action: () => navigate('/ai-assistant?action=create-event', 'action-event'),
        keywords: ['schedule', 'meeting', 'appointment']
      },
      {
        id: 'action-ask-ai',
        title: 'Ask AI a question',
        subtitle: 'Query your business data',
        icon: MessageSquare,
        category: 'actions',
        action: () => navigate('/ai-assistant', 'action-ask-ai'),
        keywords: ['question', 'help', 'query', 'search']
      }
    ];

    return [...pages, ...integrationPages, ...actions];
  }, [installedTools, navigate]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      // Show recent items first, then pages, then actions
      const recentCommandItems = recentItems
        .map(id => allItems.find(item => item.id === id))
        .filter((item): item is CommandItem => item !== undefined)
        .map(item => ({ ...item, category: 'recent' as const }));

      const nonRecentItems = allItems.filter(item => !recentItems.includes(item.id));

      return [...recentCommandItems, ...nonRecentItems];
    }

    // Fuzzy search across title, subtitle, and keywords
    return allItems.filter(item => {
      const searchFields = [
        item.title.toLowerCase(),
        item.subtitle?.toLowerCase() || '',
        ...(item.keywords || [])
      ].join(' ');

      // Check if any word in the query matches
      const queryWords = query.split(' ');
      return queryWords.every(word => searchFields.includes(word));
    });
  }, [searchQuery, allItems, recentItems]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      recent: [],
      pages: [],
      integrations: [],
      actions: []
    };

    filteredItems.forEach(item => {
      groups[item.category].push(item);
    });

    return groups;
  }, [filteredItems]);

  // Flatten for keyboard navigation
  const flatItems = useMemo(() => {
    return [
      ...groupedItems.recent,
      ...groupedItems.pages,
      ...groupedItems.integrations,
      ...groupedItems.actions
    ];
  }, [groupedItems]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatItems.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, flatItems.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < flatItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : flatItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          flatItems[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [flatItems, selectedIndex, onClose]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // This will be handled by the parent component
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const renderGroup = (title: string, items: CommandItem[], startIndex: number) => {
    if (items.length === 0) return null;

    return (
      <div className="py-2">
        <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </div>
        {items.map((item, idx) => {
          const globalIndex = startIndex + idx;
          const isSelected = globalIndex === selectedIndex;
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              data-index={globalIndex}
              onClick={() => item.action()}
              onMouseEnter={() => setSelectedIndex(globalIndex)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                ${isSelected
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <IconComponent className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                {item.subtitle && (
                  <div className={`text-sm truncate ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}>
                    {item.subtitle}
                  </div>
                )}
              </div>
              {isSelected && (
                <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  let currentIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-white rounded-xl shadow-2xl z-50 overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search or run a command..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-gray-900 placeholder-gray-400 outline-none text-base"
            aria-label="Search commands"
          />
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            aria-label="Close command palette"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[400px] overflow-y-auto"
          role="listbox"
        >
          {flatItems.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              {(() => {
                currentIndex = 0;
                return null;
              })()}
              {groupedItems.recent.length > 0 && (
                <>
                  {renderGroup('Recent', groupedItems.recent, currentIndex)}
                  {(() => { currentIndex += groupedItems.recent.length; return null; })()}
                </>
              )}
              {groupedItems.pages.length > 0 && (
                <>
                  {renderGroup('Pages', groupedItems.pages, currentIndex)}
                  {(() => { currentIndex += groupedItems.pages.length; return null; })()}
                </>
              )}
              {groupedItems.integrations.length > 0 && (
                <>
                  {renderGroup('Integrations', groupedItems.integrations, currentIndex)}
                  {(() => { currentIndex += groupedItems.integrations.length; return null; })()}
                </>
              )}
              {groupedItems.actions.length > 0 && (
                <>
                  {renderGroup('Actions', groupedItems.actions, currentIndex)}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono">↓</kbd>
              <span className="ml-1">to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono">Enter</kbd>
              <span className="ml-1">to select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono">Esc</kbd>
              <span className="ml-1">to close</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>K to open anytime</span>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook for managing command palette state
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  };
}
