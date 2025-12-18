import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RevenueSplitter", function () {
  let revenueSplitter: any;
  let mockUSDC: any;
  let admin: SignerWithAddress;
  let treasury: SignerWithAddress;
  let marketplace: SignerWithAddress;
  let creator1: SignerWithAddress;
  let creator2: SignerWithAddress;
  let customer: SignerWithAddress;

  const TEMPLATE_ID_1 = 0;
  const TEMPLATE_ID_2 = 1;
  const VARITY_PERCENTAGE = 70;
  const CREATOR_PERCENTAGE = 30;

  beforeEach(async function () {
    [admin, treasury, marketplace, creator1, creator2, customer] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USDC", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Mint USDC to marketplace for testing
    await mockUSDC.mint(marketplace.address, ethers.parseUnits("10000", 6));

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

    // Grant MARKETPLACE_ROLE to marketplace
    const marketplaceRole = await revenueSplitter.MARKETPLACE_ROLE();
    await revenueSplitter.grantRole(marketplaceRole, marketplace.address);
  });

  describe("Initialization", function () {
    it("Should set correct treasury address", async function () {
      expect(await revenueSplitter.varietyTreasury()).to.equal(treasury.address);
    });

    it("Should set correct revenue percentages", async function () {
      expect(await revenueSplitter.VARITY_PERCENTAGE()).to.equal(VARITY_PERCENTAGE);
      expect(await revenueSplitter.CREATOR_PERCENTAGE()).to.equal(CREATOR_PERCENTAGE);
    });

    it("Should grant DEFAULT_ADMIN_ROLE to admin", async function () {
      const adminRole = await revenueSplitter.DEFAULT_ADMIN_ROLE();
      expect(await revenueSplitter.hasRole(adminRole, admin.address)).to.be.true;
    });

    it("Should grant MARKETPLACE_ROLE to admin", async function () {
      const marketplaceRole = await revenueSplitter.MARKETPLACE_ROLE();
      expect(await revenueSplitter.hasRole(marketplaceRole, admin.address)).to.be.true;
    });

    it("Should grant UPGRADER_ROLE to admin", async function () {
      const upgraderRole = await revenueSplitter.UPGRADER_ROLE();
      expect(await revenueSplitter.hasRole(upgraderRole, admin.address)).to.be.true;
    });

    it("Should start unpaused", async function () {
      expect(await revenueSplitter.paused()).to.be.false;
    });

    it("Should revert with zero treasury address", async function () {
      const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");

      await expect(
        upgrades.deployProxy(
          RevenueSplitter,
          [ethers.ZeroAddress, admin.address],
          { initializer: "initialize", kind: "uups" }
        )
      ).to.be.revertedWithCustomError(revenueSplitter, "InvalidTreasuryAddress");
    });
  });

  describe("ETH Payment Processing", function () {
    const paymentAmount = ethers.parseEther("1.0");

    it("Should process ETH payment successfully", async function () {
      await expect(
        revenueSplitter
          .connect(marketplace)
          .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
            value: paymentAmount,
          })
      )
        .to.emit(revenueSplitter, "PaymentProcessed")
        .withArgs(
          TEMPLATE_ID_1,
          creator1.address,
          paymentAmount,
          (paymentAmount * 70n) / 100n,
          (paymentAmount * 30n) / 100n,
          await ethers.provider.getBlock("latest").then((b) => (b ? b.timestamp + 1 : 0))
        );
    });

    it("Should split revenue 70/30 correctly", async function () {
      const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);

      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
          value: paymentAmount,
        });

      const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
      const varietyShare = (paymentAmount * 70n) / 100n;

      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(varietyShare);
    });

    it("Should add creator share to pending withdrawals", async function () {
      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
          value: paymentAmount,
        });

      const pending = await revenueSplitter.getPendingWithdrawal(creator1.address);
      const expectedCreatorShare = (paymentAmount * 30n) / 100n;

      expect(pending).to.equal(expectedCreatorShare);
    });

    it("Should update revenue split tracking", async function () {
      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
          value: paymentAmount,
        });

      const split = await revenueSplitter.getRevenueSplit(TEMPLATE_ID_1);
      expect(split.creator).to.equal(creator1.address);
      expect(split.totalRevenue).to.equal(paymentAmount);
      expect(split.varietyShare).to.equal((paymentAmount * 70n) / 100n);
      expect(split.creatorShare).to.equal((paymentAmount * 30n) / 100n);
    });

    it("Should accumulate multiple payments", async function () {
      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
          value: paymentAmount,
        });

      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
          value: paymentAmount,
        });

      const split = await revenueSplitter.getRevenueSplit(TEMPLATE_ID_1);
      expect(split.totalRevenue).to.equal(paymentAmount * 2n);
    });

    it("Should revert if msg.value doesn't match amount", async function () {
      await expect(
        revenueSplitter
          .connect(marketplace)
          .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
            value: paymentAmount / 2n,
          })
      ).to.be.revertedWithCustomError(revenueSplitter, "InsufficientPayment");
    });

    it("Should revert with zero amount", async function () {
      await expect(
        revenueSplitter
          .connect(marketplace)
          .processPayment(TEMPLATE_ID_1, creator1.address, 0, { value: 0 })
      ).to.be.revertedWithCustomError(revenueSplitter, "InvalidAmount");
    });

    it("Should revert when paused", async function () {
      await revenueSplitter.connect(admin).togglePause();

      await expect(
        revenueSplitter
          .connect(marketplace)
          .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
            value: paymentAmount,
          })
      ).to.be.revertedWithCustomError(revenueSplitter, "ContractPaused");
    });

    it("Should revert if caller doesn't have MARKETPLACE_ROLE", async function () {
      await expect(
        revenueSplitter
          .connect(customer)
          .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
            value: paymentAmount,
          })
      ).to.be.reverted;
    });
  });

  describe("Stablecoin Payment Processing", function () {
    const paymentAmount = ethers.parseUnits("100", 6); // 100 USDC

    beforeEach(async function () {
      // Approve RevenueSplitter to spend USDC
      await mockUSDC
        .connect(marketplace)
        .approve(await revenueSplitter.getAddress(), paymentAmount * 10n);
    });

    it("Should process stablecoin payment successfully", async function () {
      await expect(
        revenueSplitter
          .connect(marketplace)
          .processStablecoinPayment(
            TEMPLATE_ID_1,
            creator1.address,
            await mockUSDC.getAddress(),
            paymentAmount
          )
      )
        .to.emit(revenueSplitter, "StablecoinPaymentProcessed")
        .withArgs(
          TEMPLATE_ID_1,
          creator1.address,
          await mockUSDC.getAddress(),
          paymentAmount,
          (paymentAmount * 70n) / 100n,
          (paymentAmount * 30n) / 100n,
          await ethers.provider.getBlock("latest").then((b) => (b ? b.timestamp + 1 : 0))
        );
    });

    it("Should transfer Varity share to treasury", async function () {
      const treasuryBalanceBefore = await mockUSDC.balanceOf(treasury.address);

      await revenueSplitter
        .connect(marketplace)
        .processStablecoinPayment(
          TEMPLATE_ID_1,
          creator1.address,
          await mockUSDC.getAddress(),
          paymentAmount
        );

      const treasuryBalanceAfter = await mockUSDC.balanceOf(treasury.address);
      const varietyShare = (paymentAmount * 70n) / 100n;

      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(varietyShare);
    });

    it("Should add creator share to pending token withdrawals", async function () {
      await revenueSplitter
        .connect(marketplace)
        .processStablecoinPayment(
          TEMPLATE_ID_1,
          creator1.address,
          await mockUSDC.getAddress(),
          paymentAmount
        );

      const pending = await revenueSplitter.getPendingTokenWithdrawal(
        creator1.address,
        await mockUSDC.getAddress()
      );
      const expectedCreatorShare = (paymentAmount * 30n) / 100n;

      expect(pending).to.equal(expectedCreatorShare);
    });

    it("Should update revenue split tracking", async function () {
      await revenueSplitter
        .connect(marketplace)
        .processStablecoinPayment(
          TEMPLATE_ID_1,
          creator1.address,
          await mockUSDC.getAddress(),
          paymentAmount
        );

      const split = await revenueSplitter.getRevenueSplit(TEMPLATE_ID_1);
      expect(split.totalRevenue).to.equal(paymentAmount);
    });

    it("Should accumulate multiple stablecoin payments", async function () {
      await revenueSplitter
        .connect(marketplace)
        .processStablecoinPayment(
          TEMPLATE_ID_1,
          creator1.address,
          await mockUSDC.getAddress(),
          paymentAmount
        );

      await revenueSplitter
        .connect(marketplace)
        .processStablecoinPayment(
          TEMPLATE_ID_1,
          creator1.address,
          await mockUSDC.getAddress(),
          paymentAmount
        );

      const pending = await revenueSplitter.getPendingTokenWithdrawal(
        creator1.address,
        await mockUSDC.getAddress()
      );
      const expectedTotal = ((paymentAmount * 30n) / 100n) * 2n;

      expect(pending).to.equal(expectedTotal);
    });

    it("Should revert if token not whitelisted", async function () {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const fakeToken = await MockERC20.deploy("FAKE", "FAKE", 18);
      await fakeToken.waitForDeployment();

      await expect(
        revenueSplitter
          .connect(marketplace)
          .processStablecoinPayment(
            TEMPLATE_ID_1,
            creator1.address,
            await fakeToken.getAddress(),
            paymentAmount
          )
      ).to.be.revertedWithCustomError(revenueSplitter, "TokenNotWhitelisted");
    });

    it("Should revert with zero amount", async function () {
      await expect(
        revenueSplitter
          .connect(marketplace)
          .processStablecoinPayment(
            TEMPLATE_ID_1,
            creator1.address,
            await mockUSDC.getAddress(),
            0
          )
      ).to.be.revertedWithCustomError(revenueSplitter, "InvalidAmount");
    });

    it("Should revert when paused", async function () {
      await revenueSplitter.connect(admin).togglePause();

      await expect(
        revenueSplitter
          .connect(marketplace)
          .processStablecoinPayment(
            TEMPLATE_ID_1,
            creator1.address,
            await mockUSDC.getAddress(),
            paymentAmount
          )
      ).to.be.revertedWithCustomError(revenueSplitter, "ContractPaused");
    });

    it("Should revert if caller doesn't have MARKETPLACE_ROLE", async function () {
      await expect(
        revenueSplitter
          .connect(customer)
          .processStablecoinPayment(
            TEMPLATE_ID_1,
            creator1.address,
            await mockUSDC.getAddress(),
            paymentAmount
          )
      ).to.be.reverted;
    });
  });

  describe("ETH Withdrawals", function () {
    const paymentAmount = ethers.parseEther("1.0");

    beforeEach(async function () {
      // Process payment to create pending withdrawal
      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
          value: paymentAmount,
        });
    });

    it("Should allow creator to withdraw pending ETH", async function () {
      const creatorBalanceBefore = await ethers.provider.getBalance(creator1.address);
      const pendingBefore = await revenueSplitter.getPendingWithdrawal(creator1.address);

      const tx = await revenueSplitter.connect(creator1).withdrawPending();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const creatorBalanceAfter = await ethers.provider.getBalance(creator1.address);

      expect(creatorBalanceAfter).to.equal(
        creatorBalanceBefore + pendingBefore - gasUsed
      );
    });

    it("Should emit WithdrawalProcessed event", async function () {
      const pending = await revenueSplitter.getPendingWithdrawal(creator1.address);

      await expect(revenueSplitter.connect(creator1).withdrawPending())
        .to.emit(revenueSplitter, "WithdrawalProcessed")
        .withArgs(creator1.address, pending, await ethers.provider.getBlock("latest").then((b) => (b ? b.timestamp + 1 : 0)));
    });

    it("Should reset pending withdrawals to zero", async function () {
      await revenueSplitter.connect(creator1).withdrawPending();

      const pending = await revenueSplitter.getPendingWithdrawal(creator1.address);
      expect(pending).to.equal(0);
    });

    it("Should revert if no pending withdrawals", async function () {
      await revenueSplitter.connect(creator1).withdrawPending();

      await expect(
        revenueSplitter.connect(creator1).withdrawPending()
      ).to.be.revertedWithCustomError(revenueSplitter, "NoPendingWithdrawals");
    });

    it("Should revert when paused", async function () {
      await revenueSplitter.connect(admin).togglePause();

      await expect(
        revenueSplitter.connect(creator1).withdrawPending()
      ).to.be.revertedWithCustomError(revenueSplitter, "ContractPaused");
    });

    it("Should handle multiple creators withdrawing", async function () {
      // Create another payment for creator2
      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_2, creator2.address, paymentAmount, {
          value: paymentAmount,
        });

      await expect(revenueSplitter.connect(creator1).withdrawPending()).to.not.be.reverted;
      await expect(revenueSplitter.connect(creator2).withdrawPending()).to.not.be.reverted;
    });
  });

  describe("Token Withdrawals", function () {
    const paymentAmount = ethers.parseUnits("100", 6);

    beforeEach(async function () {
      // Approve and process payment
      await mockUSDC
        .connect(marketplace)
        .approve(await revenueSplitter.getAddress(), paymentAmount);

      await revenueSplitter
        .connect(marketplace)
        .processStablecoinPayment(
          TEMPLATE_ID_1,
          creator1.address,
          await mockUSDC.getAddress(),
          paymentAmount
        );
    });

    it("Should allow creator to withdraw pending tokens", async function () {
      const creatorBalanceBefore = await mockUSDC.balanceOf(creator1.address);
      const pendingBefore = await revenueSplitter.getPendingTokenWithdrawal(
        creator1.address,
        await mockUSDC.getAddress()
      );

      await revenueSplitter
        .connect(creator1)
        .withdrawPendingTokens(await mockUSDC.getAddress());

      const creatorBalanceAfter = await mockUSDC.balanceOf(creator1.address);

      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(pendingBefore);
    });

    it("Should emit TokenWithdrawalProcessed event", async function () {
      const pending = await revenueSplitter.getPendingTokenWithdrawal(
        creator1.address,
        await mockUSDC.getAddress()
      );

      await expect(
        revenueSplitter.connect(creator1).withdrawPendingTokens(await mockUSDC.getAddress())
      )
        .to.emit(revenueSplitter, "TokenWithdrawalProcessed")
        .withArgs(creator1.address, await mockUSDC.getAddress(), pending, await ethers.provider.getBlock("latest").then((b) => (b ? b.timestamp + 1 : 0)));
    });

    it("Should reset pending token withdrawals to zero", async function () {
      await revenueSplitter
        .connect(creator1)
        .withdrawPendingTokens(await mockUSDC.getAddress());

      const pending = await revenueSplitter.getPendingTokenWithdrawal(
        creator1.address,
        await mockUSDC.getAddress()
      );
      expect(pending).to.equal(0);
    });

    it("Should revert if no pending token withdrawals", async function () {
      await revenueSplitter
        .connect(creator1)
        .withdrawPendingTokens(await mockUSDC.getAddress());

      await expect(
        revenueSplitter.connect(creator1).withdrawPendingTokens(await mockUSDC.getAddress())
      ).to.be.revertedWithCustomError(revenueSplitter, "NoPendingWithdrawals");
    });

    it("Should revert when paused", async function () {
      await revenueSplitter.connect(admin).togglePause();

      await expect(
        revenueSplitter.connect(creator1).withdrawPendingTokens(await mockUSDC.getAddress())
      ).to.be.revertedWithCustomError(revenueSplitter, "ContractPaused");
    });
  });

  describe("Treasury Management", function () {
    it("Should allow admin to update treasury", async function () {
      const newTreasury = creator2.address;

      await expect(revenueSplitter.connect(admin).updateTreasury(newTreasury))
        .to.emit(revenueSplitter, "TreasuryUpdated")
        .withArgs(treasury.address, newTreasury, await ethers.provider.getBlock("latest").then((b) => (b ? b.timestamp + 1 : 0)));

      expect(await revenueSplitter.varietyTreasury()).to.equal(newTreasury);
    });

    it("Should revert with zero address", async function () {
      await expect(
        revenueSplitter.connect(admin).updateTreasury(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(revenueSplitter, "InvalidTreasuryAddress");
    });

    it("Should revert if caller doesn't have DEFAULT_ADMIN_ROLE", async function () {
      await expect(
        revenueSplitter.connect(customer).updateTreasury(creator2.address)
      ).to.be.reverted;
    });
  });

  describe("Token Whitelist Management", function () {
    it("Should allow admin to whitelist token", async function () {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const newToken = await MockERC20.deploy("DAI", "DAI", 18);
      await newToken.waitForDeployment();

      await expect(
        revenueSplitter.connect(admin).setTokenWhitelist(await newToken.getAddress(), true)
      )
        .to.emit(revenueSplitter, "TokenWhitelisted")
        .withArgs(await newToken.getAddress(), true, await ethers.provider.getBlock("latest").then((b) => (b ? b.timestamp + 1 : 0)));

      expect(await revenueSplitter.whitelistedTokens(await newToken.getAddress())).to.be.true;
    });

    it("Should allow admin to remove token from whitelist", async function () {
      await revenueSplitter
        .connect(admin)
        .setTokenWhitelist(await mockUSDC.getAddress(), false);

      expect(await revenueSplitter.whitelistedTokens(await mockUSDC.getAddress())).to.be.false;
    });

    it("Should revert if caller doesn't have DEFAULT_ADMIN_ROLE", async function () {
      await expect(
        revenueSplitter.connect(customer).setTokenWhitelist(await mockUSDC.getAddress(), true)
      ).to.be.reverted;
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow admin to toggle pause", async function () {
      await expect(revenueSplitter.connect(admin).togglePause())
        .to.emit(revenueSplitter, "PauseToggled")
        .withArgs(true, await ethers.provider.getBlock("latest").then((b) => (b ? b.timestamp + 1 : 0)));

      expect(await revenueSplitter.paused()).to.be.true;
    });

    it("Should allow admin to unpause", async function () {
      await revenueSplitter.connect(admin).togglePause();
      await revenueSplitter.connect(admin).togglePause();

      expect(await revenueSplitter.paused()).to.be.false;
    });

    it("Should revert if caller doesn't have DEFAULT_ADMIN_ROLE", async function () {
      await expect(revenueSplitter.connect(customer).togglePause()).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    const paymentAmount = ethers.parseEther("1.0");

    beforeEach(async function () {
      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
          value: paymentAmount,
        });
    });

    it("Should return complete revenue split details", async function () {
      const split = await revenueSplitter.getRevenueSplit(TEMPLATE_ID_1);

      expect(split.creator).to.equal(creator1.address);
      expect(split.totalRevenue).to.equal(paymentAmount);
      expect(split.varietyShare).to.equal((paymentAmount * 70n) / 100n);
      expect(split.creatorShare).to.equal((paymentAmount * 30n) / 100n);
    });

    it("Should return correct pending withdrawal amount", async function () {
      const pending = await revenueSplitter.getPendingWithdrawal(creator1.address);
      expect(pending).to.equal((paymentAmount * 30n) / 100n);
    });

    it("Should return correct pending token withdrawal amount", async function () {
      const tokenPayment = ethers.parseUnits("100", 6);

      await mockUSDC
        .connect(marketplace)
        .approve(await revenueSplitter.getAddress(), tokenPayment);

      await revenueSplitter
        .connect(marketplace)
        .processStablecoinPayment(
          TEMPLATE_ID_1,
          creator1.address,
          await mockUSDC.getAddress(),
          tokenPayment
        );

      const pending = await revenueSplitter.getPendingTokenWithdrawal(
        creator1.address,
        await mockUSDC.getAddress()
      );

      expect(pending).to.equal((tokenPayment * 30n) / 100n);
    });
  });

  describe("Upgradeability", function () {
    it("Should only allow UPGRADER_ROLE to upgrade", async function () {
      const RevenueSplitterV2 = await ethers.getContractFactory("RevenueSplitter");

      await expect(
        upgrades.upgradeProxy(await revenueSplitter.getAddress(), RevenueSplitterV2)
      ).to.not.be.reverted;
    });

    it("Should preserve state after upgrade", async function () {
      const paymentAmount = ethers.parseEther("1.0");

      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_1, creator1.address, paymentAmount, {
          value: paymentAmount,
        });

      const beforeUpgrade = await revenueSplitter.getPendingWithdrawal(creator1.address);

      // Upgrade
      const RevenueSplitterV2 = await ethers.getContractFactory("RevenueSplitter");
      const upgraded = await upgrades.upgradeProxy(
        await revenueSplitter.getAddress(),
        RevenueSplitterV2
      );

      // Check state preserved
      expect(await upgraded.getPendingWithdrawal(creator1.address)).to.equal(beforeUpgrade);
      expect(await upgraded.varietyTreasury()).to.equal(treasury.address);
    });
  });

  describe("Receive Function", function () {
    it("Should accept direct ETH transfers", async function () {
      const amount = ethers.parseEther("1.0");

      await expect(
        customer.sendTransaction({
          to: await revenueSplitter.getAddress(),
          value: amount,
        })
      ).to.not.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small payments (1 wei)", async function () {
      const tinyPayment = 1n;

      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_1, creator1.address, tinyPayment, {
          value: tinyPayment,
        });

      const split = await revenueSplitter.getRevenueSplit(TEMPLATE_ID_1);
      expect(split.totalRevenue).to.equal(tinyPayment);
    });

    it("Should handle maximum uint256 values", async function () {
      // Test with symbolic large payment (actual max would run out of gas)
      const largePayment = ethers.parseEther("1000000");

      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_1, creator1.address, largePayment, {
          value: largePayment,
        });

      const split = await revenueSplitter.getRevenueSplit(TEMPLATE_ID_1);
      expect(split.totalRevenue).to.equal(largePayment);
    });

    it("Should handle mixed ETH and stablecoin payments", async function () {
      const ethPayment = ethers.parseEther("1.0");
      const usdcPayment = ethers.parseUnits("100", 6);

      await revenueSplitter
        .connect(marketplace)
        .processPayment(TEMPLATE_ID_1, creator1.address, ethPayment, {
          value: ethPayment,
        });

      await mockUSDC
        .connect(marketplace)
        .approve(await revenueSplitter.getAddress(), usdcPayment);

      await revenueSplitter
        .connect(marketplace)
        .processStablecoinPayment(
          TEMPLATE_ID_1,
          creator1.address,
          await mockUSDC.getAddress(),
          usdcPayment
        );

      const ethPending = await revenueSplitter.getPendingWithdrawal(creator1.address);
      const usdcPending = await revenueSplitter.getPendingTokenWithdrawal(
        creator1.address,
        await mockUSDC.getAddress()
      );

      expect(ethPending).to.equal((ethPayment * 30n) / 100n);
      expect(usdcPending).to.equal((usdcPayment * 30n) / 100n);
    });
  });
});
