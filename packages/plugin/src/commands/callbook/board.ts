import { chainInfo, explorerAddress } from "@callbook/core";
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
import { readDeployment } from "../../lib/files.js";

const inputs = {
  chain: {
    type: InputFieldType.Text,
    flag: "chain",
    message: "Chain id. 143 Monad, 10143 Monad testnet, 5042 Arc.",
    required: false,
    prompt: false,
  },
  rpc: {
    type: InputFieldType.Text,
    flag: "rpc",
    message: "RPC URL. Defaults to the public chain RPC.",
    required: false,
    prompt: false,
  },
} satisfies InputSchema;

type Row = {
  rank: number;
  agentId: string;
  name: string;
  samples: number;
  wins: number;
  winRate: string;
  cumulativePnl: string;
  copy: string;
};

export default class CallbookBoard extends PluginCommand {
  static description = "List trading agents ranked by verified ERC-8004 win rate.";
  static examples = ["<%= config.bin %> callbook board", "<%= config.bin %> callbook board --chain 10143"];
  static requiresAuth = false;
  static requiresInit = false;
  static flags = schemaToFlags(inputs);
  static args = schemaToArgs(inputs);

  protected readonly pluginCommandId = "callbook:board";

  async execute(io: CommandIO) {
    const { chain, rpc } = await io.resolveInputs(inputs);
    const chainId = Number(chain || process.env.CALLBOOK_CHAIN_ID || 143);
    const deployment = readDeployment(chainId);
    const client = await readerFor(this, chainId, rpc || undefined);
    const agents = await loadBook(client, deployment);
    const rows = agents.map((agent, index) => ({
      rank: index + 1,
      agentId: agent.agentId,
      name: agent.name,
      samples: agent.samples,
      wins: agent.wins,
      winRate: agent.winRate,
      cumulativePnl: agent.cumulativePnl,
      copy: agent.gate ?? "open",
    }));
    return {
      chain: chainInfo(chainId).name,
      desk: explorerAddress(chainId, deployment.copyDesk),
      rows,
    };
  }

  successHint(): string {
    return "Ranked by win rate, then sample size. Copy is open only when the agent clears the on-chain gate.";
  }
}
