import { defineChain } from "thirdweb";

/**
 * Varity L3 Testnet Chain Configuration (thirdweb v5)
 *
 * Integrates with:
 * - Privy (authentication)
 * - thirdweb (wallets, contracts)
 * - Superbridge (bridging)
 * - Decent (cross-chain)
 */
export const varietyTestnet5 = defineChain({
  id: 33529,
  name: "Varity L3 Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpc: "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
  blockExplorers: [
    {
      name: "Varity Explorer",
      url: "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
    },
  ],
  testnet: true,
});

/**
 * Wagmi chain configuration (for Privy integration)
 */
export const varietyTestnetWagmi = {
  id: 33529,
  name: "Varity L3 Testnet",
  network: "varity-testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
    address: "0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Varity Explorer",
      url: "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
    },
  },
  testnet: true,
} as const;
