# Comprehensive Test Plan - Varity Tool Marketplace

**Target Coverage**: 90%+
**Current Coverage**: 18%
**Estimated Effort**: 2-3 days

---

## Test Suite Structure

```
test/
├── ToolMarketplace.test.ts (✅ Exists - expand)
├── ToolLicenseNFT.test.ts (❌ Create)
├── SubscriptionBilling.test.ts (❌ Create)
├── RevenueSplitter.test.ts (❌ Create)
├── Integration.test.ts (❌ Create)
├── Security.test.ts (❌ Create)
└── Upgrade.test.ts (❌ Create)
```

---

## 1. ToolMarketplace.test.ts

### ✅ Already Tested (7 tests)
- Tool listing
- Active tools retrieval
- License purchase
- Revenue split 70/30
- USDC approval requirement
- Review submission
- Review rating update
- Duplicate review prevention

### ❌ Missing Tests (15 additional tests needed)

```typescript
describe("ToolMarketplace - Extended Tests", function () {

  describe("Multi-Month Purchases", function () {
    it("Should handle 3-month purchase correctly")
    it("Should handle 6-month purchase correctly")
    it("Should handle 12-month purchase correctly")
    it("Should calculate correct total cost for multi-month")
  });

  describe("Invalid Inputs", function () {
    it("Should revert on rating below minimum (< 100)")
    it("Should revert on rating above maximum (> 500)")
    it("Should revert on zero duration purchase")
    it("Should revert on inactive tool purchase")
    it("Should revert review without active license")
  });

  describe("Tool Management", function () {
    it("Should toggle tool status by developer")
    it("Should toggle tool status by admin")
    it("Should prevent non-developer/admin from toggling")
    it("Should update platform fee correctly")
  });

  describe("Multiple Reviews", function () {
    it("Should calculate average rating from multiple users")
    it("Should handle 1-star to 5-star range correctly")
  });

  describe("Edge Cases", function () {
    it("Should handle free tool ($0 price)")
    it("Should handle maximum price tool")
  });
});
```

---

## 2. ToolLicenseNFT.test.ts (❌ NEW FILE)

```typescript
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("ToolLicenseNFT", function () {
  let toolLicenseNFT: any;
  let admin: SignerWithAddress;
  let developer: SignerWithAddress;
  let customer: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  beforeEach(async function () {
    [admin, developer, customer, unauthorized] = await ethers.getSigners();

    const ToolLicenseNFT = await ethers.getContractFactory("ToolLicenseNFT");
    toolLicenseNFT = await upgrades.deployProxy(
      ToolLicenseNFT,
      [admin.address, "ipfs://base-uri/"],
      { initializer: "initialize", kind: "uups" }
    );
    await toolLicenseNFT.waitForDeployment();
  });

  describe("Initialization", function () {
    it("Should set correct name and symbol")
    it("Should grant admin role to deployer")
    it("Should set base URI correctly")
  });

  describe("Tool Listing", function () {
    it("Should list tool with MINTER_ROLE")
    it("Should revert listing without MINTER_ROLE")
    it("Should increment tool ID counter")
    it("Should emit ToolListed event")
    it("Should store metadata correctly")
  });

  describe("License Issuance", function () {
    it("Should issue license with MINTER_ROLE")
    it("Should revert without MINTER_ROLE")
    it("Should revert for non-existent tool")
    it("Should revert for inactive tool")
    it("Should update total licenses count")
    it("Should emit LicenseIssued event")
  });

  describe("License Revocation", function () {
    it("Should revoke license successfully")
    it("Should update total licenses count")
    it("Should handle revocation with insufficient balance")
  });

  describe("Price Management", function () {
    it("Should update price by developer")
    it("Should update price by admin")
    it("Should revert price update by non-developer")
    it("Should emit PriceUpdated event")
  });

  describe("Version Management", function () {
    it("Should update version by developer")
    it("Should update version by admin")
    it("Should revert version update by non-developer")
  });

  describe("Status Management", function () {
    it("Should toggle active status by developer")
    it("Should toggle active status by admin")
    it("Should revert toggle by non-developer/admin")
    it("Should emit ToolStatusChanged event")
  });

  describe("Queries", function () {
    it("Should return correct tool metadata")
    it("Should return correct total tools count")
    it("Should return correct hasLicense status")
    it("Should return correct URI for tool")
    it("Should revert on non-existent tool query")
  });

  describe("ERC1155 Compliance", function () {
    it("Should support ERC1155 interface")
    it("Should support AccessControl interface")
    it("Should handle batch transfers")
  });

  describe("Edge Cases", function () {
    it("Should handle listing free tool ($0 price)")
    it("Should handle large license amounts")
    it("Should handle multiple tools per developer")
  });
});
```

**Tests Needed**: 32 tests
**Estimated Time**: 4-5 hours

---

## 3. SubscriptionBilling.test.ts (❌ NEW FILE)

```typescript
describe("SubscriptionBilling", function () {
  let subscriptionBilling: any;
  let admin: SignerWithAddress;
  let marketplace: SignerWithAddress;
  let customer: SignerWithAddress;

  beforeEach(async function () {
    [admin, marketplace, customer] = await ethers.getSigners();

    const SubscriptionBilling = await ethers.getContractFactory("SubscriptionBilling");
    subscriptionBilling = await upgrades.deployProxy(
      SubscriptionBilling,
      [admin.address],
      { initializer: "initialize", kind: "uups" }
    );
    await subscriptionBilling.waitForDeployment();

    // Grant MARKETPLACE_ROLE
    const role = await subscriptionBilling.MARKETPLACE_ROLE();
    await subscriptionBilling.grantRole(role, marketplace.address);
  });

  describe("Initialization", function () {
    it("Should grant admin role to deployer")
    it("Should initialize counters to zero")
  });

  describe("Subscription Creation", function () {
    it("Should create 1-month subscription")
    it("Should create 3-month subscription")
    it("Should create 6-month subscription")
    it("Should create 12-month subscription")
    it("Should revert without MARKETPLACE_ROLE")
    it("Should revert on zero duration")
    it("Should revert on duplicate active subscription")
    it("Should emit SubscriptionCreated event")
    it("Should update active subscription count")
    it("Should update total subscriptions created")
    it("Should calculate end timestamp correctly")
  });

  describe("Subscription Renewal", function () {
    it("Should renew active subscription")
    it("Should extend end timestamp correctly")
    it("Should increment renewal count")
    it("Should emit SubscriptionRenewed event")
    it("Should revert renewal of inactive subscription")
    it("Should allow early renewal (before expiry)")
  });

  describe("Subscription Cancellation", function () {
    it("Should cancel active subscription")
    it("Should emit SubscriptionCancelled event")
    it("Should update active subscription count")
    it("Should revert cancellation by non-customer")
    it("Should revert cancellation of inactive subscription")
  });

  describe("Subscription Status Checks", function () {
    it("Should return true for active non-expired subscription")
    it("Should return false for inactive subscription")
    it("Should return false for expired subscription")
    it("Should calculate remaining time correctly")
    it("Should return zero remaining time for expired")
  });

  describe("Subscription Queries", function () {
    it("Should return full subscription details")
    it("Should return customer's subscription list")
    it("Should return active subscriber count")
  });

  describe("Batch Expiration", function () {
    it("Should expire multiple subscriptions")
    it("Should emit SubscriptionExpired events")
    it("Should update counters correctly")
    it("Should revert on array length mismatch")
    it("Should skip non-expired subscriptions")
    it("Should be callable by anyone (public)")
  });

  describe("Edge Cases", function () {
    it("Should handle subscription re-creation after cancellation")
    it("Should handle subscription re-creation after expiry")
    it("Should handle multiple tools per customer")
    it("Should handle timestamp at exact expiry")
  });

  describe("Time-Based Tests", function () {
    it("Should handle time travel to expiry")
    it("Should handle 30-day month calculation")
    it("Should handle multi-year subscriptions")
  });
});
```

**Tests Needed**: 43 tests
**Estimated Time**: 5-6 hours

---

## 4. RevenueSplitter.test.ts (❌ NEW FILE)

```typescript
describe("RevenueSplitter", function () {
  let revenueSplitter: any;
  let mockUSDC: any;
  let admin: SignerWithAddress;
  let treasury: SignerWithAddress;
  let marketplace: SignerWithAddress;
  let developer: SignerWithAddress;

  beforeEach(async function () {
    [admin, treasury, marketplace, developer] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USDC", "USDC", 6);

    // Deploy RevenueSplitter
    const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
    revenueSplitter = await upgrades.deployProxy(
      RevenueSplitter,
      [treasury.address, admin.address],
      { initializer: "initialize", kind: "uups" }
    );

    // Grant role and whitelist token
    const role = await revenueSplitter.MARKETPLACE_ROLE();
    await revenueSplitter.grantRole(role, marketplace.address);
    await revenueSplitter.setTokenWhitelist(await mockUSDC.getAddress(), true);
  });

  describe("Initialization", function () {
    it("Should set treasury address correctly")
    it("Should grant admin role")
    it("Should start unpaused")
    it("Should revert on zero address treasury")
  });

  describe("Stablecoin Payment Processing", function () {
    it("Should process USDC payment correctly")
    it("Should calculate 70/30 split exactly")
    it("Should transfer 70% to treasury immediately")
    it("Should add 30% to developer pending withdrawals")
    it("Should emit StablecoinPaymentProcessed event")
    it("Should revert when paused")
    it("Should revert for non-whitelisted token")
    it("Should revert on zero amount")
    it("Should revert without MARKETPLACE_ROLE")
  });

  describe("Revenue Split Calculations", function () {
    it("Should handle $49 USDC split (QuickBooks)")
    it("Should handle $99 USDC split (Salesforce)")
    it("Should handle $120 USDC split (HubSpot)")
    it("Should handle $8 USDC split (Slack)")
    it("Should handle no rounding errors")
    it("Should handle remainder to creator")
  });

  describe("Developer Withdrawals", function () {
    it("Should withdraw pending USDC tokens")
    it("Should emit TokenWithdrawalProcessed event")
    it("Should reset pending balance to zero")
    it("Should revert on zero pending balance")
    it("Should revert when paused")
    it("Should handle multiple payments before withdrawal")
  });

  describe("Treasury Management", function () {
    it("Should update treasury address")
    it("Should emit TreasuryUpdated event")
    it("Should revert on zero address")
    it("Should revert without admin role")
  });

  describe("Token Whitelist", function () {
    it("Should whitelist new token")
    it("Should remove token from whitelist")
    it("Should emit TokenWhitelisted event")
    it("Should revert without admin role")
  });

  describe("Pause Functionality", function () {
    it("Should toggle pause state")
    it("Should emit PauseToggled event")
    it("Should prevent payments when paused")
    it("Should prevent withdrawals when paused")
    it("Should revert toggle without admin role")
  });

  describe("Queries", function () {
    it("Should return correct revenue split details")
    it("Should return correct pending ETH withdrawal")
    it("Should return correct pending token withdrawal")
  });

  describe("Security Tests", function () {
    it("Should prevent reentrancy on payment")
    it("Should prevent reentrancy on withdrawal")
    it("Should use SafeERC20 for transfers")
    it("Should follow CEI pattern")
  });

  describe("Edge Cases", function () {
    it("Should handle multiple developers")
    it("Should handle multiple payments to same developer")
    it("Should handle very large amounts")
    it("Should handle very small amounts (1 USDC)")
  });

  describe("ETH Payment (Legacy)", function () {
    it("Should process ETH payment correctly")
    it("Should calculate 70/30 split for ETH")
    it("Should handle ETH withdrawals")
    it("Should revert on ETH amount mismatch")
  });
});
```

**Tests Needed**: 51 tests
**Estimated Time**: 6-7 hours

---

## 5. Integration.test.ts (❌ NEW FILE)

```typescript
describe("Integration Tests - Full Purchase Flow", function () {

  describe("Complete Purchase Flow", function () {
    it("Should complete full purchase: USDC approval → purchase → license → subscription")
    it("Should verify revenue split across all contracts")
    it("Should verify NFT ownership after purchase")
    it("Should verify subscription created correctly")
  });

  describe("Multi-User Scenarios", function () {
    it("Should handle 5 users purchasing same tool")
    it("Should handle 1 user purchasing 3 different tools")
    it("Should handle concurrent purchases")
  });

  describe("Review Flow", function () {
    it("Should complete: purchase → review → rating update")
    it("Should handle multiple reviews from different users")
    it("Should calculate average rating correctly across users")
  });

  describe("Subscription Lifecycle", function () {
    it("Should complete: create → renew → cancel")
    it("Should complete: create → expire → re-create")
    it("Should verify license revocation on cancellation")
  });

  describe("Developer Revenue Flow", function () {
    it("Should complete: purchase → split → withdraw")
    it("Should handle multiple sales before withdrawal")
    it("Should verify correct USDC balance after withdrawal")
  });

  describe("Cross-Contract Interactions", function () {
    it("Should verify role grants work correctly")
    it("Should verify marketplace can mint licenses")
    it("Should verify marketplace can create subscriptions")
    it("Should verify marketplace can process revenue")
  });

  describe("Upgrade Scenarios", function () {
    it("Should maintain state across marketplace upgrade")
    it("Should maintain state across NFT upgrade")
    it("Should maintain state across billing upgrade")
    it("Should maintain state across splitter upgrade")
  });
});
```

**Tests Needed**: 19 tests
**Estimated Time**: 4-5 hours

---

## 6. Security.test.ts (❌ NEW FILE)

```typescript
describe("Security Attack Simulations", function () {

  describe("Reentrancy Attacks", function () {
    it("Should prevent reentrancy on purchaseLicense")
    it("Should prevent reentrancy on withdrawPendingTokens")
    it("Should prevent reentrancy on processStablecoinPayment")
  });

  describe("Access Control Exploits", function () {
    it("Should prevent unauthorized minting")
    it("Should prevent unauthorized subscription creation")
    it("Should prevent unauthorized revenue processing")
    it("Should prevent unauthorized upgrades")
  });

  describe("Integer Overflow/Underflow", function () {
    it("Should handle maximum uint256 safely")
    it("Should prevent underflow in license revocation")
    it("Should prevent overflow in subscription duration")
  });

  describe("Front-Running Attempts", function () {
    it("Should have deterministic pricing (no front-run risk)")
    it("Should handle concurrent purchases safely")
  });

  describe("Griefing Attacks", function () {
    it("Should prevent review spam (active license required)")
    it("Should prevent duplicate reviews")
    it("Should handle very long review comments (gas limit)")
  });

  describe("Token Security", function () {
    it("Should reject non-whitelisted tokens")
    it("Should handle malicious ERC20 tokens")
    it("Should prevent direct token transfers to contracts")
  });

  describe("Timestamp Manipulation", function () {
    it("Should handle edge case timestamps")
    it("Should handle subscription at block boundaries")
  });
});
```

**Tests Needed**: 20 tests
**Estimated Time**: 3-4 hours

---

## 7. Upgrade.test.ts (❌ NEW FILE)

```typescript
describe("UUPS Upgrade Tests", function () {

  describe("Upgrade Authorization", function () {
    it("Should allow upgrade with UPGRADER_ROLE")
    it("Should prevent upgrade without UPGRADER_ROLE")
    it("Should emit Upgraded event")
  });

  describe("State Preservation", function () {
    it("Should preserve tool listings after upgrade")
    it("Should preserve subscriptions after upgrade")
    it("Should preserve pending withdrawals after upgrade")
    it("Should preserve role assignments after upgrade")
  });

  describe("Storage Layout Compatibility", function () {
    it("Should maintain storage layout in V2")
    it("Should allow adding new storage variables")
    it("Should prevent storage slot conflicts")
  });

  describe("Implementation Verification", function () {
    it("Should update implementation address")
    it("Should maintain proxy address")
    it("Should call new implementation functions")
  });

  describe("Upgrade Scenarios", function () {
    it("Should upgrade ToolMarketplace")
    it("Should upgrade ToolLicenseNFT")
    it("Should upgrade SubscriptionBilling")
    it("Should upgrade RevenueSplitter")
  });
});
```

**Tests Needed**: 18 tests
**Estimated Time**: 3-4 hours

---

## Test Execution Plan

### Phase 1: Individual Contract Tests (Days 1-2)
1. Expand `ToolMarketplace.test.ts` (+15 tests)
2. Create `ToolLicenseNFT.test.ts` (+32 tests)
3. Create `SubscriptionBilling.test.ts` (+43 tests)
4. Create `RevenueSplitter.test.ts` (+51 tests)

**Subtotal**: 141 tests

### Phase 2: Integration & Security (Day 3)
5. Create `Integration.test.ts` (+19 tests)
6. Create `Security.test.ts` (+20 tests)
7. Create `Upgrade.test.ts` (+18 tests)

**Subtotal**: 57 tests

### Total Tests
**Current**: 7 tests
**Needed**: 198 additional tests
**Final**: 205 total tests

---

## Coverage Target Breakdown

| Contract | Current | Target | Tests Needed |
|----------|---------|--------|--------------|
| ToolMarketplace | 42% | 95% | +15 tests |
| ToolLicenseNFT | 0% | 95% | +32 tests |
| SubscriptionBilling | 11% | 95% | +43 tests |
| RevenueSplitter | 12% | 95% | +51 tests |
| Integration | 0% | 80% | +19 tests |
| Security | 0% | 100% | +20 tests |
| Upgrades | 0% | 90% | +18 tests |

---

## Test Utilities Needed

```typescript
// test/utils/helpers.ts
export async function timeTravel(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

export function calculateSplit(amount: bigint) {
  const varietyShare = (amount * 70n) / 100n;
  const creatorShare = amount - varietyShare;
  return { varietyShare, creatorShare };
}

export async function deployFullStack() {
  // Deploy all 4 contracts with proper setup
  // Returns all contract instances
}

export function parseUSDC(amount: string) {
  return ethers.parseUnits(amount, 6);
}
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific file
npx hardhat test test/ToolLicenseNFT.test.ts

# Run with coverage
npx hardhat coverage

# Run with gas reporting
REPORT_GAS=true npm test
```

---

## Success Criteria

✅ **Test Coverage ≥ 90%**
✅ **All critical paths tested**
✅ **Security scenarios covered**
✅ **Upgrade paths verified**
✅ **Gas benchmarks established**

---

## Estimated Timeline

- **Day 1**: ToolLicenseNFT + SubscriptionBilling tests (75 tests)
- **Day 2**: RevenueSplitter + ToolMarketplace expansion (66 tests)
- **Day 3**: Integration + Security + Upgrades (57 tests)

**Total**: 3 days (198 new tests)

---

**Next Step**: Begin implementation with `ToolLicenseNFT.test.ts`
