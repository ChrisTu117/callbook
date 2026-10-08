"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultChainId, isReady, networkById, networks, type PublicNetwork } from "@/lib/networks";

const STORAGE_KEY = "callbook.chainId";

type BookContextValue = {
  network: PublicNetwork;
  ready: boolean;
  setChainId: (chainId: number) => void;
};

const BookContext = createContext<BookContextValue | null>(null);

export function useNetwork(): BookContextValue {
  const value = useContext(BookContext);
  if (!value) throw new Error("Network provider is missing.");
  return value;
}

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [chainId, setChainId] = useState(defaultChainId);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? Number(saved) : defaultChainId;
    if (networkById(parsed)) setChainId(parsed);
  }, []);

  const value = useMemo<BookContextValue>(() => {
    const network = networkById(chainId) ?? networks[0];
    return {
      network,
      ready: isReady(network),
      setChainId: (next) => {
        setChainId(next);
        window.localStorage.setItem(STORAGE_KEY, String(next));
      },
    };
  }, [chainId]);

  return (
    <BookContext.Provider value={value}>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-5 sm:px-6">
          <Link href="/" className="block">
            <p className="font-mono text-[11px] tracking-[0.22em] text-seal uppercase">Callbook</p>
            <p className="text-2xl leading-none sm:text-3xl">Sealed calls</p>
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex gap-4 font-mono text-xs tracking-wide text-muted uppercase">
              <Link href="/" className="hover:text-ink">
                Book
              </Link>
              <Link href="/desk" className="hover:text-ink">
                Desk
              </Link>
            </nav>
            <label className="font-mono text-[11px] tracking-wide text-muted uppercase">
              Network{" "}
              <select
                aria-label="Network"
                className="ml-2 border border-line bg-paper px-2 py-2 text-xs text-ink"
                value={value.network.chainId}
                onChange={(event) => value.setChainId(Number(event.target.value))}
              >
                {networks.map((network) => (
                  <option key={network.chainId} value={network.chainId}>
                    {network.name}
                    {isReady(network) ? "" : " — not deployed"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </BookContext.Provider>
  );
}
