// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {AttestedPriceSource} from "../src/price/AttestedPriceSource.sol";
import {PythPriceSource} from "../src/price/PythPriceSource.sol";
import {MockIdentity, MockPriceSource, MockReputation, MockValidation} from "../src/mocks/Mocks.sol";
import {CopyDesk} from "../src/CopyDesk.sol";
import {ScoreAnchor} from "../src/ScoreAnchor.sol";
import {SignalBook} from "../src/SignalBook.sol";

/// @notice One entry point for Monad testnet (10143), Monad mainnet (143),
///         Arc mainnet (5042), Base Sepolia (84532), Arbitrum Sepolia (421614),
///         Ethereum Sepolia (11155111), and a local Anvil chain.
///         Arc and the three Sepolia chains use AttestedPriceSource.
///         Monad uses Pyth unless PRICE_KIND=attested. Local uses mocks.
contract Deploy is Script {
    uint256 internal constant MONAD_TESTNET = 10143;
    uint256 internal constant MONAD_MAINNET = 143;
    uint256 internal constant ARC_MAINNET = 5042;
    uint256 internal constant BASE_SEPOLIA = 84532;
    uint256 internal constant ARBITRUM_SEPOLIA = 421614;
    uint256 internal constant ETHEREUM_SEPOLIA = 11155111;

    address internal constant PYTH = 0x2880aB155794e7179c9eE2e38200202908C17B43;
    address internal constant ID_TESTNET = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    address internal constant REP_TESTNET = 0x8004B663056A597Dffe9eCcC1965A193B7388713;
    address internal constant VAL_TESTNET = 0x8004Cb1BF31DAf7788923b405b754f57acEB4272;
    address internal constant ID_MAIN = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;
    address internal constant REP_MAIN = 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63;
    address internal constant VAL_MAIN = 0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        uint64 revealWindow = uint64(vm.envOr("REVEAL_WINDOW", uint256(120)));
        uint64 pinWindow = uint64(vm.envOr("PIN_WINDOW", uint256(3600)));
        uint64 maxStaleness = uint64(vm.envOr("MAX_STALENESS", uint256(3600)));
        uint32 minSamples = uint32(vm.envOr("MIN_SAMPLES", uint256(1)));
        uint32 minWinBps = uint32(vm.envOr("MIN_WIN_BPS", uint256(5000)));
        // Set PRICE_KIND=attested when the Pyth push feed is older than maxStaleness.
        // Hermes has required an API key since 26 Aug 2026, so a stale push cannot be refreshed here.
        bool forceAttested = keccak256(bytes(vm.envOr("PRICE_KIND", string("")))) == keccak256(bytes("attested"));

        vm.startBroadcast(pk);

        address identity;
        address reputation;
        address validation;
        address priceSource;
        string memory priceKind;

        if (block.chainid == MONAD_TESTNET) {
            identity = ID_TESTNET;
            reputation = REP_TESTNET;
            validation = VAL_TESTNET;
            if (forceAttested) {
                priceSource = address(new AttestedPriceSource(vm.addr(pk)));
                priceKind = "attested";
            } else {
                priceSource = address(new PythPriceSource(PYTH));
                priceKind = "pyth";
            }
        } else if (block.chainid == MONAD_MAINNET) {
            identity = ID_MAIN;
            reputation = REP_MAIN;
            validation = VAL_MAIN;
            if (forceAttested) {
                priceSource = address(new AttestedPriceSource(vm.addr(pk)));
                priceKind = "attested";
            } else {
                priceSource = address(new PythPriceSource(PYTH));
                priceKind = "pyth";
            }
        } else if (block.chainid == ARC_MAINNET) {
            // Same CREATE2 registry addresses as Monad mainnet. Confirmed in the research notes.
            identity = ID_MAIN;
            reputation = REP_MAIN;
            validation = VAL_MAIN;
            priceSource = address(new AttestedPriceSource(vm.addr(pk)));
            priceKind = "attested";
        } else if (
            block.chainid == BASE_SEPOLIA || block.chainid == ARBITRUM_SEPOLIA || block.chainid == ETHEREUM_SEPOLIA
        ) {
            // Same CREATE2 testnet registries as Monad testnet. Confirmed live on 8 Oct 2026.
            // Attested prices: Hermes requires an API key, so this port does not depend on a Pyth push.
            identity = ID_TESTNET;
            reputation = REP_TESTNET;
            validation = VAL_TESTNET;
            priceSource = address(new AttestedPriceSource(vm.addr(pk)));
            priceKind = "attested";
        } else {
            identity = address(new MockIdentity());
            reputation = address(new MockReputation());
            validation = address(new MockValidation());
            priceSource = address(new MockPriceSource());
            priceKind = "mock";
        }

        SignalBook book = new SignalBook(identity, priceSource, revealWindow, pinWindow, maxStaleness);
        ScoreAnchor anchor = new ScoreAnchor(address(book), reputation, validation);
        CopyDesk desk = new CopyDesk(address(book), address(anchor), minSamples, minWinBps);

        vm.stopBroadcast();

        console2.log("chainId", block.chainid);
        console2.log("identity", identity);
        console2.log("reputation", reputation);
        console2.log("validation", validation);
        console2.log("priceSource", priceSource);
        console2.log("priceKind", priceKind);
        console2.log("signalBook", address(book));
        console2.log("scoreAnchor", address(anchor));
        console2.log("copyDesk", address(desk));
        _write(identity, reputation, validation, priceSource, priceKind, address(book), address(anchor), address(desk), revealWindow, pinWindow, maxStaleness, minSamples, minWinBps);
    }

    function _write(
        address identity,
        address reputation,
        address validation,
        address priceSource,
        string memory priceKind,
        address book,
        address anchor,
        address desk,
        uint64 revealWindow,
        uint64 pinWindow,
        uint64 maxStaleness,
        uint32 minSamples,
        uint32 minWinBps
    ) internal {
        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeString(obj, "priceKind", priceKind);
        vm.serializeAddress(obj, "identity", identity);
        vm.serializeAddress(obj, "reputation", reputation);
        vm.serializeAddress(obj, "validation", validation);
        vm.serializeAddress(obj, "priceSource", priceSource);
        vm.serializeAddress(obj, "signalBook", book);
        vm.serializeAddress(obj, "scoreAnchor", anchor);
        vm.serializeUint(obj, "revealWindow", revealWindow);
        vm.serializeUint(obj, "pinWindow", pinWindow);
        vm.serializeUint(obj, "maxStaleness", maxStaleness);
        vm.serializeUint(obj, "minSamples", minSamples);
        vm.serializeAddress(obj, "copyDesk", desk);
        vm.serializeUint(obj, "minWinBps", minWinBps);
        // The last serialize call returns every key. startBlock is the head before these txs.
        string memory json = vm.serializeUint(obj, "startBlock", block.number);
        vm.writeJson(json, string.concat("deployments/", vm.toString(block.chainid), ".json"));
    }
}
