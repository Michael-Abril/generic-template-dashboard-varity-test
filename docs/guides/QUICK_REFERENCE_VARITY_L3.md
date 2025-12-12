# Varity L3 Quick Reference Card

## Network Info
- **Chain ID**: 33529
- **RPC**: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
- **Explorer**: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz

## Contract Addresses

| Contract | Address |
|----------|---------|
| ToolMarketplace | 0xa6A4c92C42a72A6946Dd304c4Ec10a84B0E98598 |
| ToolLicenseNFT | 0x56125b00de0eB47a77417c10E633B47bC631715d |
| SubscriptionBilling | 0x055E9111520047c1f4c754269CC84908fF62157B |
| RevenueSplitter | 0xc48f586717Cc471EddF4b87B2046280D07e460FA |
| USDC | 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d |

## Available Tools (8)

1. QuickBooks - $49/mo
2. Salesforce - $99/mo
3. Shopify - $79/mo
4. Monday.com - $45/mo
5. Stripe - FREE
6. Slack - $8/mo
7. HubSpot - $120/mo
8. Zendesk - $89/mo

## Testing Commands

```bash
# Start frontend
npm run dev

# Check balance
cd contracts
npx hardhat run scripts/checkBalance.ts --network varityTestnet

# Verify contracts
npx hardhat verify --network varityTestnet <ADDRESS>
```

## Explorer Links

- **ToolMarketplace**: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/address/0xa6A4c92C42a72A6946Dd304c4Ec10a84B0E98598
- **Deployer**: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/address/0x20B7d1426649D9a573ba7Fd10592456264220cbF

## Status
✅ Deployed
✅ Configured
✅ Verified (ToolMarketplace)
✅ Frontend Updated
