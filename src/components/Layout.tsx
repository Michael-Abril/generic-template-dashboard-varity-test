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
    <div className="h-screen bg-gray-50 overflow-hidden">
      <Sidebar installedTools={installedTools} />
      <main className="lg:ml-64 h-full overflow-auto">
        {children}
      </main>
    </div>
  );
}
