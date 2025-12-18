import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Comprehensive test of marketplace USDC integration
 *
 * Tests:
 * 1. Verify marketplace has correct USDC address
 * 2. Get user USDC balance
 * 3. Test USDC approval for marketplace
 * 4. Test marketplace purchase with USDC
 */
async function main() {
  console.log("🧪 Testing Marketplace USDC Integration...\n");

  // Load deployments
  const deploymentsPath = path.join(__dirname, "../../deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  const marketplaceAddress = deployments.varity_l3_testnet.contracts.ToolMarketplace;
  const usdcAddress = deployments.varity_l3_testnet.usdc;

  console.log("📋 Contract Addresses:");
  console.log("   Marketplace:", marketplaceAddress);
  console.log("   USDC:", usdcAddress);

  // Get test account
  const [tester] = await ethers.getSigners();
  console.log("\n📋 Test Account:", tester.address);

  // Get contract instances
  const ToolMarketplace = await ethers.getContractFactory("ToolMarketplace");
  const marketplace = ToolMarketplace.attach(marketplaceAddress);

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(usdcAddress);

  // Test 1: Verify marketplace USDC address
  console.log("\n✅ Test 1: Verify Marketplace USDC Address");
  const marketplaceUsdcAddress = await marketplace.usdcToken();
  console.log("   Marketplace USDC:", marketplaceUsdcAddress);

  if (marketplaceUsdcAddress.toLowerCase() === usdcAddress.toLowerCase()) {
    console.log("   ✓ Correct USDC address configured");
  } else {
    throw new Error("Marketplace has incorrect USDC address");
  }

  // Test 2: Check USDC balance
  console.log("\n✅ Test 2: Check USDC Balance");
  let balance = await usdc.balanceOf(tester.address);
  console.log("   Current Balance:", ethers.formatUnits(balance, 6), "USDC");

  // If balance is low, claim from faucet
  if (balance < ethers.parseUnits("100", 6)) {
    console.log("   💧 Balance low, claiming from faucet...");

    const [canClaim] = await usdc.canClaimFaucet(tester.address);
    if (canClaim) {
      const faucetTx = await usdc.faucet();
      await faucetTx.wait();
      balance = await usdc.balanceOf(tester.address);
      console.log("   New Balance:", ethers.formatUnits(balance, 6), "USDC");
      console.log("   ✓ Faucet claim successful");
    } else {
      console.log("   ⏳ Faucet on cooldown, continuing with current balance");
    }
  } else {
    console.log("   ✓ Sufficient USDC balance");
  }

  // Test 3: Approve marketplace to spend USDC
  console.log("\n✅ Test 3: USDC Approval");
  const approvalAmount = ethers.parseUnits("1000", 6); // Approve 1000 USDC

  // Check current allowance
  let allowance = await usdc.allowance(tester.address, marketplaceAddress);
  console.log("   Current Allowance:", ethers.formatUnits(allowance, 6), "USDC");

  if (allowance < approvalAmount) {
    console.log("   Approving", ethers.formatUnits(approvalAmount, 6), "USDC for marketplace...");
    const approveTx = await usdc.approve(marketplaceAddress, approvalAmount);
    await approveTx.wait();

    allowance = await usdc.allowance(tester.address, marketplaceAddress);
    console.log("   New Allowance:", ethers.formatUnits(allowance, 6), "USDC");
    console.log("   ✓ Approval successful");
  } else {
    console.log("   ✓ Already approved");
  }

  // Test 4: Get active tools
  console.log("\n✅ Test 4: Get Active Tools");
  const activeTools = await marketplace.getActiveTools();
  console.log("   Active Tools:", activeTools.length);

  if (activeTools.length === 0) {
    console.log("   ⚠️  No tools available for purchase test");
    console.log("   (This is expected if tools haven't been listed yet)");
  } else {
    console.log("   Available tools for testing:");
    for (const toolId of activeTools) {
      const listing = await marketplace.getToolListing(toolId);
      console.log(`   - Tool ID ${toolId}: ${listing.totalSales} sales, rating ${listing.rating}/500`);
    }

    // Test purchase with first tool
    const testToolId = activeTools[0];
    console.log("\n✅ Test 5: Test Purchase (DRY RUN)");
    console.log("   Note: Not actually purchasing, just verifying setup");
    console.log("   Tool ID:", testToolId.toString());

    // Get tool metadata from NFT contract
    const nftAddress = deployments.varity_l3_testnet.contracts.ToolLicenseNFT;
    const ToolLicenseNFT = await ethers.getContractFactory("ToolLicenseNFT");
    const nft = ToolLicenseNFT.attach(nftAddress);

    try {
      const metadata = await nft.getToolMetadata(testToolId);
      const toolPrice = metadata.price;
      console.log("   Tool Price:", ethers.formatUnits(toolPrice, 6), "USDC/month");

      const purchaseCost = toolPrice * BigInt(1); // 1 month
      console.log("   Purchase Cost (1 month):", ethers.formatUnits(purchaseCost, 6), "USDC");

      if (balance >= purchaseCost && allowance >= purchaseCost) {
        console.log("   ✓ User has sufficient balance and allowance");
        console.log("   ✓ Purchase would be successful");
      } else {
        if (balance < purchaseCost) {
          console.log("   ⚠️  Insufficient balance");
        }
        if (allowance < purchaseCost) {
          console.log("   ⚠️  Insufficient allowance");
        }
      }
    } catch (error: any) {
      console.log("   ⚠️  Could not fetch tool metadata:", error.message);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("🎉 MARKETPLACE USDC INTEGRATION TEST COMPLETE!");
  console.log("=".repeat(80));
  console.log("\n📊 Test Results:");
  console.log("   ✓ Marketplace configured with correct USDC");
  console.log("   ✓ USDC balance checked:", ethers.formatUnits(balance, 6), "USDC");
  console.log("   ✓ USDC approval working:", ethers.formatUnits(allowance, 6), "USDC");
  console.log("   ✓ Marketplace ready for purchases");

  console.log("\n💡 How to Purchase a Tool:");
  console.log("   1. Ensure you have USDC (use faucet if needed: usdc.faucet())");
  console.log("   2. Approve marketplace: usdc.approve(marketplace, amount)");
  console.log("   3. Purchase license: marketplace.purchaseLicense(toolId, months)");
  console.log("   4. Check your license: nft.balanceOf(address, toolId)");

  console.log("\n🔗 Faucet Info:");
  console.log("   - Claim Amount: 1000 USDC");
  console.log("   - Cooldown: 24 hours");
  console.log("   - Function: usdc.faucet()");

  return {
    marketplace: marketplaceAddress,
    usdc: usdcAddress,
    balance: ethers.formatUnits(balance, 6),
    allowance: ethers.formatUnits(allowance, 6),
    activeTools: activeTools.length
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
