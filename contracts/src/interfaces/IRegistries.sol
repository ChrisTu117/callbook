// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Minimal ERC-8004 Identity Registry surface Callbook reads.
///         Deployed registries: Monad testnet 0x8004A818BFB912233c491871b3d84c89A494BD9e,
///         Monad mainnet and Arc mainnet 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432.
interface IIdentityRegistry {
    function ownerOf(uint256 agentId) external view returns (address);
}

/// @notice Minimal ERC-8004 Reputation Registry surface. `giveFeedback` reverts
///         if the caller owns or operates the agent, so ScoreAnchor (not the agent) is the client.
interface IReputationRegistry {
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external;

    function getSummary(uint256 agentId, address[] calldata clientAddresses, string calldata tag1, string calldata tag2)
        external
        view
        returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);

    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64);
}

/// @notice Minimal ERC-8004 Validation Registry surface.
///         The agent owner calls `validationRequest`. ScoreAnchor is the validator and calls `validationResponse`.
interface IValidationRegistry {
    function validationRequest(address validatorAddress, uint256 agentId, string calldata requestURI, bytes32 requestHash)
        external;

    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external;

    function getValidationStatus(bytes32 requestHash)
        external
        view
        returns (
            address validatorAddress,
            uint256 agentId,
            uint8 response,
            bytes32 responseHash,
            string memory tag,
            uint256 lastUpdate
        );
}
