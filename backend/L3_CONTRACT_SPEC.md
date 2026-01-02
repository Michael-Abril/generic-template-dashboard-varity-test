# VarityDataCommitments Smart Contract Specification

**Blockchain:** Varity L3 (Conduit Arbitrum Orbit)
**Chain ID:** 33529
**Network:** Testnet
**RPC:** https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
**Explorer:** https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz

---

## Contract Overview

The `VarityDataCommitments` contract enables on-chain verification of data integrity for all customer data stored in Pinata/IPFS.

**Purpose:**
- Store Merkle root commitments for data batches
- Verify data integrity via CID + content hash
- Provide audit trail of data commits
- Enable customer verification of data immutability

---

## Solidity Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VarityDataCommitments {

    // Data structure for stored commitments
    struct DataCommitment {
        bytes32 cidHash;           // Keccak256(CID string)
        bytes32 contentHash;       // Keccak256(encrypted content)
        uint64 timestamp;          // Block timestamp
        uint32 dataType;           // Data type enum
        address wallet;            // User wallet address
        string integration;        // Integration name (google, slack, etc)
    }

    // Storage: wallet → integration → cidHash → commitment
    mapping(address => mapping(string => mapping(bytes32 => DataCommitment)))
        public commitments;

    // Batch commits: wallet → integration → merkleRoot
    mapping(address => mapping(string => mapping(bytes32 => BatchInfo)))
        public batchCommits;

    struct BatchInfo {
        bytes32 merkleRoot;
        uint32 itemCount;
        uint64 timestamp;
    }

    // Events
    event DataCommitted(
        address indexed wallet,
        string indexed integration,
        bytes32 indexed cidHash,
        bytes32 contentHash,
        uint32 dataType,
        uint64 timestamp
    );

    event BatchCommitted(
        address indexed wallet,
        string indexed integration,
        bytes32 indexed merkleRoot,
        uint32 itemCount,
        uint64 timestamp
    );

    // ================================================================
    // WRITE FUNCTIONS
    // ================================================================

    /**
     * Commit a single data item to the blockchain.
     *
     * Less efficient than batch commits - use batch for production.
     *
     * @param integration Integration name (e.g., "google", "slack")
     * @param cidHash Keccak256(CID)
     * @param contentHash Keccak256(encrypted content)
     * @param dataType Data type identifier (0=drive, 1=email, etc)
     * @param size Size of content in bytes
     */
    function commitData(
        string calldata integration,
        bytes32 cidHash,
        bytes32 contentHash,
        uint32 dataType,
        uint32 size
    ) external {
        require(bytes(integration).length > 0, "Invalid integration");
        require(cidHash != bytes32(0), "Invalid cidHash");
        require(contentHash != bytes32(0), "Invalid contentHash");

        DataCommitment storage dc = commitments[msg.sender][integration][cidHash];
        dc.cidHash = cidHash;
        dc.contentHash = contentHash;
        dc.timestamp = uint64(block.timestamp);
        dc.dataType = dataType;
        dc.wallet = msg.sender;
        dc.integration = integration;

        emit DataCommitted(
            msg.sender,
            integration,
            cidHash,
            contentHash,
            dataType,
            uint64(block.timestamp)
        );
    }

    /**
     * Commit a batch of data items via Merkle root.
     *
     * 200x more efficient than individual commits.
     * Gas: ~25,000 for entire batch vs 50,000 per item.
     *
     * Backend computes Merkle tree and provides root.
     *
     * @param integration Integration name
     * @param merkleRoot Merkle root of all items
     * @param itemCount Number of items in batch
     */
    function commitBatch(
        string calldata integration,
        bytes32 merkleRoot,
        uint32 itemCount
    ) external {
        require(bytes(integration).length > 0, "Invalid integration");
        require(merkleRoot != bytes32(0), "Invalid merkleRoot");
        require(itemCount > 0, "Invalid itemCount");

        BatchInfo storage batch = batchCommits[msg.sender][integration][merkleRoot];
        batch.merkleRoot = merkleRoot;
        batch.itemCount = itemCount;
        batch.timestamp = uint64(block.timestamp);

        emit BatchCommitted(
            msg.sender,
            integration,
            merkleRoot,
            itemCount,
            uint64(block.timestamp)
        );
    }

    // ================================================================
    // READ FUNCTIONS
    // ================================================================

    /**
     * Get commitment for a specific data item.
     *
     * @param user User wallet address
     * @param integration Integration name
     * @param cidHash Keccak256(CID)
     * @return commitment Data commitment record
     */
    function getCommitment(
        address user,
        string calldata integration,
        bytes32 cidHash
    ) external view returns (DataCommitment memory) {
        return commitments[user][integration][cidHash];
    }

    /**
     * Get batch commitment.
     *
     * @param user User wallet address
     * @param integration Integration name
     * @param merkleRoot Merkle root
     * @return batch Batch commitment record
     */
    function getBatch(
        address user,
        string calldata integration,
        bytes32 merkleRoot
    ) external view returns (BatchInfo memory) {
        return batchCommits[user][integration][merkleRoot];
    }

    /**
     * Verify that data exists for a wallet.
     *
     * @param user User wallet address
     * @param integration Integration name
     * @param cidHash Keccak256(CID)
     * @return exists True if commitment exists
     */
    function hasCommitment(
        address user,
        string calldata integration,
        bytes32 cidHash
    ) external view returns (bool) {
        return commitments[user][integration][cidHash].timestamp > 0;
    }
}
```

---

## Data Types

```solidity
enum DataType {
    DRIVE_FILES = 0,      // Google Drive, OneDrive, etc
    CONTACTS = 1,         // Google Contacts, Outlook, etc
    EMAILS = 2,           // Gmail, Outlook, etc
    CALENDAR_EVENTS = 3,  // Google Calendar, Outlook, etc
    SLACK_FILES = 4,      // Slack files
    SLACK_MESSAGES = 5,   // Slack messages
    QB_INVOICES = 6,      // QuickBooks invoices
    QB_CUSTOMERS = 7,     // QuickBooks customers
    SF_RECORDS = 8,       // Salesforce records
    HS_CONTACTS = 9,      // HubSpot contacts
    GENERIC = 255,        // Generic/unknown
}
```

---

## Deployment

### Hardhat Configuration

```javascript
// hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    "varity-testnet": {
      url: "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 33529,
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      "varity-testnet": "PLACEHOLDER", // Conduit explorer doesn't need API key
    },
    customChains: [
      {
        network: "varity-testnet",
        chainId: 33529,
        urls: {
          apiURL: "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/api",
          browserURL: "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
        },
      },
    ],
  },
};
```

### Deploy Script

```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}`);

  // Get balance
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} ETH`);

  // Deploy contract
  const VarityDataCommitments = await hre.ethers.getContractFactory(
    "VarityDataCommitments"
  );
  const contract = await VarityDataCommitments.deploy();
  await contract.deployed();

  console.log("✅ VarityDataCommitments deployed to:", contract.address);

  // Save deployment info
  const deploymentInfo = {
    contract: "VarityDataCommitments",
    address: contract.address,
    deployer: deployer.address,
    chainId: (await ethers.provider.getNetwork()).chainId,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployments.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📋 Deployment saved to deployments.json");
  console.log("\n🔧 Next steps:");
  console.log(`1. Set env var: VARITY_DATA_COMMITMENTS_ADDRESS=${contract.address}`);
  console.log(
    `2. Verify on explorer: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/address/${contract.address}`
  );
  console.log("3. Restart backend: railway redeploy");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Deploy Command

```bash
# Install Hardhat
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers @nomiclabs/hardhat-waffle

# Compile contract
npx hardhat compile

# Deploy to Varity L3 Testnet
DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.js --network varity-testnet

# Expected output:
# ✅ VarityDataCommitments deployed to: 0x...
```

---

## Backend Integration

### Configuration

```python
# app/core/config.py
varity_data_commitments_address: Optional[str] = Field(
    None,
    env="VARITY_DATA_COMMITMENTS_ADDRESS"
)

varity_l3_private_key: Optional[str] = Field(
    None,
    env="VARITY_L3_PRIVATE_KEY"
)
```

### Initialization

```python
# app/services/l3_commitment_service.py
from app.core.config import settings

class L3DataCommitmentService:
    CONTRACT_ADDRESS = settings.varity_data_commitments_address

    def __init__(self):
        self.account = None
        if settings.varity_l3_private_key:
            self.account = self.w3.eth.account.from_key(
                settings.varity_l3_private_key
            )
        self.contract = self._load_contract()
```

### Usage in MCP Pipeline

```python
# app/services/mcp_ingestion_service.py
from app.services.l3_commitment_service import get_l3_service

async def _flush_batch_to_l3(self, wallet_address: str):
    """Commit pending items to L3 as Merkle batch"""

    l3_service = get_l3_service()

    # Batch commit 50 items
    result = await l3_service.commit_batch(
        items=[
            {"cid": "QmXxx", "content": encrypted_bytes},
            ...
        ],
        integration="google",
        wallet_address=wallet_address,
    )

    # result = {
    #     "tx_hash": "0x...",
    #     "merkle_root": "0x...",
    #     "item_count": 50,
    #     "l3_committed": true,
    #     "gas_used": 25000,
    # }
```

---

## Gas Optimization

### Single Commit vs Batch

| Operation | Items | Gas | Cost* |
|-----------|-------|-----|-------|
| Single commit | 1 | 50,000 | $0.50 |
| Single commit | 10 | 500,000 | $5.00 |
| Batch commit | 1 | 25,000 | $0.25 |
| Batch commit | 50 | 25,000 | $0.25 |
| Batch commit | 100 | 25,000 | $0.25 |

*Assumes $0.01 per gas unit on L3 (varies with network load)

**Cost Reduction:** 200x cheaper for batch commits!

---

## Event Monitoring

### Listen for Data Commits

```javascript
// Frontend or monitoring service
contract.on("DataCommitted", (wallet, integration, cidHash, contentHash, event) => {
  console.log(`User ${wallet} committed ${integration} data`);
});

contract.on("BatchCommitted", (wallet, integration, merkleRoot, itemCount, event) => {
  console.log(`User ${wallet} batch committed ${itemCount} items`);
});
```

---

## Verification Tools

### Verify Data Commitment

```bash
# Check if specific CID was committed
curl -X POST https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [
      {
        "to": "0x<CONTRACT_ADDRESS>",
        "data": "0x<FUNCTION_SELECTOR><ENCODED_PARAMS>"
      },
      "latest"
    ],
    "id": 1
  }'
```

### Get Commitment Details

```python
from web3 import Web3
from eth_abi import decode

w3 = Web3(Web3.HTTPProvider("https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz"))

# Get commitment (view function)
commitment = contract.functions.getCommitment(
    wallet_address,
    "google",
    cid_hash
).call()

# Result: (cidHash, contentHash, timestamp, dataType)
print(f"Committed at: {commitment[2]}")  # timestamp
```

---

## Security Considerations

### Private Key Management

**NEVER** commit private keys to Git:

```bash
# Generate key for Railway environment variable
openssl rand -hex 32

# Use only with VARITY_L3_PRIVATE_KEY environment variable
# Railway stores this securely (encrypted at rest)
```

### Contract Upgrades

Current contract is intentionally simple to minimize attack surface.

If upgrades needed:
1. Deploy new contract
2. Update VARITY_DATA_COMMITMENTS_ADDRESS
3. Migrate historical data (optional)
4. Announce deprecation of old contract

### Access Control

Contract has no access control (anyone can commit):
- Relies on wallet-based verification
- Each wallet's data is isolated via mapping key
- No admin functions (fully immutable)

---

## Testing

### Unit Tests

```javascript
// test/VarityDataCommitments.test.js
const { expect } = require("chai");

describe("VarityDataCommitments", () => {
  let contract;
  let owner;

  beforeEach(async () => {
    const VarityDataCommitments = await ethers.getContractFactory(
      "VarityDataCommitments"
    );
    contract = await VarityDataCommitments.deploy();
    [owner] = await ethers.getSigners();
  });

  it("Should commit single data item", async () => {
    const cidHash = ethers.utils.id("QmXxx");
    const contentHash = ethers.utils.id("content");

    await expect(
      contract.commitData("google", cidHash, contentHash, 0, 1000)
    )
      .to.emit(contract, "DataCommitted")
      .withArgs(owner.address, "google", cidHash, contentHash, 0);

    const commitment = await contract.getCommitment(
      owner.address,
      "google",
      cidHash
    );
    expect(commitment.cidHash).to.equal(cidHash);
  });

  it("Should commit batch via merkle root", async () => {
    const merkleRoot = ethers.utils.id("merkle");

    await expect(contract.commitBatch("slack", merkleRoot, 50))
      .to.emit(contract, "BatchCommitted")
      .withArgs(owner.address, "slack", merkleRoot, 50);
  });
});
```

### Run Tests

```bash
# Compile
npx hardhat compile

# Test locally
npx hardhat test

# Test on testnet
npx hardhat test --network varity-testnet
```

---

## Monitoring & Alerts

### Setup Log Monitoring

```bash
# Monitor contract events
web3.eth.subscribe('logs', {
  address: CONTRACT_ADDRESS,
  topics: [
    // DataCommitted event
    web3.utils.keccak256('DataCommitted(address,string,bytes32,bytes32,uint32,uint64)')
  ]
}, (error, result) => {
  console.log("New data commitment:", result);
});
```

### Alert on Failures

```python
# app/services/l3_commitment_service.py
try:
    result = await l3_service.commit_batch(...)
    if not result.get("l3_committed"):
        logger.error("L3 commitment failed", extra={"result": result})
        # Send alert to admin
except Exception as e:
    logger.critical("L3 exception", exc_info=True)
    # Send critical alert
```

---

## References

- Varity L3: https://hub.conduit.xyz/varity-testnet-rroe52pwjp
- Solidity Docs: https://docs.soliditylang.org
- Hardhat Docs: https://hardhat.org
- Arbitrum Orbit: https://docs.arbitrum.io/launch-orbit-chain
