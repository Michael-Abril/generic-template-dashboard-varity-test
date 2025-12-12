import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("MockUSDC", function () {
  let mockUSDC: any;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const DECIMALS = 6;
  const INITIAL_SUPPLY = 1000000; // 1,000,000 USDC
  const FAUCET_AMOUNT = ethers.parseUnits("1000", DECIMALS); // 1000 USDC
  const FAUCET_COOLDOWN = 24 * 60 * 60; // 1 day in seconds

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy MockUSDC with initial supply
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy(INITIAL_SUPPLY);
    await mockUSDC.waitForDeployment();
  });

  describe("Initialization", function () {
    it("Should set correct name and symbol", async function () {
      expect(await mockUSDC.name()).to.equal("USD Coin");
      expect(await mockUSDC.symbol()).to.equal("USDC");
    });

    it("Should set correct decimals (6)", async function () {
      expect(await mockUSDC.decimals()).to.equal(DECIMALS);
    });

    it("Should mint initial supply to deployer", async function () {
      const expectedSupply = ethers.parseUnits(INITIAL_SUPPLY.toString(), DECIMALS);
      const ownerBalance = await mockUSDC.balanceOf(owner.address);
      expect(ownerBalance).to.equal(expectedSupply);
    });

    it("Should set correct faucet amount constant", async function () {
      expect(await mockUSDC.FAUCET_AMOUNT()).to.equal(FAUCET_AMOUNT);
    });

    it("Should set correct faucet cooldown constant", async function () {
      expect(await mockUSDC.FAUCET_COOLDOWN()).to.equal(FAUCET_COOLDOWN);
    });

    it("Should set deployer as owner", async function () {
      expect(await mockUSDC.owner()).to.equal(owner.address);
    });
  });

  describe("ERC20 Standard Functions", function () {
    describe("Transfer", function () {
      it("Should transfer tokens successfully", async function () {
        const amount = ethers.parseUnits("100", DECIMALS);

        await expect(mockUSDC.connect(owner).transfer(user1.address, amount))
          .to.changeTokenBalances(mockUSDC, [owner, user1], [-amount, amount]);
      });

      it("Should emit Transfer event", async function () {
        const amount = ethers.parseUnits("100", DECIMALS);

        await expect(mockUSDC.connect(owner).transfer(user1.address, amount))
          .to.emit(mockUSDC, "Transfer")
          .withArgs(owner.address, user1.address, amount);
      });

      it("Should revert with insufficient balance", async function () {
        const amount = ethers.parseUnits("1000000", DECIMALS);

        await expect(
          mockUSDC.connect(user1).transfer(user2.address, amount)
        ).to.be.reverted;
      });

      it("Should allow zero amount transfer", async function () {
        await expect(mockUSDC.connect(owner).transfer(user1.address, 0)).to.not.be.reverted;
      });

      it("Should handle max uint256 amount correctly", async function () {
        const maxAmount = ethers.MaxUint256;
        const ownerBalance = await mockUSDC.balanceOf(owner.address);

        // Should revert if trying to transfer more than balance
        await expect(
          mockUSDC.connect(owner).transfer(user1.address, maxAmount)
        ).to.be.reverted;
      });
    });

    describe("Approve & Allowance", function () {
      it("Should approve spender successfully", async function () {
        const amount = ethers.parseUnits("500", DECIMALS);

        await mockUSDC.connect(owner).approve(user1.address, amount);

        expect(await mockUSDC.allowance(owner.address, user1.address)).to.equal(amount);
      });

      it("Should emit Approval event", async function () {
        const amount = ethers.parseUnits("500", DECIMALS);

        await expect(mockUSDC.connect(owner).approve(user1.address, amount))
          .to.emit(mockUSDC, "Approval")
          .withArgs(owner.address, user1.address, amount);
      });

      it("Should allow changing approval amount", async function () {
        const amount1 = ethers.parseUnits("500", DECIMALS);
        const amount2 = ethers.parseUnits("1000", DECIMALS);

        await mockUSDC.connect(owner).approve(user1.address, amount1);
        await mockUSDC.connect(owner).approve(user1.address, amount2);

        expect(await mockUSDC.allowance(owner.address, user1.address)).to.equal(amount2);
      });

      it("Should allow zero approval", async function () {
        const amount = ethers.parseUnits("500", DECIMALS);

        await mockUSDC.connect(owner).approve(user1.address, amount);
        await mockUSDC.connect(owner).approve(user1.address, 0);

        expect(await mockUSDC.allowance(owner.address, user1.address)).to.equal(0);
      });

      it("Should handle max uint256 approval", async function () {
        const maxAmount = ethers.MaxUint256;

        await mockUSDC.connect(owner).approve(user1.address, maxAmount);

        expect(await mockUSDC.allowance(owner.address, user1.address)).to.equal(maxAmount);
      });
    });

    describe("TransferFrom", function () {
      beforeEach(async function () {
        // Transfer some tokens to user1 for testing
        const amount = ethers.parseUnits("1000", DECIMALS);
        await mockUSDC.connect(owner).transfer(user1.address, amount);
      });

      it("Should transfer tokens from approved spender", async function () {
        const amount = ethers.parseUnits("100", DECIMALS);

        await mockUSDC.connect(user1).approve(user2.address, amount);

        await expect(
          mockUSDC.connect(user2).transferFrom(user1.address, user3.address, amount)
        ).to.changeTokenBalances(mockUSDC, [user1, user3], [-amount, amount]);
      });

      it("Should emit Transfer event", async function () {
        const amount = ethers.parseUnits("100", DECIMALS);

        await mockUSDC.connect(user1).approve(user2.address, amount);

        await expect(
          mockUSDC.connect(user2).transferFrom(user1.address, user3.address, amount)
        )
          .to.emit(mockUSDC, "Transfer")
          .withArgs(user1.address, user3.address, amount);
      });

      it("Should decrease allowance after transfer", async function () {
        const amount = ethers.parseUnits("100", DECIMALS);

        await mockUSDC.connect(user1).approve(user2.address, amount);
        await mockUSDC.connect(user2).transferFrom(user1.address, user3.address, amount);

        expect(await mockUSDC.allowance(user1.address, user2.address)).to.equal(0);
      });

      it("Should revert with insufficient allowance", async function () {
        const amount = ethers.parseUnits("100", DECIMALS);

        await expect(
          mockUSDC.connect(user2).transferFrom(user1.address, user3.address, amount)
        ).to.be.reverted;
      });

      it("Should revert with insufficient balance", async function () {
        const largeAmount = ethers.parseUnits("10000", DECIMALS);

        await mockUSDC.connect(user1).approve(user2.address, largeAmount);

        await expect(
          mockUSDC.connect(user2).transferFrom(user1.address, user3.address, largeAmount)
        ).to.be.reverted;
      });

      it("Should handle max uint256 allowance without decreasing", async function () {
        const maxAmount = ethers.MaxUint256;
        const transferAmount = ethers.parseUnits("100", DECIMALS);

        await mockUSDC.connect(user1).approve(user2.address, maxAmount);
        await mockUSDC.connect(user2).transferFrom(user1.address, user3.address, transferAmount);

        // With max allowance, it shouldn't decrease (OpenZeppelin behavior)
        expect(await mockUSDC.allowance(user1.address, user2.address)).to.equal(maxAmount);
      });
    });

    describe("Balance Queries", function () {
      it("Should return correct balance", async function () {
        const expectedBalance = ethers.parseUnits(INITIAL_SUPPLY.toString(), DECIMALS);
        expect(await mockUSDC.balanceOf(owner.address)).to.equal(expectedBalance);
      });

      it("Should return zero balance for new address", async function () {
        expect(await mockUSDC.balanceOf(user1.address)).to.equal(0);
      });

      it("Should return correct total supply", async function () {
        const expectedSupply = ethers.parseUnits(INITIAL_SUPPLY.toString(), DECIMALS);
        expect(await mockUSDC.totalSupply()).to.equal(expectedSupply);
      });

      it("Should update total supply after minting", async function () {
        const mintAmount = ethers.parseUnits("1000", DECIMALS);
        const initialSupply = await mockUSDC.totalSupply();

        await mockUSDC.connect(owner).mint(user1.address, mintAmount);

        expect(await mockUSDC.totalSupply()).to.equal(initialSupply + mintAmount);
      });
    });
  });

  describe("Faucet Functionality", function () {
    describe("First Claim", function () {
      it("Should allow user to claim from faucet", async function () {
        const tx = await mockUSDC.connect(user1).faucet();
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);

        await expect(tx)
          .to.emit(mockUSDC, "FaucetUsed")
          .withArgs(user1.address, FAUCET_AMOUNT, block!.timestamp);
      });

      it("Should mint correct amount to user", async function () {
        await mockUSDC.connect(user1).faucet();

        expect(await mockUSDC.balanceOf(user1.address)).to.equal(FAUCET_AMOUNT);
      });

      it("Should update lastFaucetClaim timestamp", async function () {
        await mockUSDC.connect(user1).faucet();

        const currentTime = await time.latest();
        const lastClaim = await mockUSDC.lastFaucetClaim(user1.address);

        expect(lastClaim).to.be.closeTo(currentTime, 2);
      });

      it("Should increase total supply", async function () {
        const initialSupply = await mockUSDC.totalSupply();

        await mockUSDC.connect(user1).faucet();

        expect(await mockUSDC.totalSupply()).to.equal(initialSupply + FAUCET_AMOUNT);
      });

      it("Should allow multiple users to claim", async function () {
        await mockUSDC.connect(user1).faucet();
        await mockUSDC.connect(user2).faucet();
        await mockUSDC.connect(user3).faucet();

        expect(await mockUSDC.balanceOf(user1.address)).to.equal(FAUCET_AMOUNT);
        expect(await mockUSDC.balanceOf(user2.address)).to.equal(FAUCET_AMOUNT);
        expect(await mockUSDC.balanceOf(user3.address)).to.equal(FAUCET_AMOUNT);
      });
    });

    describe("Cooldown Period", function () {
      beforeEach(async function () {
        // User1 claims from faucet
        await mockUSDC.connect(user1).faucet();
      });

      it("Should revert if claiming before cooldown period", async function () {
        await expect(mockUSDC.connect(user1).faucet()).to.be.revertedWithCustomError(
          mockUSDC,
          "FaucetCooldownActive"
        );
      });

      it("Should allow claiming after cooldown period", async function () {
        // Fast forward 1 day + 1 second
        await time.increase(FAUCET_COOLDOWN + 1);

        await expect(mockUSDC.connect(user1).faucet()).to.not.be.reverted;
      });

      it("Should allow claiming exactly after cooldown period", async function () {
        // Fast forward exactly 1 day
        await time.increase(FAUCET_COOLDOWN);

        await expect(mockUSDC.connect(user1).faucet()).to.not.be.reverted;
      });

      it("Should increment balance with second claim", async function () {
        const balanceAfterFirst = await mockUSDC.balanceOf(user1.address);

        await time.increase(FAUCET_COOLDOWN + 1);
        await mockUSDC.connect(user1).faucet();

        expect(await mockUSDC.balanceOf(user1.address)).to.equal(
          balanceAfterFirst + FAUCET_AMOUNT
        );
      });

      it("Should update lastFaucetClaim after second claim", async function () {
        await time.increase(FAUCET_COOLDOWN + 1);

        const timeBeforeClaim = await time.latest();
        await mockUSDC.connect(user1).faucet();
        const lastClaim = await mockUSDC.lastFaucetClaim(user1.address);

        expect(lastClaim).to.be.closeTo(timeBeforeClaim + 1, 2);
      });

      it("Should allow multiple claims over time", async function () {
        // Claim 1 (already done in beforeEach)
        expect(await mockUSDC.balanceOf(user1.address)).to.equal(FAUCET_AMOUNT);

        // Claim 2
        await time.increase(FAUCET_COOLDOWN + 1);
        await mockUSDC.connect(user1).faucet();
        expect(await mockUSDC.balanceOf(user1.address)).to.equal(FAUCET_AMOUNT * 2n);

        // Claim 3
        await time.increase(FAUCET_COOLDOWN + 1);
        await mockUSDC.connect(user1).faucet();
        expect(await mockUSDC.balanceOf(user1.address)).to.equal(FAUCET_AMOUNT * 3n);
      });
    });

    describe("View Functions", function () {
      describe("canClaimFaucet", function () {
        it("Should return true for first claim", async function () {
          const [canClaim, cooldownEnds] = await mockUSDC.canClaimFaucet(user1.address);

          expect(canClaim).to.be.true;
          expect(cooldownEnds).to.equal(0);
        });

        it("Should return false during cooldown", async function () {
          await mockUSDC.connect(user1).faucet();

          const [canClaim, cooldownEnds] = await mockUSDC.canClaimFaucet(user1.address);

          expect(canClaim).to.be.false;
          expect(cooldownEnds).to.be.gt(0);
        });

        it("Should return true after cooldown", async function () {
          await mockUSDC.connect(user1).faucet();
          await time.increase(FAUCET_COOLDOWN + 1);

          const [canClaim, cooldownEnds] = await mockUSDC.canClaimFaucet(user1.address);

          expect(canClaim).to.be.true;
          expect(cooldownEnds).to.equal(0);
        });

        it("Should return correct cooldownEnds timestamp", async function () {
          const currentTime = await time.latest();
          await mockUSDC.connect(user1).faucet();

          const [, cooldownEnds] = await mockUSDC.canClaimFaucet(user1.address);
          const expectedCooldownEnd = currentTime + 1 + FAUCET_COOLDOWN;

          expect(cooldownEnds).to.be.closeTo(expectedCooldownEnd, 2);
        });
      });

      describe("timeUntilNextClaim", function () {
        it("Should return 0 for first claim", async function () {
          expect(await mockUSDC.timeUntilNextClaim(user1.address)).to.equal(0);
        });

        it("Should return correct time remaining", async function () {
          await mockUSDC.connect(user1).faucet();

          const timeRemaining = await mockUSDC.timeUntilNextClaim(user1.address);

          expect(timeRemaining).to.be.closeTo(FAUCET_COOLDOWN, 2);
        });

        it("Should decrease over time", async function () {
          await mockUSDC.connect(user1).faucet();

          const time1 = await mockUSDC.timeUntilNextClaim(user1.address);

          await time.increase(3600); // 1 hour

          const time2 = await mockUSDC.timeUntilNextClaim(user1.address);

          expect(time2).to.be.lt(time1);
        });

        it("Should return 0 after cooldown", async function () {
          await mockUSDC.connect(user1).faucet();
          await time.increase(FAUCET_COOLDOWN + 1);

          expect(await mockUSDC.timeUntilNextClaim(user1.address)).to.equal(0);
        });

        it("Should return 0 exactly at cooldown end", async function () {
          await mockUSDC.connect(user1).faucet();
          await time.increase(FAUCET_COOLDOWN);

          expect(await mockUSDC.timeUntilNextClaim(user1.address)).to.equal(0);
        });
      });
    });
  });

  describe("Mint Function (Owner Only)", function () {
    it("Should allow owner to mint tokens", async function () {
      const amount = ethers.parseUnits("5000", DECIMALS);

      await mockUSDC.connect(owner).mint(user1.address, amount);

      expect(await mockUSDC.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should emit TokensMinted event", async function () {
      const amount = ethers.parseUnits("5000", DECIMALS);

      await expect(mockUSDC.connect(owner).mint(user1.address, amount))
        .to.emit(mockUSDC, "TokensMinted")
        .withArgs(user1.address, amount, await time.latest() + 1);
    });

    it("Should emit Transfer event", async function () {
      const amount = ethers.parseUnits("5000", DECIMALS);

      await expect(mockUSDC.connect(owner).mint(user1.address, amount))
        .to.emit(mockUSDC, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, amount);
    });

    it("Should increase total supply", async function () {
      const amount = ethers.parseUnits("5000", DECIMALS);
      const initialSupply = await mockUSDC.totalSupply();

      await mockUSDC.connect(owner).mint(user1.address, amount);

      expect(await mockUSDC.totalSupply()).to.equal(initialSupply + amount);
    });

    it("Should allow minting to multiple addresses", async function () {
      const amount = ethers.parseUnits("5000", DECIMALS);

      await mockUSDC.connect(owner).mint(user1.address, amount);
      await mockUSDC.connect(owner).mint(user2.address, amount);
      await mockUSDC.connect(owner).mint(user3.address, amount);

      expect(await mockUSDC.balanceOf(user1.address)).to.equal(amount);
      expect(await mockUSDC.balanceOf(user2.address)).to.equal(amount);
      expect(await mockUSDC.balanceOf(user3.address)).to.equal(amount);
    });

    it("Should allow minting zero amount", async function () {
      await expect(mockUSDC.connect(owner).mint(user1.address, 0)).to.not.be.reverted;
    });

    it("Should revert if non-owner tries to mint", async function () {
      const amount = ethers.parseUnits("5000", DECIMALS);

      await expect(
        mockUSDC.connect(user1).mint(user2.address, amount)
      ).to.be.revertedWithCustomError(mockUSDC, "OwnableUnauthorizedAccount");
    });

    it("Should allow minting large amounts", async function () {
      const largeAmount = ethers.parseUnits("1000000000", DECIMALS); // 1 billion USDC

      await mockUSDC.connect(owner).mint(user1.address, largeAmount);

      expect(await mockUSDC.balanceOf(user1.address)).to.equal(largeAmount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle simultaneous faucet claims from different users", async function () {
      await mockUSDC.connect(user1).faucet();
      await mockUSDC.connect(user2).faucet();
      await mockUSDC.connect(user3).faucet();

      expect(await mockUSDC.balanceOf(user1.address)).to.equal(FAUCET_AMOUNT);
      expect(await mockUSDC.balanceOf(user2.address)).to.equal(FAUCET_AMOUNT);
      expect(await mockUSDC.balanceOf(user3.address)).to.equal(FAUCET_AMOUNT);
    });

    it("Should handle transfers with exact 6 decimals", async function () {
      const amount = 123456; // 0.123456 USDC (6 decimals)

      await mockUSDC.connect(owner).transfer(user1.address, amount);

      expect(await mockUSDC.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should handle very small amounts (1 unit)", async function () {
      await mockUSDC.connect(owner).transfer(user1.address, 1);

      expect(await mockUSDC.balanceOf(user1.address)).to.equal(1);
    });

    it("Should correctly handle 6 decimals vs 18 decimals difference", async function () {
      // This is critical for USDC integration
      const oneUSDC = ethers.parseUnits("1", 6); // 1,000,000 (6 decimals)
      const oneETH = ethers.parseUnits("1", 18); // 1,000,000,000,000,000,000 (18 decimals)

      expect(oneUSDC).to.equal(1000000n);
      expect(oneETH).to.equal(1000000000000000000n);
      expect(oneETH / oneUSDC).to.equal(1000000000000n);
    });

    it("Should handle faucet claim exactly at cooldown boundary", async function () {
      await mockUSDC.connect(user1).faucet();

      // Fast forward to exactly cooldown end
      await time.increase(FAUCET_COOLDOWN);

      await expect(mockUSDC.connect(user1).faucet()).to.not.be.reverted;
    });

    it("Should handle multiple mints to same address", async function () {
      const amount = ethers.parseUnits("100", DECIMALS);

      await mockUSDC.connect(owner).mint(user1.address, amount);
      await mockUSDC.connect(owner).mint(user1.address, amount);
      await mockUSDC.connect(owner).mint(user1.address, amount);

      expect(await mockUSDC.balanceOf(user1.address)).to.equal(amount * 3n);
    });

    it("Should handle transfer to self", async function () {
      const amount = ethers.parseUnits("100", DECIMALS);
      const initialBalance = await mockUSDC.balanceOf(owner.address);

      await mockUSDC.connect(owner).transfer(owner.address, amount);

      expect(await mockUSDC.balanceOf(owner.address)).to.equal(initialBalance);
    });

    it("Should handle zero address queries", async function () {
      expect(await mockUSDC.balanceOf(ethers.ZeroAddress)).to.equal(0);
    });
  });

  describe("Integration with Other Contracts", function () {
    it("Should work correctly with approve + transferFrom pattern", async function () {
      const amount = ethers.parseUnits("1000", DECIMALS);

      // Owner transfers to user1
      await mockUSDC.connect(owner).transfer(user1.address, amount);

      // User1 approves user2 to spend
      await mockUSDC.connect(user1).approve(user2.address, amount);

      // User2 transfers from user1 to user3
      await mockUSDC.connect(user2).transferFrom(user1.address, user3.address, amount);

      expect(await mockUSDC.balanceOf(user1.address)).to.equal(0);
      expect(await mockUSDC.balanceOf(user3.address)).to.equal(amount);
      expect(await mockUSDC.allowance(user1.address, user2.address)).to.equal(0);
    });

    it("Should maintain correct accounting across multiple operations", async function () {
      const faucetUser = user1;
      const mintUser = user2;
      const transferUser = user3;

      // Faucet claim
      await mockUSDC.connect(faucetUser).faucet();

      // Mint
      const mintAmount = ethers.parseUnits("2000", DECIMALS);
      await mockUSDC.connect(owner).mint(mintUser.address, mintAmount);

      // Transfer
      const transferAmount = ethers.parseUnits("500", DECIMALS);
      await mockUSDC.connect(owner).transfer(transferUser.address, transferAmount);

      // Verify balances
      expect(await mockUSDC.balanceOf(faucetUser.address)).to.equal(FAUCET_AMOUNT);
      expect(await mockUSDC.balanceOf(mintUser.address)).to.equal(mintAmount);
      expect(await mockUSDC.balanceOf(transferUser.address)).to.equal(transferAmount);

      // Verify total supply
      const initialSupply = ethers.parseUnits(INITIAL_SUPPLY.toString(), DECIMALS);
      const expectedSupply = initialSupply + FAUCET_AMOUNT + mintAmount;
      expect(await mockUSDC.totalSupply()).to.equal(expectedSupply);
    });
  });
});
