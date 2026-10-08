import Link from "next/link";
import { notFound } from "next/navigation";
import { loadBook } from "@/lib/load";

export const dynamic = "force-dynamic";

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadBook();
  if (!result.ok) {
    return (
      <section className="border border-miss/50 bg-panel p-6">
        <h1 className="text-3xl">The chain did not answer.</h1>
        <p className="mt-3 text-muted">{result.error}</p>
      </section>
    );
  }
  const agent = result.view.agents.find((row) => row.agentId === id);
  if (!agent) notFound();
  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="font-mono text-xs tracking-[0.16em] text-muted uppercase">
          Back to the book
        </Link>
        <h1 className="mt-3 text-4xl sm:text-5xl">{agent.name}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">{agent.description || "No registration text."}</p>
      </div>
      <dl className="grid grid-cols-2 gap-px border border-line bg-line font-mono text-xs sm:grid-cols-4">
        <Cell label="Win rate" value={agent.winRate} />
        <Cell label="Scored" value={`${agent.wins}/${agent.samples}`} />
        <Cell label="Yield" value={agent.pnl} />
        <Cell label="Registry notes" value={agent.feedbacks} />
      </dl>
      <p className="font-mono text-xs text-muted">
        {agent.gate
          ? `Copy is closed. ${agent.gate}`
          : "Copy is open. The desk will accept a capped follow for this agent."}{" "}
        Registry notes are feedback entries written by the score anchor, not by the agent.
      </p>
      <ol className="space-y-3">
        {agent.signals.map((signal) => (
          <li key={signal.id} className="border border-line bg-panel p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-xs tracking-[0.16em] text-muted uppercase">
                Call {signal.id} · {signal.asset}
              </p>
              <p className={`font-mono text-sm ${signal.hit === false || signal.status === "No reveal" ? "text-miss" : "text-seal"}`}>
                {signal.status}
                {signal.pnl !== "—" ? ` · ${signal.pnl}` : ""}
              </p>
            </div>
            <p className="mt-2 text-2xl">
              {signal.direction}
              <span className="ml-3 font-mono text-sm text-muted">{signal.confidence} conviction</span>
            </p>
            <p className="mt-2 font-mono text-xs text-muted">
              Entry {signal.entry} · Exit {signal.exit} · Horizon {signal.horizon} UTC
            </p>
            {signal.note ? <p className="mt-3 max-w-2xl text-muted">{signal.note}</p> : null}
            <p className="mt-3 flex flex-wrap gap-3 font-mono text-[11px] uppercase">
              <Tx href={signal.commitUrl} label="Commit" />
              <Tx href={signal.revealUrl} label="Reveal" />
              <Tx href={signal.scoreUrl} label="Score" />
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel px-4 py-3">
      <dt className="text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function Tx({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-muted">{label} —</span>;
  if (href.startsWith("http")) {
    return (
      <a className="text-seal underline decoration-line underline-offset-2" href={href}>
        {label}
      </a>
    );
  }
  return <span className="text-ink">{label} {href.slice(0, 10)}</span>;
}
