import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ToolLicenseNFT", function () {
  let toolLicenseNFT: any;
  let admin: SignerWithAddress;
  let developer: SignerWithAddress;
  let marketplace: SignerWithAddress;
  let customer1: SignerWithAddress;
  let customer2: SignerWithAddress;

  const BASE_URI = "ipfs://";
  const TOOL_NAME = "QuickBooks";
  const TOOL_CATEGORY = "Accounting";
  const TOOL_PRICE = ethers.parseUnits("49", 6); // 49 USDC (6 decimals)
  const METADATA_URI = "ipfs://quickbooks-metadata";

  beforeEach(async function () {
    [admin, developer, marketplace, customer1, customer2] = await ethers.getSigners();

    // Deploy ToolLicenseNFT
    const ToolLicenseNFT = await ethers.getContractFactory("ToolLicenseNFT");
    toolLicenseNFT = await upgrades.deployProxy(
      ToolLicenseNFT,
      [admin.address, BASE_URI],
      { initializer: "initialize", kind: "uups" }
    );
    await toolLicenseNFT.waitForDeployment();

    // Grant MINTER_ROLE to marketplace
    const minterRole = await toolLicenseNFT.MINTER_ROLE();
    await toolLicenseNFT.grantRole(minterRole, marketplace.address);
  });

  describe("Initialization", function () {
    it("Should set correct name and symbol", async function () {
      expect(await toolLicenseNFT.name()).to.equal("Varity Tool License");
      expect(await toolLicenseNFT.symbol()).to.equal("VTL");
    });

    it("Should grant DEFAULT_ADMIN_ROLE to admin", async function () {
      const adminRole = await toolLicenseNFT.DEFAULT_ADMIN_ROLE();
      expect(await toolLicenseNFT.hasRole(adminRole, admin.address)).to.be.true;
    });

    it("Should grant MINTER_ROLE to admin", async function () {
      const minterRole = await toolLicenseNFT.MINTER_ROLE();
      expect(await toolLicenseNFT.hasRole(minterRole, admin.address)).to.be.true;
    });

    it("Should grant UPGRADER_ROLE to admin", async function () {
      const upgraderRole = await toolLicenseNFT.UPGRADER_ROLE();
      expect(await toolLicenseNFT.hasRole(upgraderRole, admin.address)).to.be.true;
    });

    it("Should start with zero tools listed", async function () {
      expect(await toolLicenseNFT.totalTools()).to.equal(0);
    });
  });

  describe("Tool Listing", function () {
    it("Should list a tool successfully", async function () {
      await expect(
        toolLicenseNFT
          .connect(marketplace)
          .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI)
      )
        .to.emit(toolLicenseNFT, "ToolListed")
        .withArgs(0, developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, await ethers.provider.getBlock("latest").then(b => b ? b.timestamp + 1 : 0));

      expect(await toolLicenseNFT.totalTools()).to.equal(1);
    });

    it("Should create tool with correct metadata", async function () {
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI);

      const toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.name).to.equal(TOOL_NAME);
      expect(toolMetadata.category).to.equal(TOOL_CATEGORY);
      expect(toolMetadata.version).to.equal("1.0.0");
      expect(toolMetadata.developer).to.equal(developer.address);
      expect(toolMetadata.price).to.equal(TOOL_PRICE);
      expect(toolMetadata.isActive).to.be.true;
      expect(toolMetadata.totalLicenses).to.equal(0);
      expect(toolMetadata.metadataURI).to.equal(METADATA_URI);
    });

    it("Should allow listing multiple tools", async function () {
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, "QuickBooks", "Accounting", TOOL_PRICE, METADATA_URI);

      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, "Salesforce", "CRM", ethers.parseUnits("99", 6), "ipfs://sf");

      expect(await toolLicenseNFT.totalTools()).to.equal(2);
    });

    it("Should allow free tools (price = 0)", async function () {
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, "FreeTool", "Utility", 0, METADATA_URI);

      const toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.price).to.equal(0);
    });

    it("Should revert if caller doesn't have MINTER_ROLE", async function () {
      await expect(
        toolLicenseNFT
          .connect(customer1)
          .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI)
      ).to.be.reverted;
    });
  });

  describe("License Issuance", function () {
    beforeEach(async function () {
      // List a tool first
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI);
    });

    it("Should issue license successfully", async function () {
      await expect(
        toolLicenseNFT.connect(marketplace).issueLicense(customer1.address, 0, 1)
      )
        .to.emit(toolLicenseNFT, "LicenseIssued")
        .withArgs(customer1.address, 0, 1, await ethers.provider.getBlock("latest").then(b => b ? b.timestamp + 1 : 0));

      expect(await toolLicenseNFT.balanceOf(customer1.address, 0)).to.equal(1);
      expect(await toolLicenseNFT.hasLicense(customer1.address, 0)).to.be.true;
    });

    it("Should update totalLicenses counter", async function () {
      await toolLicenseNFT.connect(marketplace).issueLicense(customer1.address, 0, 1);

      const toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.totalLicenses).to.equal(1);
    });

    it("Should emit LicenseCountUpdated event", async function () {
      await expect(
        toolLicenseNFT.connect(marketplace).issueLicense(customer1.address, 0, 1)
      )
        .to.emit(toolLicenseNFT, "LicenseCountUpdated")
        .withArgs(0, 1);
    });

    it("Should issue multiple licenses to same customer", async function () {
      await toolLicenseNFT.connect(marketplace).issueLicense(customer1.address, 0, 3);

      expect(await toolLicenseNFT.balanceOf(customer1.address, 0)).to.equal(3);
    });

    it("Should issue licenses to multiple customers", async function () {
      await toolLicenseNFT.connect(marketplace).issueLicense(customer1.address, 0, 1);
      await toolLicenseNFT.connect(marketplace).issueLicense(customer2.address, 0, 1);

      expect(await toolLicenseNFT.hasLicense(customer1.address, 0)).to.be.true;
      expect(await toolLicenseNFT.hasLicense(customer2.address, 0)).to.be.true;

      const toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.totalLicenses).to.equal(2);
    });

    it("Should revert if tool doesn't exist", async function () {
      await expect(
        toolLicenseNFT.connect(marketplace).issueLicense(customer1.address, 999, 1)
      ).to.be.revertedWithCustomError(toolLicenseNFT, "ToolNotFound");
    });

    it("Should revert if tool is not active", async function () {
      // Deactivate tool
      await toolLicenseNFT.connect(developer).toggleActive(0);

      await expect(
        toolLicenseNFT.connect(marketplace).issueLicense(customer1.address, 0, 1)
      ).to.be.revertedWithCustomError(toolLicenseNFT, "ToolNotActive");
    });

    it("Should revert if caller doesn't have MINTER_ROLE", async function () {
      await expect(
        toolLicenseNFT.connect(customer1).issueLicense(customer1.address, 0, 1)
      ).to.be.reverted;
    });
  });

  describe("License Revocation", function () {
    beforeEach(async function () {
      // List tool and issue license
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI);

      await toolLicenseNFT.connect(marketplace).issueLicense(customer1.address, 0, 2);
    });

    it("Should revoke license successfully", async function () {
      await toolLicenseNFT.connect(marketplace).revokeLicense(customer1.address, 0, 1);

      expect(await toolLicenseNFT.balanceOf(customer1.address, 0)).to.equal(1);
      expect(await toolLicenseNFT.hasLicense(customer1.address, 0)).to.be.true;
    });

    it("Should update totalLicenses counter", async function () {
      await toolLicenseNFT.connect(marketplace).revokeLicense(customer1.address, 0, 1);

      const toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.totalLicenses).to.equal(1);
    });

    it("Should emit LicenseCountUpdated event", async function () {
      await expect(
        toolLicenseNFT.connect(marketplace).revokeLicense(customer1.address, 0, 1)
      )
        .to.emit(toolLicenseNFT, "LicenseCountUpdated")
        .withArgs(0, 1);
    });

    it("Should revoke all licenses", async function () {
      await toolLicenseNFT.connect(marketplace).revokeLicense(customer1.address, 0, 2);

      expect(await toolLicenseNFT.balanceOf(customer1.address, 0)).to.equal(0);
      expect(await toolLicenseNFT.hasLicense(customer1.address, 0)).to.be.false;
    });

    it("Should handle revoking more than totalLicenses gracefully", async function () {
      await toolLicenseNFT.connect(marketplace).revokeLicense(customer1.address, 0, 5);

      const toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.totalLicenses).to.equal(0);
    });

    it("Should revert if caller doesn't have MINTER_ROLE", async function () {
      await expect(
        toolLicenseNFT.connect(customer1).revokeLicense(customer1.address, 0, 1)
      ).to.be.reverted;
    });
  });

  describe("Price Management", function () {
    beforeEach(async function () {
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI);
    });

    it("Should allow developer to update price", async function () {
      const newPrice = ethers.parseUnits("99", 6);

      await expect(toolLicenseNFT.connect(developer).updatePrice(0, newPrice))
        .to.emit(toolLicenseNFT, "PriceUpdated")
        .withArgs(0, TOOL_PRICE, newPrice, await ethers.provider.getBlock("latest").then(b => b ? b.timestamp + 1 : 0));

      const toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.price).to.equal(newPrice);
    });

    it("Should allow admin to update price", async function () {
      const newPrice = ethers.parseUnits("199", 6);

      await toolLicenseNFT.connect(admin).updatePrice(0, newPrice);

      const toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.price).to.equal(newPrice);
    });

    it("Should revert if non-developer/non-admin tries to update price", async function () {
      const newPrice = ethers.parseUnits("99", 6);

      await expect(
        toolLicenseNFT.connect(customer1).updatePrice(0, newPrice)
      ).to.be.revertedWithCustomError(toolLicenseNFT, "NotToolDeveloper");
    });

    it("Should revert if tool doesn't exist", async function () {
      await expect(
        toolLicenseNFT.connect(developer).updatePrice(999, TOOL_PRICE)
      ).to.be.revertedWithCustomError(toolLicenseNFT, "ToolNotFound");
    });
  });

  describe("Version Management", function () {
    beforeEach(async function () {
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI);
    });

    it("Should allow developer to update version", async function () {
      await toolLicenseNFT.connect(developer).updateVersion(0, "2.0.0");

      const toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.version).to.equal("2.0.0");
    });

    it("Should allow admin to update version", async function () {
      await toolLicenseNFT.connect(admin).updateVersion(0, "3.0.0");

      const toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.version).to.equal("3.0.0");
    });

    it("Should revert if non-developer/non-admin tries to update version", async function () {
      await expect(
        toolLicenseNFT.connect(customer1).updateVersion(0, "2.0.0")
      ).to.be.revertedWithCustomError(toolLicenseNFT, "NotToolDeveloper");
    });

    it("Should revert if tool doesn't exist", async function () {
      await expect(
        toolLicenseNFT.connect(developer).updateVersion(999, "2.0.0")
      ).to.be.revertedWithCustomError(toolLicenseNFT, "ToolNotFound");
    });
  });

  describe("Active Status Management", function () {
    beforeEach(async function () {
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI);
    });

    it("Should allow developer to toggle active status", async function () {
      await expect(toolLicenseNFT.connect(developer).toggleActive(0))
        .to.emit(toolLicenseNFT, "ToolStatusChanged")
        .withArgs(0, false, await ethers.provider.getBlock("latest").then(b => b ? b.timestamp + 1 : 0));

      let toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.isActive).to.be.false;

      await toolLicenseNFT.connect(developer).toggleActive(0);
      toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.isActive).to.be.true;
    });

    it("Should allow admin to toggle active status", async function () {
      await toolLicenseNFT.connect(admin).toggleActive(0);

      const toolMetadata = await toolLicenseNFT.getToolMetadata(0);
      expect(toolMetadata.isActive).to.be.false;
    });

    it("Should revert if non-developer/non-admin tries to toggle", async function () {
      await expect(
        toolLicenseNFT.connect(customer1).toggleActive(0)
      ).to.be.revertedWithCustomError(toolLicenseNFT, "NotToolDeveloper");
    });

    it("Should revert if tool doesn't exist", async function () {
      await expect(
        toolLicenseNFT.connect(developer).toggleActive(999)
      ).to.be.revertedWithCustomError(toolLicenseNFT, "ToolNotFound");
    });
  });

  describe("URI Management", function () {
    beforeEach(async function () {
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI);
    });

    it("Should return correct URI for tool", async function () {
      expect(await toolLicenseNFT.uri(0)).to.equal(METADATA_URI);
    });

    it("Should revert if tool doesn't exist", async function () {
      await expect(toolLicenseNFT.uri(999)).to.be.revertedWithCustomError(
        toolLicenseNFT,
        "ToolNotFound"
      );
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI);
    });

    it("Should check license ownership correctly", async function () {
      expect(await toolLicenseNFT.hasLicense(customer1.address, 0)).to.be.false;

      await toolLicenseNFT.connect(marketplace).issueLicense(customer1.address, 0, 1);

      expect(await toolLicenseNFT.hasLicense(customer1.address, 0)).to.be.true;
    });

    it("Should return correct tool metadata", async function () {
      const metadata = await toolLicenseNFT.getToolMetadata(0);

      expect(metadata.name).to.equal(TOOL_NAME);
      expect(metadata.category).to.equal(TOOL_CATEGORY);
      expect(metadata.developer).to.equal(developer.address);
      expect(metadata.price).to.equal(TOOL_PRICE);
      expect(metadata.metadataURI).to.equal(METADATA_URI);
    });

    it("Should return correct total tools count", async function () {
      expect(await toolLicenseNFT.totalTools()).to.equal(1);

      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, "Tool2", "Category2", TOOL_PRICE, "ipfs://tool2");

      expect(await toolLicenseNFT.totalTools()).to.equal(2);
    });
  });

  describe("Access Control", function () {
    it("Should support ERC1155 interface", async function () {
      const ERC1155_INTERFACE_ID = "0xd9b67a26";
      expect(await toolLicenseNFT.supportsInterface(ERC1155_INTERFACE_ID)).to.be.true;
    });

    it("Should support AccessControl interface", async function () {
      const ACCESS_CONTROL_INTERFACE_ID = "0x7965db0b";
      expect(await toolLicenseNFT.supportsInterface(ACCESS_CONTROL_INTERFACE_ID)).to.be.true;
    });
  });

  describe("Upgradeability", function () {
    it("Should only allow UPGRADER_ROLE to upgrade", async function () {
      const ToolLicenseNFTV2 = await ethers.getContractFactory("ToolLicenseNFT");

      // Admin should be able to upgrade
      await expect(
        upgrades.upgradeProxy(await toolLicenseNFT.getAddress(), ToolLicenseNFTV2)
      ).to.not.be.reverted;
    });

    it("Should preserve state after upgrade", async function () {
      // List a tool
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI);

      const beforeUpgrade = await toolLicenseNFT.totalTools();

      // Upgrade
      const ToolLicenseNFTV2 = await ethers.getContractFactory("ToolLicenseNFT");
      const upgraded = await upgrades.upgradeProxy(
        await toolLicenseNFT.getAddress(),
        ToolLicenseNFTV2
      );

      // Check state preserved
      expect(await upgraded.totalTools()).to.equal(beforeUpgrade);
      const metadata = await upgraded.getToolMetadata(0);
      expect(metadata.name).to.equal(TOOL_NAME);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero-amount license issuance", async function () {
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, TOOL_PRICE, METADATA_URI);

      await toolLicenseNFT.connect(marketplace).issueLicense(customer1.address, 0, 0);

      expect(await toolLicenseNFT.balanceOf(customer1.address, 0)).to.equal(0);
    });

    it("Should handle maximum uint256 values", async function () {
      const maxUint = ethers.MaxUint256;

      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, TOOL_NAME, TOOL_CATEGORY, maxUint, METADATA_URI);

      const metadata = await toolLicenseNFT.getToolMetadata(0);
      expect(metadata.price).to.equal(maxUint);
    });

    it("Should handle empty string metadata", async function () {
      await toolLicenseNFT
        .connect(marketplace)
        .listTool(developer.address, "", "", 0, "");

      const metadata = await toolLicenseNFT.getToolMetadata(0);
      expect(metadata.name).to.equal("");
      expect(metadata.category).to.equal("");
      expect(metadata.metadataURI).to.equal("");
    });
  });
});
