/**
 * Smart Contract Addresses for Varity L3 Testnet
 *
 * Deployed on: 2025-11-16
 * Network: Varity L3 Testnet (Chain ID: 33529)
 * Deployer: 0x20B7d1426649D9a573ba7Fd10592456264220cbF
 *
 * Contract addresses are loaded from environment variables (.env.local)
 */

export const CONTRACTS = {
  // Tool Marketplace - Main marketplace contract for tool licensing
  TOOL_MARKETPLACE: process.env.NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS || '0x0000000000000000000000000000000000000000',

  // Tool License NFT - ERC-1155 contract for license management
  TOOL_LICENSE_NFT: process.env.NEXT_PUBLIC_TOOL_LICENSE_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',

  // Subscription Billing - Handles recurring payments
  SUBSCRIPTION_BILLING: process.env.NEXT_PUBLIC_SUBSCRIPTION_BILLING_ADDRESS || '0x0000000000000000000000000000000000000000',

  // USDC Token - Payment currency (MockUSDC on Varity L3)
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE',
} as const;

export const CHAIN_CONFIG = {
  CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '33529'), // Varity L3 Testnet
  CHAIN_NAME: process.env.NEXT_PUBLIC_CHAIN_NAME || 'Varity L3 Testnet',
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz',
  BLOCK_EXPLORER: 'https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz',
} as const;

/**
 * Tool Marketplace ABI (simplified for frontend use)
 * Full ABI should be imported from contract artifacts
 */
export const TOOL_MARKETPLACE_ABI = [
  // Read functions
  {
    inputs: [],
    name: 'getAllTools',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'category', type: 'string' },
          { name: 'monthlyPrice', type: 'uint256' },
          { name: 'developer', type: 'address' },
          { name: 'active', type: 'bool' },
        ],
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserLicenses',
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { name: 'toolId', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
    ],
    name: 'purchaseLicense',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * USDC ABI (ERC-20 standard functions)
 */
export const USDC_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Tool License NFT ABI (ERC-1155 standard functions)
 */
export const TOOL_LICENSE_NFT_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'accounts', type: 'address[]' },
      { name: 'ids', type: 'uint256[]' },
    ],
    name: 'balanceOfBatch',
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Helper function to check if contracts are deployed
 */
export function areContractsDeployed(): boolean {
  return (
    CONTRACTS.TOOL_MARKETPLACE !== '0x0000000000000000000000000000000000000000' &&
    CONTRACTS.TOOL_LICENSE_NFT !== '0x0000000000000000000000000000000000000000'
  );
}

/**
 * Helper function to format USDC amount (6 decimals)
 */
export function formatUSDC(amount: bigint | number): string {
  const value = typeof amount === 'bigint' ? Number(amount) : amount;
  return (value / 1e6).toFixed(2);
}

/**
 * Helper function to parse USDC amount to wei (6 decimals)
 */
export function parseUSDC(amount: number): bigint {
  return BigInt(Math.floor(amount * 1e6));
}
