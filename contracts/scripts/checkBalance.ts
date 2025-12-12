import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("\n========================================");
  console.log("WALLET BALANCE CHECK");
  console.log("========================================\n");

  console.log("Deployer Address:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Chain ID:", network.chainId.toString());
  console.log("Network Name:", network.name);

  // Check if balance is sufficient for deployment
  const minBalance = ethers.parseEther("0.01"); // Minimum 0.01 ETH recommended
  if (balance < minBalance) {
    console.log("\n⚠️  WARNING: Balance is low for deployment!");
    console.log("Recommended minimum: 0.01 ETH");
    console.log("Current balance:", ethers.formatEther(balance), "ETH");
    console.log("\nYou may need to fund this address before deploying.");
  } else {
    console.log("\n✅ Balance is sufficient for deployment");
  }

  console.log("\n========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
