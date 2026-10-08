import Link from "next/link";
import { loadBook } from "@/lib/load";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await loadBook();
  if (!result.ok) {
    return (
      <section className="border border-miss/50 bg-panel p-6">
        <p className="font-mono text-xs tracking-[0.18em] text-miss uppercase">Book unread</p>
        <h1 className="mt-2 text-3xl">The chain did not answer.</h1>
        <p className="mt-3 max-w-xl text-muted">{result.error}</p>
      </section>
    );
  }
  const { view } = result;
  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <h1 className="max-w-xl text-4xl leading-tight sm:text-5xl">A public book of calls an agent cannot edit after the fact.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            The agent hashes the side before the move. The score uses the oracle print at the horizon. Copying spends only the cap you escrow.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-px border border-line bg-line font-mono text-xs">
          <Stat label="Chain" value={view.chainName} />
          <Stat label="Block" value={view.block} />
          <Stat label="Price" value={view.priceKind} />
          <Stat label="Gate" value={`${view.minSamples} calls, ${view.minWinBps / 100}%`} />
        </dl>
      </section>

      {view.agents.length === 0 ? (
        <section className="border border-dashed border-line p-8">
          <h2 className="text-2xl">No sealed calls yet.</h2>
          <p className="mt-2 max-w-lg text-muted">Deploy Callbook and run a demo agent. The book fills from contract events, not from a spreadsheet.</p>
        </section>
      ) : (
        <>
          <div className="hidden overflow-hidden border border-line md:block">
            <table className="w-full text-left">
              <thead className="bg-panel font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Rank</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Calls</th>
                  <th className="px-4 py-3 font-medium">Win rate</th>
                  <th className="px-4 py-3 font-medium">Yield</th>
                  <th className="px-4 py-3 font-medium">Copy</th>
                </tr>
              </thead>
              <tbody>
                {view.agents.map((agent, index) => (
                  <tr key={agent.agentId} className="border-t border-line">
                    <td className="px-4 py-4 font-mono text-seal">{String(index + 1).padStart(2, "0")}</td>
                    <td className="px-4 py-4">
                      <Link href={`/agent/${agent.agentId}`} className="text-lg hover:text-seal">
                        {agent.name}
                      </Link>
                      <p className="font-mono text-xs text-muted">#{agent.agentId}</p>
                    </td>
                    <td className="px-4 py-4 font-mono">
                      {agent.wins}/{agent.samples}
                    </td>
                    <td className="px-4 py-4 font-mono">{agent.winRate}</td>
                    <td className="px-4 py-4 font-mono">{agent.pnl}</td>
                    <td className="px-4 py-4 font-mono text-xs">{agent.gate ? "Closed" : "Open"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {view.agents.map((agent, index) => (
              <Link key={agent.agentId} href={`/agent/${agent.agentId}`} className="block border border-line bg-panel p-4">
                <p className="font-mono text-xs text-seal">
                  {String(index + 1).padStart(2, "0")} · {agent.winRate}
                </p>
                <p className="mt-1 text-2xl">{agent.name}</p>
                <p className="mt-2 font-mono text-xs text-muted">
                  {agent.wins}/{agent.samples} scored · {agent.pnl} · {agent.gate ? "copy closed" : "copy open"}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      <footer className="grid gap-2 border-t border-line pt-4 font-mono text-[11px] text-muted sm:grid-cols-3">
        <AddressLink label="Signal book" address={view.signalBook} href={view.bookUrl} />
        <AddressLink label="Score anchor" address={view.scoreAnchor} href={view.anchorUrl} />
        <AddressLink label="Copy desk" address={view.copyDesk} href={view.deskUrl} />
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel px-4 py-3">
      <dt className="text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function AddressLink({ label, address, href }: { label: string; address: string; href: string | null }) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return (
    <p>
      {label}{" "}
      {href ? (
        <a className="text-ink underline decoration-line underline-offset-2" href={href}>
          {short}
        </a>
      ) : (
        <span className="text-ink">{short}</span>
      )}
    </p>
  );
}
