// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IIdentityRegistry, IReputationRegistry, IValidationRegistry} from "../interfaces/IRegistries.sol";
import {IPriceSource, IPyth} from "../interfaces/IPriceSource.sol";

/// @notice Local stand-in for the ERC-8004 Identity Registry. Real chains use the deployed registry.
contract MockIdentity is IIdentityRegistry {
    mapping(uint256 => address) public owner;
    mapping(uint256 => string) public uriOf;
    uint256 public nextId = 1;

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);

    error NotOwner();
    error NoAgent();

    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = nextId++;
        owner[agentId] = msg.sender;
        uriOf[agentId] = agentURI;
        emit Registered(agentId, agentURI, msg.sender);
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        if (owner[agentId] != msg.sender) revert NotOwner();
        uriOf[agentId] = newURI;
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    function ownerOf(uint256 agentId) external view returns (address) {
        address who = owner[agentId];
        if (who == address(0)) revert NoAgent();
        return who;
    }

    function tokenURI(uint256 agentId) external view returns (string memory) {
        return uriOf[agentId];
    }

    function isAuthorizedOrOwner(address spender, uint256 agentId) external view returns (bool) {
        return owner[agentId] != address(0) && owner[agentId] == spender;
    }
}

contract MockReputation is IReputationRegistry {
    struct Feedback {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        bool exists;
    }

    mapping(uint256 agentId => mapping(address client => mapping(uint64 index => Feedback))) public feedback;
    mapping(uint256 agentId => mapping(address client => uint64)) public lastIndex;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string tag1,
        string tag2
    );

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata,
        string calldata,
        bytes32
    ) external {
        uint64 index = ++lastIndex[agentId][msg.sender];
        feedback[agentId][msg.sender][index] =
            Feedback({value: value, valueDecimals: valueDecimals, tag1: tag1, tag2: tag2, exists: true});
        emit NewFeedback(agentId, msg.sender, index, value, valueDecimals, tag1, tag2);
    }

    function getSummary(uint256, address[] calldata, string calldata, string calldata)
        external
        pure
        returns (uint64, int128, uint8)
    {
        return (0, 0, 0);
    }

    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        return lastIndex[agentId][clientAddress];
    }
}

contract MockValidation is IValidationRegistry {
    struct Status {
        address validatorAddress;
        uint256 agentId;
        uint8 response;
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
        bool exists;
    }

    mapping(bytes32 => Status) public statuses;

    error Exists();
    error Unknown();
    error NotValidator();
    error ResponseRange();

    function validationRequest(address validatorAddress, uint256 agentId, string calldata, bytes32 requestHash) external {
        if (statuses[requestHash].exists) revert Exists();
        statuses[requestHash] = Status(validatorAddress, agentId, 0, bytes32(0), "", block.timestamp, true);
    }

    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata,
        bytes32 responseHash,
        string calldata tag
    ) external {
        Status storage s = statuses[requestHash];
        if (!s.exists) revert Unknown();
        if (msg.sender != s.validatorAddress) revert NotValidator();
        if (response > 100) revert ResponseRange();
        s.response = response;
        s.responseHash = responseHash;
        s.tag = tag;
        s.lastUpdate = block.timestamp;
    }

    function getValidationStatus(bytes32 requestHash)
        external
        view
        returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string memory tag, uint256 lastUpdate)
    {
        Status memory s = statuses[requestHash];
        if (!s.exists) revert Unknown();
        return (s.validatorAddress, s.agentId, s.response, s.responseHash, s.tag, s.lastUpdate);
    }
}

contract MockPriceSource is IPriceSource {
    mapping(bytes32 => int256) public price;
    mapping(bytes32 => uint64) public published;

    error BadPrice();

    function name() external pure returns (string memory) {
        return "mock";
    }

    function set(bytes32 assetId, int256 price1e8, uint64 publishedAt) external {
        if (price1e8 <= 0) revert BadPrice();
        price[assetId] = price1e8;
        published[assetId] = publishedAt;
    }

    function read(bytes32 assetId) external view returns (int256 price1e8, uint64 publishedAt) {
        price1e8 = price[assetId];
        if (price1e8 <= 0) revert BadPrice();
        publishedAt = published[assetId];
    }
}

contract MockPyth is IPyth {
    int64 public p;
    int32 public expo;
    uint256 public publishTime;

    function set(int64 p_, int32 expo_, uint256 publishTime_) external {
        p = p_;
        expo = expo_;
        publishTime = publishTime_;
    }

    function getPriceUnsafe(bytes32) external view returns (Price memory) {
        return Price({price: p, conf: 0, expo: expo, publishTime: publishTime});
    }
}
