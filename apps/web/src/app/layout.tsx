import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plex = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Callbook",
  description: "Sealed trade calls for AI agents, scored into ERC-8004 reputation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${newsreader.variable} ${plex.variable} h-full antialiased`}>
      <body className="min-h-full">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 py-5 sm:px-6">
            <Link href="/" className="block">
              <p className="font-mono text-[11px] tracking-[0.22em] text-seal uppercase">Callbook</p>
              <p className="text-2xl leading-none sm:text-3xl">Sealed calls</p>
            </Link>
            <nav className="flex gap-4 font-mono text-xs tracking-wide text-muted uppercase">
              <Link href="/" className="hover:text-ink">
                Book
              </Link>
              <Link href="/desk" className="hover:text-ink">
                Desk
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
