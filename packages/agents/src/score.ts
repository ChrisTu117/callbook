import { accountFromKey, attestPrice, clientsFor, markExpired, pinAndScore } from "./chain.ts";
import { chainInfo, signalBookAbi } from "@callbook/core";
import { readDeployment } from "./files.ts";
import { loadCandles, price1e8FromClose } from "./market.ts";

type SignalView = {
  revealed: boolean;
  expired: boolean;
  exitPinned: boolean;
  revealDeadline: bigint;
  horizonEnd: bigint;
  commitTime: bigint;
  assetId: `0x${string}`;
  committer: `0x${string}`;
};

async function main() {
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error("Set PRIVATE_KEY to the deployer key. On Arc this key is the price attestor.");
  const chainId = Number(process.env.CALLBOOK_CHAIN_ID ?? 10143);
  const info = chainInfo(chainId);
  const rpc = process.env.CALLBOOK_RPC_URL || info.rpc;
  const deployment = readDeployment(chainId);
  const clients = clientsFor(rpc);
  const account = accountFromKey(key);
  const wait = process.argv.includes("--wait");
  const nextId = (await clients.publicClient.readContract({
    address: deployment.signalBook,
    abi: signalBookAbi,
    functionName: "nextId",
  })) as bigint;

  if (wait) {
    let latest = 0n;
    for (let id = 1n; id < nextId; id += 1n) {
      const signal = (await clients.publicClient.readContract({
        address: deployment.signalBook,
        abi: signalBookAbi,
        functionName: "getSignal",
        args: [id],
      })) as SignalView;
      if (signal.revealed && !signal.exitPinned && signal.horizonEnd > latest) latest = signal.horizonEnd;
    }
    const now = BigInt((await clients.publicClient.getBlock()).timestamp);
    if (latest > now) {
      const ms = Number(latest - now + 2n) * 1000;
      console.log(`Waiting ${ms / 1000}s for the horizon.`);
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  const pending: { id: bigint; signal: SignalView }[] = [];
  let earliestCommit = 0n;
  for (let id = 1n; id < nextId; id += 1n) {
    const signal = (await clients.publicClient.readContract({
      address: deployment.signalBook,
      abi: signalBookAbi,
      functionName: "getSignal",
      args: [id],
    })) as SignalView;
    const now = BigInt((await clients.publicClient.getBlock()).timestamp);
    if (!signal.revealed && !signal.expired && now > signal.revealDeadline && signal.committer !== "0x0000000000000000000000000000000000000000") {
      await markExpired({ clients, account, deployment, id });
      console.log(`Signal ${id} expired and scored as a miss.`);
      continue;
    }
    if (signal.revealed && !signal.exitPinned && now >= signal.horizonEnd) {
      pending.push({ id, signal });
      if (earliestCommit === 0n || signal.commitTime < earliestCommit) earliestCommit = signal.commitTime;
    }
  }

  if (pending.length === 0) return;

  if (deployment.priceKind === "attested") {
    let print: { time: number; close: number } | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candles = await loadCandles("ETH-USD");
      const chainNow = BigInt((await clients.publicClient.getBlock()).timestamp);
      const fresh = candles.filter((candle) => {
        const time = BigInt(candle.time);
        return time >= earliestCommit && time <= chainNow;
      });
      print = fresh.length > 0 ? fresh[fresh.length - 1] : null;
      if (print) break;
      console.log("The newest candle is still from before the commit. Waiting 20s.");
      await new Promise((resolve) => setTimeout(resolve, 20_000));
    }
    if (!print) throw new Error("No candle is dated at or after the commit. Refusing to pin the entry print.");
    await attestPrice({
      clients,
      account,
      deployment,
      symbol: "ETH-USD",
      price1e8: price1e8FromClose(print.close),
      publishedAt: BigInt(print.time),
    });
    console.log(`Attested exit ETH-USD at ${print.close}, candle ${print.time}.`);
  }

  for (const item of pending) {
    await pinAndScore({ clients, account, deployment, id: item.id });
    console.log(`Signal ${item.id} pinned and scored.`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
