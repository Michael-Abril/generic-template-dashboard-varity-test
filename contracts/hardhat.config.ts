import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    varityTestnet: {
      url: process.env.VARITY_TESTNET_RPC || "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
      chainId: parseInt(process.env.VARITY_TESTNET_CHAIN_ID || "33529"),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: 5000000,
    },
  },
  etherscan: {
    apiKey: {
      varityTestnet: "no-api-key-needed",
    },
    customChains: [
      {
        network: "varityTestnet",
        chainId: 33529,
        urls: {
          apiURL: "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/api",
          browserURL: "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
