// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Test-only 6-decimal ERC-20 for Callbook's x402 demo on GOAT Testnet3.
///         It is NOT USDC and has no value. Anyone may mint up to 1,000 tUSD per call.
///         It stands in until a GOAT Flow merchant account enables a real Testnet3 token.
contract TestUSD {
    string public constant name = "Callbook Test USD (not USDC)";
    string public constant symbol = "tUSD";
    uint8 public constant decimals = 6;
    uint256 public constant MINT_CAP = 1_000e6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error OverCap();
    error Insufficient();

    function mint(address to, uint256 amount) external {
        if (amount > MINT_CAP) revert OverCap();
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a < amount) revert Insufficient();
        if (a != type(uint256).max) allowance[from][msg.sender] = a - amount;
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) internal {
        if (balanceOf[from] < amount) revert Insufficient();
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
