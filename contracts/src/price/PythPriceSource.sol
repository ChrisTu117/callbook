// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IPriceSource, IPyth} from "../interfaces/IPriceSource.sol";

/// @title PythPriceSource
/// @notice Reads Pyth push feeds and normalizes them to 1e8.
///         Monad testnet and mainnet both serve ETH/USD, BTC/USD, and MON/USD from
///         0x2880aB155794e7179c9eE2e38200202908C17B43. Arc does not: the same address
///         reverts on getPriceUnsafe, so Arc uses AttestedPriceSource instead.
contract PythPriceSource is IPriceSource {
    IPyth public immutable pyth;

    mapping(bytes32 assetId => bytes32 feedId) public feeds;

    error UnknownAsset(bytes32 assetId);
    error BadPrice();
    error Expo();

    constructor(address pyth_) {
        pyth = IPyth(pyth_);
        // bytes32("ETH-USD") is UTF-8, right-padded. Same encoding as viem pad(stringToHex).
        feeds[bytes32("ETH-USD")] = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
        feeds[bytes32("BTC-USD")] = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;
        feeds[bytes32("MON-USD")] = 0x31491744e2dbf6df7fcf4ac0820d18a609b49076d45066d3568424e62f686cd1;
    }

    function name() external pure returns (string memory) {
        return "pyth";
    }

    function read(bytes32 assetId) external view returns (int256 price1e8, uint64 publishedAt) {
        bytes32 feedId = feeds[assetId];
        if (feedId == bytes32(0)) revert UnknownAsset(assetId);
        IPyth.Price memory price = pyth.getPriceUnsafe(feedId);
        price1e8 = _to1e8(price.price, price.expo);
        if (price.publishTime > type(uint64).max) revert BadPrice();
        publishedAt = uint64(price.publishTime);
    }

    /// @dev Convert a Pyth price (price * 10^expo) into a 1e8 fixed-point integer.
    function _to1e8(int64 price, int32 expo) internal pure returns (int256) {
        if (price <= 0) revert BadPrice();
        int256 p = int256(price);
        if (expo == -8) return p;
        if (expo < -18 || expo > 0) revert Expo();
        if (expo > -8) {
            return p * int256(10 ** uint32(int32(expo + 8)));
        }
        return p / int256(10 ** uint32(int32(-8 - expo)));
    }
}
