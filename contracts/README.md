# Varity Tool Marketplace Contracts

Smart contracts for the tool marketplace on Varity L3 Testnet.

## Quick Start

```bash
# Install dependencies
npm install

# Configure deployment
cp .env.example .env
# Edit .env and add your PRIVATE_KEY

# Deploy contracts
npm run deploy

# Verify contracts
npx hardhat verify --network varityTestnet <CONTRACT_ADDRESS>
```

## Deployed Contracts

After deployment, update these in your main `.env.local`:

```bash
NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_TOOL_LICENSE_NFT_ADDRESS=0x...
NEXT_PUBLIC_SUBSCRIPTION_BILLING_ADDRESS=0x...
NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS=0x...
```

## Contract Summary

1. **ToolLicenseNFT** (ERC-1155) - Multi-token licenses for tools
2. **ToolMarketplace** - Purchase licenses with USDC
3. **SubscriptionBilling** - Manage subscription lifecycle
4. **RevenueSplitter** - Automatic 70/30 split (Varity/Developer)

## Listed Tools

- QuickBooks (Accounting) - $49/month
- Salesforce (CRM) - $99/month
- Shopify (E-commerce) - $79/month
- Monday.com (Project Management) - $45/month
- Stripe (Payments) - Free
- Slack (Communication) - $8/month
- HubSpot (Marketing) - $120/month
- Zendesk (Support) - $89/month

## Documentation

See [CONTRACTS.md](./CONTRACTS.md) for complete documentation.
