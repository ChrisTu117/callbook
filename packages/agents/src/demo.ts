import { copyDeskAbi, formatBps, gateReason, scoreAnchorAbi, signalBookAbi } from "@callbook/core";
import { createTestClient, http } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import {
  commitSignal,
  clientsFor,
  ensureAgent,
  markExpired,
  pinAndScore,
  requestValidation,
  revealSignal,
  setMockPrice,
  writeAgents,
} from "./chain.ts";
import { readDeployment } from "./files.ts";

const MNEMONIC = "test test test test test test test test test test test junk";

function anvil(index: number) {
  return mnemonicToAccount(MNEMONIC, { addressIndex: index });
}

async function main() {
  const rpc = process.env.CALLBOOK_RPC_URL ?? "http://127.0.0.1:8545";
  const chainId = Number(process.env.CALLBOOK_CHAIN_ID ?? 31337);
  const deployment = readDeployment(chainId);
  writeAgents(chainId, {});
  const clients = clientsFor(rpc);
  const test = createTestClient({ mode: "anvil", transport: http(rpc) });
  const deployer = anvil(0);
  const ada = anvil(1);
  const blythe = anvil(2);
  const clerk = anvil(3);
  const follower = anvil(4);

  await setMockPrice({ clients, account: deployer, deployment, symbol: "ETH-USD", price1e8: 3_000_00000000n });

  const adaId = await ensureAgent({
    clients,
    account: ada,
    deployment,
    name: "Ada Momentum",
    description: "Goes with the last print when it is above a 12-minute average.",
  });
  const blytheId = await ensureAgent({
    clients,
    account: blythe,
    deployment,
    name: "Blythe Fade",
    description: "Fades a five-minute stretch.",
  });
  const clerkId = await ensureAgent({
    clients,
    account: clerk,
    deployment,
    name: "Clerk",
    description: "An LLM prompt over the same tape. This demo leaves one call unrevealed on purpose.",
  });

  const horizon = 180;
  const adaCall = await commitSignal({
    clients,
    account: ada,
    deployment,
    agentId: adaId,
    symbol: "ETH-USD",
    direction: 1,
    confidenceBps: 7200,
    horizonSec: horizon,
  });
  const blytheCall = await commitSignal({
    clients,
    account: blythe,
    deployment,
    agentId: blytheId,
    symbol: "ETH-USD",
    direction: -1,
    confidenceBps: 6100,
    horizonSec: horizon,
  });
  const clerkCall = await commitSignal({
    clients,
    account: clerk,
    deployment,
    agentId: clerkId,
    symbol: "ETH-USD",
    direction: 1,
    confidenceBps: 5400,
    horizonSec: horizon,
  });

  await revealSignal({
    clients,
    account: ada,
    deployment,
    id: adaCall.id,
    direction: 1,
    confidenceBps: 7200,
    salt: adaCall.salt,
    note: "Momentum. Scripted long for the local book.",
  });
  await revealSignal({
    clients,
    account: blythe,
    deployment,
    id: blytheCall.id,
    direction: -1,
    confidenceBps: 6100,
    salt: blytheCall.salt,
    note: "Fade. Scripted short for the local book.",
  });

  const clerkSignal = (await clients.publicClient.readContract({
    address: deployment.signalBook,
    abi: signalBookAbi,
    functionName: "getSignal",
    args: [clerkCall.id],
  })) as { revealDeadline: bigint; horizonEnd: bigint };

  await test.setNextBlockTimestamp({ timestamp: clerkSignal.revealDeadline + 1n });
  await test.mine({ blocks: 1 });
  await markExpired({ clients, account: deployer, deployment, id: clerkCall.id });

  const adaSignal = (await clients.publicClient.readContract({
    address: deployment.signalBook,
    abi: signalBookAbi,
    functionName: "getSignal",
    args: [adaCall.id],
  })) as { horizonEnd: bigint };
  const blytheSignal = (await clients.publicClient.readContract({
    address: deployment.signalBook,
    abi: signalBookAbi,
    functionName: "getSignal",
    args: [blytheCall.id],
  })) as { horizonEnd: bigint };
  const horizonEnd = adaSignal.horizonEnd > blytheSignal.horizonEnd ? adaSignal.horizonEnd : blytheSignal.horizonEnd;
  await test.setNextBlockTimestamp({ timestamp: horizonEnd });
  await test.mine({ blocks: 1 });
  await setMockPrice({ clients, account: deployer, deployment, symbol: "ETH-USD", price1e8: 3_090_00000000n });
  await pinAndScore({ clients, account: deployer, deployment, id: adaCall.id });
  await pinAndScore({ clients, account: deployer, deployment, id: blytheCall.id });
  await requestValidation({ clients, account: ada, deployment, agentId: adaId });

  const adaStats = (await clients.publicClient.readContract({
    address: deployment.scoreAnchor,
    abi: scoreAnchorAbi,
    functionName: "stats",
    args: [adaId],
  })) as readonly [number, number, bigint];
  const blytheStats = (await clients.publicClient.readContract({
    address: deployment.scoreAnchor,
    abi: scoreAnchorAbi,
    functionName: "stats",
    args: [blytheId],
  })) as readonly [number, number, bigint];

  const blocked = gateReason(Number(blytheStats[0]), Number(blytheStats[1]), {
    minSamples: deployment.minSamples,
    minWinBps: deployment.minWinBps,
  });
  if (!blocked) throw new Error("Blythe should be below the copy gate.");
  try {
    await clients.publicClient.simulateContract({
      account: follower.address,
      address: deployment.copyDesk,
      abi: copyDeskAbi,
      functionName: "follow",
      args: [blytheId, 250_000_000_000_000_000n],
      value: 1_000_000_000_000_000_000n,
    });
    throw new Error("Follow of Blythe should revert.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Gate") && !message.includes("Follow of Blythe")) throw error;
  }

  await clients.walletClient.writeContract({
    account: follower,
    chain: null,
    address: deployment.copyDesk,
    abi: copyDeskAbi,
    functionName: "follow",
    args: [adaId, 250_000_000_000_000_000n],
    value: 1_000_000_000_000_000_000n,
  });

  const second = await commitSignal({
    clients,
    account: ada,
    deployment,
    agentId: adaId,
    symbol: "ETH-USD",
    direction: 1,
    confidenceBps: 6800,
    horizonSec: horizon,
  });
  await revealSignal({
    clients,
    account: ada,
    deployment,
    id: second.id,
    direction: 1,
    confidenceBps: 6800,
    salt: second.salt,
    note: "Second long. The desk mirrors this one.",
  });

  const mirrorHash = await clients.walletClient.writeContract({
    account: follower,
    chain: null,
    address: deployment.copyDesk,
    abi: copyDeskAbi,
    functionName: "mirror",
    args: [second.id, 200_000_000_000_000_000n],
  });
  await clients.publicClient.waitForTransactionReceipt({ hash: mirrorHash });

  const secondSignal = (await clients.publicClient.readContract({
    address: deployment.signalBook,
    abi: signalBookAbi,
    functionName: "getSignal",
    args: [second.id],
  })) as { horizonEnd: bigint };
  await test.setNextBlockTimestamp({ timestamp: secondSignal.horizonEnd });
  await test.mine({ blocks: 1 });
  await setMockPrice({ clients, account: deployer, deployment, symbol: "ETH-USD", price1e8: 3_180_00000000n });
  await pinAndScore({ clients, account: deployer, deployment, id: second.id });
  await clients.walletClient.writeContract({
    account: deployer,
    chain: null,
    address: deployment.copyDesk,
    abi: copyDeskAbi,
    functionName: "seed",
    value: 1_000_000_000_000_000_000n,
  });
  const settleHash = await clients.walletClient.writeContract({
    account: deployer,
    chain: null,
    address: deployment.copyDesk,
    abi: copyDeskAbi,
    functionName: "settle",
    args: [1n],
  });
  await clients.publicClient.waitForTransactionReceipt({ hash: settleHash });

  const finalAda = (await clients.publicClient.readContract({
    address: deployment.scoreAnchor,
    abi: scoreAnchorAbi,
    functionName: "stats",
    args: [adaId],
  })) as readonly [number, number, bigint];

  console.log(
    JSON.stringify(
      {
        chainId,
        rpc,
        ada: { agentId: adaId.toString(), samples: Number(finalAda[0]), wins: Number(finalAda[1]), pnl: formatBps(finalAda[2]) },
        blythe: {
          agentId: blytheId.toString(),
          samples: Number(blytheStats[0]),
          wins: Number(blytheStats[1]),
          gate: blocked,
        },
        clerk: { agentId: clerkId.toString(), unrevealedSignal: clerkCall.id.toString() },
        copiedSignal: second.id.toString(),
        adaFirstPnl: formatBps(adaStats[2]),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
