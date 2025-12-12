/**
 * Smart Contract Addresses and ABIs
 */

import type { Address } from '@/types';

/**
 * Contract addresses by chain
 */
export const CONTRACT_ADDRESSES: Record<number, Record<string, Address>> = {
  // Varity L3 Testnet
  33529: {
    USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    TOOL_MARKETPLACE: '0x0000000000000000000000000000000000000000', // To be deployed
    MERCHANT_REGISTRY: '0x0000000000000000000000000000000000000000', // To be deployed
  },
  // Arbitrum Sepolia
  421614: {
    USDC: '0x0000000000000000000000000000000000000000',
    TOOL_MARKETPLACE: '0x0000000000000000000000000000000000000000',
    MERCHANT_REGISTRY: '0x4FD5faBF8Fe90045dC865A8e20EFc3B4E2D62814',
  },
};

/**
 * Token decimals
 */
export const TOKEN_DECIMALS = {
  USDC: 6,
  ETH: 18,
  WETH: 18,
} as const;

/**
 * Gas limits for common operations
 */
export const GAS_LIMITS = {
  APPROVE: 50000n,
  TRANSFER: 65000n,
  PURCHASE_LICENSE: 200000n,
  REGISTER_MERCHANT: 150000n,
  MARKETPLACE_BUY: 250000n,
} as const;

/**
 * Transaction confirmation requirements
 */
export const CONFIRMATIONS = {
  STANDARD: 1,
  HIGH_VALUE: 2,
  CRITICAL: 3,
} as const;
