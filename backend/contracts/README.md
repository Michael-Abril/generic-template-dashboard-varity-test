# Varity Smart Contracts

Production-grade smart contracts for the Varity data commitment system on Varity L3 Testnet (Arbitrum Stack).

## Network Configuration

| Property | Value |
|----------|-------|
| **Network Name** | Varity L3 Testnet |
| **Chain ID** | 33529 |
| **RPC URL** | https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz |
| **Explorer** | https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/ |
| **Native Token** | USDC (0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d) |
| **Data Availability** | AnyTrust |
| **Framework** | Arbitrum Stack via Conduit |

## Contracts

### VarityDataCommitments

Stores data commitments for verifiable data integrity. Supports both individual commits and batch commits via Merkle trees for 200x cost reduction.

**Features:**
- Individual data commitments with CID hash + content hash
- Batch commitments using Merkle roots (200x cheaper for bulk data)
- Multi-tenant isolation (per-user, per-integration)
- On-chain verification for data integrity
- Event logging for off-chain indexing

## Prerequisites

1. **Install Foundry**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Clone and Setup**
   ```bash
   cd backend/contracts
   make install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your private key
   ```

## Quick Start

### Build

```bash
make build
```

### Test

```bash
make test
```

### Deploy to Varity L3 Testnet

```bash
# Set your private key
export DEPLOYER_PRIVATE_KEY=your_private_key_here

# Deploy
make deploy-varity
```

## Deployment Commands

| Command | Description |
|---------|-------------|
| `make build` | Compile contracts |
| `make test` | Run all tests |
| `make test-gas` | Run tests with gas reporting |
| `make deploy-local` | Deploy to local Anvil |
| `make deploy-varity` | Deploy to Varity L3 Testnet |
| `make deploy-varity-verify` | Deploy and verify on explorer |
| `make verify-varity CONTRACT_ADDRESS=0x...` | Verify existing deployment |
| `make network-info` | Show Varity L3 network details |
| `make help` | Show all available commands |

## Manual Deployment

If you prefer to run Foundry commands directly:

```bash
# 1. Build
forge build --via-ir

# 2. Deploy to Varity L3
forge script script/Deploy.s.sol:DeployVarityDataCommitments \
  --rpc-url https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --slow \
  --via-ir

# 3. Verify on explorer
forge verify-contract \
  <DEPLOYED_ADDRESS> \
  VarityDataCommitments \
  --chain-id 33529 \
  --verifier blockscout \
  --verifier-url https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/api
```

## Post-Deployment

### 1. Update Backend Environment

Add to your backend `.env`:

```bash
VARITY_L3_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
VARITY_L3_CHAIN_ID=33529
VARITY_DATA_COMMITMENTS_ADDRESS=<deployed_address>
VARITY_SIGNER_PRIVATE_KEY=<backend_signer_key>
```

### 2. Test the Deployment

```bash
make test-commitment CONTRACT_ADDRESS=<deployed_address>
```

### 3. Verify on Explorer

Visit the explorer and check your contract:
```
https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/address/<deployed_address>
```

## Contract Interface

### Write Functions

```solidity
// Commit single data item
function commitData(
    string calldata integration,    // e.g., "google", "slack"
    bytes32 cidHash,                // keccak256(CID)
    bytes32 contentHash,            // keccak256(encrypted_content)
    uint32 dataType,                // Data type identifier
    string calldata cid             // Full IPFS CID for indexers
) external;

// Commit batch via Merkle root (200x cheaper)
function commitBatch(
    string calldata integration,
    bytes32 merkleRoot,
    uint32 itemCount
) external;
```

### View Functions

```solidity
// Get commitment for specific CID
function getCommitment(
    address user,
    string calldata integration,
    bytes32 cidHash
) external view returns (DataCommitment memory);

// Verify data integrity
function verifyData(
    address user,
    string calldata integration,
    bytes32 cidHash,
    bytes32 contentHash
) external returns (bool isValid);

// Verify batch item with Merkle proof
function verifyBatchItem(
    address user,
    string calldata integration,
    uint256 batchId,
    bytes32 leaf,
    bytes32[] calldata proof
) external view returns (bool isValid);
```

## Gas Estimates

| Operation | Estimated Gas | Notes |
|-----------|---------------|-------|
| `commitData` | ~80,000 | Single item storage + event |
| `commitBatch` | ~60,000 | Fixed cost regardless of batch size |
| `verifyData` | ~30,000 | Read + event emission |
| `verifyBatchItem` | ~10,000 | Pure Merkle proof verification |

**Batch Efficiency:** For 1000 items, batch commit costs ~60,000 gas vs ~80,000,000 for individual commits (1333x savings).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend/Backend                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Varity L3 Testnet                             │
│                    (Arbitrum Orbit)                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              VarityDataCommitments Contract                │  │
│  │  - commitData(integration, cidHash, contentHash, ...)     │  │
│  │  - commitBatch(integration, merkleRoot, itemCount)        │  │
│  │  - verifyData(user, integration, cidHash, contentHash)    │  │
│  │  - verifyBatchItem(user, integration, batchId, leaf, ...) │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AnyTrust DA Layer                          │
│              (Data Availability Committee)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Security Considerations

1. **Multi-Tenant Isolation**: Each user's data is isolated by address
2. **Integration Namespacing**: Data is further isolated by integration name
3. **Immutable Commits**: Once committed, data hashes cannot be deleted
4. **Verification Events**: All verifications emit events for audit trails
5. **No Admin Keys**: Contract has no owner or upgrade mechanisms

## Testing

```bash
# Run all tests
make test

# Run with verbosity
forge test -vvvv

# Run specific test
forge test --match-test test_CommitData_Success -vvv

# Gas report
make test-gas

# Coverage
make test-coverage

# Fuzz testing (extended)
make test-fuzz
```

## Directory Structure

```
contracts/
├── VarityDataCommitments.sol    # Main contract
├── script/
│   └── Deploy.s.sol             # Deployment scripts
├── test/
│   └── VarityDataCommitments.t.sol  # Test suite
├── lib/                         # Dependencies (forge-std)
├── foundry.toml                 # Foundry configuration
├── Makefile                     # Build/deploy commands
├── .env.example                 # Environment template
└── README.md                    # This file
```

## Troubleshooting

### "Insufficient funds"
Ensure your deployer wallet has USDC (the native token on Varity L3).

### "Contract verification failed"
The Conduit explorer uses Blockscout. Ensure you're using the correct verifier:
```bash
--verifier blockscout \
--verifier-url https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/api
```

### "RPC timeout"
Add `--slow` flag to deployment command for rate-limited RPCs.

## License

MIT License - Varity Labs 2025
