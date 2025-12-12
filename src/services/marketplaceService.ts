/**
 * Marketplace API Service
 * Handles all API calls to the marketplace backend
 */

import { logger } from '@/lib/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/**
 * Fetch with timeout and retry logic
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds (default: 30000ms = 30 seconds)
 * @param retries - Number of retry attempts (default: 3)
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 30000,
  retries: number = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(undefined);

      // If it's the last attempt, throw the error
      if (attempt === retries) {
        if (error.name === 'AbortError') {
          throw new Error(
            `Request timeout after ${timeout / 1000}s - the backend may be unavailable. Please check your connection and try again.`
          );
        }

        if (error.message?.includes('fetch')) {
          throw new Error(
            `Failed to connect to backend at ${url}. Please ensure the backend is running and accessible.`
          );
        }

        throw error;
      }

      // Wait before retry (exponential backoff: 1s, 2s, 4s)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));

      logger.warn(`Retrying request (attempt ${attempt + 1}/${retries})`, { url, error: error.message });
    }
  }

  // This should never happen, but TypeScript requires it
  throw new Error('Unexpected error in fetchWithTimeout');
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  product_count: number;
}

export interface ProductSummary {
  id: number;
  name: string;
  slug: string;
  developer: string;
  category: string;
  logo: string;
  brand_color: string;
  short_description: string;
  has_adapter: boolean;
  pricing_model: string;
  active: boolean;
  featured: boolean;
  coming_soon: boolean;
  starting_price: number | null;
  plan_count: number;
}

export interface PlanLimit {
  limit_key: string;
  limit_value: string;
  display_text: string | null;
  is_unlimited: boolean;
}

export interface PlanFeature {
  feature_text: string;
  category: string | null;
  is_included: boolean;
  is_highlight: boolean;
}

export interface PricingPlan {
  id: number;
  tier: string;
  name: string;
  monthly_price: number | null;
  annual_price: number | null;
  annual_discount_percent: number | null;
  is_per_user: boolean;
  minimum_users: number | null;
  maximum_users: number | null;
  is_free: boolean;
  is_popular: boolean;
  is_recommended: boolean;
  setup_fee: number | null;
  onboarding_fee: number | null;
  features: PlanFeature[];
  limits: PlanLimit[];
}

export interface DataSync {
  sync_type: string;
  description: string | null;
  icon: string | null;
}

export interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  developer: string;
  category: string;
  logo: string;
  brand_color: string;
  description: string;
  short_description: string;
  has_adapter: boolean;
  pricing_model: string;
  transaction_fee_percent: number | null;
  transaction_fee_fixed: number | null;
  per_unit_cost: number | null;
  storage_info: string;
  active: boolean;
  featured: boolean;
  website_url: string | null;
  documentation_url: string | null;
  support_url: string | null;
  pricing_plans: PricingPlan[];
  data_sync: DataSync[];
}

export interface ProductFilters {
  category?: string;
  search?: string;
  featured?: boolean;
  has_adapter?: boolean;
}

export interface PricingCalculation {
  base_price: number;
  quantity: number;
  subtotal: number;
  setup_fee: number;
  onboarding_fee: number;
  total_one_time: number;
  total_recurring: number;
  total_first_payment: number;
  billing_period: string;
  annual_total?: number;
  annual_savings?: number;
}

export interface PurchaseRequest {
  product_id: number;
  tier: string;
  billing_period: 'monthly' | 'annually';
  /**
   * Number of users/seats for per-user plans.
   * For non per-user plans this should be 1.
   */
  users: number;
  wallet_address: string;
}

export interface PurchaseResponse {
  success: boolean;
  license_id?: number;
  product_name: string;
  tier: string;
  amount_paid: number;
  currency: string;
  transaction_hash?: string;
  expires_at?: string;
}

/**
 * Fetch all categories with product counts
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/marketplace/categories`);

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error fetching categories', error);
    throw error;
  }
}

/**
 * Fetch all products with optional filters
 */
export async function getProducts(filters?: ProductFilters): Promise<ProductSummary[]> {
  try {
    const params = new URLSearchParams();

    if (filters?.category) {
      params.append('category', filters.category);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.featured !== undefined) {
      params.append('featured', filters.featured.toString());
    }
    if (filters?.has_adapter !== undefined) {
      params.append('has_adapter', filters.has_adapter.toString());
    }

    const url = `${API_BASE_URL}/api/v1/marketplace/products${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error fetching products', error);
    throw error;
  }
}

/**
 * Fetch detailed product information by ID
 */
export async function getProductById(productId: number): Promise<ProductDetail> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/marketplace/products/${productId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error(`Error fetching product ${productId}`, error);
    throw error;
  }
}

/**
 * Fetch detailed product information by slug
 */
export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/marketplace/products/slug/${slug}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error(`Error fetching product ${slug}`, error);
    throw error;
  }
}

/**
 * Calculate pricing for a specific configuration
 */
export async function calculatePricing(
  productId: number,
  tier: string,
  billingPeriod: 'monthly' | 'annual',
  quantity: number = 1
): Promise<PricingCalculation> {
  try {
    const params = new URLSearchParams({
      product_id: productId.toString(),
      tier,
      billing_period: billingPeriod,
      users: quantity.toString()
    });

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/marketplace/pricing-calculator?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error calculating pricing', error);
    throw error;
  }
}

/**
 * Purchase a product license
 */
export async function purchaseLicense(request: PurchaseRequest): Promise<PurchaseResponse> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/marketplace/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error purchasing license', error);
    throw error;
  }
}

export interface OAuthConfig {
  authorization_url: string;
  token_url: string;
  scopes: string[];
  redirect_uri: string;
}

export interface SyncCapability {
  sync_type: string;
  description: string | null;
  icon: string | null;
  supported: boolean;
}

export interface IntegrationConfig {
  product_id: number;
  product_name: string;
  slug: string;
  developer: string;
  logo: string;
  brand_color: string | null;
  has_adapter: boolean;
  oauth_config: OAuthConfig | null;
  sync_capabilities: SyncCapability[];
  setup_instructions: string;
  documentation_url: string | null;
  support_url: string | null;
  website_url: string | null;
}

/**
 * Fetch integration configuration for a specific product
 */
export async function getIntegrationConfig(slug: string): Promise<IntegrationConfig> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/marketplace/integration-config/${slug}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error(`Error fetching integration config for ${slug}`, error);
    throw error;
  }
}

export default {
  getCategories,
  getProducts,
  getProductById,
  getProductBySlug,
  calculatePricing,
  purchaseLicense,
  getIntegrationConfig,
};
