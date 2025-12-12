# Tool Marketplace Deployment Guide

## Pre-Deployment Checklist

- [ ] Node.js and npm installed
- [ ] Hardhat installed (`npm install`)
- [ ] Private key with testnet ETH for gas fees
- [ ] USDC tokens for testing (address: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)
- [ ] `.env` file configured with PRIVATE_KEY

## Step-by-Step Deployment

### 1. Setup Environment

```bash
cd contracts
npm install
cp .env.example .env
```

Edit `.env` and add your private key:
```
PRIVATE_KEY=your_private_key_here
```

### 2. Get Testnet ETH

You need testnet ETH for gas fees on Varity L3 Testnet:

- **Network**: Varity L3 Testnet
- **Chain ID**: 33529
- **RPC URL**: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz

Add the network to your wallet (MetaMask, etc.) and request testnet ETH from the faucet or bridge from Arbitrum Sepolia.

### 3. Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 4 Solidity files successfully
```

### 4. Deploy Contracts

```bash
npm run deploy
```

This will:
1. Deploy RevenueSplitter
2. Deploy ToolLicenseNFT (ERC-1155)
3. Deploy SubscriptionBilling
4. Deploy ToolMarketplace
5. Grant necessary roles to marketplace
6. Whitelist USDC in RevenueSplitter
7. List 8 tools in the marketplace

**Expected Deployment Time**: 2-3 minutes

### 5. Save Deployment Addresses

The deployment script will output:

```
Deployed Contract Addresses:
- RevenueSplitter: 0x...
- ToolLicenseNFT: 0x...
- SubscriptionBilling: 0x...
- ToolMarketplace: 0x...
```

**SAVE THESE ADDRESSES!** You'll need them for verification and frontend integration.

### 6. Verify Contracts on Explorer

Verify each contract individually:

```bash
npx hardhat verify --network varityTestnet <REVENUE_SPLITTER_ADDRESS>
npx hardhat verify --network varityTestnet <TOOL_LICENSE_NFT_ADDRESS>
npx hardhat verify --network varityTestnet <SUBSCRIPTION_BILLING_ADDRESS>
npx hardhat verify --network varityTestnet <TOOL_MARKETPLACE_ADDRESS>
```

Visit the explorer to confirm verification:
https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz

### 7. Update .env.local

Add the contract addresses to your main `.env.local` file:

```bash
cd ..  # Back to generic-company-dashboard directory

echo "NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS=0x..." >> .env.local
echo "NEXT_PUBLIC_TOOL_LICENSE_NFT_ADDRESS=0x..." >> .env.local
echo "NEXT_PUBLIC_SUBSCRIPTION_BILLING_ADDRESS=0x..." >> .env.local
echo "NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS=0x..." >> .env.local
```

### 8. Test the Deployment

#### Check Listed Tools

```bash
npx hardhat run scripts/checkTools.ts --network varityTestnet
```

Expected: 8 tools listed (QuickBooks, Salesforce, Shopify, Monday.com, Stripe, Slack, HubSpot, Zendesk)

#### Test Purchase Flow (Optional)

1. Get USDC tokens on testnet
2. Approve marketplace to spend USDC
3. Purchase a license
4. Verify license NFT received
5. Check subscription is active

## Tools Listed After Deployment

| Tool ID | Tool Name | Category | Monthly Price |
|---------|-----------|----------|---------------|
| 0 | QuickBooks | Accounting | $49 USDC |
| 1 | Salesforce | CRM | $99 USDC |
| 2 | Shopify | E-commerce | $79 USDC |
| 3 | Monday.com | Project Management | $45 USDC |
| 4 | Stripe | Payments | Free |
| 5 | Slack | Communication | $8 USDC |
| 6 | HubSpot | Marketing | $120 USDC |
| 7 | Zendesk | Support | $89 USDC |

## Post-Deployment Configuration

### Revenue Split Configuration

Default revenue split is 70/30 (Varity/Developer):
- **Varity**: 70% sent to treasury immediately
- **Developer**: 30% available for withdrawal

To update treasury address (admin only):
```javascript
await revenueSplitter.updateTreasury(newTreasuryAddress);
```

### Add More Tools

To list additional tools (admin only):

```javascript
await toolMarketplace.listTool(
  "New Tool Name",
  "Category",
  priceInUSDC, // e.g., 50000000 for $50
  "ipfs://metadata-uri"
);
```

### Whitelist Additional Tokens

To accept other stablecoins (admin only):

```javascript
await revenueSplitter.setTokenWhitelist(tokenAddress, true);
```

## Troubleshooting

### Deployment Fails

**Problem**: Out of gas or insufficient ETH
**Solution**: Get more testnet ETH for gas fees

**Problem**: Contract already deployed
**Solution**: Use a different deployer address or redeploy to a fresh network

### Verification Fails

**Problem**: Contract not verified on explorer
**Solution**: Wait 1-2 minutes after deployment, then retry verification

**Problem**: Compiler version mismatch
**Solution**: Ensure Hardhat config uses Solidity 0.8.20

### Role Assignment Issues

**Problem**: Marketplace can't mint licenses
**Solution**: Verify MINTER_ROLE was granted to marketplace address

**Problem**: Revenue split not working
**Solution**: Verify MARKETPLACE_ROLE was granted to marketplace in both RevenueSplitter and SubscriptionBilling

### USDC Not Whitelisted

**Problem**: Can't purchase with USDC
**Solution**: Call `setTokenWhitelist(USDC_ADDRESS, true)` on RevenueSplitter

## Gas Costs (Approximate)

- RevenueSplitter deployment: ~2.5M gas
- ToolLicenseNFT deployment: ~3.0M gas
- SubscriptionBilling deployment: ~2.2M gas
- ToolMarketplace deployment: ~3.5M gas
- Role grants (3): ~150k gas each
- List 8 tools: ~500k gas total

**Total Gas**: ~12.5M gas
**Estimated Cost**: Depends on L3 gas price (very low on Varity L3)

## Security Checklist

- [ ] Private key stored securely (not committed to Git)
- [ ] USDC address correct (0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)
- [ ] Treasury address set correctly
- [ ] All roles granted to correct addresses
- [ ] USDC whitelisted in RevenueSplitter
- [ ] Contracts verified on explorer
- [ ] Test purchase completed successfully
- [ ] Revenue split working correctly (70/30)

## Upgrading Contracts

All contracts use UUPS upgradeability. To upgrade:

1. Deploy new implementation:
```javascript
const NewImplementation = await ethers.getContractFactory("ToolMarketplaceV2");
const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, NewImplementation);
```

2. Verify upgrade successful:
```javascript
const version = await upgraded.version(); // If version() function exists
```

**Note**: Only addresses with UPGRADER_ROLE can upgrade contracts.

## Support

For deployment issues:
1. Check transaction on explorer for error details
2. Review Hardhat console output
3. Verify all prerequisites are met
4. Contact Varity development team

## Next Steps After Deployment

1. Integrate contracts with frontend dashboard
2. Add tool integration logic for each listed tool
3. Test purchase flow end-to-end
4. Set up monitoring for contract events
5. Configure analytics for marketplace activity
6. Add more tools as needed
7. Deploy to mainnet when ready

## Mainnet Deployment Checklist

- [ ] All contracts tested thoroughly on testnet
- [ ] Security audit completed
- [ ] Gas optimizations verified
- [ ] Treasury address is multisig
- [ ] Emergency pause tested
- [ ] Upgrade mechanisms tested
- [ ] Frontend integration complete
- [ ] User documentation ready
