import { chainInfo } from "@callbook/core";
import { createPublicClient, http, type PublicClient } from "viem";

type ReadCtx = { publicClient?: (chainId: number) => PublicClient };

export async function readerFor(command: object, chainId: number, rpc?: string): Promise<PublicClient> {
  const ctx = (command as { ctx?: ReadCtx }).ctx;
  if (rpc) return createPublicClient({ transport: http(rpc) });
  if (ctx?.publicClient) {
    try {
      return ctx.publicClient(chainId);
    } catch {
      // The wallet may not have this chain. Fall back to the public RPC.
    }
  }
  const url = chainInfo(chainId).rpc;
  if (!url) throw new Error(`No public RPC for chain ${chainId}. Pass --rpc.`);
  return createPublicClient({ transport: http(url) });
}

type TxRequest = {
  kind: "transaction";
  chainId: number;
  transaction: { to: `0x${string}`; data: `0x${string}`; value?: `0x${string}` };
};

type TxResult = { kind?: string; hash?: string; status?: string; failureDescription?: string };

export async function submitTx(
  command: object,
  io: unknown,
  source: string,
  chainId: number,
  tx: { to: `0x${string}`; data: `0x${string}`; value?: bigint },
): Promise<{ hash: string; status: string }> {
  const ctx = (
    command as {
      ctx: { walletExecutor: (io: unknown, source: string) => Promise<(request: TxRequest) => Promise<TxResult>> };
    }
  ).ctx;
  const executor = await ctx.walletExecutor(io, source);
  const result = await executor({
    kind: "transaction",
    chainId,
    transaction: {
      to: tx.to,
      data: tx.data,
      value: tx.value && tx.value > 0n ? `0x${tx.value.toString(16)}` : "0x0",
    },
  });
  if (!result.hash) {
    throw new Error(result.failureDescription || "The wallet did not return a transaction hash.");
  }
  return { hash: result.hash, status: result.status ?? "submitted" };
}
