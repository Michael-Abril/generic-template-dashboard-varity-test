// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ToolLicenseNFT.sol";
import "./RevenueSplitter.sol";
import "./SubscriptionBilling.sol";

/**
 * @title ToolMarketplace
 * @dev Central marketplace for tool integrations (QuickBooks, Salesforce, etc.)
 * @notice Handles tool listing, license purchases, and reviews
 *
 * Security Features:
 * - ReentrancyGuard on all payment functions
 * - Role-based access control
 * - USDC payment support
 * - Rating manipulation prevention
 * - Comprehensive event logging
 */
contract ToolMarketplace is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    /// @dev Role for authorized upgraders
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @dev Reference to ToolLicenseNFT contract
    ToolLicenseNFT public toolLicenseNFT;

    /// @dev Reference to RevenueSplitter contract
    RevenueSplitter public revenueSplitter;

    /// @dev Reference to SubscriptionBilling contract
    SubscriptionBilling public subscriptionBilling;

    /// @dev USDC token address
    address public usdcToken;

    /**
     * @dev Tool listing structure
     * @param toolId Associated tool license NFT ID
     * @param developer Tool integration developer address
     * @param isActive Whether tool is listed for sale
     * @param totalSales Total number of licenses sold
     * @param rating Average rating (scaled by 100, e.g., 450 = 4.50 stars)
     * @param reviewCount Total number of reviews
     */
    struct ToolListing {
        uint256 toolId;
        address developer;
        bool isActive;
        uint256 totalSales;
        uint256 rating; // Average rating * 100
        uint256 reviewCount;
    }

    /**
     * @dev Review structure
     * @param reviewer Address of reviewer
     * @param toolId Tool being reviewed
     * @param rating Rating (1-5 stars)
     * @param comment Review text
     * @param timestamp When review was submitted
     */
    struct Review {
        address reviewer;
        uint256 toolId;
        uint256 rating;
        string comment;
        uint256 timestamp;
    }

    /// @dev Mapping: toolId => ToolListing
    mapping(uint256 => ToolListing) public listings;

    /// @dev Array of all active tool IDs
    uint256[] private activeListings;

    /// @dev Mapping: toolId => array of reviews
    mapping(uint256 => Review[]) private toolReviews;

    /// @dev Mapping: reviewer => toolId => hasReviewed
    mapping(address => mapping(uint256 => bool)) public hasReviewed;

    /// @dev Total number of tools listed
    uint256 public totalToolsListed;

    /// @dev Platform fee (in basis points, 0 = no fee, handled by RevenueSplitter)
    uint256 public platformFee;

    /// @dev Minimum rating (1 star = 100)
    uint256 public constant MIN_RATING = 100;

    /// @dev Maximum rating (5 stars = 500)
    uint256 public constant MAX_RATING = 500;

    // Custom errors
    error ToolNotActive(uint256 toolId);
    error InsufficientPayment(uint256 required, uint256 provided);
    error InvalidRating(uint256 rating);
    error NoActiveLicense(address customer, uint256 toolId);
    error AlreadyReviewed(address reviewer, uint256 toolId);
    error InvalidDuration(uint256 durationMonths);
    error InsufficientAllowance(uint256 required, uint256 provided);

    // Events
    event ToolListed(
        uint256 indexed toolId,
        address indexed developer,
        string name,
        string category,
        uint256 price,
        uint256 timestamp
    );

    event LicensePurchased(
        address indexed customer,
        uint256 indexed toolId,
        uint256 durationMonths,
        uint256 totalCost,
        uint256 timestamp
    );

    event ReviewSubmitted(
        uint256 indexed toolId,
        address indexed reviewer,
        uint256 rating,
        string comment,
        uint256 timestamp
    );

    event ToolStatusUpdated(
        uint256 indexed toolId,
        bool isActive,
        uint256 timestamp
    );

    event PlatformFeeUpdated(
        uint256 oldFee,
        uint256 newFee,
        uint256 timestamp
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the marketplace contract
     * @param _toolLicenseNFT Address of ToolLicenseNFT contract
     * @param _revenueSplitter Address of RevenueSplitter contract
     * @param _subscriptionBilling Address of SubscriptionBilling contract
     * @param _usdcToken Address of USDC token
     * @param _admin Address to be granted admin role
     */
    function initialize(
        address _toolLicenseNFT,
        address _revenueSplitter,
        address _subscriptionBilling,
        address _usdcToken,
        address _admin
    ) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        toolLicenseNFT = ToolLicenseNFT(_toolLicenseNFT);
        revenueSplitter = RevenueSplitter(payable(_revenueSplitter));
        subscriptionBilling = SubscriptionBilling(_subscriptionBilling);
        usdcToken = _usdcToken;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        totalToolsListed = 0;
        platformFee = 0; // No additional platform fee (70/30 split handles revenue)
    }

    /**
     * @dev Lists a new tool in the marketplace
     * @param name Tool name (e.g., "QuickBooks", "Salesforce")
     * @param category Tool category (Accounting, CRM, E-commerce, etc.)
     * @param monthlyPrice Monthly license price in USDC (6 decimals)
     * @param metadataURI IPFS URI with full tool metadata
     * @return toolId The newly created tool ID
     *
     * Requirements:
     * - Caller must have DEFAULT_ADMIN_ROLE (for initial setup)
     * - Price must be >= 0 (allows free tools like Stripe)
     */
    function listTool(
        string memory name,
        string memory category,
        uint256 monthlyPrice,
        string memory metadataURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        // Mint tool license NFT
        uint256 toolId = toolLicenseNFT.listTool(
            msg.sender,
            name,
            category,
            monthlyPrice,
            metadataURI
        );

        // Create marketplace listing
        listings[toolId] = ToolListing({
            toolId: toolId,
            developer: msg.sender,
            isActive: true,
            totalSales: 0,
            rating: 0,
            reviewCount: 0
        });

        // Add to active listings
        activeListings.push(toolId);
        totalToolsListed++;

        emit ToolListed(
            toolId,
            msg.sender,
            name,
            category,
            monthlyPrice,
            block.timestamp
        );

        return toolId;
    }

    /**
     * @dev Purchases a tool license with USDC
     * @param toolId Tool license NFT ID
     * @param durationMonths License duration (1, 3, 6, 12 months)
     *
     * Requirements:
     * - Tool must be active
     * - Caller must have approved sufficient USDC
     * - Duration must be at least 1 month
     */
    function purchaseLicense(
        uint256 toolId,
        uint256 durationMonths
    ) external nonReentrant {
        if (!listings[toolId].isActive) {
            revert ToolNotActive(toolId);
        }
        if (durationMonths == 0) {
            revert InvalidDuration(durationMonths);
        }

        // Get tool price
        ToolLicenseNFT.ToolMetadata memory metadata = toolLicenseNFT.getToolMetadata(toolId);
        uint256 totalCost = metadata.price * durationMonths;

        // Check USDC allowance
        IERC20 usdc = IERC20(usdcToken);
        uint256 allowance = usdc.allowance(msg.sender, address(this));
        if (allowance < totalCost) {
            revert InsufficientAllowance(totalCost, allowance);
        }

        // ✅ EFFECTS: Update marketplace stats BEFORE external calls (Checks-Effects-Interactions pattern)
        listings[toolId].totalSales++;

        // Transfer USDC from customer to marketplace
        require(usdc.transferFrom(msg.sender, address(this), totalCost), "USDC transfer failed");

        // Approve RevenueSplitter to spend USDC
        usdc.approve(address(revenueSplitter), totalCost);

        // Process revenue split (70% Varity, 30% Developer)
        address developer = listings[toolId].developer;
        revenueSplitter.processStablecoinPayment(
            toolId,
            developer,
            usdcToken,
            totalCost
        );

        // Create subscription
        subscriptionBilling.createSubscription(
            msg.sender,
            toolId,
            durationMonths
        );

        // Issue license NFT to customer
        toolLicenseNFT.issueLicense(msg.sender, toolId, 1);

        emit LicensePurchased(
            msg.sender,
            toolId,
            durationMonths,
            totalCost,
            block.timestamp
        );
    }

    /**
     * @dev Submits a review for a tool
     * @param toolId Tool license NFT ID
     * @param rating Rating (1-5 stars, scaled to 100-500)
     * @param comment Review text
     *
     * Requirements:
     * - Caller must have active license
     * - Rating must be between 1 and 5 stars
     * - Caller must not have already reviewed this tool
     */
    function leaveReview(
        uint256 toolId,
        uint256 rating,
        string memory comment
    ) external {
        // Verify active license
        if (!subscriptionBilling.hasActiveSubscription(msg.sender, toolId)) {
            revert NoActiveLicense(msg.sender, toolId);
        }

        // Validate rating (100-500 = 1-5 stars)
        if (rating < MIN_RATING || rating > MAX_RATING) {
            revert InvalidRating(rating);
        }

        // Check if already reviewed
        if (hasReviewed[msg.sender][toolId]) {
            revert AlreadyReviewed(msg.sender, toolId);
        }

        // Mark as reviewed
        hasReviewed[msg.sender][toolId] = true;

        // Update average rating
        ToolListing storage listing = listings[toolId];
        uint256 totalRating = (listing.rating * listing.reviewCount) + rating;
        listing.reviewCount++;
        listing.rating = totalRating / listing.reviewCount;

        // Store review
        toolReviews[toolId].push(Review({
            reviewer: msg.sender,
            toolId: toolId,
            rating: rating,
            comment: comment,
            timestamp: block.timestamp
        }));

        emit ReviewSubmitted(
            toolId,
            msg.sender,
            rating,
            comment,
            block.timestamp
        );
    }

    /**
     * @dev Toggles tool active status (developer or admin only)
     * @param toolId Tool license NFT ID
     *
     * Requirements:
     * - Caller must be tool developer or admin
     */
    function toggleToolStatus(uint256 toolId) external {
        ToolLicenseNFT.ToolMetadata memory metadata = toolLicenseNFT.getToolMetadata(toolId);

        require(
            metadata.developer == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not tool developer or admin"
        );

        bool newStatus = !listings[toolId].isActive;
        listings[toolId].isActive = newStatus;

        emit ToolStatusUpdated(toolId, newStatus, block.timestamp);
    }

    /**
     * @dev Gets all active tool IDs
     * @return Array of active tool IDs
     */
    function getActiveTools() external view returns (uint256[] memory) {
        // ✅ GAS OPTIMIZATION: Single loop with cached array length and tool ID
        uint256 length = activeListings.length;
        uint256 activeCount = 0;

        // Count active tools (first pass)
        for (uint256 i = 0; i < length; i++) {
            uint256 toolId = activeListings[i]; // Cache array access
            if (listings[toolId].isActive) {
                unchecked {
                    activeCount++; // Safe: activeCount <= length
                }
            }
        }

        // Build result array (second pass)
        uint256[] memory active = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < length; i++) {
            uint256 toolId = activeListings[i]; // Cache array access
            if (listings[toolId].isActive) {
                active[index] = toolId;
                unchecked {
                    index++; // Safe: index <= activeCount
                }
            }
        }

        return active;
    }

    /**
     * @dev Gets tool listing details
     * @param toolId Tool license NFT ID
     * @return listing Complete listing structure
     */
    function getToolListing(uint256 toolId)
        external
        view
        returns (ToolListing memory)
    {
        return listings[toolId];
    }

    /**
     * @dev Gets all reviews for a tool
     * @param toolId Tool license NFT ID
     * @return Array of reviews
     */
    function getToolReviews(uint256 toolId)
        external
        view
        returns (Review[] memory)
    {
        return toolReviews[toolId];
    }

    /**
     * @dev Gets review count for a tool
     * @param toolId Tool license NFT ID
     * @return count Number of reviews
     */
    function getReviewCount(uint256 toolId)
        external
        view
        returns (uint256)
    {
        return toolReviews[toolId].length;
    }

    /**
     * @dev Updates platform fee (admin only)
     * @param newFee New platform fee in basis points
     *
     * Requirements:
     * - Caller must have DEFAULT_ADMIN_ROLE
     */
    function updatePlatformFee(uint256 newFee)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 oldFee = platformFee;
        platformFee = newFee;

        emit PlatformFeeUpdated(oldFee, newFee, block.timestamp);
    }

    /**
     * @dev Updates USDC token address (admin only)
     * @param newUsdcToken New USDC token address
     *
     * Requirements:
     * - Caller must have DEFAULT_ADMIN_ROLE
     */
    function updateUsdcToken(address newUsdcToken)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        usdcToken = newUsdcToken;
    }

    /**
     * @dev Required override for UUPS upgradeability
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    /**
     * @dev Receive function to accept ETH (not used, but required for completeness)
     */
    receive() external payable {}
}
