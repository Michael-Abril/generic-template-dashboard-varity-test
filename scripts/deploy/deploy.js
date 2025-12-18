import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// USDC addresses per network
const USDC_ADDRESSES = {
  arbitrum_sepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Arbitrum Sepolia USDC
  varity_testnet: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Varity L3 Testnet USDC (same address)
};

const DEPLOYER_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function main() {
  console.log("Deploying Smart Contracts...");

  const network = await hre.ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("");

  // Determine USDC address based on network
  const USDC_ADDRESS = USDC_ADDRESSES[network.name] || USDC_ADDRESSES.arbitrum_sepolia;
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
  console.log("Deployer Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("");

  const deploymentAddresses = {};

  try {
    // Step 1: Deploy ToolLicenseNFT (ERC-1155)
    console.log("Step 1: Deploying ToolLicenseNFT...");
    const ToolLicenseNFT = await hre.ethers.getContractFactory("ToolLicenseNFT");
    const toolLicenseNFT = await hre.upgrades.deployProxy(
      ToolLicenseNFT,
      [deployer.address, "https://ipfs.io/ipfs/{id}.json"],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    await toolLicenseNFT.waitForDeployment();
    const toolLicenseAddress = await toolLicenseNFT.getAddress();
    deploymentAddresses.ToolLicenseNFT = toolLicenseAddress;
    console.log("✓ ToolLicenseNFT deployed at:", toolLicenseAddress);
    console.log("");

    // Step 2: Deploy RevenueSplitter
    console.log("Step 2: Deploying RevenueSplitter...");
    const RevenueSplitter = await hre.ethers.getContractFactory("RevenueSplitter");
    const revenueSplitter = await hre.upgrades.deployProxy(
      RevenueSplitter,
      [deployer.address, deployer.address], // admin, treasury
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    await revenueSplitter.waitForDeployment();
    const revenueSplitterAddress = await revenueSplitter.getAddress();
    deploymentAddresses.RevenueSplitter = revenueSplitterAddress;
    console.log("✓ RevenueSplitter deployed at:", revenueSplitterAddress);

    // Whitelist USDC in RevenueSplitter
    const whitelistTx = await revenueSplitter.setTokenWhitelist(USDC_ADDRESS, true);
    await whitelistTx.wait();
    console.log("✓ USDC whitelisted in RevenueSplitter");
    console.log("");

    // Step 3: Deploy SubscriptionBilling
    console.log("Step 3: Deploying SubscriptionBilling...");
    const SubscriptionBilling = await hre.ethers.getContractFactory("SubscriptionBilling");
    const subscriptionBilling = await hre.upgrades.deployProxy(
      SubscriptionBilling,
      [deployer.address], // admin
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    await subscriptionBilling.waitForDeployment();
    const subscriptionBillingAddress = await subscriptionBilling.getAddress();
    deploymentAddresses.SubscriptionBilling = subscriptionBillingAddress;
    console.log("✓ SubscriptionBilling deployed at:", subscriptionBillingAddress);
    console.log("");

    // Step 4: Deploy ToolMarketplace
    console.log("Step 4: Deploying ToolMarketplace...");
    const ToolMarketplace = await hre.ethers.getContractFactory("ToolMarketplace");
    const toolMarketplace = await hre.upgrades.deployProxy(
      ToolMarketplace,
      [
        toolLicenseAddress,        // _toolLicenseNFT
        revenueSplitterAddress,    // _revenueSplitter
        subscriptionBillingAddress, // _subscriptionBilling
        USDC_ADDRESS,              // _usdcToken
        deployer.address,          // _admin
      ],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    await toolMarketplace.waitForDeployment();
    const toolMarketplaceAddress = await toolMarketplace.getAddress();
    deploymentAddresses.ToolMarketplace = toolMarketplaceAddress;
    console.log("✓ ToolMarketplace deployed at:", toolMarketplaceAddress);
    console.log("");

    // Step 5: Grant MINTER_ROLE to ToolMarketplace in ToolLicenseNFT
    console.log("Step 5: Configuring Access Control...");
    const MINTER_ROLE = hre.ethers.id("MINTER_ROLE");
    const grantMinterTx = await toolLicenseNFT.grantRole(MINTER_ROLE, toolMarketplaceAddress);
    await grantMinterTx.wait();
    console.log("✓ ToolMarketplace granted MINTER_ROLE in ToolLicenseNFT");

    // Grant MARKETPLACE_ROLE to ToolMarketplace in RevenueSplitter
    const MARKETPLACE_ROLE = hre.ethers.id("MARKETPLACE_ROLE");
    const grantMarketplaceTx = await revenueSplitter.grantRole(MARKETPLACE_ROLE, toolMarketplaceAddress);
    await grantMarketplaceTx.wait();
    console.log("✓ ToolMarketplace granted MARKETPLACE_ROLE in RevenueSplitter");

    // Grant MARKETPLACE_ROLE to ToolMarketplace in SubscriptionBilling
    const grantBillingTx = await subscriptionBilling.grantRole(MARKETPLACE_ROLE, toolMarketplaceAddress);
    await grantBillingTx.wait();
    console.log("✓ ToolMarketplace granted MARKETPLACE_ROLE in SubscriptionBilling");
    console.log("");

    // Summary
    console.log("=" .repeat(70));
    console.log("DEPLOYMENT SUMMARY");
    console.log("=" .repeat(70));
    console.log("");
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId.toString());
    console.log("");
    console.log("Smart Contract Addresses:");
    console.log("-".repeat(70));
    console.log("ToolLicenseNFT:       ", deploymentAddresses.ToolLicenseNFT);
    console.log("RevenueSplitter:      ", deploymentAddresses.RevenueSplitter);
    console.log("SubscriptionBilling:  ", deploymentAddresses.SubscriptionBilling);
    console.log("ToolMarketplace:      ", deploymentAddresses.ToolMarketplace);
    console.log("");
    console.log("USDC Token Address:   ", USDC_ADDRESS);
    console.log("Deployer:             ", deployer.address);
    console.log("");

    // Save deployment addresses to file
    const deploymentFile = path.join(__dirname, "../deployments.json");
    fs.writeFileSync(
      deploymentFile,
      JSON.stringify(
        {
          network: network.name,
          chainId: network.chainId.toString(),
          usdc: USDC_ADDRESS,
          deployer: deployer.address,
          timestamp: new Date().toISOString(),
          contracts: deploymentAddresses,
        },
        null,
        2
      )
    );
    console.log("✓ Deployment addresses saved to:", deploymentFile);
    console.log("=" .repeat(70));

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
