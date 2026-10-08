export function NotDeployed({ name }: { name: string }) {
  return (
    <section className="border border-line bg-panel p-6">
      <p className="font-mono text-xs tracking-[0.18em] text-gold uppercase">Waiting for addresses</p>
      <h1 className="mt-2 text-3xl">{name} is in the switcher.</h1>
      <p className="mt-3 max-w-xl text-muted">
        Fill signalBook, scoreAnchor, and copyDesk for this chain in networks.json, then rebuild. The registries are already listed. The page reads the chain only after those three addresses are present.
      </p>
    </section>
  );
}

export function Loading({ label }: { label: string }) {
  return <p className="font-mono text-sm text-muted">{label}</p>;
}

export function Unread({ message }: { message: string }) {
  return (
    <section className="border border-miss/50 bg-panel p-6">
      <p className="font-mono text-xs tracking-[0.18em] text-miss uppercase">Book unread</p>
      <h1 className="mt-2 text-3xl">The chain did not answer.</h1>
      <p className="mt-3 max-w-xl text-muted">{message}</p>
    </section>
  );
}
