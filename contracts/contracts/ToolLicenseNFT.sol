// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ToolLicenseNFT
 * @dev ERC-1155 NFT representing monthly licenses for tool integrations
 * @notice Each tool license grants access to specific integrations (QuickBooks, Salesforce, etc.)
 *
 * Security Features:
 * - UUPS Upgradeable pattern for future improvements
 * - Role-based access control (MINTER_ROLE for marketplace)
 * - Gas-optimized storage layout
 * - Custom errors for reduced gas costs
 * - Multi-tool support via ERC-1155
 */
contract ToolLicenseNFT is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    /// @dev Role identifier for contracts that can mint licenses
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev Role identifier for authorized upgraders
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /**
     * @dev Tool metadata structure
     * @param name Tool display name (e.g., "QuickBooks", "Salesforce")
     * @param category Tool category (Accounting, CRM, E-commerce, etc.)
     * @param version Semantic version string (e.g., "1.0.0")
     * @param developer Address of tool integration developer (receives 30% revenue)
     * @param price Monthly license price in USDC (6 decimals)
     * @param createdAt Block timestamp when tool was listed
     * @param isActive Whether tool is currently available for purchase
     * @param totalLicenses Total number of active licenses
     * @param metadataURI IPFS URI containing full tool metadata
     */
    struct ToolMetadata {
        string name;
        string category;
        string version;
        address developer;
        uint256 price;
        uint256 createdAt;
        bool isActive;
        uint256 totalLicenses;
        string metadataURI;
    }

    /// @dev Mapping from toolId to tool metadata
    mapping(uint256 => ToolMetadata) public tools;

    /// @dev Counter for generating unique tool IDs
    uint256 private _toolIdCounter;

    /// @dev Contract name
    string public name;

    /// @dev Contract symbol
    string public symbol;

    // Custom errors for gas efficiency
    error NotToolDeveloper(address caller, uint256 toolId);
    error ToolNotActive(uint256 toolId);
    error InvalidPrice(uint256 price);
    error UnauthorizedMinter(address caller);
    error ToolNotFound(uint256 toolId);

    // Events
    event ToolListed(
        uint256 indexed toolId,
        address indexed developer,
        string name,
        string category,
        uint256 price,
        uint256 timestamp
    );

    event PriceUpdated(
        uint256 indexed toolId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );

    event ToolStatusChanged(
        uint256 indexed toolId,
        bool isActive,
        uint256 timestamp
    );

    event LicenseCountUpdated(
        uint256 indexed toolId,
        uint256 newCount
    );

    event LicenseIssued(
        address indexed customer,
        uint256 indexed toolId,
        uint256 amount,
        uint256 timestamp
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract
     * @param _admin Address to be granted admin role
     * @param _uri Base URI for token metadata
     */
    function initialize(address _admin, string memory _uri) public initializer {
        __ERC1155_init(_uri);
        __AccessControl_init();
        __UUPSUpgradeable_init();

        name = "Varity Tool License";
        symbol = "VTL";

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
    }

    /**
     * @dev Lists a new tool in the marketplace
     * @param developer Address of tool integration developer
     * @param toolName Tool name
     * @param category Tool category
     * @param price Monthly license price in USDC (6 decimals)
     * @param metadataURI IPFS URI containing full tool metadata
     * @return toolId The newly created tool ID
     *
     * Requirements:
     * - Caller must have MINTER_ROLE
     * - Price must be >= 0 (allows free tools)
     */
    function listTool(
        address developer,
        string memory toolName,
        string memory category,
        uint256 price,
        string memory metadataURI
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 toolId = _toolIdCounter;
        _toolIdCounter++;

        tools[toolId] = ToolMetadata({
            name: toolName,
            category: category,
            version: "1.0.0",
            developer: developer,
            price: price,
            createdAt: block.timestamp,
            isActive: true,
            totalLicenses: 0,
            metadataURI: metadataURI
        });

        emit ToolListed(
            toolId,
            developer,
            toolName,
            category,
            price,
            block.timestamp
        );

        return toolId;
    }

    /**
     * @dev Issues license to customer (called by marketplace on purchase)
     * @param customer Customer address
     * @param toolId Tool ID
     * @param amount Number of licenses (typically 1)
     *
     * Requirements:
     * - Caller must have MINTER_ROLE (marketplace contract)
     * - Tool must exist and be active
     */
    function issueLicense(
        address customer,
        uint256 toolId,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        if (toolId >= _toolIdCounter) revert ToolNotFound(toolId);
        if (!tools[toolId].isActive) revert ToolNotActive(toolId);

        _mint(customer, toolId, amount, "");
        tools[toolId].totalLicenses += amount;

        emit LicenseIssued(customer, toolId, amount, block.timestamp);
        emit LicenseCountUpdated(toolId, tools[toolId].totalLicenses);
    }

    /**
     * @dev Revokes license from customer (called when subscription cancelled)
     * @param customer Customer address
     * @param toolId Tool ID
     * @param amount Number of licenses to revoke
     *
     * Requirements:
     * - Caller must have MINTER_ROLE (marketplace contract)
     */
    function revokeLicense(
        address customer,
        uint256 toolId,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        _burn(customer, toolId, amount);

        if (tools[toolId].totalLicenses >= amount) {
            tools[toolId].totalLicenses -= amount;
            emit LicenseCountUpdated(toolId, tools[toolId].totalLicenses);
        }
    }

    /**
     * @dev Updates tool price
     * @param toolId Tool ID
     * @param newPrice New monthly price in USDC
     *
     * Requirements:
     * - Caller must be tool developer or admin
     */
    function updatePrice(uint256 toolId, uint256 newPrice) external {
        if (toolId >= _toolIdCounter) revert ToolNotFound(toolId);

        bool isAuthorized = tools[toolId].developer == msg.sender ||
                          hasRole(DEFAULT_ADMIN_ROLE, msg.sender);

        if (!isAuthorized) {
            revert NotToolDeveloper(msg.sender, toolId);
        }

        uint256 oldPrice = tools[toolId].price;
        tools[toolId].price = newPrice;

        emit PriceUpdated(toolId, oldPrice, newPrice, block.timestamp);
    }

    /**
     * @dev Updates tool version
     * @param toolId Tool ID
     * @param newVersion New semantic version string
     *
     * Requirements:
     * - Caller must be tool developer or admin
     */
    function updateVersion(uint256 toolId, string memory newVersion) external {
        if (toolId >= _toolIdCounter) revert ToolNotFound(toolId);

        bool isAuthorized = tools[toolId].developer == msg.sender ||
                          hasRole(DEFAULT_ADMIN_ROLE, msg.sender);

        if (!isAuthorized) {
            revert NotToolDeveloper(msg.sender, toolId);
        }

        tools[toolId].version = newVersion;
    }

    /**
     * @dev Toggles tool active status
     * @param toolId Tool ID
     *
     * Requirements:
     * - Caller must be tool developer or admin
     */
    function toggleActive(uint256 toolId) external {
        if (toolId >= _toolIdCounter) revert ToolNotFound(toolId);

        bool isAuthorized = tools[toolId].developer == msg.sender ||
                          hasRole(DEFAULT_ADMIN_ROLE, msg.sender);

        if (!isAuthorized) {
            revert NotToolDeveloper(msg.sender, toolId);
        }

        bool newStatus = !tools[toolId].isActive;
        tools[toolId].isActive = newStatus;

        emit ToolStatusChanged(toolId, newStatus, block.timestamp);
    }

    /**
     * @dev Returns full tool metadata
     * @param toolId Tool ID
     * @return metadata Complete tool metadata struct
     */
    function getToolMetadata(uint256 toolId)
        external
        view
        returns (ToolMetadata memory)
    {
        if (toolId >= _toolIdCounter) revert ToolNotFound(toolId);
        return tools[toolId];
    }

    /**
     * @dev Returns total number of tools listed
     * @return count Total tool count
     */
    function totalTools() external view returns (uint256) {
        return _toolIdCounter;
    }

    /**
     * @dev Checks if customer has valid license for tool
     * @param customer Customer address
     * @param toolId Tool ID
     * @return bool True if customer has at least 1 license
     */
    function hasLicense(address customer, uint256 toolId)
        external
        view
        returns (bool)
    {
        return balanceOf(customer, toolId) > 0;
    }

    /**
     * @dev Returns URI for a specific tool
     * @param toolId Tool ID
     * @return Tool metadata URI
     */
    function uri(uint256 toolId) public view override returns (string memory) {
        if (toolId >= _toolIdCounter) revert ToolNotFound(toolId);
        return tools[toolId].metadataURI;
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
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
