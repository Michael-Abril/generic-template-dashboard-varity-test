import hre from "hardhat";
import { ethers } from "hardhat";

/**
 * USDC Minting Script (Owner Only)
 * Allows contract owner to mint USDC to any address for testing
 */

const USDC_ADDRESS = "0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE";

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: npx hardhat run scripts/mint-usdc.js --network varity_testnet <recipient> <amount>");
    console.log();
    console.log("Example:");
    console.log("  npx hardhat run scripts/mint-usdc.js --network varity_testnet 0x123... 5000");
    console.log();
    console.log("This will mint 5000 USDC to address 0x123...");
    process.exit(1);
  }

  const recipient = args[0];
  const amount = parseFloat(args[1]);

  console.log("═".repeat(70));
  console.log("     VARITY L3 TESTNET - USDC MINTING (OWNER ONLY)");
  console.log("═".repeat(70));
  console.log();

  const [signer] = await ethers.getSigners();
  console.log("Minting from:", signer.address);
  console.log("Recipient:", recipient);
  console.log("Amount:", amount, "USDC");
  console.log();

  // Validate recipient address
  if (!ethers.isAddress(recipient)) {
    console.error("❌ Invalid recipient address:", recipient);
    process.exit(1);
  }

  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    console.error("❌ Invalid amount:", amount);
    process.exit(1);
  }

  // Get USDC contract
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = MockUSDC.attach(USDC_ADDRESS);

  // Check if signer is owner
  try {
    const owner = await usdc.owner();
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.error("❌ Only contract owner can mint USDC");
      console.error("Owner:", owner);
      console.error("Your address:", signer.address);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Failed to verify ownership:", error.message);
    process.exit(1);
  }

  // Check current balance
  const balanceBefore = await usdc.balanceOf(recipient);
  console.log("Current Balance:", ethers.formatUnits(balanceBefore, 6), "USDC");
  console.log();

  // Convert amount to smallest units (6 decimals)
  const amountInUnits = ethers.parseUnits(amount.toString(), 6);

  // Mint USDC
  console.log("⏳ Minting", amount, "USDC...");
  console.log();

  try {
    const tx = await usdc.mint(recipient, amountInUnits);
    console.log("Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log();

    // Check new balance
    const balanceAfter = await usdc.balanceOf(recipient);

    console.log("═".repeat(70));
    console.log("     SUCCESS!");
    console.log("═".repeat(70));
    console.log();
    console.log("Minted:", amount, "USDC");
    console.log("New Balance:", ethers.formatUnits(balanceAfter, 6), "USDC");
    console.log();
    console.log("Block Explorer:");
    console.log("https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/tx/" + tx.hash);
    console.log();

  } catch (error) {
    console.error("❌ Minting failed!");
    console.error();

    if (error.message.includes("OwnableUnauthorizedAccount")) {
      console.error("Error: Only the contract owner can mint USDC.");
    } else if (error.message.includes("insufficient funds")) {
      console.error("Error: Insufficient gas to pay for transaction.");
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
