'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWalletSync } from '@/app/providers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { IntegrationLogo } from '@/components/IntegrationLogo';
import { AlertTriangle, XCircle, Search } from 'lucide-react';
import { MarketplaceSkeleton } from '@/components/ui/Skeleton';
import { CONTRACTS, USDC_ABI, TOOL_MARKETPLACE_ABI, parseUSDC } from '@/lib/contracts';
import * as marketplaceService from '@/services/marketplaceService';
import type { ProductSummary, ProductDetail, PricingPlan } from '@/services/marketplaceService';
import { ethers } from 'ethers';

/**
 * Tool Integration Marketplace - Enterprise UI with Dynamic Data
 *
 * Features:
 * - Dynamic product loading from backend API
 * - Pricing tier selection (Starter/Professional/Enterprise)
 * - Per-user/seat quantity selection
 * - Real-time pricing calculation
 * - Smart contract integration for purchases
 */

export default function MarketplaceContent() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { address: syncedAddress, isLoading: walletLoading, isSynced } = useWalletSync();
  const router = useRouter();

  // Use synced address from wallet sync
  const address = syncedAddress || wallets[0]?.address;

  // State management
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [categories, setCategories] = useState<marketplaceService.Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [userLicenses, setUserLicenses] = useState<number[]>([]);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tier selection modal state
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [selectedTier, setSelectedTier] = useState<PricingPlan | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('monthly');
  const [showTierModal, setShowTierModal] = useState(false);

  // Purchase confirmation modal state
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<{
    product: ProductDetail;
    tier: PricingPlan;
    price: number;
    duration: string;
    transactionHash?: string;
  } | null>(null);

  // Load products and categories on mount
  useEffect(() => {
    loadMarketplaceData();
  }, []);

  // Load user integrations/purchases when wallet address is available
  useEffect(() => {
    const loadUserIntegrations = async () => {
      if (!address) return;
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const res = await fetch(
          `${apiBase}/api/v1/marketplace/my-integrations?wallet_address=${address}`
        );
        if (!res.ok) return;
        const data = await res.json() as Array<{ product_id: number }>;
        const productIds = data.map((i) => i.product_id);
        setUserLicenses(productIds);
      } catch (e) {
        console.error('Failed to load user integrations', e);
      }
    };

    loadUserIntegrations();
  }, [address]);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load products and categories in parallel
      const [productsData, categoriesData] = await Promise.all([
        marketplaceService.getProducts(),
        marketplaceService.getCategories()
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Error loading marketplace data:', err);
      setError(err.message || 'Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  // Filter, search, and sort products
  const filteredProducts = products
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .filter(p => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.short_description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.developer.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return (a.starting_price || 999) - (b.starting_price || 999);
        case 'price-high':
          return (b.starting_price || 0) - (a.starting_price || 0);
        case 'popular':
          if (a.has_adapter === b.has_adapter) {
            if (a.featured === b.featured) return a.name.localeCompare(b.name);
            return a.featured ? -1 : 1;
          }
          return a.has_adapter ? -1 : 1;
        default:
          return 0;
      }
    });

  const handleSelectProduct = async (product: ProductSummary) => {
    try {
      // Fetch full product details with pricing tiers
      const productDetail = await marketplaceService.getProductById(product.id);
      setSelectedProduct(productDetail);

      // Select first tier by default (or popular tier)
      // If no pricing plans exist, create a free tier for installation
      let defaultTier: PricingPlan | null = null;

      if (productDetail.pricing_plans && productDetail.pricing_plans.length > 0) {
        defaultTier = productDetail.pricing_plans.find(p => p.is_popular) || productDetail.pricing_plans[0];
      } else {
        // Create a "Free Installation" tier for products without pricing plans
        defaultTier = {
          id: 0,
          tier: 'free',
          name: 'Free Installation',
          monthly_price: 0,
          annual_price: 0,
          annual_discount_percent: null,
          is_per_user: false,
          minimum_users: null,
          maximum_users: null,
          is_free: true,
          is_popular: true,
          is_recommended: true,
          setup_fee: null,
          onboarding_fee: null,
          features: [
            { feature_text: 'Connect your account', category: null, is_included: true, is_highlight: true },
            { feature_text: 'Sync business data', category: null, is_included: true, is_highlight: false },
            { feature_text: 'AI-powered insights', category: null, is_included: true, is_highlight: false }
          ],
          limits: []
        };
      }

      setSelectedTier(defaultTier);

      // Reset quantity
      setQuantity(defaultTier?.is_per_user ? (defaultTier.minimum_users || 1) : 1);
      setBillingPeriod('monthly');

      setShowTierModal(true);
    } catch (err: any) {
      console.error('Error loading product details:', err);
      alert(`Failed to load ${product.name} details: ${err.message}`);
    }
  };

  const handleTierChange = (tier: PricingPlan) => {
    setSelectedTier(tier);
    // Adjust quantity to minimum if needed
    if (tier.is_per_user && tier.minimum_users && quantity < tier.minimum_users) {
      setQuantity(tier.minimum_users);
    }
  };

  const calculateTotalPrice = (): number => {
    if (!selectedTier) return 0;

    const basePrice = billingPeriod === 'monthly'
      ? (selectedTier.monthly_price || 0)
      : (selectedTier.annual_price || selectedTier.monthly_price || 0);

    const total = selectedTier.is_per_user ? basePrice * quantity : basePrice;
    const setup = selectedTier.setup_fee || 0;
    const onboarding = selectedTier.onboarding_fee || 0;

    return total + (setup + onboarding) / (billingPeriod === 'annually' ? 12 : 1);
  };

  const handlePurchase = async () => {
    if (!selectedProduct || !selectedTier || !authenticated || !address) {
      alert('Please sign in and connect wallet first');
      return;
    }

    setPurchasing(selectedProduct.id);
    setPurchaseStatus('Processing purchase...');

    try {
      const users = selectedTier.is_per_user ? quantity : 1;

      const purchaseRequest: marketplaceService.PurchaseRequest = {
        product_id: selectedProduct.id,
        tier: selectedTier.tier,
        billing_period: billingPeriod,
        users,
        wallet_address: address,
      };

      const purchaseResponse = await marketplaceService.purchaseLicense(purchaseRequest);

      // Show success with real backend data
      setPurchaseDetails({
        product: selectedProduct,
        tier: selectedTier,
        price: Number(purchaseResponse.amount_paid ?? calculateTotalPrice()),
        duration: billingPeriod === 'annually' ? '1 year' : '1 month',
        transactionHash: purchaseResponse.transaction_hash,
      });

      setShowTierModal(false);
      setShowConfirmationModal(true);

    } catch (error: any) {
      console.error('Purchase error:', error);
      alert(`Purchase failed: ${error.message}`);
    } finally {
      setPurchasing(null);
      setPurchaseStatus('');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Marketplace</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Integration Marketplace
            </h1>
            <p className="text-gray-600">
              Connect your existing business tools and aggregate all your data in one unified dashboard
            </p>
          </div>

          {/* Warning if not authenticated or no wallet */}
          {(!authenticated || !address) && ready && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-amber-900 font-semibold text-sm">
                    {!authenticated ? 'Authentication Required' : 'Wallet Connection Required'}
                  </p>
                  <p className="text-amber-800 text-sm mt-1">
                    {!authenticated
                      ? 'Please sign in to install and manage integrations'
                      : 'Your wallet is being set up. Please refresh the page if this message persists.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-red-900 font-semibold text-sm">Error Loading Marketplace</p>
                  <p className="text-red-800 text-sm mt-1">{error}</p>
                  <button
                    onClick={loadMarketplaceData}
                    className="mt-2 text-sm text-red-700 underline hover:text-red-900"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && <MarketplaceSkeleton />}

          {/* Marketplace Content */}
          {!loading && !error && (
            <>
              {/* Search and Sort Bar */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search integrations by name, category, or developer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                  />
                  <svg
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="sm:w-64">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm bg-white"
                  >
                    <option value="name">Sort: A-Z</option>
                    <option value="price-low">Sort: Price (Low to High)</option>
                    <option value="price-high">Sort: Price (High to Low)</option>
                    <option value="popular">Sort: Popular</option>
                  </select>
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  All Categories
                </button>
                {categories.map(category => (
                  <button
                    key={category.slug}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedCategory === category.slug
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {category.name} {category.product_count > 0 && `(${category.product_count})`}
                  </button>
                ))}
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Integrations</p>
                  <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Showing Results</p>
                  <p className="text-2xl font-bold text-blue-600">{filteredProducts.length}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Your Installations</p>
                  <p className="text-2xl font-bold text-green-600">{userLicenses.length}</p>
                </div>
              </div>

              {/* No Results Message */}
              {filteredProducts.length === 0 && (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <Search className="w-16 h-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Integrations Found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery
                      ? `No results for "${searchQuery}". Try adjusting your search.`
                      : 'No integrations match the selected filters.'}
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Clear Filters
                  </button>
                </div>
              )}

              {/* Products Grid */}
              {filteredProducts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className={`bg-white rounded-xl border border-gray-200 p-6 transition-shadow relative ${
                        product.coming_soon
                          ? 'opacity-60 cursor-not-allowed'
                          : 'hover:shadow-lg cursor-pointer'
                      }`}
                      onClick={() => !product.coming_soon && handleSelectProduct(product)}
                    >
                      {/* Coming Soon Badge */}
                      {product.coming_soon && (
                        <div className="absolute top-3 right-3 bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-full">
                          Coming Soon
                        </div>
                      )}

                      {/* Product Card Content */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <IntegrationLogo integration={product.logo} size="md" />
                          <div>
                            <h3 className={`font-bold ${product.coming_soon ? 'text-gray-500' : 'text-gray-900'}`}>{product.name}</h3>
                            <p className="text-xs text-gray-500">{product.developer}</p>
                          </div>
                        </div>
                      </div>

                      <p className={`text-sm mb-4 line-clamp-2 ${product.coming_soon ? 'text-gray-400' : 'text-gray-600'}`}>
                        {product.short_description}
                      </p>

                      <div className="border-t border-gray-200 pt-4 mt-4">
                        {product.coming_soon ? (
                          <p className="text-sm text-gray-400 italic">Available soon</p>
                        ) : product.starting_price ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Starting at</p>
                            <p className="text-2xl font-bold text-gray-900">
                              ${product.starting_price}
                              <span className="text-sm font-normal text-gray-500">/mo</span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">Usage-based pricing</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Integration Connection Modal */}
      {showTierModal && selectedProduct && selectedTier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <IntegrationLogo integration={selectedProduct.logo} size="lg" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Connect {selectedProduct.name}</h2>
                  <p className="text-gray-600">{selectedProduct.developer}</p>
                </div>
              </div>
              <button
                onClick={() => setShowTierModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-6">{selectedProduct.description}</p>

              {/* What data will be synced */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">What will be connected:</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Connect your existing {selectedProduct.name} account
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Sync your business data securely
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI Assistant can query your {selectedProduct.name} data
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowTierModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Navigate to integrations page to start OAuth flow
                    setShowTierModal(false);
                    window.location.href = `/integrations?connect=${selectedProduct.logo}`;
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
                >
                  Connect Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Confirmation Modal */}
      {showConfirmationModal && purchaseDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold text-white text-center">Purchase Successful!</h2>
            </div>

            <div className="p-6">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmationModal(false)}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
