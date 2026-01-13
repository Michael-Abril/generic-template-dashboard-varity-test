'use client';

import { useState, useEffect, Suspense } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletSync } from '@/app/providers';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { IntegrationLogo } from '@/components/IntegrationLogo';
import { Shield, Check, RefreshCw, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

/**
 * Integration Management Page
 *
 * Shows ONLY integrations that have been connected via OAuth from the marketplace.
 * This page is dynamic - it fetches connected integrations from the backend.
 *
 * To add new integrations, users should go to the Marketplace page.
 */

interface ConnectedIntegration {
  provider: string;
  name: string;
  logo: string;
  category: string;
  connected_at: string;
  last_sync?: string;
  data_synced?: boolean;
  credential_cid?: string;
}

// Provider display names and categories (for UI display only)
const PROVIDER_INFO: Record<string, { name: string; category: string; dataTypes: string[] }> = {
  quickbooks: { name: 'QuickBooks', category: 'Accounting', dataTypes: ['Invoices', 'Expenses', 'Customers', 'Vendors'] },
  salesforce: { name: 'Salesforce', category: 'CRM', dataTypes: ['Leads', 'Contacts', 'Opportunities', 'Accounts'] },
  shopify: { name: 'Shopify', category: 'E-commerce', dataTypes: ['Products', 'Orders', 'Customers', 'Inventory'] },
  slack: { name: 'Slack', category: 'Communication', dataTypes: ['Messages', 'Channels', 'Files'] },
  hubspot: { name: 'HubSpot', category: 'Marketing', dataTypes: ['Contacts', 'Campaigns', 'Email Analytics'] },
  zendesk: { name: 'Zendesk', category: 'Support', dataTypes: ['Tickets', 'Customers', 'Support Metrics'] },
  google: { name: 'Google Workspace', category: 'Productivity', dataTypes: ['Emails', 'Calendar', 'Documents'] },
  microsoft: { name: 'Microsoft 365', category: 'Productivity', dataTypes: ['Emails', 'Calendar', 'Files'] },
  xero: { name: 'Xero', category: 'Accounting', dataTypes: ['Invoices', 'Bank Transactions', 'Contacts'] },
  freshbooks: { name: 'FreshBooks', category: 'Accounting', dataTypes: ['Invoices', 'Expenses', 'Clients'] },
  mailchimp: { name: 'Mailchimp', category: 'Marketing', dataTypes: ['Campaigns', 'Subscribers', 'Analytics'] },
  docusign: { name: 'DocuSign', category: 'Documents', dataTypes: ['Agreements', 'Signatures', 'Templates'] },
  zoom: { name: 'Zoom', category: 'Communication', dataTypes: ['Meetings', 'Recordings', 'Participants'] },
  dropbox: { name: 'Dropbox', category: 'Storage', dataTypes: ['Files', 'Folders', 'Shared Links'] },
  stripe: { name: 'Stripe', category: 'Payments', dataTypes: ['Transactions', 'Subscriptions', 'Customers'] },
  monday: { name: 'Monday.com', category: 'Project Management', dataTypes: ['Projects', 'Tasks', 'Updates'] },
};

// Inner component that uses useSearchParams
function IntegrationsContent() {
  const { authenticated, ready } = usePrivy();
  const { address } = useWalletSync();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for success param from OAuth callback
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      setSuccessMessage('Integration connected successfully! Your data is now syncing.');
      router.replace('/integrations', { scroll: false });
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [searchParams, router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [authenticated, ready, router]);

  // Load ONLY connected integrations from backend
  useEffect(() => {
    const loadConnectedIntegrations = async () => {
      if (!address || !authenticated) {
        setLoading(false);
        return;
      }

      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

        // Fetch installed/connected integrations for this wallet
        const response = await fetch(
          `${backendUrl}/api/v1/integrations/installed?wallet_address=${address}`
        );

        if (!response.ok) {
          console.error('Failed to fetch integrations:', response.status);
          setIntegrations([]);
          return;
        }

        const data = await response.json();

        // Transform backend response to our format
        // IMPORTANT: Filter out integrations that need reauth (expired tokens)
        const connected: ConnectedIntegration[] = (data.integrations || data || [])
          .filter((item: any) => {
            // Only show integrations that don't need reauth
            // Backend sets needs_reauth=true when token is expired (invalid_grant)
            return !item.needs_reauth && item.connected !== false;
          })
          .map((item: any) => {
            // Backend returns 'slug' as the provider key (e.g., 'slack', 'google')
            const providerKey = item.slug?.toLowerCase() || item.provider?.toLowerCase() || item.name?.toLowerCase() || '';
            const info = PROVIDER_INFO[providerKey] || {
              name: item.name || item.provider || 'Unknown',
              category: 'Other',
              dataTypes: []
            };

            return {
              provider: providerKey,
              name: info.name,
              logo: providerKey,
              category: info.category,
              connected_at: item.connected_at || item.stored_at || new Date().toISOString(),
              last_sync: item.last_sync || item.stored_at,
              data_synced: item.data_synced || false,
              credential_cid: item.credential_cid,
            };
          });

        setIntegrations(connected);
      } catch (error) {
        console.error('Failed to load integrations:', error);
        setIntegrations([]);
      } finally {
        setLoading(false);
      }
    };

    loadConnectedIntegrations();
  }, [address, authenticated]);

  // Manual sync handler
  const handleManualSync = async (provider: string) => {
    setSyncing(provider);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      const response = await fetch(
        `${backendUrl}/api/v1/sync/${provider}/trigger`,
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
        setSuccessMessage(`Sync started for ${PROVIDER_INFO[provider]?.name || provider}. This may take a few minutes.`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast.error('Sync failed', 'Please try again later.');
    } finally {
      setSyncing(null);
    }
  };

  // Disconnect integration handler
  const handleDisconnect = async (provider: string) => {
    const providerName = PROVIDER_INFO[provider]?.name || provider;

    if (!confirm(`Are you sure you want to disconnect ${providerName}? This will remove your OAuth credentials.`)) {
      return;
    }

    setDisconnecting(provider);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      const response = await fetch(
        `${backendUrl}/api/v1/integrations/${provider}?wallet_address=${address}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setIntegrations(prev => prev.filter(i => i.provider !== provider));
        setSuccessMessage(`${providerName} disconnected successfully.`);
        setTimeout(() => setSuccessMessage(null), 5000);

        // Notify Layout to refresh sidebar
        window.dispatchEvent(new Event('integrationsChanged'));
      } else {
        throw new Error('Disconnect failed');
      }
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error('Disconnect failed', `Could not disconnect ${providerName}. Please try again.`);
    } finally {
      setDisconnecting(null);
    }
  };

  if (!authenticated || !ready) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-6">
        <div className="px-4 sm:px-6">

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
                  Manage your connected business tools. Add more from the Marketplace.
                </p>
              </div>
              <Link
                href="/marketplace"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Integration
              </Link>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <Check className="w-6 h-6 text-green-600" />
                <p className="text-green-900 font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Security Overview */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-8">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              <span>Enterprise-Grade Security</span>
            </h3>
            <p className="text-sm text-gray-600">
              All OAuth credentials are encrypted with your wallet address and stored securely on Filecoin.
              Your data is synced to your personal dashboard and can be queried by the AI Assistant.
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your integrations...</p>
            </div>
          )}

          {/* Empty State - No integrations connected */}
          {!loading && integrations.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No integrations connected yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your business tools from the Marketplace to sync your data and unlock AI-powered insights.
              </p>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <ExternalLink className="w-5 h-5" />
                Browse Marketplace
              </Link>
            </div>
          )}

          {/* Connected Integrations */}
          {!loading && integrations.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Connected ({integrations.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.map((integration) => {
                  const info = PROVIDER_INFO[integration.provider] || { name: integration.name, category: 'Other', dataTypes: [] };

                  return (
                    <div
                      key={integration.provider}
                      className="bg-white rounded-xl border-2 border-green-200 p-6 hover:shadow-xl hover:border-green-300 hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <IntegrationLogo integration={integration.logo} size="md" />
                          <div>
                            <h3 className="font-bold text-gray-900">{integration.name}</h3>
                            <p className="text-xs text-gray-500">{integration.category}</p>
                          </div>
                        </div>
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">
                          Connected
                        </span>
                      </div>

                      {/* Data types being synced */}
                      {info.dataTypes.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2">Syncing:</p>
                          <div className="flex flex-wrap gap-1">
                            {info.dataTypes.slice(0, 3).map((type) => (
                              <span key={type} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {type}
                              </span>
                            ))}
                            {info.dataTypes.length > 3 && (
                              <span className="text-xs text-gray-400">+{info.dataTypes.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Connection info */}
                      <div className="text-xs text-gray-500 mb-4">
                        {integration.last_sync && (
                          <p>Last synced: {new Date(integration.last_sync).toLocaleString()}</p>
                        )}
                        {integration.connected_at && (
                          <p>Connected: {new Date(integration.connected_at).toLocaleDateString()}</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleManualSync(integration.provider)}
                          disabled={syncing === integration.provider}
                          className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncing === integration.provider ? 'animate-spin' : ''}`} />
                          {syncing === integration.provider ? 'Syncing...' : 'Sync'}
                        </button>
                        <button
                          onClick={() => handleDisconnect(integration.provider)}
                          disabled={disconnecting === integration.provider}
                          className="py-2 px-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          title="Disconnect integration"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wallet Info */}
          {address && (
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-600 mb-1">Connected Wallet:</p>
              <p className="font-mono text-sm text-gray-900 break-all">{address}</p>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

// Main export with Suspense wrapper for useSearchParams
export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-6">
          <div className="px-4 sm:px-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </Layout>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}
