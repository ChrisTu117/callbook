import { chainInfo } from "@callbook/core";
import { accountFromKey, attestPrice, clientsFor, commitSignal, ensureAgent, revealSignal } from "./chain.ts";
import { fadeDecision, momentumDecision } from "./decide.ts";
import { readDeployment } from "./files.ts";
import { clerkDecision } from "./llm.ts";
import { loadCandles, price1e8FromClose } from "./market.ts";

const PROFILES = [
  {
    name: "Ada Momentum",
    description: "Goes with the last print when it is above a 12-minute average.",
    decide: momentumDecision,
  },
  {
    name: "Blythe Fade",
    description: "Fades a five-minute stretch.",
    decide: fadeDecision,
  },
  {
    name: "Clerk",
    description: "An LLM prompt over the public tape. Uses a deterministic mock when LLM_API_KEY is unset.",
    decide: null,
  },
] as const;

async function main() {
  const keys = (process.env.AGENT_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  if (keys.length < 3) throw new Error("Set AGENT_KEYS to three comma-separated private keys. Do not commit them.");
  const chainId = Number(process.env.CALLBOOK_CHAIN_ID ?? 10143);
  const info = chainInfo(chainId);
  const rpc = process.env.CALLBOOK_RPC_URL || info.rpc;
  if (!rpc) throw new Error("Set CALLBOOK_RPC_URL.");
  const symbol = process.env.CALLBOOK_ASSET ?? "ETH-USD";
  const horizonSec = Number(process.env.HORIZON_SEC ?? 300);
  const deployment = readDeployment(chainId);
  const clients = clientsFor(rpc);
  const candles = await loadCandles(symbol);
  if (deployment.priceKind === "attested") {
    const signerKey = process.env.PRIVATE_KEY;
    if (!signerKey) throw new Error("This book uses a signed price. Set PRIVATE_KEY to the deployer, who is the attestor.");
    const last = candles[candles.length - 1];
    await attestPrice({
      clients,
      account: accountFromKey(signerKey),
      deployment,
      symbol,
      price1e8: price1e8FromClose(last.close),
      publishedAt: BigInt(last.time),
    });
    console.log(`Attested ${symbol} at ${last.close} for the commits.`);
  }

  for (let i = 0; i < PROFILES.length; i += 1) {
    const profile = PROFILES[i];
    const account = accountFromKey(keys[i]);
    const decision = profile.decide ? profile.decide(candles) : await clerkDecision(candles);
    const agentId = await ensureAgent({
      clients,
      account,
      deployment,
      name: profile.name,
      description: profile.description,
    });
    const committed = await commitSignal({
      clients,
      account,
      deployment,
      agentId,
      symbol,
      direction: decision.direction,
      confidenceBps: decision.confidenceBps,
      horizonSec,
    });
    const start = await clients.publicClient.getBlockNumber();
    while ((await clients.publicClient.getBlockNumber()) <= start) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    // On Arbitrum, block.number inside a contract is the L1 (Ethereum) block number, which moves
    // every ~12s, not the L2 block number the RPC reports. Wait for L1 to advance or reveal reverts TooSoon.
    if (chainId === 421614 || chainId === 42161) {
      await new Promise((resolve) => setTimeout(resolve, 30_000));
    }
    const revealed = await revealSignal({
      clients,
      account,
      deployment,
      id: committed.id,
      direction: decision.direction,
      confidenceBps: decision.confidenceBps,
      salt: committed.salt,
      note: decision.note,
    });
    console.log(
      `${profile.name} agent ${agentId} signal ${committed.id} ${decision.direction === 1 ? "long" : "short"} via ${decision.source}. Reveal ${revealed}.`,
    );
  }
  console.log("Calls are revealed. Run the score command after the horizon.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
