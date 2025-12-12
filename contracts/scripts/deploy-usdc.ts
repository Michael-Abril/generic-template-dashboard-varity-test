import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment script for MockUSDC token on Varity L3 testnet
 *
 * This script:
 * 1. Deploys MockUSDC with initial supply
 * 2. Verifies the contract is deployed correctly
 * 3. Tests basic functions (balance, decimals, symbol)
 * 4. Updates deployments.json with the USDC address
 * 5. Provides instructions for using the faucet
 */
async function main() {
  console.log("🚀 Deploying MockUSDC to Varity L3 Testnet...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployer address:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy MockUSDC with 1,000,000 USDC initial supply
  const initialSupply = 1_000_000; // Will be multiplied by 10^6 in contract
  console.log("📦 Deploying MockUSDC with initial supply:", initialSupply, "USDC...");

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy(initialSupply);
  await usdc.waitForDeployment();

  const usdcAddress = await usdc.getAddress();
  console.log("✅ MockUSDC deployed to:", usdcAddress);

  // Verify deployment
  console.log("\n🔍 Verifying contract deployment...");

  const name = await usdc.name();
  const symbol = await usdc.symbol();
  const decimals = await usdc.decimals();
  const deployerBalance = await usdc.balanceOf(deployer.address);
  const totalSupply = await usdc.totalSupply();

  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals);
  console.log("   Total Supply:", ethers.formatUnits(totalSupply, 6), "USDC");
  console.log("   Deployer Balance:", ethers.formatUnits(deployerBalance, 6), "USDC");

  // Test faucet function
  console.log("\n💧 Testing faucet function...");
  const faucetAmount = await usdc.FAUCET_AMOUNT();
  console.log("   Faucet Amount:", ethers.formatUnits(faucetAmount, 6), "USDC per claim");
  console.log("   Faucet Cooldown: 1 day");

  // Update deployments.json
  console.log("\n📝 Updating deployments.json...");
  const deploymentsPath = path.join(__dirname, "../../deployments.json");
  let deployments: any = {};

  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  }

  // Update Varity L3 testnet USDC address
  if (!deployments.varity_l3_testnet) {
    deployments.varity_l3_testnet = {
      network: "varity_l3_testnet",
      chainId: "33529",
      rpcUrl: "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
      explorerUrl: "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
      contracts: {}
    };
  }

  deployments.varity_l3_testnet.usdc = usdcAddress;
  deployments.varity_l3_testnet.deployer = deployer.address;
  deployments.varity_l3_testnet.timestamp = new Date().toISOString();

  // Add USDC deployment info
  deployments.varity_l3_testnet.usdcInfo = {
    name,
    symbol,
    decimals: Number(decimals),
    initialSupply: ethers.formatUnits(totalSupply, 6),
    faucetAmount: ethers.formatUnits(faucetAmount, 6),
    faucetCooldown: "1 day"
  };

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("✅ Updated deployments.json with USDC address");

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("🎉 USDC DEPLOYMENT COMPLETE!");
  console.log("=".repeat(80));
  console.log("\n📊 Deployment Summary:");
  console.log("   USDC Address:", usdcAddress);
  console.log("   Network: Varity L3 Testnet");
  console.log("   Chain ID: 33529");
  console.log("   RPC: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz");
  console.log("   Explorer: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz");

  console.log("\n💧 Faucet Instructions:");
  console.log("   1. Connect your wallet to Varity L3 testnet");
  console.log("   2. Call faucet() function to get 1000 USDC");
  console.log("   3. Wait 24 hours before next claim");
  console.log("   4. Use timeUntilNextClaim(address) to check cooldown");

  console.log("\n🔗 Next Steps:");
  console.log("   1. Verify contract on block explorer (if available)");
  console.log("   2. Update ToolMarketplace to use this USDC address");
  console.log("   3. Test token transfers and approvals");
  console.log("   4. Test marketplace purchases with USDC");

  console.log("\n📋 Contract Functions:");
  console.log("   - faucet(): Get 1000 testnet USDC (once per day)");
  console.log("   - canClaimFaucet(address): Check if address can claim");
  console.log("   - timeUntilNextClaim(address): Time until next claim");
  console.log("   - mint(address, amount): Owner can mint tokens for testing");

  console.log("\n" + "=".repeat(80));

  return {
    usdc: usdcAddress,
    deployer: deployer.address,
    network: "varity_l3_testnet",
    chainId: 33529
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
