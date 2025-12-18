/**
 * Environment Variable Validation
 *
 * Provides type-safe access to environment variables with build-time validation.
 * Ensures required variables are present and provides helpful error messages.
 *
 * Usage:
 *   import { env, validateEnv } from '@/lib/env'
 *
 *   // Access variables (type-safe)
 *   const apiUrl = env.NEXT_PUBLIC_BACKEND_URL
 *
 *   // Validate at app startup
 *   validateEnv()
 */

// ============================================================================
// ENVIRONMENT VARIABLE DEFINITIONS
// ============================================================================

/**
 * Required environment variables - app will not work without these
 */
const requiredEnvVars = [
  'NEXT_PUBLIC_BACKEND_URL',
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'NEXT_PUBLIC_THIRDWEB_CLIENT_ID',
  'NEXT_PUBLIC_VARITY_CHAIN_ID',
  'NEXT_PUBLIC_VARITY_RPC_URL',
] as const

/**
 * Optional environment variables with defaults
 */
const optionalEnvVars = {
  NEXT_PUBLIC_API_URL: '', // Falls back to NEXT_PUBLIC_BACKEND_URL
  NEXT_PUBLIC_COMPANY_NAME: 'Generic Company',
  NEXT_PUBLIC_COMPANY_INDUSTRY: 'generic',
  NEXT_PUBLIC_COMPANY_LOGO: '/logos/varity-logo.png',
  NEXT_PUBLIC_PRIMARY_COLOR: '#3b82f6',
  NEXT_PUBLIC_SECONDARY_COLOR: '#8b5cf6',
  NEXT_PUBLIC_DASHBOARD_THEME: 'light',
  NEXT_PUBLIC_VARITY_EXPLORER_URL: 'https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz',
  NEXT_PUBLIC_VARITY_WS_URL: 'wss://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz',
  NEXT_PUBLIC_VARITY_BUNDLER_URL: 'https://bundler-varity-testnet-rroe52pwjp.t.conduit.xyz',
  NEXT_PUBLIC_VARITY_CHAIN_NAME: 'Varity L3 Testnet',
  NEXT_PUBLIC_USDC_ADDRESS: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  NEXT_PUBLIC_USDC_DECIMALS: '6',
  NEXT_PUBLIC_PAYMASTER_ADDRESS: '0xb95AF1375535149e308E6be0e31D16Af053E7fc9',
  NEXT_PUBLIC_WALLET_FACTORY_ADDRESS: '0x3c4fBCe333dEE96db20a9646E41bD85CFfB07AEe',
  NEXT_PUBLIC_PINATA_GATEWAY_URL: 'https://gateway.pinata.cloud',
  NEXT_PUBLIC_LIT_NETWORK: 'cayenne',
  NEXT_PUBLIC_AI_ASSISTANT_NAME: 'Varity AI Assistant',
  NEXT_PUBLIC_AI_MODEL: 'Llama 3.1 70B',
  NEXT_PUBLIC_ENVIRONMENT: 'development',
  NEXT_PUBLIC_DEBUG: 'false',
  NEXT_PUBLIC_TEST_MODE: 'false',
  // Feature flags
  NEXT_PUBLIC_ENABLE_AI_FEATURES: 'true',
  NEXT_PUBLIC_ENABLE_MARKETPLACE: 'true',
  NEXT_PUBLIC_ENABLE_INTEGRATIONS: 'true',
  NEXT_PUBLIC_ENABLE_TEAM_MANAGEMENT: 'true',
  NEXT_PUBLIC_ENABLE_ANALYTICS: 'false',
  NEXT_PUBLIC_ENABLE_GASLESS_TRANSACTIONS: 'true',
  NEXT_PUBLIC_ENABLE_AI_STREAMING: 'true',
  NEXT_PUBLIC_ENABLE_INDUSTRY_RAG: 'true',
  NEXT_PUBLIC_ENABLE_CUSTOM_DASHBOARDS: 'true',
  NEXT_PUBLIC_ENABLE_ERROR_TRACKING: 'false',
  NEXT_PUBLIC_ENABLE_MAINTENANCE_MODE: 'false',
  // Sentry configuration
  NEXT_PUBLIC_SENTRY_DSN: '',
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'development',
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: '0.1',
  NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: '0.1',
  NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: '1.0',
} as const

// Type definitions
type RequiredEnvVar = (typeof requiredEnvVars)[number]
type OptionalEnvVar = keyof typeof optionalEnvVars
type EnvVar = RequiredEnvVar | OptionalEnvVar

// ============================================================================
// ENVIRONMENT OBJECT
// ============================================================================

/**
 * Get environment variable value with fallback
 */
function getEnvVar(key: EnvVar): string {
  const value = process.env[key]

  if (value !== undefined && value !== '') {
    return value
  }

  // Check if it has a default
  if (key in optionalEnvVars) {
    return optionalEnvVars[key as OptionalEnvVar]
  }

  // Required variable is missing
  return ''
}

/**
 * Type-safe environment object
 * Access environment variables with proper typing and defaults
 */
export const env = {
  // Required variables
  NEXT_PUBLIC_BACKEND_URL: getEnvVar('NEXT_PUBLIC_BACKEND_URL'),
  NEXT_PUBLIC_PRIVY_APP_ID: getEnvVar('NEXT_PUBLIC_PRIVY_APP_ID'),
  NEXT_PUBLIC_THIRDWEB_CLIENT_ID: getEnvVar('NEXT_PUBLIC_THIRDWEB_CLIENT_ID'),
  NEXT_PUBLIC_VARITY_CHAIN_ID: parseInt(getEnvVar('NEXT_PUBLIC_VARITY_CHAIN_ID') || '33529', 10),
  NEXT_PUBLIC_VARITY_RPC_URL: getEnvVar('NEXT_PUBLIC_VARITY_RPC_URL'),

  // API URLs (with fallback)
  get NEXT_PUBLIC_API_URL(): string {
    return getEnvVar('NEXT_PUBLIC_API_URL') || this.NEXT_PUBLIC_BACKEND_URL
  },

  // Company configuration
  NEXT_PUBLIC_COMPANY_NAME: getEnvVar('NEXT_PUBLIC_COMPANY_NAME'),
  NEXT_PUBLIC_COMPANY_INDUSTRY: getEnvVar('NEXT_PUBLIC_COMPANY_INDUSTRY'),
  NEXT_PUBLIC_COMPANY_LOGO: getEnvVar('NEXT_PUBLIC_COMPANY_LOGO'),
  NEXT_PUBLIC_PRIMARY_COLOR: getEnvVar('NEXT_PUBLIC_PRIMARY_COLOR'),
  NEXT_PUBLIC_SECONDARY_COLOR: getEnvVar('NEXT_PUBLIC_SECONDARY_COLOR'),
  NEXT_PUBLIC_DASHBOARD_THEME: getEnvVar('NEXT_PUBLIC_DASHBOARD_THEME') as 'light' | 'dark',

  // Blockchain configuration
  NEXT_PUBLIC_VARITY_EXPLORER_URL: getEnvVar('NEXT_PUBLIC_VARITY_EXPLORER_URL'),
  NEXT_PUBLIC_VARITY_WS_URL: getEnvVar('NEXT_PUBLIC_VARITY_WS_URL'),
  NEXT_PUBLIC_VARITY_BUNDLER_URL: getEnvVar('NEXT_PUBLIC_VARITY_BUNDLER_URL'),
  NEXT_PUBLIC_VARITY_CHAIN_NAME: getEnvVar('NEXT_PUBLIC_VARITY_CHAIN_NAME'),

  // Token configuration
  NEXT_PUBLIC_USDC_ADDRESS: getEnvVar('NEXT_PUBLIC_USDC_ADDRESS'),
  NEXT_PUBLIC_USDC_DECIMALS: parseInt(getEnvVar('NEXT_PUBLIC_USDC_DECIMALS'), 10),

  // Contract addresses
  NEXT_PUBLIC_PAYMASTER_ADDRESS: getEnvVar('NEXT_PUBLIC_PAYMASTER_ADDRESS'),
  NEXT_PUBLIC_WALLET_FACTORY_ADDRESS: getEnvVar('NEXT_PUBLIC_WALLET_FACTORY_ADDRESS'),

  // Storage configuration
  NEXT_PUBLIC_PINATA_GATEWAY_URL: getEnvVar('NEXT_PUBLIC_PINATA_GATEWAY_URL'),
  NEXT_PUBLIC_LIT_NETWORK: getEnvVar('NEXT_PUBLIC_LIT_NETWORK'),

  // AI configuration
  NEXT_PUBLIC_AI_ASSISTANT_NAME: getEnvVar('NEXT_PUBLIC_AI_ASSISTANT_NAME'),
  NEXT_PUBLIC_AI_MODEL: getEnvVar('NEXT_PUBLIC_AI_MODEL'),

  // Environment
  NEXT_PUBLIC_ENVIRONMENT: getEnvVar('NEXT_PUBLIC_ENVIRONMENT') as
    | 'development'
    | 'staging'
    | 'production',
  NEXT_PUBLIC_DEBUG: getEnvVar('NEXT_PUBLIC_DEBUG') === 'true',
  NEXT_PUBLIC_TEST_MODE: getEnvVar('NEXT_PUBLIC_TEST_MODE') === 'true',

  // Feature flags (boolean)
  NEXT_PUBLIC_ENABLE_AI_FEATURES: getEnvVar('NEXT_PUBLIC_ENABLE_AI_FEATURES') === 'true',
  NEXT_PUBLIC_ENABLE_MARKETPLACE: getEnvVar('NEXT_PUBLIC_ENABLE_MARKETPLACE') === 'true',
  NEXT_PUBLIC_ENABLE_INTEGRATIONS: getEnvVar('NEXT_PUBLIC_ENABLE_INTEGRATIONS') === 'true',
  NEXT_PUBLIC_ENABLE_TEAM_MANAGEMENT: getEnvVar('NEXT_PUBLIC_ENABLE_TEAM_MANAGEMENT') === 'true',
  NEXT_PUBLIC_ENABLE_ANALYTICS: getEnvVar('NEXT_PUBLIC_ENABLE_ANALYTICS') === 'true',
  NEXT_PUBLIC_ENABLE_GASLESS_TRANSACTIONS:
    getEnvVar('NEXT_PUBLIC_ENABLE_GASLESS_TRANSACTIONS') === 'true',
  NEXT_PUBLIC_ENABLE_AI_STREAMING: getEnvVar('NEXT_PUBLIC_ENABLE_AI_STREAMING') === 'true',
  NEXT_PUBLIC_ENABLE_INDUSTRY_RAG: getEnvVar('NEXT_PUBLIC_ENABLE_INDUSTRY_RAG') === 'true',
  NEXT_PUBLIC_ENABLE_CUSTOM_DASHBOARDS:
    getEnvVar('NEXT_PUBLIC_ENABLE_CUSTOM_DASHBOARDS') === 'true',
  NEXT_PUBLIC_ENABLE_ERROR_TRACKING: getEnvVar('NEXT_PUBLIC_ENABLE_ERROR_TRACKING') === 'true',
  NEXT_PUBLIC_ENABLE_MAINTENANCE_MODE: getEnvVar('NEXT_PUBLIC_ENABLE_MAINTENANCE_MODE') === 'true',

  // Sentry configuration
  NEXT_PUBLIC_SENTRY_DSN: getEnvVar('NEXT_PUBLIC_SENTRY_DSN'),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: getEnvVar('NEXT_PUBLIC_SENTRY_ENVIRONMENT'),
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: parseFloat(
    getEnvVar('NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE') || '0.1'
  ),
  NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: parseFloat(
    getEnvVar('NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE') || '0.1'
  ),
  NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: parseFloat(
    getEnvVar('NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE') || '1.0'
  ),

  // Computed properties
  get isProduction(): boolean {
    return this.NEXT_PUBLIC_ENVIRONMENT === 'production'
  },
  get isDevelopment(): boolean {
    return this.NEXT_PUBLIC_ENVIRONMENT === 'development'
  },
  get isStaging(): boolean {
    return this.NEXT_PUBLIC_ENVIRONMENT === 'staging'
  },
} as const

// ============================================================================
// VALIDATION
// ============================================================================

export interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

/**
 * Validate that all required environment variables are present
 * Call this at application startup
 *
 * @param throwOnError - If true, throws an error when validation fails (default: true in production)
 * @returns Validation result with missing variables and warnings
 */
export function validateEnv(
  throwOnError: boolean = env.NEXT_PUBLIC_ENVIRONMENT === 'production'
): EnvValidationResult {
  const missing: string[] = []
  const warnings: string[] = []

  // Check required variables
  for (const key of requiredEnvVars) {
    const value = process.env[key]
    if (!value || value === '') {
      missing.push(key)
    }
  }

  // Check for placeholder values (common mistake)
  if (
    env.NEXT_PUBLIC_PRIVY_APP_ID === 'your_privy_app_id_here' ||
    env.NEXT_PUBLIC_PRIVY_APP_ID === ''
  ) {
    warnings.push(
      'NEXT_PUBLIC_PRIVY_APP_ID appears to be a placeholder. Get your App ID from https://dashboard.privy.io'
    )
  }

  if (
    env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID === 'your_thirdweb_client_id_here' ||
    env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID === ''
  ) {
    warnings.push(
      'NEXT_PUBLIC_THIRDWEB_CLIENT_ID appears to be a placeholder. Get your Client ID from https://thirdweb.com/dashboard'
    )
  }

  // Validate chain ID
  if (isNaN(env.NEXT_PUBLIC_VARITY_CHAIN_ID)) {
    missing.push('NEXT_PUBLIC_VARITY_CHAIN_ID (must be a number)')
  }

  // Validate URLs
  if (env.NEXT_PUBLIC_BACKEND_URL && !isValidUrl(env.NEXT_PUBLIC_BACKEND_URL)) {
    warnings.push('NEXT_PUBLIC_BACKEND_URL does not appear to be a valid URL')
  }

  if (env.NEXT_PUBLIC_VARITY_RPC_URL && !isValidUrl(env.NEXT_PUBLIC_VARITY_RPC_URL)) {
    warnings.push('NEXT_PUBLIC_VARITY_RPC_URL does not appear to be a valid URL')
  }

  // Validate USDC decimals
  if (env.NEXT_PUBLIC_USDC_DECIMALS !== 6) {
    warnings.push(
      `NEXT_PUBLIC_USDC_DECIMALS is ${env.NEXT_PUBLIC_USDC_DECIMALS} but should be 6 for USDC`
    )
  }

  const valid = missing.length === 0

  // Log validation results
  if (!valid || warnings.length > 0) {
    console.group('Environment Variable Validation')

    if (!valid) {
      console.error('Missing required environment variables:')
      missing.forEach((key) => console.error(`  - ${key}`))
      console.error('\nCopy .env.local.example to .env.local and fill in the required values.')
    }

    if (warnings.length > 0) {
      console.warn('Warnings:')
      warnings.forEach((warning) => console.warn(`  - ${warning}`))
    }

    console.groupEnd()
  }

  // Throw error if required in production
  if (!valid && throwOnError) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Copy .env.local.example to .env.local and fill in the required values.'
    )
  }

  return { valid, missing, warnings }
}

/**
 * Helper to check if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// DEBUG HELPER
// ============================================================================

/**
 * Log all environment variables (safe for debugging, hides sensitive values)
 * Only logs in development mode
 */
export function debugEnv(): void {
  if (!env.NEXT_PUBLIC_DEBUG) {
    console.log('Debug mode disabled. Set NEXT_PUBLIC_DEBUG=true to enable.')
    return
  }

  console.group('Environment Configuration')

  // Required
  console.log('Required:')
  console.log(
    `  NEXT_PUBLIC_BACKEND_URL: ${env.NEXT_PUBLIC_BACKEND_URL ? '[SET]' : '[MISSING]'}`
  )
  console.log(
    `  NEXT_PUBLIC_PRIVY_APP_ID: ${env.NEXT_PUBLIC_PRIVY_APP_ID ? '[SET]' : '[MISSING]'}`
  )
  console.log(
    `  NEXT_PUBLIC_THIRDWEB_CLIENT_ID: ${env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ? '[SET]' : '[MISSING]'}`
  )
  console.log(`  NEXT_PUBLIC_VARITY_CHAIN_ID: ${env.NEXT_PUBLIC_VARITY_CHAIN_ID}`)
  console.log(`  NEXT_PUBLIC_VARITY_RPC_URL: ${env.NEXT_PUBLIC_VARITY_RPC_URL}`)

  // Company
  console.log('\nCompany:')
  console.log(`  NEXT_PUBLIC_COMPANY_NAME: ${env.NEXT_PUBLIC_COMPANY_NAME}`)
  console.log(`  NEXT_PUBLIC_COMPANY_INDUSTRY: ${env.NEXT_PUBLIC_COMPANY_INDUSTRY}`)

  // Environment
  console.log('\nEnvironment:')
  console.log(`  NEXT_PUBLIC_ENVIRONMENT: ${env.NEXT_PUBLIC_ENVIRONMENT}`)
  console.log(`  NEXT_PUBLIC_DEBUG: ${env.NEXT_PUBLIC_DEBUG}`)
  console.log(`  NEXT_PUBLIC_TEST_MODE: ${env.NEXT_PUBLIC_TEST_MODE}`)

  // Features
  console.log('\nFeatures:')
  console.log(`  AI: ${env.NEXT_PUBLIC_ENABLE_AI_FEATURES}`)
  console.log(`  Marketplace: ${env.NEXT_PUBLIC_ENABLE_MARKETPLACE}`)
  console.log(`  Integrations: ${env.NEXT_PUBLIC_ENABLE_INTEGRATIONS}`)
  console.log(`  Gasless: ${env.NEXT_PUBLIC_ENABLE_GASLESS_TRANSACTIONS}`)

  console.groupEnd()
}

// Export type for external use
export type Env = typeof env
