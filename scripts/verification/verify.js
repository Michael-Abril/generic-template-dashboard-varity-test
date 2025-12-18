const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Verifying deployed contracts...");
  console.log("");

  const deploymentFile = path.join(__dirname, "../deployments.json");
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please run deploy script first.");
    process.exit(1);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const addresses = deployments.contracts;

  console.log("Network:", deployments.network);
  console.log("Chain ID:", deployments.chainId);
  console.log("");

  try {
    // Verify ToolLicenseNFT
    console.log("Verifying ToolLicenseNFT...");
    const toolLicenseNFT = await hre.ethers.getContractAt("ToolLicenseNFT", addresses.ToolLicenseNFT);
    const name = await toolLicenseNFT.name();
    const symbol = await toolLicenseNFT.symbol();
    console.log("✓ ToolLicenseNFT verified");
    console.log("  Name:", name);
    console.log("  Symbol:", symbol);
    console.log("");

    // Verify RevenueSplitter
    console.log("Verifying RevenueSplitter...");
    const revenueSplitter = await hre.ethers.getContractAt("RevenueSplitter", addresses.RevenueSplitter);
    const varietyTreasury = await revenueSplitter.varietyTreasury();
    const varietyPercentage = await revenueSplitter.VARITY_PERCENTAGE();
    const creatorPercentage = await revenueSplitter.CREATOR_PERCENTAGE();
    console.log("✓ RevenueSplitter verified");
    console.log("  Varity Treasury:", varietyTreasury);
    console.log("  Revenue Split: ", varietyPercentage.toString() + "% Varity / " + creatorPercentage.toString() + "% Creator");
    console.log("");

    // Verify SubscriptionBilling
    console.log("Verifying SubscriptionBilling...");
    const subscriptionBilling = await hre.ethers.getContractAt("SubscriptionBilling", addresses.SubscriptionBilling);
    const secondsPerMonth = await subscriptionBilling.SECONDS_PER_MONTH();
    console.log("✓ SubscriptionBilling verified");
    console.log("  Seconds Per Month:", secondsPerMonth.toString());
    console.log("");

    // Verify ToolMarketplace
    console.log("Verifying ToolMarketplace...");
    const toolMarketplace = await hre.ethers.getContractAt("ToolMarketplace", addresses.ToolMarketplace);
    const usdcToken = await toolMarketplace.usdcToken();
    const totalToolsListed = await toolMarketplace.totalToolsListed();
    console.log("✓ ToolMarketplace verified");
    console.log("  USDC Token:", usdcToken);
    console.log("  Total Tools Listed:", totalToolsListed.toString());
    console.log("");

    console.log("=" .repeat(70));
    console.log("✓ All contracts verified successfully!");
    console.log("=" .repeat(70));

  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
