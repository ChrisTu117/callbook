// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IPriceSource} from "../interfaces/IPriceSource.sol";

/// @title AttestedPriceSource
/// @notice Stores a price signed by a single attestor.
///         Used on Arc, where the Monad Pyth contract address does not serve getPriceUnsafe.
///         The attestor posts a Coinbase (or other public) print. Anyone can submit the signature.
///         SignalBook still rejects a print that is older than maxStaleness.
contract AttestedPriceSource is IPriceSource {
    address public immutable attestor;

    struct Print {
        int256 price1e8;
        uint64 publishedAt;
    }

    mapping(bytes32 assetId => Print) public prints;

    error BadSignature();
    error BadPrice();
    error Future();

    event Attested(bytes32 indexed assetId, int256 price1e8, uint64 publishedAt, address indexed attestor);

    constructor(address attestor_) {
        attestor = attestor_;
    }

    function name() external pure returns (string memory) {
        return "attested";
    }

    /// @dev Digest is keccak256(abi.encode("CALLBOOK_PRICE", chainid, this, asset, price, time)).
    ///      The signature is an EIP-191 personal_sign over that digest.
    function attest(bytes32 assetId, int256 price1e8, uint64 publishedAt, bytes calldata signature) external {
        if (price1e8 <= 0) revert BadPrice();
        if (publishedAt > block.timestamp) revert Future();
        bytes32 hash_ = keccak256(abi.encode("CALLBOOK_PRICE", block.chainid, address(this), assetId, price1e8, publishedAt));
        if (_recover(hash_, signature) != attestor) revert BadSignature();
        prints[assetId] = Print(price1e8, publishedAt);
        emit Attested(assetId, price1e8, publishedAt, attestor);
    }

    function read(bytes32 assetId) external view returns (int256 price1e8, uint64 publishedAt) {
        Print memory print = prints[assetId];
        if (print.price1e8 <= 0) revert BadPrice();
        return (print.price1e8, print.publishedAt);
    }

    function digest(bytes32 assetId, int256 price1e8, uint64 publishedAt) external view returns (bytes32) {
        return keccak256(abi.encode("CALLBOOK_PRICE", block.chainid, address(this), assetId, price1e8, publishedAt));
    }

    function _recover(bytes32 digest_, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert BadSignature();
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest_));
        address signer = ecrecover(ethHash, v, r, s);
        if (signer == address(0)) revert BadSignature();
        return signer;
    }
}
