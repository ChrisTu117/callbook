/**
 * Writes deployments/colosseum.json from the three Sepolia deployment files.
 * Fills the matching rows in networks.json when a deployment file exists.
 *
 *   node deploy/record-colosseum.mjs
 *
 * Safe to run before any deploy: missing files stay "not deployed".
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const networksPath = path.join(root, "networks.json");
const outPath = path.join(root, "deployments", "colosseum.json");

const CHAINS = [
  {
    key: "base-sepolia",
    chainId: 84532,
    name: "Base Sepolia",
    explorer: "https://sepolia.basescan.org",
    faucet: "https://portal.cdp.coinbase.com/products/faucet",
    faucetNote: "Coinbase CDP faucet, Base Sepolia, ETH. Also https://www.alchemy.com/faucets/base-sepolia and https://faucets.chain.link/base-sepolia (wallet login or CAPTCHA).",
  },
  {
    key: "arbitrum-sepolia",
    chainId: 421614,
    name: "Arbitrum Sepolia",
    explorer: "https://sepolia.arbiscan.io",
    faucet: "https://faucets.chain.link/arbitrum-sepolia",
    faucetNote: "Chainlink drips 0.5 ETH and needs a wallet login. Alchemy: https://www.alchemy.com/faucets/arbitrum-sepolia",
  },
  {
    key: "ethereum-sepolia",
    chainId: 11155111,
    name: "Ethereum Sepolia",
    explorer: "https://sepolia.etherscan.io",
    faucet: "https://sepolia-faucet.pk910.de/",
    faucetNote: "PoW faucet. It asks for a CAPTCHA before mining. Chainlink: https://faucets.chain.link/sepolia . Coinbase CDP also drips Ethereum Sepolia ETH.",
  },
];

const doc = JSON.parse(readFileSync(networksPath, "utf8"));
const deployer = process.env.COLOSSEUM_DEPLOYER || "";

function link(explorer, kind, address) {
  if (!address) return "";
  return `${explorer}/${kind}/${address}`;
}

const chains = CHAINS.map((chain) => {
  const file = path.join(root, "deployments", `${chain.chainId}.json`);
  const deployed = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  const row = doc.networks.find((entry) => entry.chainId === chain.chainId);
  if (deployed && row) {
    row.priceSource = deployed.priceSource;
    row.signalBook = deployed.signalBook;
    row.scoreAnchor = deployed.scoreAnchor;
    row.copyDesk = deployed.copyDesk;
    row.priceKind = deployed.priceKind;
    row.minSamples = deployed.minSamples;
    row.minWinBps = deployed.minWinBps;
    if (deployed.startBlock) row.startBlock = deployed.startBlock;
    row.revealWindow = deployed.revealWindow;
    row.pinWindow = deployed.pinWindow;
    row.maxStaleness = deployed.maxStaleness;
  }
  const book = deployed?.signalBook ?? "";
  return {
    key: chain.key,
    chainId: chain.chainId,
    name: chain.name,
    deployed: Boolean(deployed?.signalBook),
    rpc: row?.rpc ?? "",
    logChunk: row?.logChunk ?? null,
    faucet: chain.faucet,
    faucetNote: chain.faucetNote,
    identity: deployed?.identity ?? row?.identity ?? "",
    reputation: deployed?.reputation ?? row?.reputation ?? "",
    validation: deployed?.validation ?? row?.validation ?? "",
    priceSource: book ? deployed.priceSource : "",
    signalBook: book,
    scoreAnchor: deployed?.scoreAnchor ?? "",
    copyDesk: deployed?.copyDesk ?? "",
    startBlock: deployed?.startBlock ?? row?.startBlock ?? 0,
    revealWindow: deployed?.revealWindow ?? null,
    explorers: {
      identity: link(chain.explorer, "address", deployed?.identity ?? row?.identity ?? ""),
      reputation: link(chain.explorer, "address", deployed?.reputation ?? row?.reputation ?? ""),
      validation: link(chain.explorer, "address", deployed?.validation ?? row?.validation ?? ""),
      priceSource: link(chain.explorer, "address", book ? deployed.priceSource : ""),
      signalBook: link(chain.explorer, "address", book),
      scoreAnchor: link(chain.explorer, "address", deployed?.scoreAnchor ?? ""),
      copyDesk: link(chain.explorer, "address", deployed?.copyDesk ?? ""),
    },
  };
});

const payload = {
  track: "colosseum-crypto-worlds-fair",
  deadline: "2026-10-12T23:59:00-07:00",
  deployer,
  deployerNote: "Throwaway Sepolia key. The private key is not in git.",
  deployedCount: chains.filter((chain) => chain.deployed).length,
  chains,
};

writeFileSync(networksPath, `${JSON.stringify(doc, null, 2)}\n`);
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outPath)} (${payload.deployedCount}/3 deployed)`);
