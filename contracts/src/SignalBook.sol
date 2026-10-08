// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IIdentityRegistry} from "./interfaces/IRegistries.sol";
import {IPriceSource} from "./interfaces/IPriceSource.sol";

/// @title SignalBook
/// @notice Commit-reveal trade signals for ERC-8004 agents.
///         The commit transaction pins the entry price. The hash hides direction until reveal.
///         A commit that is not revealed by the deadline can be marked expired and scored as a miss,
///         so an agent cannot publish only the calls that won.
contract SignalBook {
    struct Signal {
        uint256 agentId;
        address committer;
        bytes32 assetId;
        bytes32 commitHash;
        uint64 commitTime;
        uint64 commitBlock;
        uint64 revealDeadline;
        uint64 horizonEnd;
        int256 entryPrice;
        uint64 entryPublishedAt;
        int8 direction;
        uint16 confidenceBps;
        bool revealed;
        bool expired;
        bool exitPinned;
        int256 exitPrice;
        uint64 exitPublishedAt;
        string note;
    }

    IIdentityRegistry public immutable identity;
    IPriceSource public immutable prices;
    uint64 public immutable revealWindow;
    uint64 public immutable pinWindow;
    uint64 public immutable maxStaleness;

    uint256 public nextId = 1;
    mapping(uint256 id => Signal) private _signals;

    error NotOwner();
    error BadHorizon();
    error BadPrice();
    error Stale();
    error Unknown();
    error TooSoon();
    error Late();
    error Hash();
    error Direction();
    error Confidence();
    error Note();
    error State();
    error Early();
    error PinWindow();

    event Committed(
        uint256 indexed id,
        uint256 indexed agentId,
        bytes32 indexed assetId,
        bytes32 commitHash,
        int256 entryPrice,
        uint64 entryPublishedAt,
        uint64 revealDeadline,
        uint64 horizonEnd
    );
    event Revealed(uint256 indexed id, uint256 indexed agentId, int8 direction, uint16 confidenceBps, string note);
    event Expired(uint256 indexed id, uint256 indexed agentId);
    event ExitPinned(uint256 indexed id, int256 exitPrice, uint64 exitPublishedAt);

    constructor(address identity_, address prices_, uint64 revealWindow_, uint64 pinWindow_, uint64 maxStaleness_) {
        identity = IIdentityRegistry(identity_);
        prices = IPriceSource(prices_);
        revealWindow = revealWindow_;
        pinWindow = pinWindow_;
        maxStaleness = maxStaleness_;
    }

    function getSignal(uint256 id) external view returns (Signal memory) {
        return _signals[id];
    }

    /// @dev Binds the hidden call to this chain and this book. Direction is 1 (long) or -1 (short).
    function hashSignal(uint256 agentId, bytes32 assetId, int8 direction, uint16 confidenceBps, bytes32 salt)
        public
        view
        returns (bytes32)
    {
        return keccak256(abi.encode(agentId, assetId, direction, confidenceBps, salt, block.chainid, address(this)));
    }

    function commit(uint256 agentId, bytes32 assetId, bytes32 commitHash, uint64 horizonSec) external returns (uint256 id) {
        if (identity.ownerOf(agentId) != msg.sender) revert NotOwner();
        if (horizonSec <= revealWindow || horizonSec > 7 days) revert BadHorizon();

        (int256 entryPrice, uint64 publishedAt) = _freshPrice(assetId);

        id = nextId++;
        uint64 nowTs = uint64(block.timestamp);
        Signal storage s = _signals[id];
        s.agentId = agentId;
        s.committer = msg.sender;
        s.assetId = assetId;
        s.commitHash = commitHash;
        s.commitTime = nowTs;
        s.commitBlock = uint64(block.number);
        s.revealDeadline = nowTs + revealWindow;
        s.horizonEnd = nowTs + horizonSec;
        s.entryPrice = entryPrice;
        s.entryPublishedAt = publishedAt;

        emit Committed(id, agentId, assetId, commitHash, entryPrice, publishedAt, s.revealDeadline, s.horizonEnd);
    }

    function reveal(uint256 id, int8 direction, uint16 confidenceBps, bytes32 salt, string calldata note) external {
        Signal storage s = _signals[id];
        if (s.committer == address(0)) revert Unknown();
        if (s.committer != msg.sender) revert NotOwner();
        if (s.revealed || s.expired) revert State();
        // Block number, not timestamp: Arc timestamps can repeat.
        if (block.number <= s.commitBlock) revert TooSoon();
        if (block.timestamp > s.revealDeadline) revert Late();
        if (direction != 1 && direction != -1) revert Direction();
        if (confidenceBps == 0 || confidenceBps > 10_000) revert Confidence();
        if (bytes(note).length > 280) revert Note();
        bytes32 got = hashSignal(s.agentId, s.assetId, direction, confidenceBps, salt);
        if (got != s.commitHash) revert Hash();

        s.revealed = true;
        s.direction = direction;
        s.confidenceBps = confidenceBps;
        s.note = note;
        emit Revealed(id, s.agentId, direction, confidenceBps, note);
    }

    /// @notice Anyone may close a commit the agent did not reveal. ScoreAnchor counts it as a miss.
    function markExpired(uint256 id) external {
        Signal storage s = _signals[id];
        if (s.committer == address(0)) revert Unknown();
        if (s.revealed || s.expired) revert State();
        if (block.timestamp <= s.revealDeadline) revert Early();
        s.expired = true;
        emit Expired(id, s.agentId);
    }

    /// @notice Pin the exit price after the horizon, while the oracle print is still fresh.
    function pinExit(uint256 id) external {
        Signal storage s = _signals[id];
        if (s.committer == address(0)) revert Unknown();
        if (!s.revealed || s.expired || s.exitPinned) revert State();
        if (block.timestamp < s.horizonEnd) revert Early();
        if (block.timestamp > uint256(s.horizonEnd) + pinWindow) revert PinWindow();

        (int256 exitPrice, uint64 publishedAt) = _freshPrice(s.assetId);
        if (publishedAt < s.commitTime) revert Stale();

        s.exitPinned = true;
        s.exitPrice = exitPrice;
        s.exitPublishedAt = publishedAt;
        emit ExitPinned(id, exitPrice, publishedAt);
    }

    function _freshPrice(bytes32 assetId) internal view returns (int256 price1e8, uint64 publishedAt) {
        (price1e8, publishedAt) = prices.read(assetId);
        if (price1e8 <= 0) revert BadPrice();
        if (publishedAt > block.timestamp) revert Stale();
        if (block.timestamp - publishedAt > maxStaleness) revert Stale();
    }
}
