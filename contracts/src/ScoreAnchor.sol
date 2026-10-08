// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IReputationRegistry, IValidationRegistry} from "./interfaces/IRegistries.sol";
import {SignalBook} from "./SignalBook.sol";

/// @title ScoreAnchor
/// @notice Scores a revealed signal from the two pinned prices and writes the result
///         into the ERC-8004 Reputation Registry. Scoring is permissionless: the math
///         uses only prices already stored on SignalBook.
///         This contract is the reputation client. It must not own the agent NFT,
///         because the registry rejects self-feedback.
contract ScoreAnchor {
    struct Score {
        bool exists;
        bool counted;
        bool hit;
        bool noReveal;
        int256 pnlBps;
        string tag2;
    }

    struct Stats {
        uint32 samples;
        uint32 wins;
        int256 cumulativePnlBps;
    }

    SignalBook public immutable book;
    IReputationRegistry public immutable reputation;
    IValidationRegistry public immutable validation;

    mapping(uint256 signalId => Score) public scores;
    mapping(uint256 agentId => Stats) public statsOf;

    error Already();
    error NotReady();
    error NoSamples();
    error NotValidator();

    event Scored(uint256 indexed signalId, uint256 indexed agentId, int256 pnlBps, bool hit, string tag2);
    event Validated(uint256 indexed agentId, bytes32 indexed requestHash, uint8 response);

    constructor(address book_, address reputation_, address validation_) {
        book = SignalBook(book_);
        reputation = IReputationRegistry(reputation_);
        validation = IValidationRegistry(validation_);
    }

    function stats(uint256 agentId) external view returns (uint32 samples, uint32 wins, int256 cumulativePnlBps) {
        Stats memory s = statsOf[agentId];
        return (s.samples, s.wins, s.cumulativePnlBps);
    }

    function getScore(uint256 signalId) external view returns (Score memory) {
        return scores[signalId];
    }

    function score(uint256 signalId) external returns (int256 pnlBps) {
        if (scores[signalId].exists) revert Already();
        SignalBook.Signal memory s = book.getSignal(signalId);
        if (s.committer == address(0)) revert NotReady();

        bool noReveal;
        bool hit;
        string memory tag2;
        if (s.expired) {
            noReveal = true;
            tag2 = "noReveal";
            pnlBps = 0;
        } else {
            if (!s.revealed || !s.exitPinned) revert NotReady();
            pnlBps = _pnlBps(s.direction, s.entryPrice, s.exitPrice);
            hit = pnlBps > 0;
            tag2 = hit ? "hit" : "miss";
        }

        scores[signalId] = Score({exists: true, counted: true, hit: hit, noReveal: noReveal, pnlBps: pnlBps, tag2: tag2});

        Stats storage st = statsOf[s.agentId];
        st.samples += 1;
        if (hit) st.wins += 1;
        st.cumulativePnlBps += pnlBps;

        if (pnlBps > type(int128).max || pnlBps < type(int128).min) revert NotReady();
        reputation.giveFeedback(
            s.agentId,
            int128(pnlBps),
            2,
            "tradingYield",
            tag2,
            _assetString(s.assetId),
            "",
            bytes32(0)
        );

        emit Scored(signalId, s.agentId, pnlBps, hit, tag2);
    }

    /// @notice Push the agent's win rate (0-100) to the Validation Registry.
    ///         The agent owner must have already called validationRequest with this contract as validator.
    function respond(bytes32 requestHash) external returns (uint8 response) {
        (address validator, uint256 agentId,,,,) = validation.getValidationStatus(requestHash);
        if (validator != address(this)) revert NotValidator();
        Stats memory st = statsOf[agentId];
        if (st.samples == 0) revert NoSamples();
        response = uint8((uint256(st.wins) * 100) / st.samples);
        validation.validationResponse(requestHash, response, "", bytes32(0), "winRate");
        emit Validated(agentId, requestHash, response);
    }

    function _pnlBps(int8 direction, int256 entry, int256 exit_) internal pure returns (int256) {
        int256 bps = ((exit_ - entry) * 10_000) / entry;
        if (direction < 0) bps = -bps;
        return bps;
    }

    function _assetString(bytes32 assetId) internal pure returns (string memory) {
        uint256 len;
        while (len < 32 && assetId[len] != 0) len++;
        bytes memory out = new bytes(len);
        for (uint256 i; i < len; i++) out[i] = assetId[i];
        return string(out);
    }
}
