// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title SubscriptionBilling
 * @dev Manages recurring monthly/annual template subscriptions
 * @notice Tracks subscription duration, renewals, and active status
 *
 * Security Features:
 * - Role-based access control for marketplace integration
 * - Automatic expiration checking
 * - Gas-optimized storage layout
 * - Comprehensive subscription lifecycle tracking
 */
contract SubscriptionBilling is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    /// @dev Role for marketplace contract to manage subscriptions
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    /// @dev Role for authorized upgraders
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @dev Seconds in a month (30 days)
    uint256 public constant SECONDS_PER_MONTH = 30 days;

    /**
     * @dev Subscription structure
     * @param templateId Associated template NFT ID
     * @param customer Subscriber address
     * @param startTimestamp When subscription began
     * @param endTimestamp When subscription expires
     * @param isActive Whether subscription is currently active
     * @param renewalCount Number of times subscription has been renewed
     */
    struct Subscription {
        uint256 templateId;
        address customer;
        uint256 startTimestamp;
        uint256 endTimestamp;
        bool isActive;
        uint256 renewalCount;
    }

    /// @dev Mapping: customer => templateId => Subscription
    mapping(address => mapping(uint256 => Subscription)) public subscriptions;

    /// @dev Mapping: templateId => total active subscriptions
    mapping(uint256 => uint256) public activeSubscriptionCount;

    /// @dev Mapping: customer => array of templateIds they're subscribed to
    mapping(address => uint256[]) private customerSubscriptions;

    /// @dev Total number of subscriptions ever created
    uint256 public totalSubscriptionsCreated;

    /// @dev Total number of currently active subscriptions
    uint256 public totalActiveSubscriptions;

    // Custom errors
    error SubscriptionNotActive(address customer, uint256 templateId);
    error SubscriptionAlreadyActive(address customer, uint256 templateId);
    error InvalidDuration(uint256 durationMonths);

    // Events
    event SubscriptionCreated(
        address indexed customer,
        uint256 indexed templateId,
        uint256 startTimestamp,
        uint256 endTimestamp,
        uint256 durationMonths
    );

    event SubscriptionRenewed(
        address indexed customer,
        uint256 indexed templateId,
        uint256 newEndTimestamp,
        uint256 renewalCount
    );

    event SubscriptionCancelled(
        address indexed customer,
        uint256 indexed templateId,
        uint256 timestamp
    );

    event SubscriptionExpired(
        address indexed customer,
        uint256 indexed templateId,
        uint256 timestamp
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract
     * @param _admin Address to be granted admin role
     */
    function initialize(address _admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MARKETPLACE_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        totalSubscriptionsCreated = 0;
        totalActiveSubscriptions = 0;
    }

    /**
     * @dev Creates a new subscription
     * @param customer Subscriber address
     * @param templateId Template NFT ID
     * @param durationMonths Subscription duration in months
     *
     * Requirements:
     * - Caller must have MARKETPLACE_ROLE
     * - Customer must not already have active subscription for this template
     * - Duration must be at least 1 month
     */
    function createSubscription(
        address customer,
        uint256 templateId,
        uint256 durationMonths
    ) external onlyRole(MARKETPLACE_ROLE) {
        if (durationMonths == 0) revert InvalidDuration(durationMonths);

        Subscription storage sub = subscriptions[customer][templateId];

        // Check if customer already has active subscription
        if (sub.isActive && block.timestamp < sub.endTimestamp) {
            revert SubscriptionAlreadyActive(customer, templateId);
        }

        uint256 durationSeconds = durationMonths * SECONDS_PER_MONTH;
        uint256 endTime = block.timestamp + durationSeconds;

        // Create or update subscription
        sub.templateId = templateId;
        sub.customer = customer;
        sub.startTimestamp = block.timestamp;
        sub.endTimestamp = endTime;
        sub.isActive = true;
        sub.renewalCount = 0;

        // Update counters
        activeSubscriptionCount[templateId]++;
        totalActiveSubscriptions++;
        totalSubscriptionsCreated++;

        // Add to customer's subscription list if not already present
        _addToCustomerSubscriptions(customer, templateId);

        emit SubscriptionCreated(
            customer,
            templateId,
            block.timestamp,
            endTime,
            durationMonths
        );
    }

    /**
     * @dev Renews an existing subscription
     * @param customer Subscriber address
     * @param templateId Template NFT ID
     * @param durationMonths Additional duration in months
     *
     * Requirements:
     * - Caller must have MARKETPLACE_ROLE
     * - Subscription must be active
     */
    function renewSubscription(
        address customer,
        uint256 templateId,
        uint256 durationMonths
    ) external onlyRole(MARKETPLACE_ROLE) {
        if (durationMonths == 0) revert InvalidDuration(durationMonths);

        Subscription storage sub = subscriptions[customer][templateId];

        if (!sub.isActive) {
            revert SubscriptionNotActive(customer, templateId);
        }

        uint256 durationSeconds = durationMonths * SECONDS_PER_MONTH;

        // Extend from current end time (allows early renewal)
        sub.endTimestamp += durationSeconds;
        sub.renewalCount++;

        emit SubscriptionRenewed(
            customer,
            templateId,
            sub.endTimestamp,
            sub.renewalCount
        );
    }

    /**
     * @dev Cancels a subscription
     * @param templateId Template NFT ID to cancel
     *
     * Requirements:
     * - Caller must be the customer
     * - Subscription must be active
     */
    function cancelSubscription(uint256 templateId) external {
        Subscription storage sub = subscriptions[msg.sender][templateId];

        if (!sub.isActive) {
            revert SubscriptionNotActive(msg.sender, templateId);
        }

        sub.isActive = false;
        activeSubscriptionCount[templateId]--;
        totalActiveSubscriptions--;

        emit SubscriptionCancelled(msg.sender, templateId, block.timestamp);
    }

    /**
     * @dev Checks if customer has active subscription for template
     * @param customer Subscriber address
     * @param templateId Template NFT ID
     * @return bool True if subscription is active and not expired
     */
    function hasActiveSubscription(address customer, uint256 templateId)
        external
        view
        returns (bool)
    {
        Subscription memory sub = subscriptions[customer][templateId];
        return sub.isActive && block.timestamp < sub.endTimestamp;
    }

    /**
     * @dev Checks if subscription has expired
     * @param customer Subscriber address
     * @param templateId Template NFT ID
     * @return bool True if subscription has expired
     */
    function isSubscriptionExpired(address customer, uint256 templateId)
        external
        view
        returns (bool)
    {
        Subscription memory sub = subscriptions[customer][templateId];
        return sub.isActive && block.timestamp >= sub.endTimestamp;
    }

    /**
     * @dev Gets remaining time on subscription
     * @param customer Subscriber address
     * @param templateId Template NFT ID
     * @return seconds Remaining seconds (0 if expired or inactive)
     */
    function getRemainingTime(address customer, uint256 templateId)
        external
        view
        returns (uint256)
    {
        Subscription memory sub = subscriptions[customer][templateId];

        if (!sub.isActive || block.timestamp >= sub.endTimestamp) {
            return 0;
        }

        return sub.endTimestamp - block.timestamp;
    }

    /**
     * @dev Gets full subscription details
     * @param customer Subscriber address
     * @param templateId Template NFT ID
     * @return subscription Complete subscription structure
     */
    function getSubscription(address customer, uint256 templateId)
        external
        view
        returns (Subscription memory)
    {
        return subscriptions[customer][templateId];
    }

    /**
     * @dev Gets all template IDs customer is subscribed to
     * @param customer Subscriber address
     * @return templateIds Array of template IDs
     */
    function getCustomerSubscriptions(address customer)
        external
        view
        returns (uint256[] memory)
    {
        return customerSubscriptions[customer];
    }

    /**
     * @dev Gets count of active subscriptions for a template
     * @param templateId Template NFT ID
     * @return count Number of active subscribers
     */
    function getActiveSubscriberCount(uint256 templateId)
        external
        view
        returns (uint256)
    {
        return activeSubscriptionCount[templateId];
    }

    /**
     * @dev Batch expires subscriptions (callable by anyone, gas-efficient cleanup)
     * @param customers Array of customer addresses
     * @param templateIds Array of template IDs
     *
     * Requirements:
     * - Arrays must be same length
     * - Subscriptions must actually be expired
     */
    function batchExpireSubscriptions(
        address[] calldata customers,
        uint256[] calldata templateIds
    ) external {
        require(customers.length == templateIds.length, "Array length mismatch");

        for (uint256 i = 0; i < customers.length; i++) {
            Subscription storage sub = subscriptions[customers[i]][templateIds[i]];

            if (sub.isActive && block.timestamp >= sub.endTimestamp) {
                sub.isActive = false;
                activeSubscriptionCount[templateIds[i]]--;
                totalActiveSubscriptions--;

                emit SubscriptionExpired(
                    customers[i],
                    templateIds[i],
                    block.timestamp
                );
            }
        }
    }

    /**
     * @dev Internal function to add template to customer's subscription list
     */
    function _addToCustomerSubscriptions(address customer, uint256 templateId) private {
        uint256[] storage subs = customerSubscriptions[customer];

        // Check if already in list
        for (uint256 i = 0; i < subs.length; i++) {
            if (subs[i] == templateId) {
                return; // Already exists
            }
        }

        // Add to list
        subs.push(templateId);
    }

    /**
     * @dev Required override for UUPS upgradeability
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
