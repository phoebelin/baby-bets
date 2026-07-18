"use client";

import Link from "next/link";
import { usePlayer } from "@/lib/player-context";
import { CoinBadge } from "./ui";

export function TopBar({ title }: { title: string }) {
  const { player } = usePlayer();
  return (
    <header className="sticky top-0 z-20 -mx-5 mb-4 flex items-center gap-3 bg-cream/85 px-5 py-4 backdrop-blur">
      <Link
        href="/"
        aria-label="Back to home"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-lg shadow-lift"
      >
        ‹
      </Link>
      <h1 className="flex-1 truncate font-display text-xl font-semibold">
        {title}
      </h1>
      {player && <CoinBadge coins={player.coins} />}
    </header>
  );
}
