import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SubscriptionBilling", function () {
  let subscriptionBilling: any;
  let admin: SignerWithAddress;
  let marketplace: SignerWithAddress;
  let customer1: SignerWithAddress;
  let customer2: SignerWithAddress;

  const TEMPLATE_ID_1 = 0;
  const TEMPLATE_ID_2 = 1;
  const DURATION_1_MONTH = 1;
  const DURATION_3_MONTHS = 3;
  const DURATION_12_MONTHS = 12;
  const SECONDS_PER_MONTH = 30 * 24 * 60 * 60; // 30 days

  beforeEach(async function () {
    [admin, marketplace, customer1, customer2] = await ethers.getSigners();

    // Deploy SubscriptionBilling
    const SubscriptionBilling = await ethers.getContractFactory("SubscriptionBilling");
    subscriptionBilling = await upgrades.deployProxy(
      SubscriptionBilling,
      [admin.address],
      { initializer: "initialize", kind: "uups" }
    );
    await subscriptionBilling.waitForDeployment();

    // Grant MARKETPLACE_ROLE to marketplace
    const marketplaceRole = await subscriptionBilling.MARKETPLACE_ROLE();
    await subscriptionBilling.grantRole(marketplaceRole, marketplace.address);
  });

  describe("Initialization", function () {
    it("Should grant DEFAULT_ADMIN_ROLE to admin", async function () {
      const adminRole = await subscriptionBilling.DEFAULT_ADMIN_ROLE();
      expect(await subscriptionBilling.hasRole(adminRole, admin.address)).to.be.true;
    });

    it("Should grant MARKETPLACE_ROLE to admin", async function () {
      const marketplaceRole = await subscriptionBilling.MARKETPLACE_ROLE();
      expect(await subscriptionBilling.hasRole(marketplaceRole, admin.address)).to.be.true;
    });

    it("Should grant UPGRADER_ROLE to admin", async function () {
      const upgraderRole = await subscriptionBilling.UPGRADER_ROLE();
      expect(await subscriptionBilling.hasRole(upgraderRole, admin.address)).to.be.true;
    });

    it("Should initialize with zero subscriptions", async function () {
      expect(await subscriptionBilling.totalSubscriptionsCreated()).to.equal(0);
      expect(await subscriptionBilling.totalActiveSubscriptions()).to.equal(0);
    });

    it("Should set correct SECONDS_PER_MONTH constant", async function () {
      expect(await subscriptionBilling.SECONDS_PER_MONTH()).to.equal(30 * 24 * 60 * 60);
    });
  });

  describe("Subscription Creation", function () {
    it("Should create subscription successfully", async function () {
      const currentTime = await time.latest();

      await expect(
        subscriptionBilling
          .connect(marketplace)
          .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH)
      )
        .to.emit(subscriptionBilling, "SubscriptionCreated")
        .withArgs(
          customer1.address,
          TEMPLATE_ID_1,
          currentTime + 1,
          currentTime + 1 + SECONDS_PER_MONTH,
          DURATION_1_MONTH
        );
    });

    it("Should set correct subscription details", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      const sub = await subscriptionBilling.getSubscription(customer1.address, TEMPLATE_ID_1);
      expect(sub.templateId).to.equal(TEMPLATE_ID_1);
      expect(sub.customer).to.equal(customer1.address);
      expect(sub.isActive).to.be.true;
      expect(sub.renewalCount).to.equal(0);
    });

    it("Should calculate correct end timestamp", async function () {
      const currentTime = await time.latest();

      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_3_MONTHS);

      const sub = await subscriptionBilling.getSubscription(customer1.address, TEMPLATE_ID_1);
      const expectedDuration = DURATION_3_MONTHS * SECONDS_PER_MONTH;

      expect(sub.endTimestamp).to.be.closeTo(currentTime + expectedDuration, 5);
    });

    it("Should update totalSubscriptionsCreated counter", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      expect(await subscriptionBilling.totalSubscriptionsCreated()).to.equal(1);
    });

    it("Should update totalActiveSubscriptions counter", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      expect(await subscriptionBilling.totalActiveSubscriptions()).to.equal(1);
    });

    it("Should update activeSubscriptionCount for template", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      expect(await subscriptionBilling.getActiveSubscriberCount(TEMPLATE_ID_1)).to.equal(1);
    });

    it("Should add template to customer subscriptions list", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      const subs = await subscriptionBilling.getCustomerSubscriptions(customer1.address);
      expect(subs.length).to.equal(1);
      expect(subs[0]).to.equal(TEMPLATE_ID_1);
    });

    it("Should allow multiple subscriptions for same customer", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_2, DURATION_1_MONTH);

      const subs = await subscriptionBilling.getCustomerSubscriptions(customer1.address);
      expect(subs.length).to.equal(2);
    });

    it("Should allow same template for multiple customers", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer2.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      expect(await subscriptionBilling.getActiveSubscriberCount(TEMPLATE_ID_1)).to.equal(2);
    });

    it("Should revert with zero duration", async function () {
      await expect(
        subscriptionBilling
          .connect(marketplace)
          .createSubscription(customer1.address, TEMPLATE_ID_1, 0)
      ).to.be.revertedWithCustomError(subscriptionBilling, "InvalidDuration");
    });

    it("Should revert if customer already has active subscription", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      await expect(
        subscriptionBilling
          .connect(marketplace)
          .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH)
      ).to.be.revertedWithCustomError(subscriptionBilling, "SubscriptionAlreadyActive");
    });

    it("Should allow re-subscription after expiration", async function () {
      // Create subscription
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      // Fast forward past expiration
      await time.increase(SECONDS_PER_MONTH + 1);

      // Should allow new subscription
      await expect(
        subscriptionBilling
          .connect(marketplace)
          .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH)
      ).to.not.be.reverted;
    });

    it("Should revert if caller doesn't have MARKETPLACE_ROLE", async function () {
      await expect(
        subscriptionBilling
          .connect(customer1)
          .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH)
      ).to.be.reverted;
    });

    it("Should handle 12-month subscription", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_12_MONTHS);

      const sub = await subscriptionBilling.getSubscription(customer1.address, TEMPLATE_ID_1);
      const currentTime = await time.latest();
      const expectedDuration = DURATION_12_MONTHS * SECONDS_PER_MONTH;

      expect(sub.endTimestamp).to.be.closeTo(currentTime + expectedDuration, 5);
    });
  });

  describe("Subscription Renewal", function () {
    beforeEach(async function () {
      // Create initial subscription
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);
    });

    it("Should renew subscription successfully", async function () {
      const subBefore = await subscriptionBilling.getSubscription(customer1.address, TEMPLATE_ID_1);
      const endTimeBefore = subBefore.endTimestamp;

      await expect(
        subscriptionBilling
          .connect(marketplace)
          .renewSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH)
      )
        .to.emit(subscriptionBilling, "SubscriptionRenewed")
        .withArgs(
          customer1.address,
          TEMPLATE_ID_1,
          endTimeBefore + BigInt(SECONDS_PER_MONTH),
          1
        );
    });

    it("Should extend end timestamp correctly", async function () {
      const subBefore = await subscriptionBilling.getSubscription(customer1.address, TEMPLATE_ID_1);
      const endTimeBefore = subBefore.endTimestamp;

      await subscriptionBilling
        .connect(marketplace)
        .renewSubscription(customer1.address, TEMPLATE_ID_1, DURATION_3_MONTHS);

      const subAfter = await subscriptionBilling.getSubscription(customer1.address, TEMPLATE_ID_1);
      const expectedExtension = DURATION_3_MONTHS * SECONDS_PER_MONTH;

      expect(subAfter.endTimestamp).to.equal(endTimeBefore + BigInt(expectedExtension));
    });

    it("Should increment renewal count", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .renewSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      const sub = await subscriptionBilling.getSubscription(customer1.address, TEMPLATE_ID_1);
      expect(sub.renewalCount).to.equal(1);
    });

    it("Should allow multiple renewals", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .renewSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      await subscriptionBilling
        .connect(marketplace)
        .renewSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      const sub = await subscriptionBilling.getSubscription(customer1.address, TEMPLATE_ID_1);
      expect(sub.renewalCount).to.equal(2);
    });

    it("Should allow early renewal (before expiration)", async function () {
      // Renew immediately after creation
      await expect(
        subscriptionBilling
          .connect(marketplace)
          .renewSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH)
      ).to.not.be.reverted;
    });

    it("Should revert with zero duration", async function () {
      await expect(
        subscriptionBilling
          .connect(marketplace)
          .renewSubscription(customer1.address, TEMPLATE_ID_1, 0)
      ).to.be.revertedWithCustomError(subscriptionBilling, "InvalidDuration");
    });

    it("Should revert if subscription is not active", async function () {
      // Cancel subscription
      await subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1);

      await expect(
        subscriptionBilling
          .connect(marketplace)
          .renewSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH)
      ).to.be.revertedWithCustomError(subscriptionBilling, "SubscriptionNotActive");
    });

    it("Should revert if caller doesn't have MARKETPLACE_ROLE", async function () {
      await expect(
        subscriptionBilling
          .connect(customer1)
          .renewSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH)
      ).to.be.reverted;
    });
  });

  describe("Subscription Cancellation", function () {
    beforeEach(async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);
    });

    it("Should cancel subscription successfully", async function () {
      await expect(subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1))
        .to.emit(subscriptionBilling, "SubscriptionCancelled")
        .withArgs(customer1.address, TEMPLATE_ID_1, await time.latest() + 1);
    });

    it("Should set isActive to false", async function () {
      await subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1);

      const sub = await subscriptionBilling.getSubscription(customer1.address, TEMPLATE_ID_1);
      expect(sub.isActive).to.be.false;
    });

    it("Should decrement activeSubscriptionCount", async function () {
      await subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1);

      expect(await subscriptionBilling.getActiveSubscriberCount(TEMPLATE_ID_1)).to.equal(0);
    });

    it("Should decrement totalActiveSubscriptions", async function () {
      await subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1);

      expect(await subscriptionBilling.totalActiveSubscriptions()).to.equal(0);
    });

    it("Should revert if subscription is not active", async function () {
      // Cancel once
      await subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1);

      // Try to cancel again
      await expect(
        subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1)
      ).to.be.revertedWithCustomError(subscriptionBilling, "SubscriptionNotActive");
    });

    it("Should only allow customer to cancel their own subscription", async function () {
      // Customer1 creates subscription
      // Customer2 tries to cancel it
      await expect(
        subscriptionBilling.connect(customer2).cancelSubscription(TEMPLATE_ID_1)
      ).to.be.revertedWithCustomError(subscriptionBilling, "SubscriptionNotActive");
    });

    it("Should allow cancellation even if expired", async function () {
      // Fast forward past expiration
      await time.increase(SECONDS_PER_MONTH + 1);

      // Should still be marked as active (until batch expired)
      await expect(
        subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1)
      ).to.not.be.reverted;
    });
  });

  describe("Subscription Status Checks", function () {
    beforeEach(async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);
    });

    it("Should return true for active unexpired subscription", async function () {
      expect(
        await subscriptionBilling.hasActiveSubscription(customer1.address, TEMPLATE_ID_1)
      ).to.be.true;
    });

    it("Should return false for expired subscription", async function () {
      await time.increase(SECONDS_PER_MONTH + 1);

      expect(
        await subscriptionBilling.hasActiveSubscription(customer1.address, TEMPLATE_ID_1)
      ).to.be.false;
    });

    it("Should return false for cancelled subscription", async function () {
      await subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1);

      expect(
        await subscriptionBilling.hasActiveSubscription(customer1.address, TEMPLATE_ID_1)
      ).to.be.false;
    });

    it("Should return false for non-existent subscription", async function () {
      expect(
        await subscriptionBilling.hasActiveSubscription(customer2.address, TEMPLATE_ID_1)
      ).to.be.false;
    });

    it("Should correctly identify expired subscription", async function () {
      expect(
        await subscriptionBilling.isSubscriptionExpired(customer1.address, TEMPLATE_ID_1)
      ).to.be.false;

      await time.increase(SECONDS_PER_MONTH + 1);

      expect(
        await subscriptionBilling.isSubscriptionExpired(customer1.address, TEMPLATE_ID_1)
      ).to.be.true;
    });

    it("Should return false for expired cancelled subscription", async function () {
      await subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1);

      expect(
        await subscriptionBilling.isSubscriptionExpired(customer1.address, TEMPLATE_ID_1)
      ).to.be.false;
    });
  });

  describe("Remaining Time Calculation", function () {
    beforeEach(async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);
    });

    it("Should return correct remaining time", async function () {
      const remainingTime = await subscriptionBilling.getRemainingTime(
        customer1.address,
        TEMPLATE_ID_1
      );

      expect(remainingTime).to.be.closeTo(SECONDS_PER_MONTH, 5);
    });

    it("Should return 0 for expired subscription", async function () {
      await time.increase(SECONDS_PER_MONTH + 1);

      const remainingTime = await subscriptionBilling.getRemainingTime(
        customer1.address,
        TEMPLATE_ID_1
      );

      expect(remainingTime).to.equal(0);
    });

    it("Should return 0 for cancelled subscription", async function () {
      await subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1);

      const remainingTime = await subscriptionBilling.getRemainingTime(
        customer1.address,
        TEMPLATE_ID_1
      );

      expect(remainingTime).to.equal(0);
    });

    it("Should return 0 for non-existent subscription", async function () {
      const remainingTime = await subscriptionBilling.getRemainingTime(
        customer2.address,
        TEMPLATE_ID_1
      );

      expect(remainingTime).to.equal(0);
    });

    it("Should decrease over time", async function () {
      const time1 = await subscriptionBilling.getRemainingTime(customer1.address, TEMPLATE_ID_1);

      await time.increase(10 * 24 * 60 * 60); // 10 days

      const time2 = await subscriptionBilling.getRemainingTime(customer1.address, TEMPLATE_ID_1);

      expect(time2).to.be.lt(time1);
    });
  });

  describe("Batch Expiration", function () {
    beforeEach(async function () {
      // Create multiple subscriptions
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer2.address, TEMPLATE_ID_1, DURATION_1_MONTH);
    });

    it("Should batch expire subscriptions", async function () {
      await time.increase(SECONDS_PER_MONTH + 1);

      await expect(
        subscriptionBilling.batchExpireSubscriptions(
          [customer1.address, customer2.address],
          [TEMPLATE_ID_1, TEMPLATE_ID_1]
        )
      )
        .to.emit(subscriptionBilling, "SubscriptionExpired")
        .withArgs(customer1.address, TEMPLATE_ID_1, await time.latest() + 1);
    });

    it("Should update activeSubscriptionCount correctly", async function () {
      await time.increase(SECONDS_PER_MONTH + 1);

      await subscriptionBilling.batchExpireSubscriptions(
        [customer1.address, customer2.address],
        [TEMPLATE_ID_1, TEMPLATE_ID_1]
      );

      expect(await subscriptionBilling.getActiveSubscriberCount(TEMPLATE_ID_1)).to.equal(0);
    });

    it("Should update totalActiveSubscriptions correctly", async function () {
      await time.increase(SECONDS_PER_MONTH + 1);

      await subscriptionBilling.batchExpireSubscriptions(
        [customer1.address, customer2.address],
        [TEMPLATE_ID_1, TEMPLATE_ID_1]
      );

      expect(await subscriptionBilling.totalActiveSubscriptions()).to.equal(0);
    });

    it("Should skip non-expired subscriptions", async function () {
      // Don't fast forward time

      await subscriptionBilling.batchExpireSubscriptions(
        [customer1.address, customer2.address],
        [TEMPLATE_ID_1, TEMPLATE_ID_1]
      );

      // Should still have 2 active subscriptions
      expect(await subscriptionBilling.totalActiveSubscriptions()).to.equal(2);
    });

    it("Should revert if array lengths mismatch", async function () {
      await expect(
        subscriptionBilling.batchExpireSubscriptions(
          [customer1.address, customer2.address],
          [TEMPLATE_ID_1] // Mismatch
        )
      ).to.be.revertedWith("Array length mismatch");
    });

    it("Should be callable by anyone", async function () {
      await time.increase(SECONDS_PER_MONTH + 1);

      await expect(
        subscriptionBilling.connect(customer2).batchExpireSubscriptions(
          [customer1.address],
          [TEMPLATE_ID_1]
        )
      ).to.not.be.reverted;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);
    });

    it("Should return complete subscription details", async function () {
      const sub = await subscriptionBilling.getSubscription(customer1.address, TEMPLATE_ID_1);

      expect(sub.templateId).to.equal(TEMPLATE_ID_1);
      expect(sub.customer).to.equal(customer1.address);
      expect(sub.isActive).to.be.true;
      expect(sub.renewalCount).to.equal(0);
    });

    it("Should return customer subscription list", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_2, DURATION_1_MONTH);

      const subs = await subscriptionBilling.getCustomerSubscriptions(customer1.address);
      expect(subs.length).to.equal(2);
      expect(subs[0]).to.equal(TEMPLATE_ID_1);
      expect(subs[1]).to.equal(TEMPLATE_ID_2);
    });

    it("Should return correct active subscriber count", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer2.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      expect(await subscriptionBilling.getActiveSubscriberCount(TEMPLATE_ID_1)).to.equal(2);
    });

    it("Should not duplicate templateId in customer list", async function () {
      // Cancel and re-subscribe
      await subscriptionBilling.connect(customer1).cancelSubscription(TEMPLATE_ID_1);
      await time.increase(SECONDS_PER_MONTH + 1);

      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      const subs = await subscriptionBilling.getCustomerSubscriptions(customer1.address);
      expect(subs.length).to.equal(1); // Should still be 1, not duplicated
    });
  });

  describe("Upgradeability", function () {
    it("Should only allow UPGRADER_ROLE to upgrade", async function () {
      const SubscriptionBillingV2 = await ethers.getContractFactory("SubscriptionBilling");

      await expect(
        upgrades.upgradeProxy(await subscriptionBilling.getAddress(), SubscriptionBillingV2)
      ).to.not.be.reverted;
    });

    it("Should preserve state after upgrade", async function () {
      // Create subscription
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      const beforeUpgrade = await subscriptionBilling.totalSubscriptionsCreated();

      // Upgrade
      const SubscriptionBillingV2 = await ethers.getContractFactory("SubscriptionBilling");
      const upgraded = await upgrades.upgradeProxy(
        await subscriptionBilling.getAddress(),
        SubscriptionBillingV2
      );

      // Check state preserved
      expect(await upgraded.totalSubscriptionsCreated()).to.equal(beforeUpgrade);
      const sub = await upgraded.getSubscription(customer1.address, TEMPLATE_ID_1);
      expect(sub.isActive).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum duration", async function () {
      const maxDuration = 1000000; // Very large number

      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, maxDuration);

      const sub = await subscriptionBilling.getSubscription(customer1.address, TEMPLATE_ID_1);
      expect(sub.isActive).to.be.true;
    });

    it("Should handle concurrent subscriptions to different templates", async function () {
      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_1, DURATION_1_MONTH);

      await subscriptionBilling
        .connect(marketplace)
        .createSubscription(customer1.address, TEMPLATE_ID_2, DURATION_3_MONTHS);

      expect(
        await subscriptionBilling.hasActiveSubscription(customer1.address, TEMPLATE_ID_1)
      ).to.be.true;

      expect(
        await subscriptionBilling.hasActiveSubscription(customer1.address, TEMPLATE_ID_2)
      ).to.be.true;
    });

    it("Should handle empty batch expiration", async function () {
      await expect(subscriptionBilling.batchExpireSubscriptions([], [])).to.not.be.reverted;
    });
  });
});
