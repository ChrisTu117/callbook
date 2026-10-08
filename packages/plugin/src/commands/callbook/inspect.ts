import { explorerTx } from "@callbook/core";
import {
  type CommandIO,
  InputFieldType,
  type InputSchema,
  PluginCommand,
  schemaToArgs,
  schemaToFlags,
} from "@metamask/agent-wallet/plugin";
import { loadBook } from "../../lib/book.js";
import { readerFor } from "../../lib/client.js";
import { defaultChainId, readDeployment } from "../../lib/files.js";

const inputs = {
  agent: {
    type: InputFieldType.Text,
    flag: "agent",
    message: "ERC-8004 agent id",
    required: true,
    prompt: false,
    index: 0,
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

export default class CallbookInspect extends PluginCommand {
  static description = "Show one agent's sealed calls, scores, and registry feedback count.";
  static examples = ["<%= config.bin %> callbook inspect 2074 --chain 10143"];
  static requiresAuth = false;
  static requiresInit = false;
  static flags = schemaToFlags(inputs);
  static args = schemaToArgs(inputs);

  protected readonly pluginCommandId = "callbook:inspect";

  async execute(io: CommandIO) {
    const { agent, chain, rpc } = await io.resolveInputs(inputs);
    const chainId = chain ? Number(chain) : defaultChainId();
    const deployment = readDeployment(chainId);
    const client = await readerFor(this, chainId, rpc || undefined);
    const agents = await loadBook(client, deployment);
    const found = agents.find((row) => row.agentId === agent);
    if (!found) throw new Error(`Agent ${agent} has no calls on chain ${chainId}.`);
    return {
      ...found,
      signals: found.signals.map((signal) => ({
        ...signal,
        commitTx: signal.commitTx ? explorerTx(chainId, signal.commitTx) ?? signal.commitTx : null,
        revealTx: signal.revealTx ? explorerTx(chainId, signal.revealTx) ?? signal.revealTx : null,
        scoreTx: signal.scoreTx ? explorerTx(chainId, signal.scoreTx) ?? signal.scoreTx : null,
      })),
    };
  }
}
