'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWalletSync } from '@/app/providers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { IntegrationLogo } from '@/components/IntegrationLogo';
import { AlertTriangle, XCircle, Search, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { MarketplaceSkeleton } from '@/components/ui/Skeleton';
import * as marketplaceService from '@/services/marketplaceService';
import type { ProductSummary } from '@/services/marketplaceService';

/**
 * Integration Marketplace - Simplified OAuth Connection Flow
 *
 * This is a SIMPLE integration connection page:
 * 1. User clicks "Connect" on a software card
 * 2. Opens software's OAuth login page directly (no intermediate modal)
 * 3. User logs in with their credentials
 * 4. Popup closes, redirected back
 * 5. Software shows as connected on /integrations page
 */

// Mapping from product logo names to OAuth provider names
const LOGO_TO_OAUTH_PROVIDER: Record<string, string> = {
  'quickbooks': 'quickbooks',
  'google-workspace': 'google',
  'google': 'google',
  'salesforce': 'salesforce',
  'hubspot': 'hubspot',
  'slack': 'slack',
  'microsoft-365': 'microsoft',
  'microsoft': 'microsoft',
};

// Products with OAuth integrations configured
const OAUTH_SUPPORTED_PROVIDERS = new Set([
  'quickbooks',
  'google',
  'salesforce',
  'hubspot',
  'slack',
  'microsoft',
]);

const isOAuthSupported = (logo: string): boolean => {
  const oauthProvider = LOGO_TO_OAUTH_PROVIDER[logo];
  return oauthProvider ? OAUTH_SUPPORTED_PROVIDERS.has(oauthProvider) : false;
};

const getOAuthProvider = (logo: string): string => {
  return LOGO_TO_OAUTH_PROVIDER[logo] || logo;
};

export default function MarketplaceContent() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { address: syncedAddress } = useWalletSync();
  const router = useRouter();
  const toast = useToast();

  const address = syncedAddress || wallets[0]?.address;

  // State
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [categories, setCategories] = useState<marketplaceService.Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  // Load products and categories
  useEffect(() => {
    loadMarketplaceData();
  }, []);

  // Load connected integrations
  useEffect(() => {
    if (address) {
      loadConnectedIntegrations();
    }
  }, [address]);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [productsData, categoriesData] = await Promise.all([
        marketplaceService.getProducts(),
        marketplaceService.getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Error loading marketplace:', err);
      setError(err.message || 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const loadConnectedIntegrations = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
      const res = await fetch(`${apiBase}/api/v1/integrations/installed?wallet_address=${address}`);
      if (res.ok) {
        const data = await res.json();
        const connected = data.integrations?.map((i: any) => i.provider) || [];
        setConnectedIntegrations(connected);
      }
    } catch (e) {
      console.error('Failed to load connected integrations', e);
    }
  };

  // Filter products
  const availableProducts = products.filter(p => isOAuthSupported(p.logo) && !p.coming_soon);
  const comingSoonProducts = products.filter(p => !isOAuthSupported(p.logo) || p.coming_soon);

  const filteredProducts = availableProducts
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .filter(p => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
    });

  // DIRECT OAuth connection - no modal, goes straight to login page
  const handleConnect = async (product: ProductSummary) => {
    if (!authenticated || !address) {
      toast.warning('Sign in required', 'Please sign in first to connect integrations.');
      return;
    }

    const provider = getOAuthProvider(product.logo);
    setConnectingProvider(provider);

    try {
      // Store wallet address for OAuth callback
      if (typeof window !== 'undefined') {
        localStorage.setItem('varity_oauth_wallet_address', address);
      }

      // Get OAuth authorization URL from backend
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
      const response = await fetch(`${apiBase}/api/v1/oauth/start/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to start OAuth');
      }

      if (data.authorization_url) {
        // Listen for OAuth completion from popup
        const handleOAuthMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type === 'oauth-complete' && event.data?.provider === provider) {
            window.removeEventListener('message', handleOAuthMessage);
            setConnectingProvider(null);
            if (event.data.success) {
              toast.success('Connected!', `${product.name} has been connected successfully.`);
              loadConnectedIntegrations();
              // Redirect to integrations page
              setTimeout(() => router.push('/integrations'), 1500);
            } else {
              toast.error('Connection failed', event.data.error || 'Please try again.');
            }
          }
        };

        window.addEventListener('message', handleOAuthMessage);

        // Open OAuth in popup
        const popup = window.open(
          data.authorization_url,
          `oauth-${provider}`,
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // If popup blocked, redirect in same window
        if (!popup || popup.closed) {
          window.removeEventListener('message', handleOAuthMessage);
          window.location.href = data.authorization_url;
        }
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      toast.error('Connection failed', error.message || 'Could not start authentication.');
      setConnectingProvider(null);
    }
  };

  const isConnected = (logo: string): boolean => {
    const provider = getOAuthProvider(logo);
    return connectedIntegrations.includes(provider);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Marketplace</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect Your Software</h1>
            <p className="text-gray-600">
              Connect your existing business tools to aggregate all your data in one dashboard
            </p>
          </div>

          {/* Auth Warning */}
          {(!authenticated || !address) && ready && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-amber-900 font-semibold text-sm">Sign In Required</p>
                  <p className="text-amber-800 text-sm mt-1">
                    Please sign in to connect your software integrations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-red-900 font-semibold text-sm">Error</p>
                  <p className="text-red-800 text-sm mt-1">{error}</p>
                  <button onClick={loadMarketplaceData} className="mt-2 text-sm text-red-700 underline">
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && <MarketplaceSkeleton />}

          {!loading && !error && (
            <>
              {/* Search */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <input
                    type="text"
                    placeholder="Search software..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category.slug}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedCategory === category.slug
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Available</p>
                  <p className="text-2xl font-bold text-green-600">{availableProducts.length}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Connected</p>
                  <p className="text-2xl font-bold text-blue-600">{connectedIntegrations.length}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Coming Soon</p>
                  <p className="text-2xl font-bold text-amber-600">{comingSoonProducts.length}</p>
                </div>
              </div>

              {/* Available Integrations */}
              <h2 className="text-xl font-bold text-gray-900 mb-4">Available Integrations</h2>

              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center mb-8">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Results</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search or filters.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {filteredProducts.map(product => {
                    const provider = getOAuthProvider(product.logo);
                    const connected = isConnected(product.logo);
                    const connecting = connectingProvider === provider;

                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <IntegrationLogo integration={product.logo} size="lg" />
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{product.name}</h3>
                            <p className="text-sm text-gray-500">{product.developer}</p>
                          </div>
                          {connected && (
                            <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                              <CheckCircle className="w-4 h-4" />
                              Connected
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {product.short_description}
                        </p>

                        <button
                          onClick={() => handleConnect(product)}
                          disabled={connected || connecting || !authenticated}
                          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                            connected
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : connecting
                              ? 'bg-blue-100 text-blue-600 cursor-wait'
                              : !authenticated
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                          }`}
                        >
                          {connecting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Connecting...
                            </>
                          ) : connected ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Connected
                            </>
                          ) : (
                            `Connect ${product.name}`
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Coming Soon Section */}
              {comingSoonProducts.length > 0 && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Coming Soon</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {comingSoonProducts.slice(0, 6).map(product => (
                      <div
                        key={product.id}
                        className="bg-white rounded-xl border border-gray-200 p-6 opacity-60"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <IntegrationLogo integration={product.logo} size="lg" />
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-700">{product.name}</h3>
                            <p className="text-sm text-gray-500">{product.developer}</p>
                          </div>
                          <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-full">
                            Soon
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {product.short_description}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
