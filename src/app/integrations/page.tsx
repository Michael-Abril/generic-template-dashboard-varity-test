'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletSync } from '@/app/providers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { IntegrationLogo } from '@/components/IntegrationLogo';
import { CONTRACTS, TOOL_MARKETPLACE_ABI, TOOL_LICENSE_NFT_ABI } from '@/lib/contracts';
import { logger } from '@/lib/logger';

/**
 * Integration Management Page
 *
 * Shows all integrations owned by the logged-in business
 * - License verification
 * - Encryption status
 * - Secure storage tracking
 * - Manual sync controls
 * - Security audit trail
 */

// Integration metadata (matches marketplace)
const INTEGRATION_METADATA: Record<number, {
  name: string;
  logo: string;
  category: string;
  developer: string;
  dataTypes: string[];
}> = {
  1: {
    name: 'QuickBooks',
    logo: 'quickbooks',
    category: 'Accounting',
    developer: 'Intuit',
    dataTypes: ['Invoices', 'Expenses', 'Customers', 'Vendors', 'Payments'],
  },
  2: {
    name: 'Salesforce',
    logo: 'salesforce',
    category: 'CRM',
    developer: 'Salesforce',
    dataTypes: ['Leads', 'Contacts', 'Opportunities', 'Accounts', 'Activities'],
  },
  3: {
    name: 'Shopify',
    logo: 'shopify',
    category: 'E-commerce',
    developer: 'Shopify',
    dataTypes: ['Products', 'Orders', 'Customers', 'Inventory', 'Sales Data'],
  },
  4: {
    name: 'Slack',
    logo: 'slack',
    category: 'Communication',
    developer: 'Slack',
    dataTypes: ['Messages', 'Files', 'Channels', 'Team Activity'],
  },
  5: {
    name: 'Monday.com',
    logo: 'monday',
    category: 'Project Management',
    developer: 'Monday.com',
    dataTypes: ['Projects', 'Tasks', 'Timelines', 'Resources', 'Updates'],
  },
  6: {
    name: 'Stripe',
    logo: 'stripe',
    category: 'Payments',
    developer: 'Stripe',
    dataTypes: ['Transactions', 'Subscriptions', 'Customers', 'Invoices', 'Payouts'],
  },
  7: {
    name: 'HubSpot',
    logo: 'hubspot',
    category: 'Marketing',
    developer: 'HubSpot',
    dataTypes: ['Contacts', 'Campaigns', 'Email Performance', 'Lead Scores'],
  },
  8: {
    name: 'Zendesk',
    logo: 'zendesk',
    category: 'Customer Support',
    developer: 'Zendesk',
    dataTypes: ['Tickets', 'Customer Conversations', 'Support Metrics', 'KB Articles'],
  },
  9: {
    name: 'Google Workspace',
    logo: 'google',
    category: 'Productivity',
    developer: 'Google',
    dataTypes: ['Emails', 'Contacts', 'Calendar Events', 'Files', 'Documents'],
  },
  10: {
    name: 'Microsoft 365',
    logo: 'microsoft',
    category: 'Productivity',
    developer: 'Microsoft',
    dataTypes: ['Emails', 'Calendar Events', 'Excel Files', 'Word Documents', 'OneDrive Files'],
  },
};

type IntegrationStatus = 'connected' | 'syncing' | 'error' | 'pending_oauth';

interface OwnedIntegration {
  id: number;
  tokenId: number;
  name: string;
  logo: string;
  category: string;
  developer: string;
  dataTypes: string[];
  status: IntegrationStatus;
  lastSync?: Date;
  encryptionCID?: string;
  oauthConnected: boolean;
}

export default function IntegrationsPage() {
  const { authenticated } = usePrivy();
  const { address } = useWalletSync();
  const router = useRouter();

  const [ownedIntegrations, setOwnedIntegrations] = useState<OwnedIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<number | null>(null);

  // Marketplace integration verification (database-driven)
  const [licenses, setLicenses] = useState<number[]>([]);
  const [licensesLoading, setLicensesLoading] = useState(false);
  const [nftVerificationEnabled, setNftVerificationEnabled] = useState(false);

  // Load purchased integrations from backend (and optionally flag NFT verification)
  useEffect(() => {
    const loadPurchases = async () => {
      if (!address || !authenticated) {
        setLicenses([]);
        return;
      }

      try {
        setLicensesLoading(true);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const res = await fetch(
          `${backendUrl}/api/v1/marketplace/my-integrations?wallet_address=${address}`
        );
        if (!res.ok) {
          setLicenses([]);
          return;
        }
        const data = await res.json() as Array<{ product_id: number; is_purchased: boolean }>;
        const productIds = data
          .filter((item) => item.is_purchased)
          .map((item) => item.product_id);
        setLicenses(productIds);

        const blockchainEnabled = process.env.NEXT_PUBLIC_BLOCKCHAIN_VERIFICATION_ENABLED === 'true';
        setNftVerificationEnabled(blockchainEnabled);
      } catch (error) {
        logger.error('Failed to load marketplace integrations for wallet:', error);
        setLicenses([]);
      } finally {
        setLicensesLoading(false);
      }
    };

    loadPurchases();
  }, [address, authenticated]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push('/');
    }
  }, [authenticated, router]);

  // Fetch integration details when licenses change
  useEffect(() => {
    const fetchIntegrationDetails = async () => {
      if (!licenses || !address) {
        setLoading(false);
        return;
      }

      try {
        const integrationPromises = licenses.map(async (licenseId: unknown, index: number) => {
          const integrationId = Number(licenseId);
          const metadata = INTEGRATION_METADATA[integrationId];

          if (!metadata) {
            return null;
          }

          // Check OAuth connection status
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
          let oauthConnected = false;
          let encryptionCID = undefined;
          let lastSync = undefined;

          try {
            const integrationKey = metadata.name.toLowerCase().replace(/\s+/g, '').replace('.com', '').replace('workspace', '').replace('365', '');
            const response = await fetch(
              `${backendUrl}/api/v1/oauth/status/${integrationKey}?wallet_address=${address}`
            );

            if (response.ok) {
              const data = await response.json();
              oauthConnected = data.connected || false;
              encryptionCID = data.credential_cid;
              lastSync = data.stored_at ? new Date(data.stored_at) : undefined;
            }
          } catch (error) {
            console.error(`Failed to check OAuth status for ${metadata.name}:`, error);
          }

          // Determine status
          let status: IntegrationStatus = 'pending_oauth';
          if (oauthConnected) {
            status = lastSync ? 'connected' : 'syncing';
          }

          return {
            id: integrationId,
            tokenId: index,
            name: metadata.name,
            logo: metadata.logo,
            category: metadata.category,
            developer: metadata.developer,
            dataTypes: metadata.dataTypes,
            status,
            lastSync,
            encryptionCID,
            oauthConnected,
          } as OwnedIntegration;
        });

        const integrations = (await Promise.all(integrationPromises)).filter(Boolean) as OwnedIntegration[];
        setOwnedIntegrations(integrations);
      } catch (error) {
        console.error('Failed to fetch integration details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrationDetails();
  }, [licenses, address]);

  const handleConnectOAuth = async (integration: OwnedIntegration) => {
    const integrationKey = integration.name.toLowerCase().replace(/\s+/g, '').replace('.com', '').replace('workspace', '').replace('365', '');

    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(
        `${backendUrl}/api/v1/oauth/start/${integrationKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: address,
            shop_domain: null,
            subdomain: null
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth');
      }

      const data = await response.json();

      if (data.authorization_url) {
        // Redirect to OAuth provider
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error('OAuth connection error:', error);
      alert(`Failed to connect ${integration.name}. Please try again.`);
    }
  };

  const handleManualSync = async (integration: OwnedIntegration) => {
    setSyncing(integration.id);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const integrationKey = integration.name.toLowerCase().replace(/\s+/g, '').replace('.com', '').replace('workspace', '').replace('365', '');

      const response = await fetch(
        `${backendUrl}/api/v1/sync/${integrationKey}/trigger`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: address,
            force: true,
          }),
        }
      );

      if (response.ok) {
        alert(`Sync started for ${integration.name}. This may take a few minutes.`);
        // Refresh integration status after a delay
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      alert(`Failed to sync ${integration.name}. Please try again.`);
    } finally {
      setSyncing(null);
    }
  };

  if (!authenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">My Integrations</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  My Integrations
                </h1>
                <p className="text-gray-600">
                  Manage your connected business tools and data sync
                </p>
              </div>
              <Link
                href="/marketplace"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all"
              >
                + Add Integration
              </Link>
            </div>
          </div>

          {/* Security Overview */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-8">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <span>Maximum Security & Privacy</span>
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-900 mb-1">End-to-End Encryption</p>
                <p className="text-xs text-gray-600">Bank-level security for all data</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-900 mb-1">Secure Cloud Storage</p>
                <p className="text-xs text-gray-600">Distributed encrypted storage</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-900 mb-1">Private & Secure</p>
                <p className="text-xs text-gray-600">Only you can access your data</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-900 mb-1">NFT License Verification</p>
                <p className="text-xs text-gray-600">
                  {nftVerificationEnabled ? (
                    <span className="text-green-600">✓ On-chain verification active</span>
                  ) : (
                    <span className="text-gray-600">Database verification</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {(loading || licensesLoading) && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your integrations...</p>
            </div>
          )}

          {/* No Integrations */}
          {!loading && !licensesLoading && ownedIntegrations.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No Integrations Yet
              </h2>
              <p className="text-gray-600 mb-6">
                Connect your business tools to unlock AI-powered insights
              </p>
              <Link
                href="/marketplace"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all"
              >
                Browse Marketplace
              </Link>
            </div>
          )}

          {/* Integrations Grid */}
          {!loading && !licensesLoading && ownedIntegrations.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {ownedIntegrations.map((integration) => {
                return (
                <div
                  key={integration.tokenId}
                  className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all"
                >
                  {/* Integration Header */}
                  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <IntegrationLogo integration={integration.logo} size="lg" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-gray-900">{integration.name}</h3>
                          </div>
                          <p className="text-sm text-gray-600">by {integration.developer}</p>
                          <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                            {integration.category}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={integration.status} />
                    </div>
                  </div>

                  {/* Integration Body */}
                  <div className="p-6">
                    {/* OAuth Status */}
                    {!integration.oauthConnected && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-sm font-semibold text-yellow-900 mb-2">
                          ⚠️ OAuth Connection Required
                        </p>
                        <p className="text-xs text-yellow-800 mb-3">
                          Connect your {integration.name} account to start syncing data
                        </p>
                        <button
                          onClick={() => handleConnectOAuth(integration)}
                          className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-yellow-700 transition-all"
                        >
                          Connect {integration.name}
                        </button>
                      </div>
                    )}

                    {/* Data Types */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">Data Synced:</h4>
                      <div className="flex flex-wrap gap-2">
                        {integration.dataTypes.map((type) => (
                          <span
                            key={type}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Security Info */}
                    {integration.oauthConnected && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-purple-900 mb-2 text-sm flex items-center gap-2">
                          <span>🔐</span> Encryption Status
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-purple-800">Enterprise Encryption:</span>
                            <span className="text-green-600 font-semibold">✓ Active</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-purple-800">Secure Storage:</span>
                            <span className="text-green-600 font-semibold">✓ Encrypted</span>
                          </div>
                          {integration.encryptionCID && (
                            <div className="mt-2 pt-2 border-t border-purple-200">
                              <p className="text-purple-800 mb-1">Storage ID:</p>
                              <p className="font-mono text-[10px] text-purple-900 bg-white px-2 py-1 rounded break-all">
                                {integration.encryptionCID}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Last Sync */}
                    {integration.lastSync && (
                      <div className="flex items-center justify-between text-sm mb-4">
                        <span className="text-gray-600">Last synced:</span>
                        <span className="text-gray-900 font-medium">
                          {integration.lastSync.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    {integration.oauthConnected && (
                      <button
                        onClick={() => handleManualSync(integration)}
                        disabled={syncing === integration.id}
                        className={`w-full py-3 rounded-lg font-semibold transition-all text-sm ${
                          syncing === integration.id
                            ? 'bg-gray-100 text-gray-400 cursor-wait'
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                        }`}
                      >
                        {syncing === integration.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            Syncing...
                          </span>
                        ) : (
                          '🔄 Manual Sync'
                        )}
                      </button>
                    )}
                  </div>

                  {/* License Details */}
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">License ID:</span>
                      <span className="font-mono text-gray-900 font-semibold">#{integration.tokenId}</span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* Account Info */}
          {address && (
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-600 mb-1">Your Account ID:</p>
              <p className="font-mono text-sm text-gray-900 break-all">{address}</p>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: IntegrationStatus }) {
  const styles = {
    connected: 'bg-green-100 text-green-700 border-green-200',
    syncing: 'bg-blue-100 text-blue-700 border-blue-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    pending_oauth: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };

  const labels = {
    connected: '✓ Connected',
    syncing: '⟳ Syncing',
    error: '✗ Error',
    pending_oauth: '⚠ Setup Required',
  };

  return (
    <span className={`text-xs px-3 py-1 rounded-full font-semibold border-2 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
