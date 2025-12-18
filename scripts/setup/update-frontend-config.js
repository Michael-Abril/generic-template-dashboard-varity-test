const fs = require("fs");
const path = require("path");

function main() {
  console.log("Updating frontend configuration with deployed contract addresses...");
  console.log("");

  const deploymentFile = path.join(__dirname, "../deployments.json");
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please run deploy script first.");
    process.exit(1);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const addresses = deployments.contracts;

  // Update .env.local
  const envLocalFile = path.join(__dirname, "../.env.local");
  let envContent = fs.readFileSync(envLocalFile, "utf8");

  // Add contract addresses
  const contractSection = `# ==============================================================================
# DEPLOYED SMART CONTRACTS (Auto-generated from deployment)
# ==============================================================================
# Deployed on Varity L3 Testnet
NEXT_PUBLIC_MARKETPLACE_ADDRESS=${addresses.ToolMarketplace}
NEXT_PUBLIC_LICENSE_NFT_ADDRESS=${addresses.ToolLicenseNFT}
NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS=${addresses.RevenueSplitter}
NEXT_PUBLIC_SUBSCRIPTION_BILLING_ADDRESS=${addresses.SubscriptionBilling}

# Deployment metadata
NEXT_PUBLIC_CONTRACTS_DEPLOYED_AT=${deployments.timestamp}
`;

  // Remove old contract section if exists
  envContent = envContent.replace(
    /# ==============================================================================\n# DEPLOYED SMART CONTRACTS.*?\n(?:NEXT_PUBLIC_[A-Z_]+.*?\n)*/s,
    ""
  );

  // Append new contract section before company customization
  envContent = envContent.replace(
    "# Company Customization",
    contractSection + "\n# Company Customization"
  );

  fs.writeFileSync(envLocalFile, envContent);
  console.log("✓ .env.local updated with contract addresses");
  console.log("");

  // Update lib/contracts.ts
  const contractsTypescriptFile = path.join(__dirname, "../src/lib/contracts.ts");
  if (fs.existsSync(contractsTypescriptFile)) {
    const contractsContent = `// Auto-generated from deployment scripts
// Generated at: ${deployments.timestamp}
// Network: ${deployments.network} (Chain ID: ${deployments.chainId})

export const CONTRACTS = {
  ToolMarketplace: "${addresses.ToolMarketplace}",
  ToolLicenseNFT: "${addresses.ToolLicenseNFT}",
  RevenueSplitter: "${addresses.RevenueSplitter}",
  SubscriptionBilling: "${addresses.SubscriptionBilling}",
} as const;

export const USDC_ADDRESS = "${deployments.usdc}";

export const NETWORK_CONFIG = {
  chainId: ${deployments.chainId},
  rpc: "${deployments.rpc}",
  explorer: "${deployments.explorer}",
  name: "${deployments.network}",
} as const;

export type ContractName = keyof typeof CONTRACTS;

export function getContractAddress(contract: ContractName): string {
  return CONTRACTS[contract];
}
`;

    fs.writeFileSync(contractsTypescriptFile, contractsContent);
    console.log("✓ src/lib/contracts.ts updated with contract addresses");
  } else {
    console.log("⚠ src/lib/contracts.ts not found, please create it manually with the addresses above");
  }

  console.log("");
  console.log("=" .repeat(70));
  console.log("Frontend Configuration Updated");
  console.log("=" .repeat(70));
  console.log("");
  console.log("Contract Addresses:");
  console.log("-".repeat(70));
  console.log("ToolMarketplace:       ", addresses.ToolMarketplace);
  console.log("ToolLicenseNFT:        ", addresses.ToolLicenseNFT);
  console.log("RevenueSplitter:       ", addresses.RevenueSplitter);
  console.log("SubscriptionBilling:   ", addresses.SubscriptionBilling);
  console.log("");
  console.log("USDC Address:          ", deployments.usdc);
  console.log("Network:               ", deployments.network);
  console.log("Chain ID:              ", deployments.chainId);
  console.log("");
  console.log("Files Updated:");
  console.log("- .env.local");
  console.log("- src/lib/contracts.ts (if exists)");
  console.log("=" .repeat(70));
}

main();
