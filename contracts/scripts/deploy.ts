import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("Starting deployment to Varity L3 Testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Configuration
  const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
  const VARITY_TREASURY = deployer.address; // Use deployer as treasury for testing
  const ADMIN = deployer.address;

  console.log("Configuration:");
  console.log("- USDC Address:", USDC_ADDRESS);
  console.log("- Varity Treasury:", VARITY_TREASURY);
  console.log("- Admin:", ADMIN);
  console.log("");

  // Step 1: Deploy RevenueSplitter
  console.log("1. Deploying RevenueSplitter...");
  const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
  const revenueSplitter = await upgrades.deployProxy(
    RevenueSplitter,
    [VARITY_TREASURY, ADMIN],
    { initializer: "initialize", kind: "uups" }
  );
  await revenueSplitter.waitForDeployment();
  const revenueSplitterAddress = await revenueSplitter.getAddress();
  console.log("   RevenueSplitter deployed to:", revenueSplitterAddress);

  // Whitelist USDC token
  console.log("   Whitelisting USDC token...");
  const whitelistTx = await revenueSplitter.setTokenWhitelist(USDC_ADDRESS, true);
  await whitelistTx.wait();
  console.log("   USDC whitelisted\n");

  // Step 2: Deploy ToolLicenseNFT
  console.log("2. Deploying ToolLicenseNFT...");
  const ToolLicenseNFT = await ethers.getContractFactory("ToolLicenseNFT");
  const toolLicenseNFT = await upgrades.deployProxy(
    ToolLicenseNFT,
    [ADMIN, "ipfs://"],
    { initializer: "initialize", kind: "uups" }
  );
  await toolLicenseNFT.waitForDeployment();
  const toolLicenseNFTAddress = await toolLicenseNFT.getAddress();
  console.log("   ToolLicenseNFT deployed to:", toolLicenseNFTAddress, "\n");

  // Step 3: Deploy SubscriptionBilling
  console.log("3. Deploying SubscriptionBilling...");
  const SubscriptionBilling = await ethers.getContractFactory("SubscriptionBilling");
  const subscriptionBilling = await upgrades.deployProxy(
    SubscriptionBilling,
    [ADMIN],
    { initializer: "initialize", kind: "uups" }
  );
  await subscriptionBilling.waitForDeployment();
  const subscriptionBillingAddress = await subscriptionBilling.getAddress();
  console.log("   SubscriptionBilling deployed to:", subscriptionBillingAddress, "\n");

  // Step 4: Deploy ToolMarketplace
  console.log("4. Deploying ToolMarketplace...");
  const ToolMarketplace = await ethers.getContractFactory("ToolMarketplace");
  const toolMarketplace = await upgrades.deployProxy(
    ToolMarketplace,
    [
      toolLicenseNFTAddress,
      revenueSplitterAddress,
      subscriptionBillingAddress,
      USDC_ADDRESS,
      ADMIN,
    ],
    { initializer: "initialize", kind: "uups" }
  );
  await toolMarketplace.waitForDeployment();
  const toolMarketplaceAddress = await toolMarketplace.getAddress();
  console.log("   ToolMarketplace deployed to:", toolMarketplaceAddress, "\n");

  // Step 5: Grant roles
  console.log("5. Granting roles...");

  // Grant MINTER_ROLE to marketplace for ToolLicenseNFT
  console.log("   Granting MINTER_ROLE to ToolMarketplace...");
  const minterRole = await toolLicenseNFT.MINTER_ROLE();
  let grantTx = await toolLicenseNFT.grantRole(minterRole, toolMarketplaceAddress);
  await grantTx.wait();
  console.log("   MINTER_ROLE granted");

  // Grant MARKETPLACE_ROLE to marketplace for SubscriptionBilling
  console.log("   Granting MARKETPLACE_ROLE to ToolMarketplace (SubscriptionBilling)...");
  const marketplaceRoleBilling = await subscriptionBilling.MARKETPLACE_ROLE();
  grantTx = await subscriptionBilling.grantRole(marketplaceRoleBilling, toolMarketplaceAddress);
  await grantTx.wait();
  console.log("   MARKETPLACE_ROLE granted");

  // Grant MARKETPLACE_ROLE to marketplace for RevenueSplitter
  console.log("   Granting MARKETPLACE_ROLE to ToolMarketplace (RevenueSplitter)...");
  const marketplaceRoleSplitter = await revenueSplitter.MARKETPLACE_ROLE();
  grantTx = await revenueSplitter.grantRole(marketplaceRoleSplitter, toolMarketplaceAddress);
  await grantTx.wait();
  console.log("   MARKETPLACE_ROLE granted\n");

  // Step 6: List 8 tools
  console.log("6. Listing 8 tools in marketplace...");

  const tools = [
    { name: "QuickBooks", category: "Accounting", price: 49000000 }, // $49 USDC
    { name: "Salesforce", category: "CRM", price: 99000000 }, // $99 USDC
    { name: "Shopify", category: "E-commerce", price: 79000000 }, // $79 USDC
    { name: "Monday.com", category: "Project Management", price: 45000000 }, // $45 USDC
    { name: "Stripe", category: "Payments", price: 0 }, // Free
    { name: "Slack", category: "Communication", price: 8000000 }, // $8 USDC
    { name: "HubSpot", category: "Marketing", price: 120000000 }, // $120 USDC
    { name: "Zendesk", category: "Support", price: 89000000 }, // $89 USDC
  ];

  for (const tool of tools) {
    console.log(`   Listing ${tool.name} (${tool.category}) at $${tool.price / 1000000} USDC/month...`);
    const listTx = await toolMarketplace.listTool(
      tool.name,
      tool.category,
      tool.price,
      `ipfs://tool-${tool.name.toLowerCase()}-metadata`
    );
    await listTx.wait();
    console.log(`   ${tool.name} listed successfully`);
  }

  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE!");
  console.log("========================================\n");

  console.log("Deployed Contract Addresses:");
  console.log("- RevenueSplitter:", revenueSplitterAddress);
  console.log("- ToolLicenseNFT:", toolLicenseNFTAddress);
  console.log("- SubscriptionBilling:", subscriptionBillingAddress);
  console.log("- ToolMarketplace:", toolMarketplaceAddress);
  console.log("");

  console.log("Configuration:");
  console.log("- USDC Token:", USDC_ADDRESS);
  console.log("- Varity Treasury:", VARITY_TREASURY);
  console.log("- Admin:", ADMIN);
  console.log("");

  console.log("Next Steps:");
  console.log("1. Verify contracts on explorer");
  console.log("2. Update .env.local with contract addresses");
  console.log("3. Test purchasing a license");
  console.log("");

  // Generate .env.local content
  console.log("Add to .env.local:");
  console.log(`NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS=${toolMarketplaceAddress}`);
  console.log(`NEXT_PUBLIC_TOOL_LICENSE_NFT_ADDRESS=${toolLicenseNFTAddress}`);
  console.log(`NEXT_PUBLIC_SUBSCRIPTION_BILLING_ADDRESS=${subscriptionBillingAddress}`);
  console.log(`NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS=${revenueSplitterAddress}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${USDC_ADDRESS}`);
  console.log("");

  // Generate verification commands
  console.log("Verification Commands:");
  console.log(`npx hardhat verify --network varityTestnet ${revenueSplitterAddress}`);
  console.log(`npx hardhat verify --network varityTestnet ${toolLicenseNFTAddress}`);
  console.log(`npx hardhat verify --network varityTestnet ${subscriptionBillingAddress}`);
  console.log(`npx hardhat verify --network varityTestnet ${toolMarketplaceAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
