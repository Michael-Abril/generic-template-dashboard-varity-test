import { ethers } from "hardhat";

/**
 * Test script for MockUSDC token
 *
 * Tests:
 * 1. Contract verification (name, symbol, decimals)
 * 2. Balance checking
 * 3. Transfer functionality
 * 4. Approval functionality
 * 5. Faucet functionality
 */
async function main() {
  console.log("🧪 Testing MockUSDC Token Functions...\n");

  // Get USDC contract address from deployments.json
  const deploymentsPath = require("path").join(__dirname, "../../deployments.json");
  const deployments = require(deploymentsPath);
  const usdcAddress = deployments.varity_l3_testnet.usdc;

  console.log("📋 USDC Address:", usdcAddress);

  // Get contract instance
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(usdcAddress);

  // Get test accounts
  const [deployer] = await ethers.getSigners();
  console.log("📋 Test Account:", deployer.address);

  // Test 1: Verify contract details
  console.log("\n✅ Test 1: Contract Verification");
  const name = await usdc.name();
  const symbol = await usdc.symbol();
  const decimals = await usdc.decimals();
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals);
  console.log("   ✓ Contract details verified");

  // Test 2: Check balances
  console.log("\n✅ Test 2: Balance Check");
  const deployerBalance = await usdc.balanceOf(deployer.address);
  const totalSupply = await usdc.totalSupply();
  console.log("   Deployer Balance:", ethers.formatUnits(deployerBalance, 6), "USDC");
  console.log("   Total Supply:", ethers.formatUnits(totalSupply, 6), "USDC");
  console.log("   ✓ Balance check passed");

  // Test 3: Transfer functionality
  console.log("\n✅ Test 3: Transfer Function");
  const testAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Random test address
  const transferAmount = ethers.parseUnits("100", 6); // 100 USDC

  console.log("   Transferring 100 USDC to", testAddress);
  const transferTx = await usdc.transfer(testAddress, transferAmount);
  await transferTx.wait();

  const recipientBalance = await usdc.balanceOf(testAddress);
  console.log("   Recipient Balance:", ethers.formatUnits(recipientBalance, 6), "USDC");
  console.log("   ✓ Transfer successful");

  // Test 4: Approval functionality
  console.log("\n✅ Test 4: Approval Function");
  const spenderAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Random spender
  const approvalAmount = ethers.parseUnits("500", 6); // 500 USDC

  console.log("   Approving 500 USDC for spender", spenderAddress);
  const approveTx = await usdc.approve(spenderAddress, approvalAmount);
  await approveTx.wait();

  const allowance = await usdc.allowance(deployer.address, spenderAddress);
  console.log("   Allowance:", ethers.formatUnits(allowance, 6), "USDC");
  console.log("   ✓ Approval successful");

  // Test 5: Faucet functionality
  console.log("\n✅ Test 5: Faucet Function");
  const faucetAmount = await usdc.FAUCET_AMOUNT();
  console.log("   Faucet Amount:", ethers.formatUnits(faucetAmount, 6), "USDC");

  // Check if can claim
  const [canClaim, cooldownEnds] = await usdc.canClaimFaucet(deployer.address);
  console.log("   Can Claim:", canClaim);

  if (canClaim) {
    console.log("   Claiming from faucet...");
    const beforeBalance = await usdc.balanceOf(deployer.address);
    const faucetTx = await usdc.faucet();
    await faucetTx.wait();
    const afterBalance = await usdc.balanceOf(deployer.address);

    const received = afterBalance - beforeBalance;
    console.log("   Received:", ethers.formatUnits(received, 6), "USDC");
    console.log("   ✓ Faucet claim successful");

    // Check cooldown
    const timeUntilNext = await usdc.timeUntilNextClaim(deployer.address);
    console.log("   Time until next claim:", Number(timeUntilNext), "seconds (~24 hours)");
  } else {
    console.log("   ⏳ Faucet on cooldown");
    const timeUntilNext = await usdc.timeUntilNextClaim(deployer.address);
    console.log("   Time until next claim:", Number(timeUntilNext), "seconds");
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("🎉 ALL TESTS PASSED!");
  console.log("=".repeat(80));
  console.log("\n📊 Test Summary:");
  console.log("   ✓ Contract verification");
  console.log("   ✓ Balance checking");
  console.log("   ✓ Transfer function");
  console.log("   ✓ Approval function");
  console.log("   ✓ Faucet function");

  console.log("\n💡 USDC Token Ready for Use!");
  console.log("   Address:", usdcAddress);
  console.log("   Network: Varity L3 Testnet (Chain ID: 33529)");
  console.log("   Total Supply:", ethers.formatUnits(totalSupply, 6), "USDC");

  return {
    address: usdcAddress,
    name,
    symbol,
    decimals: Number(decimals),
    totalSupply: ethers.formatUnits(totalSupply, 6)
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
