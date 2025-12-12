# Tool Marketplace Smart Contracts

## Overview

This directory contains the smart contracts for the Varity Tool Marketplace deployed on Varity L3 Testnet. The marketplace enables companies to purchase monthly licenses for tool integrations (QuickBooks, Salesforce, Shopify, etc.) using USDC, with a 70/30 revenue split between Varity and tool developers.

## Network Information

- **Network**: Varity L3 Testnet
- **Chain ID**: 33529
- **RPC URL**: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
- **Explorer**: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz
- **USDC Address**: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
- **Data Availability**: Arbitrum AnyTrust

## Contract Architecture

The tool marketplace consists of 4 main contracts:

### 1. ToolLicenseNFT (ERC-1155)

**Purpose**: Multi-token NFT representing tool licenses

**Key Features**:
- ERC-1155 standard for efficient multi-tool license management
- Each tool has a unique ID (toolId)
- Customers receive NFT licenses when purchasing
- Supports multiple licenses per customer per tool
- UUPS upgradeable pattern

**Main Functions**:
```solidity
function listTool(address developer, string name, string category, uint256 price, string metadataURI) returns (uint256 toolId)
function issueLicense(address customer, uint256 toolId, uint256 amount)
function revokeLicense(address customer, uint256 toolId, uint256 amount)
function hasLicense(address customer, uint256 toolId) returns (bool)
function getToolMetadata(uint256 toolId) returns (ToolMetadata)
```

**Events**:
- `ToolListed(toolId, developer, name, category, price, timestamp)`
- `LicenseIssued(customer, toolId, amount, timestamp)`
- `PriceUpdated(toolId, oldPrice, newPrice, timestamp)`
- `ToolStatusChanged(toolId, isActive, timestamp)`

### 2. ToolMarketplace

**Purpose**: Central marketplace for tool purchases and reviews

**Key Features**:
- USDC-only payments (no ETH)
- Monthly subscription model (1, 3, 6, 12 months)
- Star rating system (1-5 stars, scaled 100-500)
- Review system (only active license holders)
- Integration with RevenueSplitter for automatic 70/30 split
- UUPS upgradeable pattern

**Main Functions**:
```solidity
function listTool(string name, string category, uint256 monthlyPrice, string metadataURI) returns (uint256 toolId)
function purchaseLicense(uint256 toolId, uint256 durationMonths)
function leaveReview(uint256 toolId, uint256 rating, string comment)
function getActiveTools() returns (uint256[] toolIds)
function getToolListing(uint256 toolId) returns (ToolListing)
function getToolReviews(uint256 toolId) returns (Review[])
```

**Events**:
- `ToolListed(toolId, developer, name, category, price, timestamp)`
- `LicensePurchased(customer, toolId, durationMonths, totalCost, timestamp)`
- `ReviewSubmitted(toolId, reviewer, rating, comment, timestamp)`

### 3. SubscriptionBilling

**Purpose**: Manages subscription lifecycle and expiration

**Key Features**:
- Tracks subscription start/end timestamps
- Automatic expiration checking
- Renewal support with duration extension
- Customer subscription history
- UUPS upgradeable pattern

**Main Functions**:
```solidity
function createSubscription(address customer, uint256 toolId, uint256 durationMonths)
function renewSubscription(address customer, uint256 toolId, uint256 durationMonths)
function cancelSubscription(uint256 toolId)
function hasActiveSubscription(address customer, uint256 toolId) returns (bool)
function getRemainingTime(address customer, uint256 toolId) returns (uint256 seconds)
function getSubscription(address customer, uint256 toolId) returns (Subscription)
```

**Events**:
- `SubscriptionCreated(customer, toolId, startTimestamp, endTimestamp, durationMonths)`
- `SubscriptionRenewed(customer, toolId, newEndTimestamp, renewalCount)`
- `SubscriptionCancelled(customer, toolId, timestamp)`
- `SubscriptionExpired(customer, toolId, timestamp)`

### 4. RevenueSplitter

**Purpose**: Automatic 70/30 revenue split (Varity 70%, Developer 30%)

**Key Features**:
- Varity receives 70% immediately to treasury
- Developers receive 30% to pending withdrawals (pull pattern)
- Supports USDC payments
- Emergency pause functionality
- Token whitelisting system
- UUPS upgradeable pattern

**Main Functions**:
```solidity
function processStablecoinPayment(uint256 toolId, address creator, address token, uint256 amount)
function withdrawPendingTokens(address token)
function getPendingTokenWithdrawal(address creator, address token) returns (uint256)
function setTokenWhitelist(address token, bool whitelisted)
function updateTreasury(address newTreasury)
```

**Events**:
- `StablecoinPaymentProcessed(toolId, creator, token, totalAmount, varietyShare, creatorShare, timestamp)`
- `TokenWithdrawalProcessed(creator, token, amount, timestamp)`
- `TreasuryUpdated(oldTreasury, newTreasury, timestamp)`

## Deployment

### Prerequisites

1. Node.js and npm installed
2. Private key with testnet ETH for gas
3. USDC tokens for testing purchases

### Installation

```bash
cd contracts
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Add your private key to `.env`:
```
PRIVATE_KEY=your_private_key_here
```

3. Get testnet ETH for gas from a faucet

### Deploy Contracts

```bash
npm run deploy
```

This will:
1. Deploy RevenueSplitter (with USDC whitelisted)
2. Deploy ToolLicenseNFT (ERC-1155)
3. Deploy SubscriptionBilling
4. Deploy ToolMarketplace
5. Grant necessary roles
6. List 8 tools in the marketplace

### Listed Tools

After deployment, these 8 tools are automatically listed:

| Tool | Category | Monthly Price |
|------|----------|---------------|
| QuickBooks | Accounting | $49 USDC |
| Salesforce | CRM | $99 USDC |
| Shopify | E-commerce | $79 USDC |
| Monday.com | Project Management | $45 USDC |
| Stripe | Payments | Free |
| Slack | Communication | $8 USDC |
| HubSpot | Marketing | $120 USDC |
| Zendesk | Support | $89 USDC |

## Contract Verification

After deployment, verify contracts on the explorer:

```bash
npx hardhat verify --network varityTestnet <CONTRACT_ADDRESS>
```

The deployment script will output verification commands for all 4 contracts.

## Environment Variables

After deployment, add these to your main `.env.local`:

```bash
NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_TOOL_LICENSE_NFT_ADDRESS=0x...
NEXT_PUBLIC_SUBSCRIPTION_BILLING_ADDRESS=0x...
NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

## Usage Examples

### Purchase a License

```typescript
import { ethers } from "ethers";

// 1. Approve USDC spending
const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
const price = 49000000; // $49 USDC (6 decimals)
const duration = 1; // 1 month
await usdc.approve(TOOL_MARKETPLACE_ADDRESS, price * duration);

// 2. Purchase license
const marketplace = new ethers.Contract(TOOL_MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
await marketplace.purchaseLicense(0, duration); // toolId 0 = QuickBooks
```

### Check License Status

```typescript
const nft = new ethers.Contract(TOOL_LICENSE_NFT_ADDRESS, NFT_ABI, provider);
const hasLicense = await nft.hasLicense(customerAddress, 0); // toolId 0
console.log("Has QuickBooks license:", hasLicense);
```

### Leave a Review

```typescript
const marketplace = new ethers.Contract(TOOL_MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
await marketplace.leaveReview(
  0, // toolId
  500, // 5 stars (500 = 5.00)
  "Excellent integration! Works perfectly with our accounting system."
);
```

### Developer Withdrawal

```typescript
const splitter = new ethers.Contract(REVENUE_SPLITTER_ADDRESS, SPLITTER_ABI, signer);

// Check pending USDC
const pending = await splitter.getPendingTokenWithdrawal(developerAddress, USDC_ADDRESS);
console.log("Pending USDC:", ethers.formatUnits(pending, 6));

// Withdraw
await splitter.withdrawPendingTokens(USDC_ADDRESS);
```

## Revenue Split Example

For a $99 USDC purchase (e.g., Salesforce):

- **Total**: $99 USDC
- **Varity (70%)**: $69.30 USDC → Sent immediately to treasury
- **Developer (30%)**: $29.70 USDC → Added to pending withdrawals

The developer can withdraw their $29.70 at any time using `withdrawPendingTokens()`.

## Security Features

1. **ReentrancyGuard**: All payment functions protected
2. **AccessControl**: Role-based permissions
3. **UUPS Upgradeable**: Future improvements without losing state
4. **Pull Pattern**: Developers withdraw funds (safer than push)
5. **Custom Errors**: Gas-efficient error handling
6. **SafeERC20**: Secure token transfers
7. **Pausable**: Emergency pause in RevenueSplitter

## Testing

```bash
npm run test
```

## Contract Sizes

- ToolLicenseNFT: ~310 lines
- ToolMarketplace: ~380 lines
- SubscriptionBilling: 381 lines
- RevenueSplitter: 417 lines
- **Total**: ~1,488 lines of production-ready Solidity

## Gas Estimates

- Deploy RevenueSplitter: ~2.5M gas
- Deploy ToolLicenseNFT: ~3.0M gas
- Deploy SubscriptionBilling: ~2.2M gas
- Deploy ToolMarketplace: ~3.5M gas
- Purchase License: ~250k gas
- Leave Review: ~100k gas

## Upgradeability

All contracts use the UUPS (Universal Upgradeable Proxy Standard) pattern:

- Upgrader role required
- State preserved across upgrades
- Gas-efficient proxy pattern
- Secure upgrade authorization

## License

MIT License - See individual contract files for details.

## Support

For issues or questions:
- Open an issue in the repository
- Contact the Varity development team
- Check the explorer for transaction details

## Deployed Addresses

**To be filled after deployment**

```
RevenueSplitter: 0x...
ToolLicenseNFT: 0x...
SubscriptionBilling: 0x...
ToolMarketplace: 0x...
```

## Next Steps

1. Deploy contracts with `npm run deploy`
2. Verify contracts on explorer
3. Update `.env.local` with addresses
4. Test purchasing a license
5. Integrate with frontend dashboard
6. Add more tools as needed
