// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {VarityDataCommitments} from "../VarityDataCommitments.sol";

/**
 * @title VarityDataCommitmentsTest
 * @author Varity Labs
 * @notice Comprehensive test suite for VarityDataCommitments contract
 */
contract VarityDataCommitmentsTest is Test {
    VarityDataCommitments public dataCommitments;

    address public user1 = address(0x1);
    address public user2 = address(0x2);

    string constant GOOGLE_INTEGRATION = "google";
    string constant SLACK_INTEGRATION = "slack";

    // Test data
    bytes32 constant TEST_CID_HASH = keccak256("QmTestCID123456789");
    bytes32 constant TEST_CONTENT_HASH = keccak256("encrypted_content_data");
    uint32 constant DATA_TYPE_EMAIL = 1;
    uint32 constant DATA_TYPE_CALENDAR = 2;
    string constant TEST_CID = "QmTestCID123456789";

    // Events
    event DataCommitted(
        address indexed user,
        string indexed integration,
        bytes32 cidHash,
        bytes32 contentHash,
        uint32 dataType,
        string cid
    );

    event BatchCommitted(
        address indexed user, string indexed integration, uint256 indexed batchId, bytes32 merkleRoot, uint32 itemCount
    );

    event DataVerified(address indexed user, string indexed integration, bytes32 cidHash, bool isValid);

    function setUp() public {
        dataCommitments = new VarityDataCommitments();
        vm.label(user1, "User1");
        vm.label(user2, "User2");
    }

    // =============================================================================
    // commitData Tests
    // =============================================================================

    function test_CommitData_Success() public {
        vm.prank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH, DATA_TYPE_EMAIL, TEST_CID);

        VarityDataCommitments.DataCommitment memory commitment =
            dataCommitments.getCommitment(user1, GOOGLE_INTEGRATION, TEST_CID_HASH);

        assertEq(commitment.cidHash, TEST_CID_HASH);
        assertEq(commitment.contentHash, TEST_CONTENT_HASH);
        assertEq(commitment.dataType, DATA_TYPE_EMAIL);
        assertGt(commitment.timestamp, 0);
    }

    function test_CommitData_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit DataCommitted(user1, GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH, DATA_TYPE_EMAIL, TEST_CID);

        vm.prank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH, DATA_TYPE_EMAIL, TEST_CID);
    }

    function test_CommitData_RevertOnZeroCidHash() public {
        vm.expectRevert("Invalid CID hash");
        vm.prank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, bytes32(0), TEST_CONTENT_HASH, DATA_TYPE_EMAIL, TEST_CID);
    }

    function test_CommitData_RevertOnZeroContentHash() public {
        vm.expectRevert("Invalid content hash");
        vm.prank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, TEST_CID_HASH, bytes32(0), DATA_TYPE_EMAIL, TEST_CID);
    }

    function test_CommitData_DifferentUsersIsolated() public {
        // User1 commits data
        vm.prank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH, DATA_TYPE_EMAIL, TEST_CID);

        // User2 should not see user1's data
        VarityDataCommitments.DataCommitment memory commitment =
            dataCommitments.getCommitment(user2, GOOGLE_INTEGRATION, TEST_CID_HASH);

        assertEq(commitment.cidHash, bytes32(0));
    }

    function test_CommitData_DifferentIntegrationsIsolated() public {
        vm.startPrank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH, DATA_TYPE_EMAIL, TEST_CID);
        vm.stopPrank();

        // Same CID hash but different integration should be empty
        VarityDataCommitments.DataCommitment memory commitment =
            dataCommitments.getCommitment(user1, SLACK_INTEGRATION, TEST_CID_HASH);

        assertEq(commitment.cidHash, bytes32(0));
    }

    function test_CommitData_OverwriteExisting() public {
        bytes32 newContentHash = keccak256("new_encrypted_content");

        vm.startPrank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH, DATA_TYPE_EMAIL, TEST_CID);
        dataCommitments.commitData(GOOGLE_INTEGRATION, TEST_CID_HASH, newContentHash, DATA_TYPE_CALENDAR, TEST_CID);
        vm.stopPrank();

        VarityDataCommitments.DataCommitment memory commitment =
            dataCommitments.getCommitment(user1, GOOGLE_INTEGRATION, TEST_CID_HASH);

        assertEq(commitment.contentHash, newContentHash);
        assertEq(commitment.dataType, DATA_TYPE_CALENDAR);
    }

    // =============================================================================
    // commitBatch Tests
    // =============================================================================

    function test_CommitBatch_Success() public {
        bytes32 merkleRoot = keccak256("merkle_root_123");
        uint32 itemCount = 100;

        vm.prank(user1);
        dataCommitments.commitBatch(GOOGLE_INTEGRATION, merkleRoot, itemCount);

        VarityDataCommitments.BatchCommitment memory batch = dataCommitments.getBatch(user1, GOOGLE_INTEGRATION, 0);

        assertEq(batch.merkleRoot, merkleRoot);
        assertEq(batch.itemCount, itemCount);
        assertGt(batch.timestamp, 0);
    }

    function test_CommitBatch_EmitsEvent() public {
        bytes32 merkleRoot = keccak256("merkle_root_123");
        uint32 itemCount = 100;

        vm.expectEmit(true, true, true, true);
        emit BatchCommitted(user1, GOOGLE_INTEGRATION, 0, merkleRoot, itemCount);

        vm.prank(user1);
        dataCommitments.commitBatch(GOOGLE_INTEGRATION, merkleRoot, itemCount);
    }

    function test_CommitBatch_IncrementsBatchId() public {
        bytes32 merkleRoot1 = keccak256("merkle_root_1");
        bytes32 merkleRoot2 = keccak256("merkle_root_2");

        vm.startPrank(user1);
        dataCommitments.commitBatch(GOOGLE_INTEGRATION, merkleRoot1, 50);
        dataCommitments.commitBatch(GOOGLE_INTEGRATION, merkleRoot2, 75);
        vm.stopPrank();

        assertEq(dataCommitments.getBatchCount(user1, GOOGLE_INTEGRATION), 2);

        VarityDataCommitments.BatchCommitment memory batch0 = dataCommitments.getBatch(user1, GOOGLE_INTEGRATION, 0);

        VarityDataCommitments.BatchCommitment memory batch1 = dataCommitments.getBatch(user1, GOOGLE_INTEGRATION, 1);

        assertEq(batch0.merkleRoot, merkleRoot1);
        assertEq(batch1.merkleRoot, merkleRoot2);
    }

    function test_CommitBatch_RevertOnZeroMerkleRoot() public {
        vm.expectRevert("Invalid Merkle root");
        vm.prank(user1);
        dataCommitments.commitBatch(GOOGLE_INTEGRATION, bytes32(0), 100);
    }

    function test_CommitBatch_RevertOnZeroItemCount() public {
        vm.expectRevert("Empty batch");
        vm.prank(user1);
        dataCommitments.commitBatch(GOOGLE_INTEGRATION, keccak256("root"), 0);
    }

    // =============================================================================
    // verifyData Tests
    // =============================================================================

    function test_VerifyData_ValidCommitment() public {
        vm.prank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH, DATA_TYPE_EMAIL, TEST_CID);

        vm.prank(user1);
        bool isValid = dataCommitments.verifyData(user1, GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH);

        assertTrue(isValid);
    }

    function test_VerifyData_InvalidContentHash() public {
        vm.prank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH, DATA_TYPE_EMAIL, TEST_CID);

        bytes32 wrongContentHash = keccak256("wrong_content");

        vm.prank(user1);
        bool isValid = dataCommitments.verifyData(user1, GOOGLE_INTEGRATION, TEST_CID_HASH, wrongContentHash);

        assertFalse(isValid);
    }

    function test_VerifyData_NonExistentCommitment() public {
        vm.prank(user1);
        bool isValid = dataCommitments.verifyData(user1, GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH);

        assertFalse(isValid);
    }

    function test_VerifyData_EmitsEvent() public {
        vm.prank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH, DATA_TYPE_EMAIL, TEST_CID);

        vm.expectEmit(true, true, false, true);
        emit DataVerified(user1, GOOGLE_INTEGRATION, TEST_CID_HASH, true);

        vm.prank(user1);
        dataCommitments.verifyData(user1, GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH);
    }

    // =============================================================================
    // verifyBatchItem Tests
    // =============================================================================

    function test_VerifyBatchItem_ValidProof() public {
        // Create a simple Merkle tree with 2 leaves
        bytes32 leaf1 = keccak256(abi.encodePacked(TEST_CID_HASH, TEST_CONTENT_HASH));
        bytes32 leaf2 = keccak256(abi.encodePacked(keccak256("cid2"), keccak256("content2")));

        // Sort and compute root
        bytes32 merkleRoot;
        if (leaf1 <= leaf2) {
            merkleRoot = keccak256(abi.encodePacked(leaf1, leaf2));
        } else {
            merkleRoot = keccak256(abi.encodePacked(leaf2, leaf1));
        }

        vm.prank(user1);
        dataCommitments.commitBatch(GOOGLE_INTEGRATION, merkleRoot, 2);

        // Verify leaf1 with leaf2 as proof
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leaf2;

        bool isValid = dataCommitments.verifyBatchItem(user1, GOOGLE_INTEGRATION, 0, leaf1, proof);

        assertTrue(isValid);
    }

    function test_VerifyBatchItem_InvalidProof() public {
        bytes32 merkleRoot = keccak256("merkle_root");

        vm.prank(user1);
        dataCommitments.commitBatch(GOOGLE_INTEGRATION, merkleRoot, 2);

        bytes32 leaf = keccak256("fake_leaf");
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = keccak256("fake_sibling");

        bool isValid = dataCommitments.verifyBatchItem(user1, GOOGLE_INTEGRATION, 0, leaf, proof);

        assertFalse(isValid);
    }

    function test_VerifyBatchItem_NonExistentBatch() public {
        bytes32 leaf = keccak256("leaf");
        bytes32[] memory proof = new bytes32[](0);

        bool isValid = dataCommitments.verifyBatchItem(user1, GOOGLE_INTEGRATION, 0, leaf, proof);

        assertFalse(isValid);
    }

    // =============================================================================
    // Gas Optimization Tests
    // =============================================================================

    function test_GasUsage_SingleCommit() public {
        uint256 gasBefore = gasleft();

        vm.prank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, TEST_CID_HASH, TEST_CONTENT_HASH, DATA_TYPE_EMAIL, TEST_CID);

        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used for single commit:", gasUsed);

        // Sanity check: should be reasonable for storage ops
        assertLt(gasUsed, 200000);
    }

    function test_GasUsage_BatchCommit() public {
        bytes32 merkleRoot = keccak256("merkle_root_large_batch");
        uint32 itemCount = 1000;

        uint256 gasBefore = gasleft();

        vm.prank(user1);
        dataCommitments.commitBatch(GOOGLE_INTEGRATION, merkleRoot, itemCount);

        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used for batch commit (1000 items):", gasUsed);

        // Batch should be much cheaper than 1000 individual commits
        assertLt(gasUsed, 100000);
    }

    // =============================================================================
    // Fuzz Tests
    // =============================================================================

    function testFuzz_CommitData(bytes32 cidHash, bytes32 contentHash, uint32 dataType, string memory cid) public {
        vm.assume(cidHash != bytes32(0));
        vm.assume(contentHash != bytes32(0));

        vm.prank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, cidHash, contentHash, dataType, cid);

        VarityDataCommitments.DataCommitment memory commitment =
            dataCommitments.getCommitment(user1, GOOGLE_INTEGRATION, cidHash);

        assertEq(commitment.cidHash, cidHash);
        assertEq(commitment.contentHash, contentHash);
        assertEq(commitment.dataType, dataType);
    }

    function testFuzz_VerifyData(bytes32 cidHash, bytes32 contentHash, bytes32 wrongContentHash) public {
        vm.assume(cidHash != bytes32(0));
        vm.assume(contentHash != bytes32(0));
        vm.assume(contentHash != wrongContentHash);

        vm.prank(user1);
        dataCommitments.commitData(GOOGLE_INTEGRATION, cidHash, contentHash, 1, "test");

        // Valid verification
        vm.prank(user1);
        assertTrue(dataCommitments.verifyData(user1, GOOGLE_INTEGRATION, cidHash, contentHash));

        // Invalid verification (if wrongContentHash is not zero)
        if (wrongContentHash != bytes32(0)) {
            vm.prank(user1);
            assertFalse(dataCommitments.verifyData(user1, GOOGLE_INTEGRATION, cidHash, wrongContentHash));
        }
    }
}
