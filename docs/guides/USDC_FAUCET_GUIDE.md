# USDC Faucet Guide - Varity L3 Testnet

## Overview

The Varity L3 testnet uses **MockUSDC** as the native payment token for marketplace transactions. Users need USDC to purchase tool licenses and interact with the marketplace.

## USDC Token Details

- **Contract Address**: `0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE`
- **Token Name**: USD Coin
- **Symbol**: USDC
- **Decimals**: 6
- **Network**: Varity L3 Testnet (Chain ID: 33529)
- **RPC**: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
- **Explorer**: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz

## Faucet Information

### Claim Amount
- **1000 USDC** per claim

### Cooldown
- **24 hours** between claims
- Use `timeUntilNextClaim(address)` to check when you can claim again

### Faucet Functions

#### 1. Claim USDC
```solidity
function faucet() external
```
Call this function to receive 1000 USDC. Must wait 24 hours between claims.

#### 2. Check Eligibility
```solidity
function canClaimFaucet(address user) external view returns (bool canClaim, uint256 cooldownEnds)
```
Returns:
- `canClaim`: true if user can claim now
- `cooldownEnds`: timestamp when cooldown ends (0 if can claim now)

#### 3. Check Time Until Next Claim
```solidity
function timeUntilNextClaim(address user) external view returns (uint256)
```
Returns number of seconds until next claim (0 if can claim now).

## How to Get USDC

### Option 1: Using Hardhat Script

```bash
cd contracts
npx hardhat run scripts/test-usdc.ts --network varityTestnet
```

This will:
1. Check your USDC balance
2. Claim from faucet if available
3. Show your updated balance

### Option 2: Using thirdweb SDK (Frontend)

```typescript
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { client } from "./client";
import { varietyTestnet5 } from "./lib/varity-chain";

const usdcContract = getContract({
  client,
  chain: varietyTestnet5,
  address: "0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE"
});

// Claim from faucet
const transaction = prepareContractCall({
  contract: usdcContract,
  method: "function faucet()",
  params: []
});

await sendTransaction({ transaction, account });
```

### Option 3: Using ethers.js

```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz");
const signer = new ethers.Wallet(privateKey, provider);

const usdcABI = [
  "function faucet() external",
  "function balanceOf(address) view returns (uint256)",
  "function timeUntilNextClaim(address) view returns (uint256)"
];

const usdc = new ethers.Contract("0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE", usdcABI, signer);

// Check balance
const balance = await usdc.balanceOf(signer.address);
console.log("Balance:", ethers.formatUnits(balance, 6), "USDC");

// Claim from faucet
const tx = await usdc.faucet();
await tx.wait();
console.log("Claimed 1000 USDC!");

// Check cooldown
const cooldown = await usdc.timeUntilNextClaim(signer.address);
console.log("Time until next claim:", cooldown.toString(), "seconds");
```

### Option 4: Direct Contract Interaction (Block Explorer)

1. Go to [Varity Explorer](https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz)
2. Navigate to USDC contract: `0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE`
3. Connect your wallet
4. Find the `faucet()` function under "Write Contract"
5. Click "Write" to claim 1000 USDC

## Using USDC for Marketplace Purchases

Once you have USDC, you can purchase tool licenses:

### Step 1: Approve Marketplace
```typescript
// Approve marketplace to spend your USDC
const approveAmount = ethers.parseUnits("1000", 6); // 1000 USDC
await usdc.approve(marketplaceAddress, approveAmount);
```

### Step 2: Purchase License
```typescript
// Purchase a tool license
const toolId = 0; // QuickBooks
const durationMonths = 1;
await marketplace.purchaseLicense(toolId, durationMonths);
```

### Step 3: Verify License
```typescript
// Check your license balance
const licenseBalance = await toolLicenseNFT.balanceOf(userAddress, toolId);
console.log("Licenses owned:", licenseBalance.toString());
```

## Common Issues

### Issue: "Faucet cooldown active"
**Solution**: Wait 24 hours between claims. Check `timeUntilNextClaim()` to see when you can claim again.

### Issue: "Insufficient balance"
**Solution**: Use the faucet to get more USDC, or wait for the cooldown to expire.

### Issue: "Insufficient allowance"
**Solution**: Approve the marketplace contract before purchasing:
```typescript
await usdc.approve(marketplaceAddress, amount);
```

### Issue: "Transaction failed"
**Solution**:
1. Check you have enough gas (USDC is also used for gas on Varity L3)
2. Verify you're connected to the correct network (Chain ID: 33529)
3. Check transaction details in explorer

## Faucet Limits

- **No total cap**: Unlimited claims with 24-hour cooldown
- **Per-claim limit**: 1000 USDC
- **Cooldown**: 24 hours (86400 seconds)
- **No whitelist**: Open to all testnet users

## Admin Functions (Owner Only)

### Mint USDC (Testing)
```solidity
function mint(address to, uint256 amount) external onlyOwner
```
Owner can mint unlimited USDC for testing purposes.

**Note**: The `mint()` function is restricted to the contract owner for emergency use or large-scale testing.

## Contract Source Code

The MockUSDC contract is a standard ERC-20 implementation with:
- OpenZeppelin ERC20 base
- OpenZeppelin Ownable for access control
- Custom faucet functionality with cooldown
- 6 decimals (matching real USDC)

Contract location: `contracts/contracts/MockUSDC.sol`

## Support

If you encounter issues with the faucet:
1. Check your transaction in the [block explorer](https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz)
2. Verify you're on Varity L3 Testnet (Chain ID: 33529)
3. Ensure your wallet has enough gas
4. Check the faucet cooldown with `timeUntilNextClaim()`

## Future Updates

- Faucet UI integration in dashboard
- Automatic faucet claiming on first login
- Faucet analytics dashboard
- Multi-token support (future tokens)

---

**Last Updated**: 2025-11-19
**USDC Contract**: `0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE`
**Network**: Varity L3 Testnet (Chain ID: 33529)
