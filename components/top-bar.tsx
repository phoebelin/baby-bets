"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePlayer } from "@/lib/player-context";
import { CoinBadge } from "./ui";

export function TopBar({ title }: { title: string }) {
  const { player } = usePlayer();
  return (
    <header className="sticky top-0 z-20 -mx-5 mb-4 flex items-center gap-3 border-b border-line bg-cream/85 px-5 py-4 backdrop-blur">
      <Link
        href="/"
        aria-label="Back to home"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card shadow-lift"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
      </Link>
      <h1 className="flex-1 truncate font-display text-xl font-semibold">
        {title}
      </h1>
      {player && <CoinBadge coins={player.coins} />}
    </header>
  );
}
