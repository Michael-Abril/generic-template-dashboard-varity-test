import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Updates ToolMarketplace to use the new USDC token address
 *
 * Steps:
 * 1. Load marketplace contract
 * 2. Call updateUsdcToken() with new USDC address
 * 3. Verify the update
 */
async function main() {
  console.log("🔄 Updating ToolMarketplace USDC Address...\n");

  // Load deployments
  const deploymentsPath = path.join(__dirname, "../../deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  const marketplaceAddress = deployments.varity_l3_testnet.contracts.ToolMarketplace;
  const newUsdcAddress = deployments.varity_l3_testnet.usdc;

  console.log("📋 Marketplace Address:", marketplaceAddress);
  console.log("📋 New USDC Address:", newUsdcAddress);

  // Get deployer (should have admin role)
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployer/Admin:", deployer.address);

  // Get marketplace contract
  const ToolMarketplace = await ethers.getContractFactory("ToolMarketplace");
  const marketplace = ToolMarketplace.attach(marketplaceAddress);

  // Check current USDC address
  console.log("\n🔍 Checking current USDC address...");
  const currentUsdcAddress = await marketplace.usdcToken();
  console.log("   Current USDC:", currentUsdcAddress);

  if (currentUsdcAddress.toLowerCase() === newUsdcAddress.toLowerCase()) {
    console.log("✅ USDC address is already up to date!");
    return {
      marketplace: marketplaceAddress,
      usdc: newUsdcAddress,
      status: "already_updated"
    };
  }

  // Update USDC address
  console.log("\n🔄 Updating USDC address...");
  const updateTx = await marketplace.updateUsdcToken(newUsdcAddress);
  console.log("   Transaction hash:", updateTx.hash);

  await updateTx.wait();
  console.log("✅ Transaction confirmed!");

  // Verify update
  console.log("\n🔍 Verifying update...");
  const updatedUsdcAddress = await marketplace.usdcToken();
  console.log("   Updated USDC:", updatedUsdcAddress);

  if (updatedUsdcAddress.toLowerCase() === newUsdcAddress.toLowerCase()) {
    console.log("✅ USDC address updated successfully!");
  } else {
    throw new Error("USDC address update verification failed");
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("🎉 MARKETPLACE UPDATE COMPLETE!");
  console.log("=".repeat(80));
  console.log("\n📊 Update Summary:");
  console.log("   Marketplace:", marketplaceAddress);
  console.log("   Old USDC:", currentUsdcAddress);
  console.log("   New USDC:", updatedUsdcAddress);
  console.log("   Network: Varity L3 Testnet (Chain ID: 33529)");

  console.log("\n✅ Next Steps:");
  console.log("   1. Test marketplace purchases with new USDC");
  console.log("   2. Verify USDC approvals work correctly");
  console.log("   3. Test complete purchase flow");

  return {
    marketplace: marketplaceAddress,
    oldUsdc: currentUsdcAddress,
    newUsdc: updatedUsdcAddress,
    status: "updated"
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Update failed:", error);
    process.exit(1);
  });
