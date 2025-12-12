// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for Varity L3 testnet
 * @notice This is a testnet-only token with faucet functionality
 *
 * Features:
 * - Standard ERC20 implementation
 * - 6 decimals (matches real USDC)
 * - Faucet for testnet users (1000 USDC per request)
 * - Minting capability for testing
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**6; // 1000 USDC (6 decimals)
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    /// @dev Mapping: user address => last faucet claim timestamp
    mapping(address => uint256) public lastFaucetClaim;

    // Events
    event FaucetUsed(address indexed user, uint256 amount, uint256 timestamp);
    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);

    // Custom errors
    error FaucetCooldownActive(address user, uint256 cooldownEnds);

    /**
     * @dev Initializes the MockUSDC token
     * @param initialSupply Initial token supply (will be minted to deployer)
     */
    constructor(uint256 initialSupply) ERC20("USD Coin", "USDC") Ownable(msg.sender) {
        // Mint initial supply to deployer (for marketplace setup)
        _mint(msg.sender, initialSupply * 10**DECIMALS);
    }

    /**
     * @dev Returns the number of decimals (6 for USDC)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Faucet function for testnet users
     * @notice Users can claim 1000 USDC once per day
     *
     * Requirements:
     * - Caller must wait 24 hours between claims
     */
    function faucet() external {
        uint256 lastClaim = lastFaucetClaim[msg.sender];
        uint256 cooldownEnd = lastClaim + FAUCET_COOLDOWN;

        if (block.timestamp < cooldownEnd) {
            revert FaucetCooldownActive(msg.sender, cooldownEnd);
        }

        // Update last claim timestamp
        lastFaucetClaim[msg.sender] = block.timestamp;

        // Mint USDC to user
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetUsed(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }

    /**
     * @dev Mint tokens (owner only, for testing)
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount, block.timestamp);
    }

    /**
     * @dev Checks if user can claim from faucet
     * @param user User address
     * @return canClaim Whether user can claim
     * @return cooldownEnds When cooldown ends (0 if can claim now)
     */
    function canClaimFaucet(address user) external view returns (bool canClaim, uint256 cooldownEnds) {
        uint256 lastClaim = lastFaucetClaim[user];
        cooldownEnds = lastClaim + FAUCET_COOLDOWN;

        if (block.timestamp >= cooldownEnds) {
            return (true, 0);
        } else {
            return (false, cooldownEnds);
        }
    }

    /**
     * @dev Returns time until user can claim from faucet again
     * @param user User address
     * @return seconds Time remaining in seconds (0 if can claim now)
     */
    function timeUntilNextClaim(address user) external view returns (uint256) {
        uint256 lastClaim = lastFaucetClaim[user];
        uint256 cooldownEnd = lastClaim + FAUCET_COOLDOWN;

        if (block.timestamp >= cooldownEnd) {
            return 0;
        } else {
            return cooldownEnd - block.timestamp;
        }
    }
}
