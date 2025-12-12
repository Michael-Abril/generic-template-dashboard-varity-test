import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ToolMarketplace", function () {
  let toolMarketplace: any;
  let toolLicenseNFT: any;
  let revenueSplitter: any;
  let subscriptionBilling: any;
  let mockUSDC: any;
  let admin: SignerWithAddress;
  let developer: SignerWithAddress;
  let customer: SignerWithAddress;
  let treasury: SignerWithAddress;

  beforeEach(async function () {
    [admin, developer, customer, treasury] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USDC", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Mint USDC to customer for testing
    await mockUSDC.mint(customer.address, ethers.parseUnits("1000", 6));

    // Deploy RevenueSplitter
    const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
    revenueSplitter = await upgrades.deployProxy(
      RevenueSplitter,
      [treasury.address, admin.address],
      { initializer: "initialize", kind: "uups" }
    );
    await revenueSplitter.waitForDeployment();

    // Whitelist USDC
    await revenueSplitter.setTokenWhitelist(await mockUSDC.getAddress(), true);

    // Deploy ToolLicenseNFT
    const ToolLicenseNFT = await ethers.getContractFactory("ToolLicenseNFT");
    toolLicenseNFT = await upgrades.deployProxy(
      ToolLicenseNFT,
      [admin.address, "ipfs://"],
      { initializer: "initialize", kind: "uups" }
    );
    await toolLicenseNFT.waitForDeployment();

    // Deploy SubscriptionBilling
    const SubscriptionBilling = await ethers.getContractFactory("SubscriptionBilling");
    subscriptionBilling = await upgrades.deployProxy(
      SubscriptionBilling,
      [admin.address],
      { initializer: "initialize", kind: "uups" }
    );
    await subscriptionBilling.waitForDeployment();

    // Deploy ToolMarketplace
    const ToolMarketplace = await ethers.getContractFactory("ToolMarketplace");
    toolMarketplace = await upgrades.deployProxy(
      ToolMarketplace,
      [
        await toolLicenseNFT.getAddress(),
        await revenueSplitter.getAddress(),
        await subscriptionBilling.getAddress(),
        await mockUSDC.getAddress(),
        admin.address,
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await toolMarketplace.waitForDeployment();

    // Grant roles
    const minterRole = await toolLicenseNFT.MINTER_ROLE();
    await toolLicenseNFT.grantRole(minterRole, await toolMarketplace.getAddress());

    const marketplaceRoleBilling = await subscriptionBilling.MARKETPLACE_ROLE();
    await subscriptionBilling.grantRole(marketplaceRoleBilling, await toolMarketplace.getAddress());

    const marketplaceRoleSplitter = await revenueSplitter.MARKETPLACE_ROLE();
    await revenueSplitter.grantRole(marketplaceRoleSplitter, await toolMarketplace.getAddress());
  });

  describe("Tool Listing", function () {
    it("Should list a tool successfully", async function () {
      const tx = await toolMarketplace.listTool(
        "QuickBooks",
        "Accounting",
        ethers.parseUnits("49", 6),
        "ipfs://quickbooks-metadata"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => log.fragment?.name === "ToolListed");

      expect(event).to.not.be.undefined;
      expect(await toolMarketplace.totalToolsListed()).to.equal(1);
    });

    it("Should retrieve active tools", async function () {
      await toolMarketplace.listTool("QuickBooks", "Accounting", ethers.parseUnits("49", 6), "ipfs://qb");
      await toolMarketplace.listTool("Salesforce", "CRM", ethers.parseUnits("99", 6), "ipfs://sf");

      const activeTools = await toolMarketplace.getActiveTools();
      expect(activeTools.length).to.equal(2);
    });
  });

  describe("License Purchase", function () {
    beforeEach(async function () {
      // List a tool
      await toolMarketplace.listTool(
        "QuickBooks",
        "Accounting",
        ethers.parseUnits("49", 6),
        "ipfs://quickbooks-metadata"
      );
    });

    it("Should purchase a license successfully", async function () {
      const toolId = 0;
      const duration = 1;
      const price = ethers.parseUnits("49", 6);

      // Approve USDC
      await mockUSDC.connect(customer).approve(await toolMarketplace.getAddress(), price);

      // Purchase license
      await expect(
        toolMarketplace.connect(customer).purchaseLicense(toolId, duration)
      ).to.emit(toolMarketplace, "LicensePurchased");

      // Check license
      const hasLicense = await toolLicenseNFT.hasLicense(customer.address, toolId);
      expect(hasLicense).to.be.true;

      // Check subscription
      const hasSubscription = await subscriptionBilling.hasActiveSubscription(customer.address, toolId);
      expect(hasSubscription).to.be.true;
    });

    it("Should split revenue correctly (70/30)", async function () {
      const toolId = 0;
      const duration = 1;
      const price = ethers.parseUnits("49", 6);

      // Approve USDC
      await mockUSDC.connect(customer).approve(await toolMarketplace.getAddress(), price);

      // Purchase license
      await toolMarketplace.connect(customer).purchaseLicense(toolId, duration);

      // Check treasury received 70%
      const treasuryBalance = await mockUSDC.balanceOf(treasury.address);
      const expectedTreasuryAmount = (price * 70n) / 100n;
      expect(treasuryBalance).to.equal(expectedTreasuryAmount);

      // Check developer pending withdrawal is 30%
      const pending = await revenueSplitter.getPendingTokenWithdrawal(
        admin.address,
        await mockUSDC.getAddress()
      );
      const expectedDeveloperAmount = price - expectedTreasuryAmount;
      expect(pending).to.equal(expectedDeveloperAmount);
    });

    it("Should fail without USDC approval", async function () {
      await expect(
        toolMarketplace.connect(customer).purchaseLicense(0, 1)
      ).to.be.revertedWithCustomError(toolMarketplace, "InsufficientAllowance");
    });
  });

  describe("Reviews", function () {
    beforeEach(async function () {
      // List tool and purchase license
      await toolMarketplace.listTool("QuickBooks", "Accounting", ethers.parseUnits("49", 6), "ipfs://qb");

      const price = ethers.parseUnits("49", 6);
      await mockUSDC.connect(customer).approve(await toolMarketplace.getAddress(), price);
      await toolMarketplace.connect(customer).purchaseLicense(0, 1);
    });

    it("Should leave a review successfully", async function () {
      await expect(
        toolMarketplace.connect(customer).leaveReview(0, 500, "Great tool!")
      ).to.emit(toolMarketplace, "ReviewSubmitted");

      const reviews = await toolMarketplace.getToolReviews(0);
      expect(reviews.length).to.equal(1);
      expect(reviews[0].rating).to.equal(500);
    });

    it("Should update average rating correctly", async function () {
      await toolMarketplace.connect(customer).leaveReview(0, 500, "Great!");

      const listing = await toolMarketplace.getToolListing(0);
      expect(listing.rating).to.equal(500);
      expect(listing.reviewCount).to.equal(1);
    });

    it("Should prevent duplicate reviews", async function () {
      await toolMarketplace.connect(customer).leaveReview(0, 500, "Great!");

      await expect(
        toolMarketplace.connect(customer).leaveReview(0, 400, "Still great!")
      ).to.be.revertedWithCustomError(toolMarketplace, "AlreadyReviewed");
    });
  });
});
