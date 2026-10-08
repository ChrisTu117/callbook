// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ScoreAnchor} from "./ScoreAnchor.sol";
import {SignalBook} from "./SignalBook.sol";

/// @title CopyDesk
/// @notice Follow an agent and mirror one live signal, with a hard spend cap.
///         The cap is the follower's escrow. A per-trade cap is optional.
///         Losses stay in `surplus`. Gains are paid only from surplus, so the desk
///         cannot mint winnings. The deployer may seed surplus. Nobody can skim it.
///         On Arc the native coin is USDC with 18 decimals. This contract uses msg.value
///         only. It does not call the 6-decimal ERC-20 balanceOf.
contract CopyDesk {
    struct Mirror {
        address follower;
        uint256 agentId;
        uint256 signalId;
        uint256 notional;
        bool settled;
        int256 pnl;
    }

    SignalBook public immutable book;
    ScoreAnchor public immutable anchor;
    address public owner;
    uint32 public minSamples;
    uint32 public minWinBps;

    mapping(address follower => uint256) public escrow;
    mapping(address follower => uint256) public locked;
    mapping(address follower => uint256) public perTradeCap;
    mapping(address follower => mapping(uint256 agentId => bool)) public following;
    mapping(uint256 mirrorId => Mirror) private _mirrors;

    uint256 public nextMirrorId = 1;
    uint256 public surplus;

    error Owner();
    error Gate();
    error Value();
    error Cap();
    error NotFollowing();
    error Signal();
    error Funds();
    error AlreadySettled();
    error Score();

    event Followed(address indexed follower, uint256 indexed agentId, uint256 added, uint256 escrowBalance, uint256 perTradeCap);
    event Unfollowed(address indexed follower, uint256 indexed agentId);
    event Deposited(address indexed follower, uint256 amount);
    event Withdrawn(address indexed follower, uint256 amount);
    event Seeded(address indexed from, uint256 amount);
    event Mirrored(uint256 indexed mirrorId, address indexed follower, uint256 indexed signalId, uint256 notional);
    event Settled(uint256 indexed mirrorId, address indexed follower, int256 pnl, uint256 paidGain, uint256 loss);
    event GateSet(uint32 minSamples, uint32 minWinBps);

    constructor(address book_, address anchor_, uint32 minSamples_, uint32 minWinBps_) {
        book = SignalBook(book_);
        anchor = ScoreAnchor(anchor_);
        owner = msg.sender;
        minSamples = minSamples_;
        minWinBps = minWinBps_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Owner();
        _;
    }

    function setGate(uint32 minSamples_, uint32 minWinBps_) external onlyOwner {
        if (minWinBps_ > 10_000) revert Gate();
        minSamples = minSamples_;
        minWinBps = minWinBps_;
        emit GateSet(minSamples_, minWinBps_);
    }

    function getMirror(uint256 mirrorId) external view returns (Mirror memory) {
        return _mirrors[mirrorId];
    }

    /// @notice Total the follower can still lose on a new mirror.
    function spendable(address follower) external view returns (uint256) {
        return escrow[follower];
    }

    function follow(uint256 agentId, uint256 newPerTradeCap) external payable {
        if (msg.value == 0) revert Value();
        _checkGate(agentId);
        following[msg.sender][agentId] = true;
        escrow[msg.sender] += msg.value;
        if (newPerTradeCap > 0) perTradeCap[msg.sender] = newPerTradeCap;
        emit Followed(msg.sender, agentId, msg.value, escrow[msg.sender], perTradeCap[msg.sender]);
    }

    function deposit() external payable {
        if (msg.value == 0) revert Value();
        escrow[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function unfollow(uint256 agentId) external {
        following[msg.sender][agentId] = false;
        emit Unfollowed(msg.sender, agentId);
    }

    function withdraw(uint256 amount) external {
        if (amount == 0 || amount > escrow[msg.sender]) revert Funds();
        escrow[msg.sender] -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert Funds();
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Fund the surplus that pays winning copiers. The seed can be paid out. It cannot be reclaimed.
    function seed() external payable {
        if (msg.value == 0) revert Value();
        surplus += msg.value;
        emit Seeded(msg.sender, msg.value);
    }

    /// @notice Mirror a revealed signal before the horizon and before the exit price is pinned.
    function mirror(uint256 signalId, uint256 notional) external returns (uint256 mirrorId) {
        if (notional == 0) revert Value();
        if (notional > escrow[msg.sender]) revert Cap();
        uint256 tradeCap = perTradeCap[msg.sender];
        if (tradeCap != 0 && notional > tradeCap) revert Cap();

        SignalBook.Signal memory s = book.getSignal(signalId);
        if (!s.revealed || s.expired || s.exitPinned) revert Signal();
        if (block.timestamp >= s.horizonEnd) revert Signal();
        if (!following[msg.sender][s.agentId]) revert NotFollowing();
        _checkGate(s.agentId);

        escrow[msg.sender] -= notional;
        locked[msg.sender] += notional;

        mirrorId = nextMirrorId++;
        _mirrors[mirrorId] = Mirror({
            follower: msg.sender,
            agentId: s.agentId,
            signalId: signalId,
            notional: notional,
            settled: false,
            pnl: 0
        });
        emit Mirrored(mirrorId, msg.sender, signalId, notional);
    }

    /// @notice Apply the scored pnl. A loss is capped at the notional. A gain is capped at surplus.
    function settle(uint256 mirrorId) external {
        Mirror storage m = _mirrors[mirrorId];
        if (m.follower == address(0) || m.settled) revert AlreadySettled();
        ScoreAnchor.Score memory sc = anchor.getScore(m.signalId);
        if (!sc.exists) revert Score();

        int256 pnl = (int256(m.notional) * sc.pnlBps) / 10_000;
        uint256 paidGain;
        uint256 loss;
        if (pnl >= 0) {
            uint256 gain = uint256(pnl);
            paidGain = gain > surplus ? surplus : gain;
            surplus -= paidGain;
            locked[m.follower] -= m.notional;
            escrow[m.follower] += m.notional + paidGain;
        } else {
            loss = uint256(-pnl);
            if (loss > m.notional) loss = m.notional;
            surplus += loss;
            locked[m.follower] -= m.notional;
            escrow[m.follower] += m.notional - loss;
        }

        m.settled = true;
        m.pnl = pnl;
        emit Settled(mirrorId, m.follower, pnl, paidGain, loss);
    }

    function _checkGate(uint256 agentId) internal view {
        (uint32 samples, uint32 wins,) = anchor.stats(agentId);
        if (samples < minSamples) revert Gate();
        if (samples == 0) return;
        if ((uint256(wins) * 10_000) / samples < minWinBps) revert Gate();
    }
}
