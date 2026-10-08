// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Spot price normalized to 1e8 (3000e8 = $3000) plus the source publish time.
interface IPriceSource {
    function read(bytes32 assetId) external view returns (int256 price1e8, uint64 publishedAt);

    function name() external view returns (string memory);
}

interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }

    function getPriceUnsafe(bytes32 id) external view returns (Price memory price);
}
