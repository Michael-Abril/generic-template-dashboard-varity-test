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

  // Load installed tools based on real purchases/integrations
  useEffect(() => {
    const loadInstalledTools = async () => {
      if (!authenticated || !address) {
        setInstalledTools([]);
        return;
      }
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const res = await fetch(
          `${apiBase}/api/v1/marketplace/my-integrations?wallet_address=${address}`
        );
        if (!res.ok) {
          setInstalledTools([]);
          return;
        }
        const data = await res.json() as Array<{ product_name: string; is_purchased: boolean }>;
        const tools = data
          .filter((integration) => integration.is_purchased)
          .map((integration) => integration.product_name);
        setInstalledTools(tools);
      } catch {
        setInstalledTools([]);
      }
    };

    loadInstalledTools();
  }, [authenticated, address]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar installedTools={installedTools} />
      <main className="lg:ml-64">
        {children}
      </main>
    </div>
  );
}
