import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  assetId,
  attestedPriceAbi,
  copyDeskAbi,
  identityAbi,
  mockPriceAbi,
  priceDigest,
  registrationUri,
  scoreAnchorAbi,
  signalBookAbi,
  signalHash,
  validationAbi,
  type Address,
  type Deployment,
  type Hex,
} from "@callbook/core";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  keccak256,
  toHex,
  type Account,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { repoRoot } from "./files.ts";

export type Clients = {
  publicClient: PublicClient;
  walletClient: WalletClient;
};

export function clientsFor(rpc: string): Clients {
  return {
    publicClient: createPublicClient({ transport: http(rpc) }),
    walletClient: createWalletClient({ transport: http(rpc) }),
  };
}

export function fees(chainId: number): { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint } {
  if (chainId !== 5042) return {};
  const floor = 20_000_000_000n;
  return { maxFeePerGas: floor, maxPriorityFeePerGas: floor };
}

export async function send(
  clients: Clients,
  account: Account,
  chainId: number,
  request: { address: Address; abi: typeof signalBookAbi; functionName: string; args?: readonly unknown[]; value?: bigint },
): Promise<Hex> {
  // Public L2 RPCs sit behind load balancers. A node can lag one block behind the node that
  // mined the previous tx, so a dependent call (setAgentURI right after register) can fail
  // simulation. Retry a few times before treating the revert as real.
  let hash: Hex | undefined;
  for (let attempt = 0; ; attempt += 1) {
    try {
      hash = await clients.walletClient.writeContract({
        account,
        chain: null,
        address: request.address,
        abi: request.abi,
        functionName: request.functionName,
        args: request.args,
        value: request.value,
        ...fees(chainId),
      } as never);
      break;
    } catch (error) {
      if (attempt >= 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)));
    }
  }
  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Transaction reverted: ${hash}`);
  return hash;
}

type AgentFile = Record<string, { agentId: string; address: Address }>;

function agentPath(chainId: number): string {
  return join(repoRoot(), "deployments", `agents-${chainId}.json`);
}

export function readAgents(chainId: number): AgentFile {
  const path = agentPath(chainId);
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as AgentFile;
}

export function writeAgents(chainId: number, file: AgentFile): void {
  mkdirSync(join(repoRoot(), "deployments"), { recursive: true });
  writeFileSync(agentPath(chainId), `${JSON.stringify(file, null, 2)}\n`);
}

export async function ensureAgent(args: {
  clients: Clients;
  account: Account;
  deployment: Deployment;
  name: string;
  description: string;
}): Promise<bigint> {
  const chainId = args.deployment.chainId;
  const known = readAgents(chainId)[args.name];
  if (known) {
    try {
      const owner = (await args.clients.publicClient.readContract({
        address: args.deployment.identity,
        abi: identityAbi,
        functionName: "ownerOf",
        args: [BigInt(known.agentId)],
      })) as Address;
      if (owner.toLowerCase() === args.account.address.toLowerCase()) return BigInt(known.agentId);
    } catch {
      // The saved id is from another deployment. Register again.
    }
  }

  const registerHash = await send(args.clients, args.account, chainId, {
    address: args.deployment.identity,
    abi: identityAbi,
    functionName: "register",
    args: [""],
  });
  const receipt = await args.clients.publicClient.getTransactionReceipt({ hash: registerHash });
  let agentId: bigint | null = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: identityAbi, data: log.data, topics: log.topics });
      if (decoded.eventName === "Registered") {
        agentId = (decoded.args as { agentId: bigint }).agentId;
      }
    } catch {
      // other contracts may log in the same receipt
    }
  }
  if (agentId === null) throw new Error("Identity registry did not emit Registered.");

  const uri = registrationUri({
    name: args.name,
    description: args.description,
    agentId,
    chainId,
    identity: args.deployment.identity,
  });
  await send(args.clients, args.account, chainId, {
    address: args.deployment.identity,
    abi: identityAbi,
    functionName: "setAgentURI",
    args: [agentId, uri],
  });

  const file = readAgents(chainId);
  file[args.name] = { agentId: agentId.toString(), address: args.account.address };
  writeAgents(chainId, file);
  return agentId;
}

export async function commitSignal(args: {
  clients: Clients;
  account: Account;
  deployment: Deployment;
  agentId: bigint;
  symbol: string;
  direction: 1 | -1;
  confidenceBps: number;
  horizonSec: number;
}): Promise<{ id: bigint; salt: Hex; hash: Hex }> {
  const salt = keccak256(toHex(`${args.agentId}:${args.symbol}:${Date.now()}:${Math.random()}`));
  const asset = assetId(args.symbol);
  const hash = signalHash({
    agentId: args.agentId,
    asset,
    direction: args.direction,
    confidenceBps: args.confidenceBps,
    salt,
    chainId: BigInt(args.deployment.chainId),
    book: args.deployment.signalBook,
  });
  const tx = await send(args.clients, args.account, args.deployment.chainId, {
    address: args.deployment.signalBook,
    abi: signalBookAbi,
    functionName: "commit",
    args: [args.agentId, asset, hash, BigInt(args.horizonSec)],
  });
  const receipt = await args.clients.publicClient.getTransactionReceipt({ hash: tx });
  let id: bigint | null = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: signalBookAbi, data: log.data, topics: log.topics });
      if (decoded.eventName === "Committed") id = (decoded.args as { id: bigint }).id;
    } catch {
      // ignore
    }
  }
  if (id === null) throw new Error("SignalBook did not emit Committed.");
  return { id, salt, hash };
}

export async function revealSignal(args: {
  clients: Clients;
  account: Account;
  deployment: Deployment;
  id: bigint;
  direction: 1 | -1;
  confidenceBps: number;
  salt: Hex;
  note: string;
}): Promise<Hex> {
  return send(args.clients, args.account, args.deployment.chainId, {
    address: args.deployment.signalBook,
    abi: signalBookAbi,
    functionName: "reveal",
    args: [args.id, args.direction, args.confidenceBps, args.salt, args.note.slice(0, 280)],
  });
}

export async function setMockPrice(args: {
  clients: Clients;
  account: Account;
  deployment: Deployment;
  symbol: string;
  price1e8: bigint;
}): Promise<void> {
  const block = await args.clients.publicClient.getBlock();
  await send(args.clients, args.account, args.deployment.chainId, {
    address: args.deployment.priceSource,
    abi: mockPriceAbi,
    functionName: "set",
    args: [assetId(args.symbol), args.price1e8, BigInt(block.timestamp)],
  });
}

export async function attestPrice(args: {
  clients: Clients;
  account: Account;
  deployment: Deployment;
  symbol: string;
  price1e8: bigint;
  publishedAt: bigint;
}): Promise<void> {
  const digest = priceDigest({
    chainId: BigInt(args.deployment.chainId),
    source: args.deployment.priceSource,
    asset: assetId(args.symbol),
    price1e8: args.price1e8,
    publishedAt: args.publishedAt,
  });
  const signature = await args.account.signMessage({ message: { raw: digest } });
  await send(args.clients, args.account, args.deployment.chainId, {
    address: args.deployment.priceSource,
    abi: attestedPriceAbi,
    functionName: "attest",
    args: [assetId(args.symbol), args.price1e8, args.publishedAt, signature],
  });
}

export async function pinAndScore(args: {
  clients: Clients;
  account: Account;
  deployment: Deployment;
  id: bigint;
}): Promise<void> {
  await send(args.clients, args.account, args.deployment.chainId, {
    address: args.deployment.signalBook,
    abi: signalBookAbi,
    functionName: "pinExit",
    args: [args.id],
  });
  await send(args.clients, args.account, args.deployment.chainId, {
    address: args.deployment.scoreAnchor,
    abi: scoreAnchorAbi,
    functionName: "score",
    args: [args.id],
  });
}

export async function markExpired(args: {
  clients: Clients;
  account: Account;
  deployment: Deployment;
  id: bigint;
}): Promise<void> {
  await send(args.clients, args.account, args.deployment.chainId, {
    address: args.deployment.signalBook,
    abi: signalBookAbi,
    functionName: "markExpired",
    args: [args.id],
  });
  await send(args.clients, args.account, args.deployment.chainId, {
    address: args.deployment.scoreAnchor,
    abi: scoreAnchorAbi,
    functionName: "score",
    args: [args.id],
  });
}

export async function requestValidation(args: {
  clients: Clients;
  account: Account;
  deployment: Deployment;
  agentId: bigint;
}): Promise<Hex> {
  const requestHash = keccak256(toHex(`callbook:${args.deployment.chainId}:${args.agentId}`));
  await send(args.clients, args.account, args.deployment.chainId, {
    address: args.deployment.validation,
    abi: validationAbi,
    functionName: "validationRequest",
    args: [args.deployment.scoreAnchor, args.agentId, "callbook://book", requestHash],
  });
  await send(args.clients, args.account, args.deployment.chainId, {
    address: args.deployment.scoreAnchor,
    abi: scoreAnchorAbi,
    functionName: "respond",
    args: [requestHash],
  });
  return requestHash;
}

export function accountFromKey(key: string): Account {
  const normalized = key.startsWith("0x") ? key : `0x${key}`;
  return privateKeyToAccount(normalized as Hex);
}
