/**
 * Blockchain Chain Constants
 */

export const CHAIN_IDS = {
  VARITY_L3_TESTNET: 33529,
  ARBITRUM_SEPOLIA: 421614,
  ARBITRUM_ONE: 42161,
  ETHEREUM_MAINNET: 1,
  ETHEREUM_SEPOLIA: 11155111,
} as const;

export const RPC_URLS = {
  [CHAIN_IDS.VARITY_L3_TESTNET]: 'https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz',
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: 'https://sepolia-rollup.arbitrum.io/rpc',
  [CHAIN_IDS.ARBITRUM_ONE]: 'https://arb1.arbitrum.io/rpc',
} as const;

export const EXPLORER_URLS = {
  [CHAIN_IDS.VARITY_L3_TESTNET]: 'https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz',
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: 'https://sepolia.arbiscan.io',
  [CHAIN_IDS.ARBITRUM_ONE]: 'https://arbiscan.io',
} as const;

export const CHAIN_NAMES = {
  [CHAIN_IDS.VARITY_L3_TESTNET]: 'Varity L3 Testnet',
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: 'Arbitrum Sepolia',
  [CHAIN_IDS.ARBITRUM_ONE]: 'Arbitrum One',
} as const;

export const NATIVE_CURRENCY = {
  [CHAIN_IDS.VARITY_L3_TESTNET]: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  [CHAIN_IDS.ARBITRUM_ONE]: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
} as const;
