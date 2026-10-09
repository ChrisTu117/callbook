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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readSignal(
  client: ReturnType<typeof clientsFor>["publicClient"],
  book: `0x${string}`,
  id: bigint,
): Promise<SignalView> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const signal = (await client.readContract({
        address: book,
        abi: signalBookAbi,
        functionName: "getSignal",
        args: [id],
      })) as SignalView;
      await sleep(80);
      return signal;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/15\/sec|rate limit|429|timeout|ETIMEDOUT/i.test(message) || attempt === 7) throw error;
      console.log(`RPC limited the read of signal ${id}. Waiting ${attempt + 1}s.`);
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error(`Could not read signal ${id}.`);
}

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
      const signal = await readSignal(clients.publicClient, deployment.signalBook, id);
      if (signal.revealed && !signal.exitPinned && signal.horizonEnd > latest) latest = signal.horizonEnd;
    }
    const now = BigInt((await clients.publicClient.getBlock()).timestamp);
    if (latest > now) {
      const ms = Number(latest - now + 2n) * 1000;
      console.log(`Waiting ${ms / 1000}s for the horizon.`);
      await sleep(ms);
    }
  }

  const pending: { id: bigint; signal: SignalView }[] = [];
  // The exit print must be dated at or after every pending commit. SignalBook reverts Stale
  // otherwise. On slow chains (Ethereum Sepolia, 12s blocks) the three commits of a round are
  // a minute or more apart, so key on the latest commit, not the earliest.
  let latestCommit = 0n;
  const now = BigInt((await clients.publicClient.getBlock()).timestamp);
  for (let id = 1n; id < nextId; id += 1n) {
    const signal = await readSignal(clients.publicClient, deployment.signalBook, id);
    if (!signal.revealed && !signal.expired && now > signal.revealDeadline && signal.committer !== "0x0000000000000000000000000000000000000000") {
      await markExpired({ clients, account, deployment, id });
      console.log(`Signal ${id} expired and scored as a miss.`);
      continue;
    }
    if (signal.revealed && !signal.exitPinned && now >= signal.horizonEnd) {
      pending.push({ id, signal });
      if (signal.commitTime > latestCommit) latestCommit = signal.commitTime;
    }
  }

  if (pending.length === 0) return;

  if (deployment.priceKind === "attested") {
    let print: { time: number; close: number } | null = null;
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const candles = await loadCandles("ETH-USD");
      const chainNow = BigInt((await clients.publicClient.getBlock()).timestamp);
      const fresh = candles.filter((candle) => {
        const time = BigInt(candle.time);
        return time >= latestCommit && time <= chainNow;
      });
      print = fresh.length > 0 ? fresh[fresh.length - 1] : null;
      if (print) break;
      const newest = candles.length > 0 ? candles[candles.length - 1].time : 0;
      console.log(
        `No candle at or after commit ${latestCommit}. Newest candle ${newest}. Chain time ${chainNow}. Waiting 20s.`,
      );
      await sleep(20_000);
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
