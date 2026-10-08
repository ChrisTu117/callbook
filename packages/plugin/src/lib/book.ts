import {
  assetLabel,
  chainInfo,
  checkCopy,
  copyDeskAbi,
  formatBps,
  formatWinRate,
  gateReason,
  identityAbi,
  parseRegistration,
  rankAgents,
  reputationAbi,
  scoreAnchorAbi,
  signalBookAbi,
  bookTxIndex,
  type Deployment,
  type PendingSignal,
} from "@callbook/core";
import { createPublicClient, encodeFunctionData, http, type PublicClient } from "viem";

type SignalTuple = {
  agentId: bigint;
  committer: `0x${string}`;
  assetId: `0x${string}`;
  commitHash: `0x${string}`;
  commitTime: bigint;
  commitBlock: bigint;
  revealDeadline: bigint;
  horizonEnd: bigint;
  entryPrice: bigint;
  entryPublishedAt: bigint;
  direction: number;
  confidenceBps: number;
  revealed: boolean;
  expired: boolean;
  exitPinned: boolean;
  exitPrice: bigint;
  exitPublishedAt: bigint;
  note: string;
};

type ScoreTuple = {
  exists: boolean;
  counted: boolean;
  hit: boolean;
  noReveal: boolean;
  pnlBps: bigint;
  tag2: string;
};

export type LoadedSignal = {
  id: string;
  agentId: string;
  asset: string;
  direction: "long" | "short" | "hidden";
  confidenceBps: number;
  note: string;
  status: "committed" | "revealed" | "expired" | "scored";
  entryPrice: string;
  exitPrice: string;
  pnlBps: string;
  hit: boolean | null;
  horizonEnd: string;
  commitTx: string | null;
  revealTx: string | null;
  scoreTx: string | null;
};

export type LoadedAgent = {
  agentId: string;
  name: string;
  description: string;
  samples: number;
  wins: number;
  winRate: string;
  cumulativePnl: string;
  reputationFeedbacks: string;
  gate: string | null;
  signals: LoadedSignal[];
};

export function publicReader(chainId: number, rpc: string | undefined, hosted?: PublicClient): PublicClient {
  if (rpc) return createPublicClient({ transport: http(rpc) });
  if (hosted) return hosted;
  const url = chainInfo(chainId).rpc;
  if (!url) throw new Error(`No public RPC for chain ${chainId}. Pass --rpc.`);
  return createPublicClient({ transport: http(url) });
}

export async function loadBook(client: PublicClient, deployment: Deployment): Promise<LoadedAgent[]> {
  const nextId = (await client.readContract({
    address: deployment.signalBook,
    abi: signalBookAbi,
    functionName: "nextId",
  })) as bigint;
  const read: { id: bigint; signal: SignalTuple; score: ScoreTuple }[] = [];
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
    })) as ScoreTuple;
    read.push({ id, signal, score });
  }
  const pending: PendingSignal[] = read.map(({ id, signal, score }) => ({
    id: id.toString(),
    commitBlock: BigInt(signal.commitBlock),
    commitTime: BigInt(signal.commitTime),
    revealDeadline: BigInt(signal.revealDeadline),
    horizonEnd: BigInt(signal.horizonEnd),
    revealed: signal.revealed,
    scored: score.exists,
  }));
  const txs = await bookTxIndex({
    client,
    chainId: deployment.chainId,
    signalBook: deployment.signalBook,
    scoreAnchor: deployment.scoreAnchor,
    startBlock: deployment.startBlock !== undefined ? BigInt(deployment.startBlock) : undefined,
    pending,
  });
  const byAgent = new Map<string, LoadedSignal[]>();
  for (const { id, signal, score } of read) {
    const row: LoadedSignal = {
      id: id.toString(),
      agentId: signal.agentId.toString(),
      asset: assetLabel(signal.assetId),
      direction: signal.revealed ? (signal.direction < 0 ? "short" : "long") : "hidden",
      confidenceBps: signal.confidenceBps,
      note: signal.note,
      status: score.exists ? "scored" : signal.expired ? "expired" : signal.revealed ? "revealed" : "committed",
      entryPrice: signal.entryPrice.toString(),
      exitPrice: signal.exitPinned ? signal.exitPrice.toString() : "",
      pnlBps: score.exists ? formatBps(score.pnlBps) : "",
      hit: score.exists ? score.hit : null,
      horizonEnd: signal.horizonEnd.toString(),
      commitTx: txs.commit.get(id.toString()) ?? null,
      revealTx: txs.reveal.get(id.toString()) ?? null,
      scoreTx: txs.score.get(id.toString()) ?? null,
    };
    const list = byAgent.get(row.agentId) ?? [];
    list.push(row);
    byAgent.set(row.agentId, list);
  }

  const agents: LoadedAgent[] = [];
  for (const [agentId, signals] of byAgent) {
    const stats = (await client.readContract({
      address: deployment.scoreAnchor,
      abi: scoreAnchorAbi,
      functionName: "stats",
      args: [BigInt(agentId)],
    })) as readonly [number, number, bigint];
    const samples = Number(stats[0]);
    const wins = Number(stats[1]);
    let feedbacks = "0";
    try {
      const last = (await client.readContract({
        address: deployment.reputation,
        abi: reputationAbi,
        functionName: "getLastIndex",
        args: [BigInt(agentId), deployment.scoreAnchor],
      })) as bigint;
      feedbacks = last.toString();
    } catch {
      feedbacks = "unread";
    }
    let name = `Agent ${agentId}`;
    let description = "";
    try {
      const uri = (await client.readContract({
        address: deployment.identity,
        abi: identityAbi,
        functionName: "tokenURI",
        args: [BigInt(agentId)],
      })) as string;
      const parsed = parseRegistration(uri);
      if (parsed?.name) name = parsed.name;
      if (parsed?.description) description = parsed.description;
    } catch {
      // The registry may not expose tokenURI on every chain build. The id still ranks.
    }
    agents.push({
      agentId,
      name,
      description,
      samples,
      wins,
      winRate: formatWinRate(samples, wins),
      cumulativePnl: formatBps(stats[2]),
      reputationFeedbacks: feedbacks,
      gate: gateReason(samples, wins, { minSamples: deployment.minSamples, minWinBps: deployment.minWinBps }),
      signals,
    });
  }
  return rankAgents(
    agents.map((agent) => ({
      ...agent,
      agentId: BigInt(agent.agentId),
      cumulativePnlBps: 0n,
    })),
  ).map((agent) => ({
    ...agent,
    agentId: agent.agentId.toString(),
  }));
}

export async function loadSpend(client: PublicClient, deployment: Deployment, account: `0x${string}`) {
  const escrow = (await client.readContract({
    address: deployment.copyDesk,
    abi: copyDeskAbi,
    functionName: "spendable",
    args: [account],
  })) as bigint;
  const perTradeCap = (await client.readContract({
    address: deployment.copyDesk,
    abi: copyDeskAbi,
    functionName: "perTradeCap",
    args: [account],
  })) as bigint;
  return { escrow, perTradeCap };
}

export function followCall(deployment: Deployment, agentId: bigint, perTradeCap: bigint, value: bigint) {
  const copy = checkCopy({ escrow: value, perTradeCap, notional: perTradeCap === 0n ? value : perTradeCap });
  return {
    to: deployment.copyDesk,
    data: encodeFunctionData({
      abi: copyDeskAbi,
      functionName: "follow",
      args: [agentId, perTradeCap],
    }),
    value,
    capOk: copy.ok,
  };
}

export function mirrorCall(deployment: Deployment, signalId: bigint, notional: bigint, escrow: bigint, perTradeCap: bigint) {
  const copy = checkCopy({ escrow, perTradeCap, notional });
  return {
    ok: copy.ok,
    reason: copy.ok ? null : copy.reason,
    to: deployment.copyDesk,
    data: encodeFunctionData({
      abi: copyDeskAbi,
      functionName: "mirror",
      args: [signalId, notional],
    }),
    value: 0n,
  };
}
