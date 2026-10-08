// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {AttestedPriceSource} from "../src/price/AttestedPriceSource.sol";
import {PythPriceSource} from "../src/price/PythPriceSource.sol";
import {MockIdentity, MockPriceSource, MockPyth, MockReputation, MockValidation} from "../src/mocks/Mocks.sol";
import {CopyDesk} from "../src/CopyDesk.sol";
import {ScoreAnchor} from "../src/ScoreAnchor.sol";
import {SignalBook} from "../src/SignalBook.sol";

contract CallbookTest is Test {
    bytes32 internal constant ETH = bytes32("ETH-USD");

    MockIdentity internal identity;
    MockReputation internal reputation;
    MockValidation internal validation;
    MockPriceSource internal prices;
    SignalBook internal book;
    ScoreAnchor internal anchor;
    CopyDesk internal desk;

    uint256 internal agentPk = 0xA11CE;
    address internal agent;
    uint256 internal agentId;
    address internal follower = makeAddr("follower");

    function setUp() public {
        vm.warp(1_000_000);
        agent = vm.addr(agentPk);
        identity = new MockIdentity();
        reputation = new MockReputation();
        validation = new MockValidation();
        prices = new MockPriceSource();
        book = new SignalBook(address(identity), address(prices), 60, 3600, 3600);
        anchor = new ScoreAnchor(address(book), address(reputation), address(validation));
        desk = new CopyDesk(address(book), address(anchor), 1, 5000);

        vm.prank(agent);
        agentId = identity.register("ipfs://ada");
        _setPrice(3_000e8);
    }

    function test_commitRevealScore_hit() public {
        uint256 id = _commit(180, 1, 7000);
        _reveal(id, 1, 7000, "long the open");

        vm.warp(book.getSignal(id).horizonEnd);
        _setPrice(3_030e8);
        book.pinExit(id);
        int256 bps = anchor.score(id);

        assertEq(bps, 100);
        (uint32 samples, uint32 wins, int256 cum) = anchor.stats(agentId);
        assertEq(samples, 1);
        assertEq(wins, 1);
        assertEq(cum, 100);
        assertEq(reputation.getLastIndex(agentId, address(anchor)), 1);
        (int128 value, uint8 decimals, string memory tag1, string memory tag2,) =
            reputation.feedback(agentId, address(anchor), 1);
        assertEq(value, 100);
        assertEq(decimals, 2);
        assertEq(tag1, "tradingYield");
        assertEq(tag2, "hit");
    }

    function test_revert_sameBlockReveal_and_badHash() public {
        bytes32 salt = keccak256("salt");
        bytes32 hash_ = book.hashSignal(agentId, ETH, 1, 5000, salt);
        vm.prank(agent);
        uint256 id = book.commit(agentId, ETH, hash_, 180);
        vm.expectRevert(SignalBook.TooSoon.selector);
        vm.prank(agent);
        book.reveal(id, 1, 5000, salt, "");

        vm.roll(vm.getBlockNumber() + 1); // block.number can be stale under via_ir after a roll
        vm.expectRevert(SignalBook.Hash.selector);
        vm.prank(agent);
        book.reveal(id, -1, 5000, salt, "");
    }

    function test_unrevealed_is_a_miss() public {
        uint256 id = _commit(180, 1, 8000);
        SignalBook.Signal memory s = book.getSignal(id);
        vm.warp(s.revealDeadline + 1);
        book.markExpired(id);
        int256 bps = anchor.score(id);
        assertEq(bps, 0);
        (uint32 samples, uint32 wins,) = anchor.stats(agentId);
        assertEq(samples, 1);
        assertEq(wins, 0);
        (,,, string memory tag2,) = reputation.feedback(agentId, address(anchor), 1);
        assertEq(tag2, "noReveal");
    }

    function test_copy_gate_cap_and_settlement() public {
        uint256 first = _commit(180, 1, 6000);
        _reveal(first, 1, 6000, "");
        vm.warp(book.getSignal(first).horizonEnd);
        _setPrice(3_030e8);
        book.pinExit(first);
        anchor.score(first);

        vm.deal(follower, 10 ether);
        vm.expectRevert(CopyDesk.Gate.selector);
        vm.prank(follower);
        desk.follow{value: 1 ether}(agentId + 9, 0.25 ether);

        // The scored agent clears a 50% gate. A fresh agent does not.
        vm.prank(follower);
        desk.follow{value: 1 ether}(agentId, 0.25 ether);
        assertEq(desk.spendable(follower), 1 ether);

        uint256 live = _commit(180, 1, 6400);
        _reveal(live, 1, 6400, "again");

        vm.expectRevert(CopyDesk.Cap.selector);
        vm.prank(follower);
        desk.mirror(live, 0.3 ether);

        vm.prank(follower);
        uint256 mirrorId = desk.mirror(live, 0.2 ether);
        assertEq(desk.spendable(follower), 0.8 ether);
        assertEq(desk.locked(follower), 0.2 ether);

        vm.warp(book.getSignal(live).horizonEnd);
        _setPrice(3_060e8);
        book.pinExit(live);
        anchor.score(live);

        desk.seed{value: 1 ether}();
        uint256 surplusBefore = desk.surplus();
        desk.settle(mirrorId);
        int256 expectedPnl = (int256(0.2 ether) * anchor.getScore(live).pnlBps) / 10_000;
        assertGt(expectedPnl, 0);
        assertEq(desk.locked(follower), 0);
        assertEq(desk.spendable(follower), 0.8 ether + 0.2 ether + uint256(expectedPnl));
        assertEq(desk.surplus(), surplusBefore - uint256(expectedPnl));
        assertEq(address(desk).balance, desk.spendable(follower) + desk.surplus());

        // A losing mirror caps the loss at the notional and cannot withdraw locked funds.
        uint256 losing = _commit(180, -1, 5100);
        _reveal(losing, -1, 5100, "fade");
        vm.prank(follower);
        uint256 lossMirror = desk.mirror(losing, 0.2 ether);
        uint256 lockedNow = desk.locked(follower);
        uint256 tooMuch = desk.spendable(follower) + 1;
        vm.expectRevert(CopyDesk.Funds.selector);
        vm.prank(follower);
        desk.withdraw(tooMuch);

        vm.warp(book.getSignal(losing).horizonEnd);
        _setPrice(book.getSignal(losing).entryPrice * 2);
        book.pinExit(losing);
        anchor.score(losing);
        desk.settle(lossMirror);
        assertEq(desk.locked(follower), lockedNow - 0.2 ether);
        // Short into a doubled price loses the whole notional.
        CopyDesk.Mirror memory settled = desk.getMirror(lossMirror);
        assertTrue(settled.settled);
        assertLt(settled.pnl, 0);
    }

    function test_gain_capped_by_surplus_and_loss_capped_by_notional() public {
        uint256 id = _roundTrip(1, 3_000e8, 3_300e8); // +10%
        anchor.score(id);
        vm.deal(follower, 5 ether);
        vm.prank(follower);
        desk.follow{value: 1 ether}(agentId, 1 ether);
        uint256 live = _commit(180, 1, 5000);
        _reveal(live, 1, 5000, "");
        vm.prank(follower);
        uint256 mirrorId = desk.mirror(live, 1 ether);
        vm.warp(book.getSignal(live).horizonEnd);
        _setPrice(6_000e8);
        book.pinExit(live);
        anchor.score(live);
        // +100% would pay 1 ether, but surplus is empty, so the copier is paid 0.
        desk.settle(mirrorId);
        assertEq(desk.spendable(follower), 1 ether);
        assertEq(desk.surplus(), 0);

        // Short, price up 10x: raw pnl is far past -100%, loss stops at notional.
        uint256 losing = _commit(180, -1, 5000);
        _reveal(losing, -1, 5000, "");
        vm.prank(follower);
        uint256 lossId = desk.mirror(losing, 1 ether);
        vm.warp(book.getSignal(losing).horizonEnd);
        int256 entry = book.getSignal(losing).entryPrice;
        _setPrice(entry * 10);
        book.pinExit(losing);
        int256 bps = anchor.score(losing);
        assertLt(bps, -10_000);
        desk.settle(lossId);
        assertEq(desk.spendable(follower), 0);
        assertEq(desk.surplus(), 1 ether);
    }

    function test_cannot_mirror_a_known_outcome() public {
        uint256 id = _roundTrip(1, 3_000e8, 3_030e8);
        anchor.score(id);
        vm.deal(follower, 2 ether);
        vm.prank(follower);
        desk.follow{value: 1 ether}(agentId, 1 ether);

        uint256 live = _commit(180, 1, 5000);
        _reveal(live, 1, 5000, "");
        vm.warp(book.getSignal(live).horizonEnd);
        vm.expectRevert(CopyDesk.Signal.selector);
        vm.prank(follower);
        desk.mirror(live, 0.1 ether);
    }

    function test_pyth_normalizes_expo() public {
        MockPyth pyth = new MockPyth();
        PythPriceSource src = new PythPriceSource(address(pyth));
        pyth.set(2_574_62521325, -8, block.timestamp);
        (int256 p,) = src.read(ETH);
        assertEq(p, 2_574_62521325);

        pyth.set(1000, -5, block.timestamp);
        (p,) = src.read(ETH);
        assertEq(p, 1_000_000);

        vm.expectRevert(abi.encodeWithSelector(PythPriceSource.UnknownAsset.selector, bytes32("DOGE-USD")));
        src.read(bytes32("DOGE-USD"));
    }

    function test_attested_price_checks_signer() public {
        uint256 pk = 0xBEEF;
        AttestedPriceSource src = new AttestedPriceSource(vm.addr(pk));
        uint64 ts = uint64(block.timestamp);
        bytes32 digest = src.digest(ETH, 2_500e8, ts);
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethHash);
        src.attest(ETH, 2_500e8, ts, abi.encodePacked(r, s, v));
        (int256 p, uint64 published) = src.read(ETH);
        assertEq(p, 2_500e8);
        assertEq(published, ts);

        uint256 other = 0xCAFE;
        bytes32 digest2 = src.digest(ETH, 2_600e8, ts);
        bytes32 ethHash2 = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest2));
        (v, r, s) = vm.sign(other, ethHash2);
        vm.expectRevert(AttestedPriceSource.BadSignature.selector);
        src.attest(ETH, 2_600e8, ts, abi.encodePacked(r, s, v));
    }

    function test_validation_response_is_win_rate() public {
        uint256 id = _roundTrip(1, 3_000e8, 3_030e8);
        anchor.score(id);
        bytes32 requestHash = keccak256("request");
        vm.prank(agent);
        validation.validationRequest(address(anchor), agentId, "", requestHash);
        uint8 response = anchor.respond(requestHash);
        assertEq(response, 100);
        (, uint256 gotAgent, uint8 stored,, string memory tag,) = validation.getValidationStatus(requestHash);
        assertEq(gotAgent, agentId);
        assertEq(stored, 100);
        assertEq(tag, "winRate");
    }

    function test_vectors() public pure {
        bytes32 signal = keccak256(
            abi.encode(
                uint256(1),
                bytes32("ETH-USD"),
                int8(1),
                uint16(7000),
                bytes32(uint256(5)),
                uint256(31337),
                address(0x1234)
            )
        );
        console2.logBytes32(signal);
        bytes32 price = keccak256(
            abi.encode(
                "CALLBOOK_PRICE",
                uint256(5042),
                address(0x1111),
                bytes32("ETH-USD"),
                int256(250_000_000_000),
                uint64(1_700_000_000)
            )
        );
        console2.logBytes32(price);
    }

    function test_non_owner_cannot_commit() public {
        vm.expectRevert(SignalBook.NotOwner.selector);
        book.commit(agentId, ETH, bytes32("x"), 180);
    }

    function _setPrice(int256 price1e8) internal {
        prices.set(ETH, price1e8, uint64(block.timestamp));
    }

    function _commit(uint64 horizon, int8 direction, uint16 confidence) internal returns (uint256 id) {
        bytes32 salt = keccak256(abi.encode(agentId, direction, confidence, book.nextId()));
        bytes32 hash_ = book.hashSignal(agentId, ETH, direction, confidence, salt);
        vm.prank(agent);
        id = book.commit(agentId, ETH, hash_, horizon);
        // Stash the salt in a mapping via the hash check at reveal time. The helper reveal recomputes it.
        salts[id] = salt;
    }

    mapping(uint256 => bytes32) internal salts;

    function _reveal(uint256 id, int8 direction, uint16 confidence, string memory note) internal {
        vm.roll(vm.getBlockNumber() + 1); // block.number can be stale under via_ir after a roll
        vm.prank(agent);
        book.reveal(id, direction, confidence, salts[id], note);
    }

    function _roundTrip(int8 direction, int256 entry, int256 exit_) internal returns (uint256 id) {
        _setPrice(entry);
        id = _commit(180, direction, 5000);
        _reveal(id, direction, 5000, "");
        vm.warp(book.getSignal(id).horizonEnd);
        _setPrice(exit_);
        book.pinExit(id);
    }
}
