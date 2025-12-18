import { ethers } from "hardhat";

async function main() {
  console.log("Verifying Tool Marketplace Deployment\n");

  // Update these addresses after deployment
  const TOOL_MARKETPLACE_ADDRESS = process.env.TOOL_MARKETPLACE_ADDRESS || "";
  const TOOL_LICENSE_NFT_ADDRESS = process.env.TOOL_LICENSE_NFT_ADDRESS || "";
  const SUBSCRIPTION_BILLING_ADDRESS = process.env.SUBSCRIPTION_BILLING_ADDRESS || "";
  const REVENUE_SPLITTER_ADDRESS = process.env.REVENUE_SPLITTER_ADDRESS || "";

  if (!TOOL_MARKETPLACE_ADDRESS) {
    console.error("Error: TOOL_MARKETPLACE_ADDRESS not set");
    console.log("Set it in .env or pass as environment variable");
    process.exit(1);
  }

  console.log("Contract Addresses:");
  console.log("- ToolMarketplace:", TOOL_MARKETPLACE_ADDRESS);
  console.log("- ToolLicenseNFT:", TOOL_LICENSE_NFT_ADDRESS);
  console.log("- SubscriptionBilling:", SUBSCRIPTION_BILLING_ADDRESS);
  console.log("- RevenueSplitter:", REVENUE_SPLITTER_ADDRESS);
  console.log("");

  // Connect to contracts
  const marketplace = await ethers.getContractAt("ToolMarketplace", TOOL_MARKETPLACE_ADDRESS);
  const nft = await ethers.getContractAt("ToolLicenseNFT", TOOL_LICENSE_NFT_ADDRESS);
  const billing = await ethers.getContractAt("SubscriptionBilling", SUBSCRIPTION_BILLING_ADDRESS);
  const splitter = await ethers.getContractAt("RevenueSplitter", REVENUE_SPLITTER_ADDRESS);

  console.log("1. Checking Tool Listings...");
  const totalTools = await marketplace.totalToolsListed();
  console.log(`   Total Tools Listed: ${totalTools}`);

  const activeTools = await marketplace.getActiveTools();
  console.log(`   Active Tools: ${activeTools.length}`);

  if (activeTools.length > 0) {
    console.log("\n   Listed Tools:");
    for (const toolId of activeTools) {
      const metadata = await nft.getToolMetadata(toolId);
      const listing = await marketplace.getToolListing(toolId);

      console.log(`   [${toolId}] ${metadata.name}`);
      console.log(`       Category: ${metadata.category}`);
      console.log(`       Price: $${Number(metadata.price) / 1000000} USDC/month`);
      console.log(`       Developer: ${metadata.developer}`);
      console.log(`       Active: ${metadata.isActive}`);
      console.log(`       Total Sales: ${listing.totalSales}`);
      console.log(`       Rating: ${Number(listing.rating) / 100} stars (${listing.reviewCount} reviews)`);
      console.log("");
    }
  }

  console.log("2. Checking Contract Configuration...");

  // Check USDC address
  const usdcAddress = await marketplace.usdcToken();
  console.log(`   USDC Token: ${usdcAddress}`);

  // Check treasury
  const treasury = await splitter.varietyTreasury();
  console.log(`   Varity Treasury: ${treasury}`);

  // Check revenue split percentages
  const varietyPercentage = await splitter.VARITY_PERCENTAGE();
  const creatorPercentage = await splitter.CREATOR_PERCENTAGE();
  console.log(`   Revenue Split: ${varietyPercentage}% Varity / ${creatorPercentage}% Developer`);

  // Check if USDC is whitelisted
  const isWhitelisted = await splitter.whitelistedTokens(usdcAddress);
  console.log(`   USDC Whitelisted: ${isWhitelisted}`);

  console.log("\n3. Checking Roles...");

  // Check marketplace roles
  const minterRole = await nft.MINTER_ROLE();
  const hasMinterRole = await nft.hasRole(minterRole, TOOL_MARKETPLACE_ADDRESS);
  console.log(`   Marketplace has MINTER_ROLE: ${hasMinterRole}`);

  const marketplaceRoleBilling = await billing.MARKETPLACE_ROLE();
  const hasMarketplaceRoleBilling = await billing.hasRole(marketplaceRoleBilling, TOOL_MARKETPLACE_ADDRESS);
  console.log(`   Marketplace has MARKETPLACE_ROLE (Billing): ${hasMarketplaceRoleBilling}`);

  const marketplaceRoleSplitter = await splitter.MARKETPLACE_ROLE();
  const hasMarketplaceRoleSplitter = await splitter.hasRole(marketplaceRoleSplitter, TOOL_MARKETPLACE_ADDRESS);
  console.log(`   Marketplace has MARKETPLACE_ROLE (Splitter): ${hasMarketplaceRoleSplitter}`);

  console.log("\n4. Checking Subscription Stats...");
  const totalSubscriptions = await billing.totalSubscriptionsCreated();
  const activeSubscriptions = await billing.totalActiveSubscriptions();
  console.log(`   Total Subscriptions Created: ${totalSubscriptions}`);
  console.log(`   Active Subscriptions: ${activeSubscriptions}`);

  console.log("\n5. Deployment Summary");
  console.log("   ✓ Contracts deployed successfully");
  console.log(`   ✓ ${activeTools.length} tools listed`);
  console.log(`   ✓ USDC whitelisted: ${isWhitelisted ? 'Yes' : 'No'}`);
  console.log(`   ✓ Roles configured: ${hasMinterRole && hasMarketplaceRoleBilling && hasMarketplaceRoleSplitter ? 'Yes' : 'No'}`);
  console.log(`   ✓ Revenue split: ${varietyPercentage}/${creatorPercentage}`);

  console.log("\n✅ Deployment verification complete!");
  console.log("\nNext Steps:");
  console.log("1. Verify contracts on explorer");
  console.log("2. Update .env.local with contract addresses");
  console.log("3. Test purchasing a license");
  console.log("4. Integrate with frontend dashboard");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
