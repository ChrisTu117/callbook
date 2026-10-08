"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useNetwork } from "@/components/BookProvider";
import { Loading, NotDeployed, Unread } from "@/components/States";
import { loadLiveBook, type AgentRow } from "@/lib/live";

export default function AgentRoute() {
  return (
    <Suspense fallback={<Loading label="Opening the agent." />}>
      <AgentPage />
    </Suspense>
  );
}

function AgentPage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { network, ready } = useNetwork();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !id) return;
    let cancel = false;
    setAgent(null);
    setError(null);
    loadLiveBook(network)
      .then((view) => {
        if (cancel) return;
        const row = view.agents.find((item) => item.agentId === id);
        if (!row) setError("That agent has no calls on this book.");
        else setAgent(row);
      })
      .catch((reason: unknown) => {
        if (!cancel) setError(reason instanceof Error ? reason.message : "The RPC did not answer.");
      });
    return () => {
      cancel = true;
    };
  }, [id, network, ready]);

  if (!ready) return <NotDeployed name={network.name} />;
  if (!id) return <Unread message="Add ?id= to the address. The leaderboard links do this." />;
  if (error) return <Unread message={error} />;
  if (!agent) return <Loading label="Reading this agent from the chain." />;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="font-mono text-xs tracking-[0.16em] text-muted uppercase">
          Back to the book
        </Link>
        <p className="mt-3 font-mono text-xs tracking-[0.18em] text-seal uppercase">Live chain read</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">{agent.name}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">{agent.description || "No registration text."}</p>
      </div>
      <dl className="grid grid-cols-2 gap-px border border-line bg-line font-mono text-xs sm:grid-cols-4">
        <Cell label="Win rate" value={agent.winRate} />
        <Cell label="Scored" value={`${agent.wins}/${agent.samples}`} />
        <Cell label="Yield" value={agent.pnl} />
        <Cell label="Registry notes" value={agent.feedbacks} />
      </dl>
      <p className="font-mono text-xs text-muted">
        {agent.gate ? `Copy is closed. ${agent.gate}` : "Copy is open. The desk will accept a capped follow for this agent."}{" "}
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
  return (
    <a className="text-seal underline decoration-line underline-offset-2" href={href}>
      {label}
    </a>
  );
}
