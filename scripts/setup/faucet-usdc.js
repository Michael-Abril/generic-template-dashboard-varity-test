import hre from "hardhat";
import { ethers } from "hardhat";

/**
 * USDC Faucet Script for Varity L3 Testnet
 * Allows users to claim 1000 test USDC once per day
 */

const USDC_ADDRESS = "0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE";

async function main() {
  console.log("═".repeat(70));
  console.log("     VARITY L3 TESTNET - USDC FAUCET");
  console.log("═".repeat(70));
  console.log();

  const [signer] = await ethers.getSigners();
  console.log("Claiming USDC for:", signer.address);
  console.log();

  // Get USDC contract
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(USDC_ADDRESS);

  // Check current balance
  const balanceBefore = await usdc.balanceOf(signer.address);
  console.log("Current Balance:", ethers.formatUnits(balanceBefore, 6), "USDC");
  console.log();

  // Check if can claim
  const [canClaim, cooldownEnds] = await usdc.canClaimFaucet(signer.address);

  if (!canClaim) {
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = Number(cooldownEnds) - now;
    const hoursRemaining = Math.floor(timeRemaining / 3600);
    const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);

    console.log("❌ Faucet Cooldown Active");
    console.log();
    console.log("You can claim again in:", hoursRemaining, "hours", minutesRemaining, "minutes");
    console.log("Cooldown ends at:", new Date(Number(cooldownEnds) * 1000).toLocaleString());
    console.log();
    console.log("Try again later or use a different wallet address.");
    process.exit(1);
  }

  // Claim from faucet
  console.log("⏳ Claiming 1000 USDC from faucet...");
  console.log();

  try {
    const tx = await usdc.faucet();
    console.log("Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log();

    // Check new balance
    const balanceAfter = await usdc.balanceOf(signer.address);
    const claimed = balanceAfter - balanceBefore;

    console.log("═".repeat(70));
    console.log("     SUCCESS!");
    console.log("═".repeat(70));
    console.log();
    console.log("Claimed:", ethers.formatUnits(claimed, 6), "USDC");
    console.log("New Balance:", ethers.formatUnits(balanceAfter, 6), "USDC");
    console.log();
    console.log("You can claim again in 24 hours.");
    console.log();
    console.log("Block Explorer:");
    console.log("https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/tx/" + tx.hash);
    console.log();

  } catch (error) {
    console.error("❌ Faucet claim failed!");
    console.error();

    if (error.message.includes("FaucetCooldownActive")) {
      console.error("Error: You've already claimed from the faucet recently.");
      console.error("Please wait 24 hours between claims.");
    } else if (error.message.includes("insufficient funds")) {
      console.error("Error: Insufficient gas to pay for transaction.");
      console.error("Please ensure your wallet has enough ETH for gas.");
    } else {
      console.error("Error:", error.message);
    }

    console.error();
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
