/**
 * Type definitions for Varity Generic Company Dashboard
 *
 * This file contains all TypeScript type definitions, interfaces, and types
 * used throughout the application to ensure type safety and prevent `any` usage.
 */

// ============================================================================
// Blockchain & Smart Contract Types
// ============================================================================

/** Ethereum address type */
export type Address = `0x${string}`;

/** Transaction hash type */
export type TransactionHash = `0x${string}`;

/** Chain ID type */
export type ChainId = number;

/** BigNumber-like value */
export type BigNumberish = string | number | bigint;

// ============================================================================
// Marketplace Types
// ============================================================================

/** Product category */
export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  count?: number;
}

/** Pricing plan for a product */
export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  features: string[];
  max_users?: number;
  is_popular?: boolean;
}

/** Product summary (list view) */
export interface ProductSummary {
  id: string;
  name: string;
  short_description: string;
  category: string;
  developer: string;
  logo_url?: string;
  starting_price?: number;
  has_adapter: boolean;
  featured: boolean;
  rating?: number;
  reviews_count?: number;
}

/** Product detail (full view) */
export interface ProductDetail {
  id: string;
  name: string;
  short_description: string;
  long_description: string;
  category: string;
  developer: string;
  logo_url?: string;
  screenshots?: string[];
  pricing_plans: PricingPlan[];
  features: string[];
  has_adapter: boolean;
  featured: boolean;
  rating?: number;
  reviews_count?: number;
  supported_integrations?: string[];
  documentation_url?: string;
  support_url?: string;
}

// ============================================================================
// License & Purchase Types
// ============================================================================

/** License information */
export interface License {
  licenseId: number;
  productId: string;
  productName: string;
  tier: string;
  expiresAt: Date;
  isActive: boolean;
}

/** Purchase details for confirmation */
export interface PurchaseDetails {
  product: ProductDetail;
  tier: PricingPlan;
  price: number;
  duration: string;
  transactionHash?: TransactionHash;
  quantity?: number;
  billingPeriod?: 'monthly' | 'annual';
}

// ============================================================================
// AI Chat Types
// ============================================================================

/** Chat message role */
export type MessageRole = 'user' | 'assistant';

/** Chat message */
export interface Message {
  role: MessageRole;
  content: string;
  sources?: string[];
  timestamp: Date;
}

/** AI chat source */
export interface AISource {
  tool: string;
  data_type: string;
  relevance_score?: number;
}

/** AI chat request */
export interface AIChatRequest {
  message: string;
  wallet_address: Address;
  use_rag: boolean;
  context?: Record<string, unknown>;
}

/** AI chat response */
export interface AIChatResponse {
  response: string;
  sources?: AISource[];
  confidence?: number;
  processing_time_ms?: number;
}

// ============================================================================
// Integration Types
// ============================================================================

/** Integration status */
export type IntegrationStatus = 'active' | 'inactive' | 'pending' | 'error';

/** Integration */
export interface Integration {
  id: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  logo_url?: string;
  connected_at?: Date;
  last_sync?: Date;
  error_message?: string;
}

/** Integration list response */
export interface IntegrationsResponse {
  integrations: Integration[];
  total_count: number;
}

// ============================================================================
// Wallet & Authentication Types
// ============================================================================

/** Wallet sync state */
export interface WalletSyncState {
  address: Address | null;
  isLoading: boolean;
  isSynced: boolean;
  error?: string;
}

/** Authentication state */
export interface AuthState {
  authenticated: boolean;
  ready: boolean;
  user?: {
    id: string;
    wallet?: {
      address: Address;
    };
  };
}

// ============================================================================
// API Response Types
// ============================================================================

/** Generic API error */
export interface APIError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/** Generic API response */
export interface APIResponse<T> {
  data?: T;
  error?: APIError;
  success: boolean;
  timestamp?: string;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Smart Contract Event Types
// ============================================================================

/** Generic contract event */
export interface ContractEvent {
  eventName: string;
  blockNumber: number;
  transactionHash: TransactionHash;
  args: Record<string, unknown>;
}

/** Purchase event */
export interface PurchaseEvent extends ContractEvent {
  eventName: 'Purchase';
  args: {
    buyer: Address;
    productId: BigNumberish;
    price: BigNumberish;
    timestamp: BigNumberish;
  };
}

// ============================================================================
// UI Component Props Types
// ============================================================================

/** Layout props */
export interface LayoutProps {
  children: React.ReactNode;
}

/** Modal props */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/** Button props */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

/** Card props */
export interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/** Make all properties optional recursively */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Make all properties required recursively */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/** Extract keys of type T that are of type U */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/** Async function return type */
export type AsyncReturnType<T extends (...args: any[]) => Promise<any>> =
  T extends (...args: any[]) => Promise<infer R> ? R : never;

// ============================================================================
// Environment Variable Types
// ============================================================================

/** Environment variables */
export interface EnvironmentVariables {
  NEXT_PUBLIC_BACKEND_URL: string;
  NEXT_PUBLIC_VARITY_CHAIN_ID: string;
  NEXT_PUBLIC_VARITY_RPC_URL: string;
  NEXT_PUBLIC_PRIVY_APP_ID: string;
  NEXT_PUBLIC_THIRDWEB_CLIENT_ID: string;
  NEXT_PUBLIC_SENTRY_DSN?: string;
}

// ============================================================================
// Form Types
// ============================================================================

/** Generic form field */
export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
}

/** Form state */
export interface FormState<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// ============================================================================
// Dashboard Types
// ============================================================================

/** KPI metric */
export interface KPIMetric {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}

/** Chart data point */
export interface ChartDataPoint {
  label: string;
  value: number;
  timestamp?: Date;
}

/** Dashboard stats */
export interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  profitMargin: number;
  activeCustomers: number;
  recentTransactions: number;
  topProducts: Array<{
    name: string;
    revenue: number;
  }>;
}

// ============================================================================
// Type Guards
// ============================================================================

/** Check if value is an Address */
export function isAddress(value: unknown): value is Address {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

/** Check if value is an API error */
export function isAPIError(value: unknown): value is APIError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    'message' in value &&
    'statusCode' in value
  );
}

/** Check if error has a message */
export function hasErrorMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}
