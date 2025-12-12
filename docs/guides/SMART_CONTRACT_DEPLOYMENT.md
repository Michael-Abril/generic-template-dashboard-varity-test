# Smart Contract Deployment Guide for Varity L3 Marketplace

## Overview
This guide explains how to deploy the marketplace smart contract to Varity L3 Arbitrum testnet for the generic company dashboard.

## Prerequisites
- Node.js 16+
- Hardhat or Foundry
- Varity L3 testnet ETH for gas
- Connected wallet with deployment permissions

## Varity L3 Testnet Configuration
```json
{
  "chainId": 33529,
  "chainName": "Varity L3 Testnet",
  "rpcUrl": "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
  "nativeCurrency": {
    "name": "Ethereum",
    "symbol": "ETH",
    "decimals": 18
  },
  "blockExplorer": "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz"
}
```

## Smart Contract Features Required

### 1. License NFT Management
```solidity
contract MarketplaceLicense {
    // Mint license NFT on purchase
    function purchaseLicense(
        uint256 productId,
        string memory tier,
        uint256 userCount,
        uint256 billingPeriod
    ) external payable returns (uint256 tokenId);

    // Check if user owns license for product
    function hasActiveLicense(
        address user,
        uint256 productId
    ) external view returns (bool);
}
```

### 2. Subscription Management
```solidity
contract SubscriptionManager {
    // Track recurring payments
    mapping(uint256 => Subscription) public subscriptions;

    struct Subscription {
        address owner;
        uint256 productId;
        uint256 nextPaymentDate;
        uint256 amount;
        bool active;
    }
}
```

### 3. OAuth Token Encryption
```solidity
// Store encrypted OAuth tokens on-chain
// Use Lit Protocol for access control
mapping(address => mapping(uint256 => bytes)) encryptedTokens;
```

## Deployment Steps

### Step 1: Install Dependencies
```bash
npm install --save-dev hardhat @openzeppelin/contracts
```

### Step 2: Configure Hardhat
```javascript
// hardhat.config.js
module.exports = {
  networks: {
    varietyL3: {
      url: "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
      chainId: 33529,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    }
  }
};
```

### Step 3: Deploy Contract
```bash
npx hardhat run scripts/deploy.js --network varietyL3
```

### Step 4: Verify Contract
```bash
npx hardhat verify --network varietyL3 <CONTRACT_ADDRESS>
```

### Step 5: Update Backend Configuration
Add to `.env`:
```bash
MARKETPLACE_CONTRACT=0x... # Your deployed contract address
```

## Integration with Backend

### Purchase Flow
1. User selects product and plan
2. Backend calculates price
3. Frontend initiates Web3 transaction
4. Smart contract mints license NFT
5. Backend records transaction hash
6. Backend activates OAuth connections

### Security Considerations
- Use OpenZeppelin's security patterns
- Implement reentrancy guards
- Add pausable functionality
- Use role-based access control
- Audit contract before mainnet deployment

## Testing on Testnet

### Get Test ETH
Request testnet ETH from Varity L3 faucet or bridge from Arbitrum Sepolia

### Test Purchase Flow
1. Deploy contract to testnet
2. Update `.env` with contract address
3. Run marketplace test:
```bash
python3 test_marketplace_full.py
```

## Production Checklist
- [ ] Contract audited by security firm
- [ ] Multi-sig wallet for admin functions
- [ ] Upgradeable proxy pattern implemented
- [ ] Gas optimization completed
- [ ] Emergency pause mechanism tested
- [ ] Integration tests passed
- [ ] Monitoring and alerts configured

## Support
For assistance with Varity L3 deployment:
- Documentation: https://docs.varity.xyz
- Discord: https://discord.gg/varity
- GitHub: https://github.com/varity-network