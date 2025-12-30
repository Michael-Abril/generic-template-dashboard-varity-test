'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Search, Command } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { CommandPalette, useCommandPalette } from './CommandPalette';
import { NotificationDropdown, useNotifications } from './NotificationDropdown';
import { DataFreshnessIndicator, useDataFreshness } from './ui/DataFreshnessIndicator';
import { useWalletSync } from '@/app/providers';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { authenticated } = usePrivy();
  const { address } = useWalletSync();
  const [installedTools, setInstalledTools] = useState<string[]>([]);

  // Command palette state
  const commandPalette = useCommandPalette();

  // Notifications state
  const { notifications, addNotification, markAsRead, markAllAsRead, dismiss, clearAll } = useNotifications();

  // Data freshness state
  const { lastSyncTime, isRefreshing, refresh } = useDataFreshness(address);

  // Load installed tools from OAuth connections
  useEffect(() => {
    const loadInstalledTools = async () => {
      if (!authenticated || !address) {
        setInstalledTools([]);
        return;
      }
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const res = await fetch(
          `${apiBase}/api/v1/integrations/installed?wallet_address=${address}`
        );
        if (!res.ok) {
          setInstalledTools([]);
          return;
        }
        const data = await res.json();
        // Extract tool names from connected OAuth integrations
        const tools = (data.integrations || [])
          .filter((integration: { connected: boolean }) => integration.connected)
          .map((integration: { name: string }) => integration.name);
        setInstalledTools(tools);
      } catch {
        setInstalledTools([]);
      }
    };

    loadInstalledTools();
  }, [authenticated, address]);

  // Handle refresh with notification
  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
      addNotification({
        type: 'sync_complete',
        title: 'Sync Complete',
        message: 'Your data has been synced successfully.'
      });
    } catch {
      addNotification({
        type: 'sync_error',
        title: 'Sync Failed',
        message: 'Failed to sync data. Please try again.'
      });
    }
  }, [refresh, addNotification]);

  // Detect OS for keyboard shortcut display
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    }
  }, []);

  return (
    <>
      {/* Skip to main content link for keyboard accessibility (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
        <Sidebar installedTools={installedTools} />

        {/* Top Bar */}
        <header className="lg:ml-64 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          {/* Left side - Search trigger */}
          <div className="flex items-center gap-4 flex-1">
            {/* Search bar that opens command palette */}
            <button
              onClick={commandPalette.open}
              className="flex items-center gap-2 px-3 py-1.5 w-full max-w-md bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left group"
              aria-label="Open command palette"
            >
              <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-500" />
              <span className="text-sm text-gray-500 group-hover:text-gray-600 flex-1">
                Search or run a command...
              </span>
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-200 group-hover:bg-gray-300 rounded text-xs text-gray-500 font-mono">
                {isMac ? (
                  <>
                    <Command className="w-3 h-3" />
                    <span>K</span>
                  </>
                ) : (
                  <span>Ctrl+K</span>
                )}
              </kbd>
            </button>
          </div>

          {/* Right side - Data freshness, Notifications */}
          <div className="flex items-center gap-3">
            {/* Data Freshness Indicator - only show if authenticated */}
            {authenticated && (
              <div className="hidden md:block">
                <DataFreshnessIndicator
                  lastSyncTime={lastSyncTime}
                  onRefresh={handleRefresh}
                  isRefreshing={isRefreshing}
                />
              </div>
            )}

            {/* Notification Bell */}
            <NotificationDropdown
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDismiss={dismiss}
              onClearAll={clearAll}
            />
          </div>
        </header>

        {/* Main content area */}
        <main id="main-content" className="lg:ml-64 flex-1 overflow-auto" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        installedTools={installedTools}
      />
    </>
  );
}
