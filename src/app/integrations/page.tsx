'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletSync } from '@/app/providers';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { IntegrationLogo } from '@/components/IntegrationLogo';
import { logger } from '@/lib/logger';
import { Shield, Check, ExternalLink, RefreshCw, Plus } from 'lucide-react';

/**
 * Integration Management Page
 *
 * Shows ALL available integrations and their connection status
 * - Connect existing accounts via OAuth
 * - View connected integrations and their data
 * - Manual sync controls
 * - Handles ?connect=provider param to auto-start OAuth
 */

// All available integrations (keyed by logo name for easy lookup)
const ALL_INTEGRATIONS: Record<string, {
  name: string;
  logo: string;
  category: string;
  developer: string;
  dataTypes: string[];
  oauthKey: string;
  comingSoon?: boolean;
}> = {
  quickbooks: {
    name: 'QuickBooks',
    logo: 'quickbooks',
    category: 'Accounting',
    developer: 'Intuit',
    dataTypes: ['Invoices', 'Expenses', 'Customers', 'Vendors', 'Payments'],
    oauthKey: 'quickbooks',
  },
  salesforce: {
    name: 'Salesforce',
    logo: 'salesforce',
    category: 'CRM',
    developer: 'Salesforce',
    dataTypes: ['Leads', 'Contacts', 'Opportunities', 'Accounts', 'Activities'],
    oauthKey: 'salesforce',
  },
  shopify: {
    name: 'Shopify',
    logo: 'shopify',
    category: 'E-commerce',
    developer: 'Shopify',
    dataTypes: ['Products', 'Orders', 'Customers', 'Inventory', 'Sales Data'],
    oauthKey: 'shopify',
  },
  slack: {
    name: 'Slack',
    logo: 'slack',
    category: 'Communication',
    developer: 'Slack',
    dataTypes: ['Messages', 'Files', 'Channels', 'Team Activity'],
    oauthKey: 'slack',
  },
  monday: {
    name: 'Monday.com',
    logo: 'monday',
    category: 'Project Management',
    developer: 'Monday.com',
    dataTypes: ['Projects', 'Tasks', 'Timelines', 'Resources', 'Updates'],
    oauthKey: 'monday',
    comingSoon: true,
  },
  stripe: {
    name: 'Stripe',
    logo: 'stripe',
    category: 'Payments',
    developer: 'Stripe',
    dataTypes: ['Transactions', 'Subscriptions', 'Customers', 'Invoices', 'Payouts'],
    oauthKey: 'stripe',
    comingSoon: true,
  },
  hubspot: {
    name: 'HubSpot',
    logo: 'hubspot',
    category: 'Marketing',
    developer: 'HubSpot',
    dataTypes: ['Contacts', 'Campaigns', 'Email Performance', 'Lead Scores'],
    oauthKey: 'hubspot',
  },
  zendesk: {
    name: 'Zendesk',
    logo: 'zendesk',
    category: 'Customer Support',
    developer: 'Zendesk',
    dataTypes: ['Tickets', 'Customer Conversations', 'Support Metrics', 'KB Articles'],
    oauthKey: 'zendesk',
  },
  google: {
    name: 'Google Workspace',
    logo: 'google',
    category: 'Productivity',
    developer: 'Google',
    dataTypes: ['Emails', 'Contacts', 'Calendar Events', 'Files', 'Documents'],
    oauthKey: 'google',
  },
  microsoft: {
    name: 'Microsoft 365',
    logo: 'microsoft',
    category: 'Productivity',
    developer: 'Microsoft',
    dataTypes: ['Emails', 'Calendar Events', 'Excel Files', 'Word Documents', 'OneDrive Files'],
    oauthKey: 'microsoft',
  },
  xero: {
    name: 'Xero',
    logo: 'xero',
    category: 'Accounting',
    developer: 'Xero',
    dataTypes: ['Invoices', 'Bank Transactions', 'Contacts', 'Payments'],
    oauthKey: 'xero',
  },
  freshbooks: {
    name: 'FreshBooks',
    logo: 'freshbooks',
    category: 'Accounting',
    developer: 'FreshBooks',
    dataTypes: ['Invoices', 'Expenses', 'Time Tracking', 'Clients'],
    oauthKey: 'freshbooks',
  },
  mailchimp: {
    name: 'Mailchimp',
    logo: 'mailchimp',
    category: 'Marketing',
    developer: 'Intuit',
    dataTypes: ['Campaigns', 'Subscribers', 'Email Analytics', 'Automations'],
    oauthKey: 'mailchimp',
  },
  docusign: {
    name: 'DocuSign',
    logo: 'docusign',
    category: 'Documents',
    developer: 'DocuSign',
    dataTypes: ['Agreements', 'Signatures', 'Templates', 'Envelopes'],
    oauthKey: 'docusign',
  },
  zoom: {
    name: 'Zoom',
    logo: 'zoom',
    category: 'Communication',
    developer: 'Zoom',
    dataTypes: ['Meetings', 'Recordings', 'Participants', 'Webinars'],
    oauthKey: 'zoom',
  },
  dropbox: {
    name: 'Dropbox',
    logo: 'dropbox',
    category: 'Storage',
    developer: 'Dropbox',
    dataTypes: ['Files', 'Folders', 'Shared Links', 'Team Activity'],
    oauthKey: 'dropbox',
  },
};

type IntegrationStatus = 'connected' | 'syncing' | 'not_connected';

interface IntegrationItem {
  logo: string;
  name: string;
  category: string;
  developer: string;
  dataTypes: string[];
  oauthKey: string;
  status: IntegrationStatus;
  lastSync?: Date;
  encryptionCID?: string;
  oauthConnected: boolean;
  comingSoon?: boolean;
}

// Inner component that uses useSearchParams
function IntegrationsContent() {
  const { authenticated, ready } = usePrivy();
  const { address } = useWalletSync();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [autoConnectTriggered, setAutoConnectTriggered] = useState(false);

  // OAuth connection handler
  const handleConnectOAuth = useCallback(async (integration: IntegrationItem | typeof ALL_INTEGRATIONS[string]) => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    if (integration.comingSoon) {
      alert(`${integration.name} integration is coming soon!`);
      return;
    }

    setConnecting(integration.oauthKey);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(
        `${backendUrl}/api/v1/oauth/start/${integration.oauthKey}`,
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to initiate OAuth');
      }

      const data = await response.json();

      if (data.authorization_url) {
        // Open OAuth provider in new tab for professional experience
        const oauthWindow = window.open(data.authorization_url, '_blank', 'noopener,noreferrer');

        // Set up listener for when OAuth completes
        const handleOAuthComplete = (event: MessageEvent) => {
          // Verify the message is from our OAuth callback
          if (event.data?.type === 'oauth-complete' && event.data?.provider === integration.oauthKey) {
            window.removeEventListener('message', handleOAuthComplete);
            setConnecting(null);

            if (event.data.success) {
              setSuccessMessage(`${integration.name} connected successfully! Your data will now sync.`);
              // Reload integrations to show updated status
              setTimeout(() => window.location.reload(), 1500);
            } else {
              alert(`Failed to connect ${integration.name}: ${event.data.error || 'Unknown error'}`);
            }
          }
        };

        window.addEventListener('message', handleOAuthComplete);

        // Timeout after 5 minutes if OAuth window doesn't complete
        setTimeout(() => {
          window.removeEventListener('message', handleOAuthComplete);
          if (connecting === integration.oauthKey) {
            setConnecting(null);
          }
        }, 300000);
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      console.error('OAuth connection error:', error);
      alert(`Failed to connect ${integration.name}: ${error.message}`);
      setConnecting(null);
    }
  }, [address, connecting]);

  // Handle ?connect=provider param - auto-start OAuth
  useEffect(() => {
    const connectProvider = searchParams.get('connect');
    const success = searchParams.get('success');

    if (success === 'true') {
      setSuccessMessage('Integration connected successfully! Your data will now sync.');
      // Clear the success param from URL
      router.replace('/integrations', { scroll: false });
      setTimeout(() => setSuccessMessage(null), 5000);
    }

    if (connectProvider && address && authenticated && !connecting && !autoConnectTriggered) {
      const integration = ALL_INTEGRATIONS[connectProvider.toLowerCase()];
      if (integration && !integration.comingSoon) {
        setAutoConnectTriggered(true);
        // Auto-start OAuth for this provider
        handleConnectOAuth(integration);
        // Clear the connect param from URL to prevent re-triggering
        router.replace('/integrations', { scroll: false });
      }
    }
  }, [searchParams, address, authenticated, connecting, autoConnectTriggered, handleConnectOAuth, router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [authenticated, ready, router]);

  // Load ALL integrations and check their connection status
  useEffect(() => {
    const loadIntegrations = async () => {
      if (!address || !authenticated) {
        setLoading(false);
        return;
      }

      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

        // Check OAuth status for each integration
        const integrationItems: IntegrationItem[] = await Promise.all(
          Object.values(ALL_INTEGRATIONS).map(async (integration) => {
            let oauthConnected = false;
            let encryptionCID = undefined;
            let lastSync = undefined;
            let status: IntegrationStatus = 'not_connected';

            if (!integration.comingSoon) {
              try {
                const response = await fetch(
                  `${backendUrl}/api/v1/oauth/status/${integration.oauthKey}?wallet_address=${address}`
                );

                if (response.ok) {
                  const data = await response.json();
                  oauthConnected = data.connected || false;
                  encryptionCID = data.credential_cid;
                  lastSync = data.stored_at ? new Date(data.stored_at) : undefined;

                  if (oauthConnected) {
                    status = lastSync ? 'connected' : 'syncing';
                  }
                }
              } catch (error) {
                console.error(`Failed to check OAuth status for ${integration.name}:`, error);
              }
            }

            return {
              ...integration,
              status,
              lastSync,
              encryptionCID,
              oauthConnected,
            };
          })
        );

        // Sort: connected first, then by category, then by name
        integrationItems.sort((a, b) => {
          if (a.oauthConnected && !b.oauthConnected) return -1;
          if (!a.oauthConnected && b.oauthConnected) return 1;
          if (a.comingSoon && !b.comingSoon) return 1;
          if (!a.comingSoon && b.comingSoon) return -1;
          return a.name.localeCompare(b.name);
        });

        setIntegrations(integrationItems);
      } catch (error) {
        console.error('Failed to load integrations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadIntegrations();
  }, [address, authenticated]);

  const handleManualSync = async (integration: IntegrationItem) => {
    setSyncing(integration.oauthKey);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      const response = await fetch(
        `${backendUrl}/api/v1/sync/${integration.oauthKey}/trigger`,
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

  if (!authenticated || !ready) {
    return null;
  }

  const connectedCount = integrations.filter(i => i.oauthConnected).length;
  const availableCount = integrations.filter(i => !i.comingSoon && !i.oauthConnected).length;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Integrations</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  My Integrations
                </h1>
                <p className="text-gray-600">
                  Connect your business tools to aggregate data and unlock AI-powered insights
                </p>
              </div>
              <Link
                href="/marketplace"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Browse Marketplace
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

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Connected</p>
              <p className="text-2xl font-bold text-green-600">{connectedCount}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Available to Connect</p>
              <p className="text-2xl font-bold text-blue-600">{availableCount}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Total Integrations</p>
              <p className="text-2xl font-bold text-gray-900">{integrations.length}</p>
            </div>
          </div>

          {/* Security Overview */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-8">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              <span>Enterprise-Grade Security</span>
            </h3>
            <p className="text-sm text-gray-600">
              All OAuth credentials are encrypted with your wallet and stored securely.
              Your data is synced to your personal dashboard and can be queried by the AI Assistant.
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading integrations...</p>
            </div>
          )}

          {/* Connected Integrations */}
          {!loading && connectedCount > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Connected ({connectedCount})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.filter(i => i.oauthConnected).map((integration) => (
                  <div
                    key={integration.oauthKey}
                    className="bg-white rounded-xl border-2 border-green-200 p-6 hover:shadow-lg transition-all"
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

                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Syncing:</p>
                      <div className="flex flex-wrap gap-1">
                        {integration.dataTypes.slice(0, 3).map((type) => (
                          <span key={type} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {type}
                          </span>
                        ))}
                        {integration.dataTypes.length > 3 && (
                          <span className="text-xs text-gray-400">+{integration.dataTypes.length - 3} more</span>
                        )}
                      </div>
                    </div>

                    {integration.lastSync && (
                      <p className="text-xs text-gray-500 mb-4">
                        Last synced: {integration.lastSync.toLocaleString()}
                      </p>
                    )}

                    <button
                      onClick={() => handleManualSync(integration)}
                      disabled={syncing === integration.oauthKey}
                      className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing === integration.oauthKey ? 'animate-spin' : ''}`} />
                      {syncing === integration.oauthKey ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Integrations */}
          {!loading && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Available Integrations ({availableCount})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.filter(i => !i.oauthConnected && !i.comingSoon).map((integration) => (
                  <div
                    key={integration.oauthKey}
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <IntegrationLogo integration={integration.logo} size="md" />
                        <div>
                          <h3 className="font-bold text-gray-900">{integration.name}</h3>
                          <p className="text-xs text-gray-500">{integration.category}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                      Connect your {integration.name} account to sync {integration.dataTypes.slice(0, 2).join(', ').toLowerCase()}
                      {integration.dataTypes.length > 2 ? ` and ${integration.dataTypes.length - 2} more` : ''}.
                    </p>

                    <button
                      onClick={() => handleConnectOAuth(integration)}
                      disabled={connecting === integration.oauthKey}
                      className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {connecting === integration.oauthKey ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Connect Account
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coming Soon Integrations */}
          {!loading && integrations.filter(i => i.comingSoon).length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 text-gray-400">
                Coming Soon
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.filter(i => i.comingSoon).map((integration) => (
                  <div
                    key={integration.oauthKey}
                    className="bg-gray-50 rounded-xl border border-gray-200 p-6 opacity-60"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <IntegrationLogo integration={integration.logo} size="md" />
                        <div>
                          <h3 className="font-bold text-gray-500">{integration.name}</h3>
                          <p className="text-xs text-gray-400">{integration.category}</p>
                        </div>
                      </div>
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-semibold">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                ))}
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
