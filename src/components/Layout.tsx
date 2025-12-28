'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Sidebar } from './Sidebar';
import { useWalletSync } from '@/app/providers';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { authenticated } = usePrivy();
  const { address } = useWalletSync();
  const [installedTools, setInstalledTools] = useState<string[]>([]);

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

  return (
    <>
      {/* Skip to main content link for keyboard accessibility (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <div className="h-screen bg-gray-50 overflow-hidden">
        <Sidebar installedTools={installedTools} />
        <main id="main-content" className="lg:ml-64 h-full overflow-auto" tabIndex={-1}>
          {children}
        </main>
      </div>
    </>
  );
}
