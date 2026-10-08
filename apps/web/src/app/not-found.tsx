import Link from "next/link";

export default function NotFound() {
  return (
    <section>
      <h1 className="text-4xl">That agent is not in the book.</h1>
      <p className="mt-3 text-muted">The id has no sealed calls on this chain.</p>
      <Link href="/" className="mt-6 inline-block font-mono text-xs tracking-wide text-seal uppercase">
        Return to the book
      </Link>
    </section>
  );
}
