import { formatUnits } from "viem";
import { chainInfo, gateReason, scoreAnchorAbi } from "@callbook/core";
import {
  type CommandIO,
  InputFieldType,
  type InputSchema,
  PluginCommand,
  schemaToArgs,
  schemaToFlags,
} from "@metamask/agent-wallet/plugin";
import { followCall } from "../../lib/book.js";
import { readerFor, submitTx } from "../../lib/client.js";
import { defaultChainId, readDeployment } from "../../lib/files.js";

const inputs = {
  agent: {
    type: InputFieldType.Text,
    flag: "agent",
    message: "ERC-8004 agent id to follow",
    required: true,
    prompt: false,
    index: 0,
  },
  cap: {
    type: InputFieldType.Text,
    flag: "cap",
    message: "Hard spend cap in the chain's native coin (MON, or USDC on Arc)",
    required: true,
    prompt: false,
  },
  perTrade: {
    type: InputFieldType.Text,
    flag: "per-trade",
    message: "Max notional for one copied signal, in the native coin",
    required: true,
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
    message: "RPC URL used to read the gate before signing",
    required: false,
    prompt: false,
  },
} satisfies InputSchema;

function parseAmount(raw: string, label: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error(`${label} must be a decimal amount.`);
  const [whole, frac = ""] = raw.split(".");
  if (frac.length > 18) throw new Error(`${label} has more than 18 decimals.`);
  return BigInt(whole) * 10n ** 18n + BigInt(frac.padEnd(18, "0"));
}

export default class CallbookFollow extends PluginCommand {
  static description = "Escrow a hard spend cap and follow an agent who clears the reputation gate.";
  static examples = ["<%= config.bin %> callbook follow 2074 --cap 0.05 --per-trade 0.02 --chain 10143"];
  static flags = schemaToFlags(inputs);
  static args = schemaToArgs(inputs);

  protected readonly pluginCommandId = "callbook:follow";

  async execute(io: CommandIO) {
    const flags = await io.resolveInputs(inputs);
    const chainId = flags.chain ? Number(flags.chain) : defaultChainId();
    const deployment = readDeployment(chainId);
    const cap = parseAmount(flags.cap, "Cap");
    const perTrade = parseAmount(flags.perTrade, "Per-trade cap");
    if (perTrade > cap) throw new Error("Per-trade cap cannot exceed the total spend cap.");
    const client = await readerFor(this, chainId, flags.rpc || undefined);
    const stats = (await client.readContract({
      address: deployment.scoreAnchor,
      abi: scoreAnchorAbi,
      functionName: "stats",
      args: [BigInt(flags.agent)],
    })) as readonly [number, number, bigint];
    const reason = gateReason(Number(stats[0]), Number(stats[1]), {
      minSamples: deployment.minSamples,
      minWinBps: deployment.minWinBps,
    });
    if (reason) throw new Error(reason);
    const call = followCall(deployment, BigInt(flags.agent), perTrade, cap);
    const info = chainInfo(chainId);
    const result = await submitTx(this, io, "callbook:follow", chainId, call);
    return {
      hash: result.hash,
      status: result.status,
      agentId: flags.agent,
      cap: `${formatUnits(cap, info.nativeDecimals)} ${info.nativeSymbol}`,
      perTrade: `${formatUnits(perTrade, info.nativeDecimals)} ${info.nativeSymbol}`,
      note: "The contract holds the cap. A later copy cannot spend more than the remaining escrow or the per-trade cap.",
    };
  }
}
