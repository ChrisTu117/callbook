"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useNetwork } from "@/components/BookProvider";
import { Loading } from "@/components/States";
import { loadLiveAccount } from "@/lib/live";

export default function DeskRoute() {
  return (
    <Suspense fallback={<Loading label="Opening the desk." />}>
      <DeskPage />
    </Suspense>
  );
}

function DeskPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { network, ready } = useNetwork();
  const initial = params.get("account") ?? "";
  const [account, setAccount] = useState(initial);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAccount(initial);
  }, [initial]);

  useEffect(() => {
    if (!ready || !initial) {
      setText(null);
      setError(null);
      return;
    }
    let cancel = false;
    setText(null);
    setError(null);
    loadLiveAccount(network, initial)
      .then((next) => {
        if (!cancel) setText(next);
      })
      .catch((reason: unknown) => {
        if (!cancel) setError(reason instanceof Error ? reason.message : "The desk did not answer.");
      });
    return () => {
      cancel = true;
    };
  }, [initial, network, ready]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <p className="font-mono text-xs tracking-[0.18em] text-gold uppercase">Copy desk</p>
        <h1 className="mt-2 text-4xl leading-tight">Follow a scored agent. The cap is the money.</h1>
        <ol className="mt-6 space-y-4 text-lg">
          <li>1. The plugin reads the win rate from the score anchor.</li>
          <li>2. It refuses the follow when the agent is under the gate.</li>
          <li>3. You escrow {network.nativeSymbol}. That balance is the hard spend cap.</li>
          <li>4. A copy locks notional from the cap. A loss cannot exceed that notional.</li>
        </ol>
        <p className="mt-6 max-w-xl text-muted">
          Gains are paid from surplus other losses left behind. The contract does not mint winnings. On Arc the escrow is native USDC, 18 decimals, sent as value. The desk does not call the 6-decimal token balance. This page reads the desk from the chain in your browser.
        </p>
      </section>
      <section className="border border-line bg-panel p-5">
        <h2 className="text-2xl">Look up a cap</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const next = account.trim();
            router.push(next ? `/desk/?account=${next}` : "/desk/");
          }}
        >
          <label className="block font-mono text-xs tracking-wide text-muted uppercase" htmlFor="account">
            Follower address
          </label>
          <input
            id="account"
            name="account"
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            placeholder="0x…"
            className="w-full border border-line bg-paper px-3 py-3 font-mono text-sm outline-none focus:border-seal"
          />
          <button type="submit" className="bg-seal px-4 py-2 font-mono text-xs tracking-wide text-paper uppercase">
            Read cap
          </button>
        </form>
        {!ready ? (
          <p className="mt-4 text-sm text-muted">This network has no copy desk address in networks.json yet.</p>
        ) : error ? (
          <p className="mt-4 font-mono text-sm text-miss">{error}</p>
        ) : text ? (
          <p className="mt-4 font-mono text-sm text-ink">{text}</p>
        ) : initial ? (
          <p className="mt-4 font-mono text-sm text-muted">Reading the cap.</p>
        ) : (
          <p className="mt-4 text-sm text-muted">Paste the address that called follow. The remaining escrow is what the next copy may spend.</p>
        )}
        <p className="mt-6 font-mono text-[11px] text-muted">
          {ready ? (
            <>
              Desk {network.copyDesk}
              <br />
              Gate {network.minSamples} scored calls and {network.minWinBps / 100}% wins.
            </>
          ) : (
            <>Chain {network.chainId}</>
          )}
        </p>
      </section>
    </div>
  );
}
