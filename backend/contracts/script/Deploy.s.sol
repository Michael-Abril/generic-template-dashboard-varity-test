// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {VarityDataCommitments} from "../VarityDataCommitments.sol";

/**
 * @title DeployVarityDataCommitments
 * @author Varity Labs
 * @notice Deployment script for VarityDataCommitments to Varity L3 Testnet
 *
 * Varity L3 Network Configuration:
 * - Chain ID: 33529
 * - RPC: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
 * - Native Token: USDC (0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)
 * - Explorer: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/
 * - Data Availability: AnyTrust (not Ethereum calldata)
 *
 * Usage:
 *   forge script script/Deploy.s.sol:DeployVarityDataCommitments \
 *     --rpc-url varity_testnet \
 *     --private-key $DEPLOYER_PRIVATE_KEY \
 *     --broadcast \
 *     --verify
 */
contract DeployVarityDataCommitments is Script {
    // Varity L3 Testnet chain ID
    uint256 constant VARITY_TESTNET_CHAIN_ID = 33529;

    function setUp() public {}

    function run() public {
        // Validate we're deploying to the correct network
        uint256 chainId = block.chainid;
        console.log("Deploying to chain ID:", chainId);

        if (chainId == VARITY_TESTNET_CHAIN_ID) {
            console.log("Network: Varity L3 Testnet (Arbitrum Stack - AnyTrust)");
        } else if (chainId == 421614) {
            console.log("Network: Arbitrum Sepolia (for testing)");
        } else if (chainId == 31337) {
            console.log("Network: Local Anvil");
        } else {
            console.log("Warning: Unknown network");
        }

        // Get deployer address
        address deployer = msg.sender;
        console.log("Deployer address:", deployer);

        // Check deployer balance
        uint256 balance = deployer.balance;
        console.log("Deployer balance:", balance);

        // Start broadcast (actual transaction sending)
        vm.startBroadcast();

        // Deploy VarityDataCommitments
        VarityDataCommitments dataCommitments = new VarityDataCommitments();

        console.log("VarityDataCommitments deployed at:", address(dataCommitments));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("");
        console.log("========================================");
        console.log("Deployment Complete!");
        console.log("========================================");
        console.log("Contract: VarityDataCommitments");
        console.log("Address:", address(dataCommitments));
        console.log("Chain ID:", chainId);
        console.log("");
        console.log("Next steps:");
        console.log("1. Verify on explorer:");
        console.log("   forge verify-contract <address> VarityDataCommitments --chain-id 33529");
        console.log("2. Update backend .env with CONTRACT_ADDRESS=", address(dataCommitments));
        console.log("3. Run integration tests");
    }
}

/**
 * @title VerifyDeployment
 * @notice Script to verify an existing deployment
 */
contract VerifyDeployment is Script {
    function run(address contractAddress) public view {
        console.log("Verifying deployment at:", contractAddress);

        // Check if contract exists
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(contractAddress)
        }

        if (codeSize > 0) {
            console.log("Contract deployed successfully!");
            console.log("Code size:", codeSize, "bytes");
        } else {
            console.log("ERROR: No contract found at address");
        }
    }
}

/**
 * @title TestCommitment
 * @notice Script to test a data commitment after deployment
 */
contract TestCommitment is Script {
    function run(address contractAddress) public {
        VarityDataCommitments dataCommitments = VarityDataCommitments(contractAddress);

        // Test data
        string memory integration = "google";
        bytes32 cidHash = keccak256(abi.encodePacked("QmTestCID123456789"));
        bytes32 contentHash = keccak256(abi.encodePacked("encrypted_content_hash"));
        uint32 dataType = 1; // e.g., 1 = email, 2 = calendar, etc.
        string memory cid = "QmTestCID123456789";

        console.log("Testing commitData function...");
        console.log("Integration:", integration);
        console.log("CID:", cid);

        vm.startBroadcast();

        dataCommitments.commitData(integration, cidHash, contentHash, dataType, cid);

        vm.stopBroadcast();

        // Verify commitment
        VarityDataCommitments.DataCommitment memory commitment =
            dataCommitments.getCommitment(msg.sender, integration, cidHash);

        console.log("Commitment verified!");
        console.log("Stored cidHash matches:", commitment.cidHash == cidHash);
        console.log("Stored contentHash matches:", commitment.contentHash == contentHash);
        console.log("Timestamp:", commitment.timestamp);
        console.log("DataType:", commitment.dataType);
    }
}
