// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {Test} from "forge-std/Test.sol";
import {TestUSD} from "../src/x402/TestUSD.sol";
contract TestUSDTest is Test {
    TestUSD t;
    function setUp() public { t = new TestUSD(); }
    function testMintAndTransfer() public {
        t.mint(address(this), 5e6);
        assertTrue(t.transfer(address(0xBEEF), 2e6));
        assertEq(t.balanceOf(address(0xBEEF)), 2e6);
        assertEq(t.balanceOf(address(this)), 3e6);
    }
    function testMintCap() public {
        vm.expectRevert(TestUSD.OverCap.selector);
        t.mint(address(this), 1_000e6 + 1);
    }
    function testTransferTooMuch() public {
        vm.expectRevert(TestUSD.Insufficient.selector);
        t.transfer(address(1), 1);
    }
}
