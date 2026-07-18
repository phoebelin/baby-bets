"use client";

import { useState } from "react";
import Link from "next/link";
import { NotConfigured } from "@/components/not-configured";
import { OddsBar } from "@/components/odds-bar";
import { Card, CoinBadge, Pill } from "@/components/ui";
import { usePlayer } from "@/lib/player-context";
import { supabaseConfigured } from "@/lib/supabase";
import { useBets } from "@/lib/use-bets";

export default function Home() {
  const { ready, player } = usePlayer();

  return (
    <main className="relative z-10 flex flex-1 flex-col pt-10">
      <p className="text-center text-sm font-medium tracking-wide text-ink-soft">
        Phoebe &amp; David&apos;s baby shower
      </p>
      <h1 className="mt-1 text-center font-display text-5xl font-bold">
        Baby <span className="italic text-blush-deep">Bets</span>
      </h1>
      <p className="mx-auto mt-3 max-w-xs text-center text-ink-soft">
        Boy or girl? Put your coins where your gut is — the truth comes out at
        the big reveal. 💙🩷
      </p>

      {!supabaseConfigured ? (
        <NotConfigured />
      ) : !ready ? (
        <div className="mt-16 text-center text-4xl soft-pulse">🍼</div>
      ) : player ? (
        <Hub />
      ) : (
        <JoinForm />
      )}
    </main>
  );
}

function JoinForm() {
  const { join } = usePlayer();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await join(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-10">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="name" className="font-display text-lg font-semibold">
          What&apos;s your name?
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Auntie Kim"
          autoComplete="name"
          maxLength={40}
          className="rounded-2xl border border-line bg-cream px-4 py-3.5 text-base outline-none focus:border-blush"
        />
        {error && <p className="text-sm text-blush-deep">{error}</p>}
        <Pill
          type="submit"
          disabled={!name.trim() || busy}
          className="bg-ink px-6 py-3.5 text-base text-cream shadow-lift"
        >
          {busy ? "Joining…" : "Join the game 🎉"}
        </Pill>
        <p className="text-center text-xs text-ink-soft">
          You start with 2 🪙 — earn more in trivia. Played before? Enter the
          same name to pick up where you left off.
        </p>
      </form>
    </Card>
  );
}

function Hub() {
  const { player, gameState, leave } = usePlayer();
  const { pools, loaded } = useBets();
  if (!player) return null;

  const revealed = gameState?.revealed ?? false;

  return (
    <div className="mt-8 flex flex-col gap-4">
      <Card className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold">
            Hi, {player.name}! 👋
          </p>
          <p className="text-xs text-ink-soft">Your coin purse</p>
        </div>
        <CoinBadge coins={player.coins} className="px-4 py-2 text-lg" />
      </Card>

      {loaded && (
        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            The crowd says…
          </p>
          <OddsBar pools={pools} compact />
        </Card>
      )}

      {revealed && (
        <NavRow
          href="/reveal"
          emoji="🎉"
          title="The reveal is out!"
          subtitle="See the answer and who won big"
          highlight
        />
      )}
      <NavRow
        href="/market"
        emoji="📈"
        title="The Market"
        subtitle={
          gameState?.betting_open && !revealed
            ? "Bet your coins on boy or girl"
            : "Betting is closed — see the board"
        }
      />
      <NavRow
        href="/trivia"
        emoji="🍼"
        title="Baby Trivia"
        subtitle={
          gameState?.trivia_open
            ? "Open now — every correct answer = 1 🪙"
            : "Opens during the party"
        }
      />
      <NavRow
        href="/leaderboard"
        emoji="🏆"
        title="Leaderboard"
        subtitle="Who's sitting on the biggest pile?"
      />
      {!revealed && (
        <NavRow
          href="/reveal"
          emoji="🎀"
          title="The Big Reveal"
          subtitle="Keep this open for the moment of truth"
        />
      )}

      <div className="mt-4 flex items-center justify-between px-2 text-xs text-ink-soft">
        <button onClick={leave} className="underline underline-offset-2">
          Not {player.name}? Switch player
        </button>
        <Link href="/admin" className="underline underline-offset-2">
          Host tools
        </Link>
      </div>
    </div>
  );
}

function NavRow({
  href,
  emoji,
  title,
  subtitle,
  highlight = false,
}: {
  href: string;
  emoji: string;
  title: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-3xl border p-4 shadow-soft transition-transform active:scale-[0.98] ${
        highlight ? "border-gold/50 bg-gold-soft" : "border-line bg-card"
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-2xl">
        {emoji}
      </span>
      <span className="flex-1">
        <span className="block font-display text-base font-semibold">
          {title}
        </span>
        <span className="block text-xs text-ink-soft">{subtitle}</span>
      </span>
      <span className="text-ink-soft">›</span>
    </Link>
  );
}
