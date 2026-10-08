import {
  assetLabel,
  bookTxIndex,
  copyDeskAbi,
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
} from "@callbook/core";
import { createPublicClient, formatUnits, http, isAddress } from "viem";
import { asAddress, type PublicNetwork } from "./networks";

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
  bookUrl: string | null;
  anchorUrl: string | null;
  deskUrl: string | null;
  minSamples: number;
  minWinBps: number;
  source: "live";
  agents: AgentRow[];
};

type SignalTuple = {
  agentId: bigint;
  committer: `0x${string}`;
  assetId: `0x${string}`;
  commitTime: bigint;
  commitBlock: bigint;
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

function explorer(base: string, kind: "tx" | "address", value: string): string | null {
  if (!base || !value) return null;
  return `${base.replace(/\/$/, "")}/${kind}/${value}`;
}

export async function loadLiveBook(network: PublicNetwork): Promise<BookView> {
  const client = createPublicClient({ transport: http(network.rpc) });
  const signalBook = asAddress(network.signalBook);
  const scoreAnchor = asAddress(network.scoreAnchor);
  const copyDesk = asAddress(network.copyDesk);
  const identity = asAddress(network.identity);
  const reputation = asAddress(network.reputation);
  const block = await client.getBlockNumber();
  const nextId = (await client.readContract({
    address: signalBook,
    abi: signalBookAbi,
    functionName: "nextId",
  })) as bigint;
  const read: { id: bigint; signal: SignalTuple; score: { exists: boolean; hit: boolean; pnlBps: bigint } }[] = [];
  for (let id = BigInt(1); id < nextId; id += BigInt(1)) {
    const signal = (await client.readContract({
      address: signalBook,
      abi: signalBookAbi,
      functionName: "getSignal",
      args: [id],
    })) as SignalTuple;
    if (signal.committer === "0x0000000000000000000000000000000000000000") continue;
    const score = (await client.readContract({
      address: scoreAnchor,
      abi: scoreAnchorAbi,
      functionName: "getScore",
      args: [id],
    })) as { exists: boolean; hit: boolean; pnlBps: bigint };
    read.push({ id, signal, score });
  }
  // Bundled snapshot first, then throttled 100-block getLogs only for blocks after it.
  const txs = await bookTxIndex({
    client,
    chainId: network.chainId,
    signalBook,
    scoreAnchor,
    startBlock: BigInt(network.startBlock),
    pending: read.map(({ id, signal, score }) => ({
      id: id.toString(),
      commitBlock: BigInt(signal.commitBlock),
      commitTime: BigInt(signal.commitTime),
      revealDeadline: BigInt(signal.revealDeadline),
      horizonEnd: BigInt(signal.horizonEnd),
      revealed: signal.revealed,
      scored: score.exists,
    })),
  });
  const link = (hash: string | undefined) => (hash ? explorer(network.explorer, "tx", hash) : null);
  const grouped = new Map<string, SignalRow[]>();
  const ids = new Map<string, bigint>();

  for (const { id, signal, score } of read) {
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
      commitUrl: link(txs.commit.get(key)),
      revealUrl: link(txs.reveal.get(key)),
      scoreUrl: link(txs.score.get(key)),
    };
    grouped.set(agentId, [...(grouped.get(agentId) ?? []), row]);
  }

  const agents: (AgentRow & { cumulativePnlBps: bigint })[] = [];
  for (const [agentId, signals] of grouped) {
    const stats = (await client.readContract({
      address: scoreAnchor,
      abi: scoreAnchorAbi,
      functionName: "stats",
      args: [ids.get(agentId)!],
    })) as readonly [number, number, bigint];
    const samples = Number(stats[0]);
    const wins = Number(stats[1]);
    let feedbacks = "0";
    try {
      const last = (await client.readContract({
        address: reputation,
        abi: reputationAbi,
        functionName: "getLastIndex",
        args: [ids.get(agentId)!, scoreAnchor],
      })) as bigint;
      feedbacks = last.toString();
    } catch {
      feedbacks = "—";
    }
    let name = `Agent ${agentId}`;
    let description = "";
    try {
      const uri = (await client.readContract({
        address: identity,
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
      gate: gateReason(samples, wins, { minSamples: network.minSamples, minWinBps: network.minWinBps }),
      signals,
      cumulativePnlBps: stats[2],
    });
  }

  const ranked = rankAgents(agents.map((agent) => ({ ...agent, agentId: BigInt(agent.agentId) }))).map((agent) => ({
    ...agent,
    agentId: agent.agentId.toString(),
  }));

  return {
    chainId: network.chainId,
    chainName: network.name,
    nativeSymbol: network.nativeSymbol,
    block: block.toString(),
    priceKind: network.priceKind,
    signalBook,
    scoreAnchor,
    copyDesk,
    bookUrl: explorer(network.explorer, "address", signalBook),
    anchorUrl: explorer(network.explorer, "address", scoreAnchor),
    deskUrl: explorer(network.explorer, "address", copyDesk),
    minSamples: network.minSamples,
    minWinBps: network.minWinBps,
    source: "live",
    agents: ranked.map(({ cumulativePnlBps: _pnl, ...agent }) => agent),
  };
}

export async function loadLiveAccount(network: PublicNetwork, account: string): Promise<string> {
  if (!isAddress(account)) throw new Error("That is not an address.");
  const client = createPublicClient({ transport: http(network.rpc) });
  const desk = asAddress(network.copyDesk);
  const escrow = (await client.readContract({
    address: desk,
    abi: copyDeskAbi,
    functionName: "spendable",
    args: [account],
  })) as bigint;
  const locked = (await client.readContract({
    address: desk,
    abi: copyDeskAbi,
    functionName: "locked",
    args: [account],
  })) as bigint;
  const perTrade = (await client.readContract({
    address: desk,
    abi: copyDeskAbi,
    functionName: "perTradeCap",
    args: [account],
  })) as bigint;
  const unit = network.nativeSymbol;
  return `Spendable ${formatUnits(escrow, network.nativeDecimals)} ${unit}. Locked ${formatUnits(locked, network.nativeDecimals)} ${unit}. Per-trade cap ${formatUnits(perTrade, network.nativeDecimals)} ${unit}.`;
}
