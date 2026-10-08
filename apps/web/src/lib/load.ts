import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  assetLabel,
  chainInfo,
  explorerAddress,
  explorerTx,
  format1e8,
  formatBps,
  formatWinRate,
  gateReason,
  identityAbi,
  parseRegistration,
  rankAgents,
  reputationAbi,
  scoreAnchorAbi,
  signalBookAbi,
  copyDeskAbi,
  type Deployment,
} from "@callbook/core";
import { createPublicClient, decodeEventLog, formatUnits, http, isAddress, type Address } from "viem";

export type SignalRow = {
  id: string;
  asset: string;
  direction: string;
  confidence: string;
  status: string;
  entry: string;
  exit: string;
  pnl: string;
  hit: boolean | null;
  note: string;
  horizon: string;
  commitUrl: string | null;
  revealUrl: string | null;
  scoreUrl: string | null;
};

export type AgentRow = {
  agentId: string;
  name: string;
  description: string;
  samples: number;
  wins: number;
  winRate: string;
  pnl: string;
  feedbacks: string;
  gate: string | null;
  signals: SignalRow[];
};

export type BookView = {
  chainId: number;
  chainName: string;
  nativeSymbol: string;
  block: string;
  priceKind: string;
  signalBook: string;
  scoreAnchor: string;
  copyDesk: string;
  reputation: string;
  bookUrl: string | null;
  anchorUrl: string | null;
  deskUrl: string | null;
  minSamples: number;
  minWinBps: number;
  agents: AgentRow[];
};

function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, "foundry.toml"))) return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

function readDeployment(chainId: number): Deployment {
  const path = process.env.CALLBOOK_DEPLOYMENT ?? join(repoRoot(), "deployments", `${chainId}.json`);
  if (!existsSync(path)) throw new Error(`No deployment file at ${path}.`);
  return JSON.parse(readFileSync(path, "utf8")) as Deployment;
}

type SignalTuple = {
  agentId: bigint;
  committer: Address;
  assetId: `0x${string}`;
  revealDeadline: bigint;
  horizonEnd: bigint;
  entryPrice: bigint;
  direction: number;
  confidenceBps: number;
  revealed: boolean;
  expired: boolean;
  exitPinned: boolean;
  exitPrice: bigint;
  note: string;
};

export async function loadAccount(account: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!isAddress(account)) return { ok: false, error: "That is not an address." };
  const chainId = Number(process.env.CALLBOOK_CHAIN_ID ?? 31337);
  const info = chainInfo(chainId);
  const rpc = process.env.CALLBOOK_RPC_URL || info.rpc;
  try {
    const deployment = readDeployment(chainId);
    const client = createPublicClient({ transport: http(rpc) });
    const escrow = (await client.readContract({
      address: deployment.copyDesk,
      abi: copyDeskAbi,
      functionName: "spendable",
      args: [account],
    })) as bigint;
    const locked = (await client.readContract({
      address: deployment.copyDesk,
      abi: copyDeskAbi,
      functionName: "locked",
      args: [account],
    })) as bigint;
    const perTrade = (await client.readContract({
      address: deployment.copyDesk,
      abi: copyDeskAbi,
      functionName: "perTradeCap",
      args: [account],
    })) as bigint;
    const unit = info.nativeSymbol;
    return {
      ok: true,
      text: `Spendable ${formatUnits(escrow, 18)} ${unit}. Locked ${formatUnits(locked, 18)} ${unit}. Per-trade cap ${formatUnits(perTrade, 18)} ${unit}.`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The desk did not answer." };
  }
}

export async function loadBook(): Promise<{ ok: true; view: BookView } | { ok: false; error: string }> {
  const chainId = Number(process.env.CALLBOOK_CHAIN_ID ?? 31337);
  const info = chainInfo(chainId);
  const rpc = process.env.CALLBOOK_RPC_URL || info.rpc;
  try {
    const deployment = readDeployment(chainId);
    const client = createPublicClient({ transport: http(rpc) });
    const block = await client.getBlockNumber();
    const nextId = (await client.readContract({
      address: deployment.signalBook,
      abi: signalBookAbi,
      functionName: "nextId",
    })) as bigint;
    const txs = await indexTxs(client, deployment, chainId);
    const grouped = new Map<string, SignalRow[]>();
    const ids = new Map<string, bigint>();
    for (let id = 1n; id < nextId; id += 1n) {
      const signal = (await client.readContract({
        address: deployment.signalBook,
        abi: signalBookAbi,
        functionName: "getSignal",
        args: [id],
      })) as SignalTuple;
      if (signal.committer === "0x0000000000000000000000000000000000000000") continue;
      const score = (await client.readContract({
        address: deployment.scoreAnchor,
        abi: scoreAnchorAbi,
        functionName: "getScore",
        args: [id],
      })) as { exists: boolean; hit: boolean; pnlBps: bigint };
      const agentId = signal.agentId.toString();
      ids.set(agentId, signal.agentId);
      const key = id.toString();
      const row: SignalRow = {
        id: key,
        asset: assetLabel(signal.assetId),
        direction: signal.revealed ? (Number(signal.direction) < 0 ? "Short" : "Long") : "Sealed",
        confidence: signal.revealed ? `${(signal.confidenceBps / 100).toFixed(0)}%` : "—",
        status: signal.expired && !signal.revealed ? "No reveal" : score.exists ? "Scored" : signal.revealed ? "Revealed" : "Committed",
        entry: format1e8(signal.entryPrice),
        exit: signal.exitPinned ? format1e8(signal.exitPrice) : "—",
        pnl: score.exists ? formatBps(score.pnlBps) : "—",
        hit: score.exists ? score.hit : null,
        note: signal.note,
        horizon: new Date(Number(signal.horizonEnd) * 1000).toISOString().slice(0, 16).replace("T", " "),
        commitUrl: txs.commit.get(key) ?? null,
        revealUrl: txs.reveal.get(key) ?? null,
        scoreUrl: txs.score.get(key) ?? null,
      };
      grouped.set(agentId, [...(grouped.get(agentId) ?? []), row]);
    }

    const agents: (AgentRow & { cumulativePnlBps: bigint })[] = [];
    for (const [agentId, signals] of grouped) {
      const stats = (await client.readContract({
        address: deployment.scoreAnchor,
        abi: scoreAnchorAbi,
        functionName: "stats",
        args: [ids.get(agentId)!],
      })) as readonly [number, number, bigint];
      const samples = Number(stats[0]);
      const wins = Number(stats[1]);
      let feedbacks = "0";
      try {
        const last = (await client.readContract({
          address: deployment.reputation,
          abi: reputationAbi,
          functionName: "getLastIndex",
          args: [ids.get(agentId)!, deployment.scoreAnchor],
        })) as bigint;
        feedbacks = last.toString();
      } catch {
        feedbacks = "—";
      }
      let name = `Agent ${agentId}`;
      let description = "";
      try {
        const uri = (await client.readContract({
          address: deployment.identity,
          abi: identityAbi,
          functionName: "tokenURI",
          args: [ids.get(agentId)!],
        })) as string;
        const parsed = parseRegistration(uri);
        if (parsed?.name) name = parsed.name;
        if (parsed?.description) description = parsed.description;
      } catch {
        description = "";
      }
      agents.push({
        agentId,
        name,
        description,
        samples,
        wins,
        winRate: formatWinRate(samples, wins),
        pnl: formatBps(stats[2]),
        feedbacks,
        gate: gateReason(samples, wins, { minSamples: deployment.minSamples, minWinBps: deployment.minWinBps }),
        signals,
        cumulativePnlBps: stats[2],
      });
    }

    const ranked = rankAgents(
      agents.map((agent) => ({
        ...agent,
        agentId: BigInt(agent.agentId),
      })),
    ).map((agent) => ({
      ...agent,
      agentId: agent.agentId.toString(),
    }));

    return {
      ok: true,
      view: {
        chainId,
        chainName: info.name,
        nativeSymbol: info.nativeSymbol,
        block: block.toString(),
        priceKind: deployment.priceKind,
        signalBook: deployment.signalBook,
        scoreAnchor: deployment.scoreAnchor,
        copyDesk: deployment.copyDesk,
        reputation: deployment.reputation,
        bookUrl: explorerAddress(chainId, deployment.signalBook),
        anchorUrl: explorerAddress(chainId, deployment.scoreAnchor),
        deskUrl: explorerAddress(chainId, deployment.copyDesk),
        minSamples: deployment.minSamples,
        minWinBps: deployment.minWinBps,
        agents: ranked.map(({ cumulativePnlBps: _pnl, ...agent }) => agent),
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The RPC did not answer." };
  }
}

async function indexTxs(
  client: ReturnType<typeof createPublicClient>,
  deployment: Deployment,
  chainId: number,
): Promise<{ commit: Map<string, string | null>; reveal: Map<string, string | null>; score: Map<string, string | null> }> {
  const commit = new Map<string, string | null>();
  const reveal = new Map<string, string | null>();
  const score = new Map<string, string | null>();
  try {
    const logs = await client.getLogs({
      address: [deployment.signalBook, deployment.scoreAnchor],
      fromBlock: 0n,
      toBlock: "latest",
    });
    for (const log of logs) {
      try {
        const decoded = decodeEventLog({
          abi: [...signalBookAbi, ...scoreAnchorAbi],
          data: log.data,
          topics: log.topics,
        });
        const args = decoded.args as { id?: bigint; signalId?: bigint };
        const id = (args.id ?? args.signalId)?.toString();
        if (!id || !log.transactionHash) continue;
        const url = explorerTx(chainId, log.transactionHash) ?? log.transactionHash;
        if (decoded.eventName === "Committed") commit.set(id, url);
        if (decoded.eventName === "Revealed") reveal.set(id, url);
        if (decoded.eventName === "Scored") score.set(id, url);
      } catch {
        // skip
      }
    }
  } catch {
    // tx links stay empty
  }
  return { commit, reveal, score };
}
