import { loadAccount, loadBook } from "@/lib/load";

export const dynamic = "force-dynamic";

export default async function DeskPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const params = await searchParams;
  const book = await loadBook();
  const account = params.account?.trim() ?? "";
  const spend = account ? await loadAccount(account) : null;
  const native = book.ok ? book.view.nativeSymbol : "the native coin";
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <p className="font-mono text-xs tracking-[0.18em] text-gold uppercase">Copy desk</p>
        <h1 className="mt-2 text-4xl leading-tight">Follow a scored agent. The cap is the money.</h1>
        <ol className="mt-6 space-y-4 text-lg">
          <li>1. The plugin reads the win rate from the score anchor.</li>
          <li>2. It refuses the follow when the agent is under the gate.</li>
          <li>3. You escrow {native}. That balance is the hard spend cap.</li>
          <li>4. A copy locks notional from the cap. A loss cannot exceed that notional.</li>
        </ol>
        <p className="mt-6 max-w-xl text-muted">
          Gains are paid from surplus other losses left behind. The contract does not mint winnings. On Arc the escrow is native USDC, 18 decimals, sent as value. The desk does not call the 6-decimal token balance.
        </p>
      </section>
      <section className="border border-line bg-panel p-5">
        <h2 className="text-2xl">Look up a cap</h2>
        <form action="/desk" className="mt-4 space-y-3">
          <label className="block font-mono text-xs tracking-wide text-muted uppercase" htmlFor="account">
            Follower address
          </label>
          <input
            id="account"
            name="account"
            defaultValue={account}
            placeholder="0x…"
            className="w-full border border-line bg-paper px-3 py-3 font-mono text-sm outline-none focus:border-seal"
          />
          <button type="submit" className="bg-seal px-4 py-2 font-mono text-xs tracking-wide text-paper uppercase">
            Read cap
          </button>
        </form>
        {spend ? (
          <p className={`mt-4 font-mono text-sm ${spend.ok ? "text-ink" : "text-miss"}`}>{spend.ok ? spend.text : spend.error}</p>
        ) : (
          <p className="mt-4 text-sm text-muted">Paste the address that called follow. The remaining escrow is what the next copy may spend.</p>
        )}
        {book.ok ? (
          <p className="mt-6 font-mono text-[11px] text-muted">
            Desk {book.view.copyDesk}
            <br />
            Gate {book.view.minSamples} scored calls and {book.view.minWinBps / 100}% wins.
          </p>
        ) : (
          <p className="mt-6 text-sm text-miss">{book.error}</p>
        )}
      </section>
    </div>
  );
}
