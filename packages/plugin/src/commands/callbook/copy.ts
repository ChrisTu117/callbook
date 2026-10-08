import { formatUnits, type PublicClient } from "viem";
import { chainInfo, signalBookAbi } from "@callbook/core";
import {
  type CommandIO,
  InputFieldType,
  type InputSchema,
  PluginCommand,
  schemaToArgs,
  schemaToFlags,
} from "@metamask/agent-wallet/plugin";
import { loadSpend, mirrorCall } from "../../lib/book.js";
import { readerFor, submitTx } from "../../lib/client.js";
import { readDeployment } from "../../lib/files.js";

const inputs = {
  signal: {
    type: InputFieldType.Text,
    flag: "signal",
    message: "Revealed signal id to mirror",
    required: true,
    prompt: false,
    index: 0,
  },
  notional: {
    type: InputFieldType.Text,
    flag: "notional",
    message: "Notional to put at risk, in the native coin",
    required: true,
    prompt: false,
  },
  account: {
    type: InputFieldType.Text,
    flag: "account",
    message: "Follower address. Defaults to the selected wallet when the host exposes one.",
    required: false,
    prompt: false,
  },
  chain: {
    type: InputFieldType.Text,
    flag: "chain",
    message: "Chain id",
    required: false,
    prompt: false,
  },
  rpc: {
    type: InputFieldType.Text,
    flag: "rpc",
    message: "RPC URL",
    required: false,
    prompt: false,
  },
} satisfies InputSchema;

function parseAmount(raw: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error("Notional must be a decimal amount.");
  const [whole, frac = ""] = raw.split(".");
  if (frac.length > 18) throw new Error("Notional has more than 18 decimals.");
  return BigInt(whole) * 10n ** 18n + BigInt(frac.padEnd(18, "0"));
}

async function selectedAccount(command: object): Promise<`0x${string}` | null> {
  const ctx = (
    command as {
      ctx?: { walletStateManager?: { getSelectedWallet?: () => { address?: string } | Promise<{ address?: string }> } };
    }
  ).ctx;
  const manager = ctx?.walletStateManager;
  if (!manager?.getSelectedWallet) return null;
  const wallet = await manager.getSelectedWallet();
  if (wallet?.address && /^0x[0-9a-fA-F]{40}$/.test(wallet.address)) return wallet.address as `0x${string}`;
  return null;
}

export default class CallbookCopy extends PluginCommand {
  static description = "Mirror one live signal. Refuses to sign if the notional breaks the spend cap.";
  static examples = ["<%= config.bin %> callbook copy 4 --notional 0.1 --chain 143"];
  static flags = schemaToFlags(inputs);
  static args = schemaToArgs(inputs);

  protected readonly pluginCommandId = "callbook:copy";

  async execute(io: CommandIO) {
    const flags = await io.resolveInputs(inputs);
    const chainId = Number(flags.chain || process.env.CALLBOOK_CHAIN_ID || 143);
    const deployment = readDeployment(chainId);
    const notional = parseAmount(flags.notional);
    const client = (await readerFor(this, chainId, flags.rpc || undefined)) as PublicClient;
    const account = (flags.account as `0x${string}` | undefined) || (await selectedAccount(this));
    if (!account) throw new Error("Pass --account. The plugin checks that address's remaining cap before it asks the wallet to sign.");
    const signal = (await client.readContract({
      address: deployment.signalBook,
      abi: signalBookAbi,
      functionName: "getSignal",
      args: [BigInt(flags.signal)],
    })) as { revealed: boolean; expired: boolean; exitPinned: boolean; horizonEnd: bigint; agentId: bigint };
    if (!signal.revealed || signal.expired || signal.exitPinned) {
      throw new Error("That signal is not a live revealed call.");
    }
    const now = (await client.getBlock()).timestamp;
    if (now >= signal.horizonEnd) throw new Error("The horizon has passed. The outcome is no longer hidden.");
    const spend = await loadSpend(client, deployment, account);
    const call = mirrorCall(deployment, BigInt(flags.signal), notional, spend.escrow, spend.perTradeCap);
    if (!call.ok) throw new Error(call.reason ?? "Cap check failed.");
    const info = chainInfo(chainId);
    const result = await submitTx(this, io, "callbook:copy", chainId, call);
    return {
      hash: result.hash,
      status: result.status,
      signalId: flags.signal,
      agentId: signal.agentId.toString(),
      notional: `${formatUnits(notional, info.nativeDecimals)} ${info.nativeSymbol}`,
      remainingBefore: `${formatUnits(spend.escrow, info.nativeDecimals)} ${info.nativeSymbol}`,
    };
  }
}
