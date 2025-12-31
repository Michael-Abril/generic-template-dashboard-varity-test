// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VarityDataCommitments
 * @author Varity Labs
 * @notice Stores data commitments for verifiable data integrity on Varity L3 Arbitrum
 * @dev Uses Merkle tree batch commits for 200x cost reduction
 *
 * Varity L3 Testnet (Conduit - Arbitrum Stack AnyTrust):
 * - Chain ID: 33529
 * - RPC: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
 * - Explorer: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/
 * - Native Token: USDC (0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)
 *
 * Architecture:
 * 1. Encrypted data stored on IPFS/Pinata with CID
 * 2. cidHash + contentHash committed on-chain for verification
 * 3. Batch commits use Merkle roots for efficiency
 * 4. Events enable off-chain indexing for fast queries
 */
contract VarityDataCommitments {
    // ============ Structs ============

    /**
     * @notice Single data commitment record
     * @param cidHash keccak256 hash of the IPFS CID
     * @param contentHash keccak256 hash of encrypted content
     * @param timestamp Block timestamp when committed
     * @param dataType Integration data type identifier
     */
    struct DataCommitment {
        bytes32 cidHash;
        bytes32 contentHash;
        uint64 timestamp;
        uint32 dataType;
    }

    /**
     * @notice Batch commit using Merkle root
     * @param merkleRoot Root of Merkle tree containing commitments
     * @param itemCount Number of items in the batch
     * @param timestamp Block timestamp when committed
     */
    struct BatchCommitment {
        bytes32 merkleRoot;
        uint32 itemCount;
        uint64 timestamp;
    }

    // ============ Storage ============

    // user => integration => cidHash => DataCommitment
    mapping(address => mapping(string => mapping(bytes32 => DataCommitment))) public commitments;

    // user => integration => batchId => BatchCommitment
    mapping(address => mapping(string => mapping(uint256 => BatchCommitment))) public batches;

    // user => integration => batch count
    mapping(address => mapping(string => uint256)) public batchCount;

    // ============ Events ============

    /**
     * @notice Emitted when a single data item is committed
     * @dev Full CID stored in event (cheaper than storage) for indexers
     */
    event DataCommitted(
        address indexed user,
        string indexed integration,
        bytes32 cidHash,
        bytes32 contentHash,
        uint32 dataType,
        string cid  // Full CID for indexers
    );

    /**
     * @notice Emitted when a batch is committed via Merkle root
     */
    event BatchCommitted(
        address indexed user,
        string indexed integration,
        uint256 indexed batchId,
        bytes32 merkleRoot,
        uint32 itemCount
    );

    /**
     * @notice Emitted when data integrity is verified
     */
    event DataVerified(
        address indexed user,
        string indexed integration,
        bytes32 cidHash,
        bool isValid
    );

    // ============ Write Functions ============

    /**
     * @notice Commit a single data item
     * @param integration Integration name (e.g., "google", "slack")
     * @param cidHash keccak256(CID)
     * @param contentHash keccak256(encrypted_content)
     * @param dataType Data type identifier
     * @param cid Full IPFS CID string for event logging
     */
    function commitData(
        string calldata integration,
        bytes32 cidHash,
        bytes32 contentHash,
        uint32 dataType,
        string calldata cid
    ) external {
        require(cidHash != bytes32(0), "Invalid CID hash");
        require(contentHash != bytes32(0), "Invalid content hash");

        commitments[msg.sender][integration][cidHash] = DataCommitment({
            cidHash: cidHash,
            contentHash: contentHash,
            timestamp: uint64(block.timestamp),
            dataType: dataType
        });

        emit DataCommitted(
            msg.sender,
            integration,
            cidHash,
            contentHash,
            dataType,
            cid
        );
    }

    /**
     * @notice Commit multiple items via Merkle root (200x more efficient)
     * @dev Leaf = keccak256(abi.encodePacked(cidHash, contentHash))
     * @param integration Integration name
     * @param merkleRoot Root of Merkle tree
     * @param itemCount Number of items in batch
     */
    function commitBatch(
        string calldata integration,
        bytes32 merkleRoot,
        uint32 itemCount
    ) external {
        require(merkleRoot != bytes32(0), "Invalid Merkle root");
        require(itemCount > 0, "Empty batch");

        uint256 batchId = batchCount[msg.sender][integration];
        batchCount[msg.sender][integration] = batchId + 1;

        batches[msg.sender][integration][batchId] = BatchCommitment({
            merkleRoot: merkleRoot,
            itemCount: itemCount,
            timestamp: uint64(block.timestamp)
        });

        emit BatchCommitted(
            msg.sender,
            integration,
            batchId,
            merkleRoot,
            itemCount
        );
    }

    // ============ View Functions ============

    /**
     * @notice Get commitment for a specific CID
     * @param user User address
     * @param integration Integration name
     * @param cidHash keccak256(CID)
     * @return DataCommitment struct
     */
    function getCommitment(
        address user,
        string calldata integration,
        bytes32 cidHash
    ) external view returns (DataCommitment memory) {
        return commitments[user][integration][cidHash];
    }

    /**
     * @notice Get batch commitment by ID
     * @param user User address
     * @param integration Integration name
     * @param batchId Batch ID
     * @return BatchCommitment struct
     */
    function getBatch(
        address user,
        string calldata integration,
        uint256 batchId
    ) external view returns (BatchCommitment memory) {
        return batches[user][integration][batchId];
    }

    /**
     * @notice Get user's batch count for an integration
     * @param user User address
     * @param integration Integration name
     * @return Number of batches
     */
    function getBatchCount(
        address user,
        string calldata integration
    ) external view returns (uint256) {
        return batchCount[user][integration];
    }

    /**
     * @notice Verify data integrity against on-chain commitment
     * @param user User address
     * @param integration Integration name
     * @param cidHash keccak256(CID)
     * @param contentHash keccak256(encrypted_content) to verify
     * @return isValid True if content hash matches commitment
     */
    function verifyData(
        address user,
        string calldata integration,
        bytes32 cidHash,
        bytes32 contentHash
    ) external returns (bool isValid) {
        DataCommitment storage commitment = commitments[user][integration][cidHash];

        if (commitment.cidHash == bytes32(0)) {
            emit DataVerified(user, integration, cidHash, false);
            return false;
        }

        isValid = commitment.contentHash == contentHash;
        emit DataVerified(user, integration, cidHash, isValid);
        return isValid;
    }

    /**
     * @notice Verify Merkle proof for batch item
     * @param user User address
     * @param integration Integration name
     * @param batchId Batch ID
     * @param leaf Leaf node = keccak256(abi.encodePacked(cidHash, contentHash))
     * @param proof Merkle proof (array of sibling hashes)
     * @return isValid True if proof is valid against stored Merkle root
     */
    function verifyBatchItem(
        address user,
        string calldata integration,
        uint256 batchId,
        bytes32 leaf,
        bytes32[] calldata proof
    ) external view returns (bool isValid) {
        BatchCommitment storage batch = batches[user][integration][batchId];

        if (batch.merkleRoot == bytes32(0)) {
            return false;
        }

        bytes32 computedRoot = _computeMerkleRoot(leaf, proof);
        return computedRoot == batch.merkleRoot;
    }

    // ============ Internal Functions ============

    /**
     * @notice Compute Merkle root from leaf and proof
     * @param leaf Starting leaf hash
     * @param proof Array of sibling hashes
     * @return Computed Merkle root
     */
    function _computeMerkleRoot(
        bytes32 leaf,
        bytes32[] calldata proof
    ) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            // Sort hashes before combining (ensures deterministic tree)
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash;
    }
}
