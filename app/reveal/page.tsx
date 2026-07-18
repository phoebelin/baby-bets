"use client";

import { Crown, Gift, PartyPopper, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Confetti } from "@/components/confetti";
import { NotConfigured } from "@/components/not-configured";
import { OddsBar } from "@/components/odds-bar";
import { TopBar } from "@/components/top-bar";
import { Card, PillLink, SideDot } from "@/components/ui";
import { usePlayer } from "@/lib/player-context";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { SIDE_META, type Player, type Side } from "@/lib/types";
import { useBets } from "@/lib/use-bets";

export default function RevealPage() {
  const { player, gameState } = usePlayer();
  const { bets, pools, loaded } = useBets();
  const [winners, setWinners] = useState<Player[] | null>(null);

  const revealed = Boolean(gameState?.revealed && gameState.actual_gender);
  const gender = gameState?.actual_gender ?? null;

  // Load the winners board once the reveal lands (also on refresh after it).
  useEffect(() => {
    if (!supabaseConfigured || !revealed) return;
    (async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .gt("reveal_winnings", 0)
        .order("reveal_winnings", { ascending: false });
      if (data) setWinners(data as Player[]);
    })();
  }, [revealed]);

  const myResult = useMemo(() => {
    if (!player || !gender) return null;
    const stakeOnWinner = bets
      .filter((b) => b.player_id === player.id && b.side === gender)
      .reduce((s, b) => s + b.amount, 0);
    const stakeOnLoser = bets
      .filter((b) => b.player_id === player.id && b.side !== gender)
      .reduce((s, b) => s + b.amount, 0);
    if (stakeOnWinner === 0 && stakeOnLoser === 0) return null;
    return { stakeOnWinner, stakeOnLoser };
  }, [player, gender, bets]);

  if (!supabaseConfigured) {
    return (
      <main className="relative z-10">
        <TopBar title="The Big Reveal" />
        <NotConfigured />
      </main>
    );
  }

  if (!revealed || !gender) {
    return (
      <main className="relative z-10 flex flex-col gap-4">
        <TopBar title="The Big Reveal" />
        <Card className="mt-6 text-center">
          <Gift
            className="mx-auto h-14 w-14 text-ink-soft soft-pulse"
            strokeWidth={1.5}
            aria-hidden
          />
          <h2 className="mt-4 font-display text-2xl font-semibold">
            The moment is coming…
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Keep this page open — the answer will appear here the instant
            Phoebe &amp; David spill the beans.
          </p>
        </Card>
        {loaded && (
          <Card>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Final(ish) odds
            </p>
            <OddsBar pools={pools} />
          </Card>
        )}
      </main>
    );
  }

  const winningPool = gender === "boy" ? pools.boy : pools.girl;
  const meta = SIDE_META[gender];

  return (
    <main className="relative z-10 flex flex-col gap-4">
      <Confetti side={gender} />
      <TopBar title="The Big Reveal" />

      <Card
        className={`mt-4 text-center pop-in ${
          gender === "boy"
            ? "border-boy-deep/40 bg-boy-soft"
            : "border-girl-deep/40 bg-girl-soft"
        }`}
      >
        <SideDot side={gender} className="mx-auto h-16 w-16" />
        <h2 className="mt-4 font-display text-4xl font-bold">
          It&apos;s {meta.noun}!
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          The crowd had {meta.label} at{" "}
          {gender === "boy" ? pools.boyPrice : pools.girlPrice}¢.
        </p>
      </Card>

      {myResult && (
        <Card className="text-center">
          {myResult.stakeOnWinner > 0 ? (
            <p className="flex flex-col items-center gap-1 font-display text-lg font-semibold">
              <span className="flex items-center gap-1.5">
                You called it! <PartyPopper className="h-5 w-5" aria-hidden />
              </span>
              {player && player.reveal_winnings > 0 && (
                <span className="flex items-center gap-1 text-leaf">
                  +{player.reveal_winnings} winnings
                </span>
              )}
            </p>
          ) : (
            <p className="font-display text-lg font-semibold">
              AAUGH! Better luck next baby.
            </p>
          )}
        </Card>
      )}

      <Card>
        <p className="mb-2 font-display text-lg font-semibold">
          {winningPool === 0 ? "Nobody saw it coming" : "Winners' circle"}
        </p>
        {winningPool === 0 ? (
          <p className="text-sm text-ink-soft">
            Not a single coin was on {meta.label} — every stake has been
            refunded. The baby keeps its mystery to the end.
          </p>
        ) : winners === null ? (
          <p className="text-sm text-ink-soft">Tallying payouts…</p>
        ) : winners.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Winners got their stakes back — the other side never bet, so
            there was no pot to split.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {winners.map((w, i) => (
              <li key={w.id} className="flex items-center gap-3 text-sm">
                <span className="flex w-6 justify-center">
                  {i === 0 ? (
                    <Crown className="h-4 w-4 text-gold" aria-hidden />
                  ) : (
                    <PartyPopper
                      className="h-4 w-4 text-ink-soft"
                      aria-hidden
                    />
                  )}
                </span>
                <span className="flex-1 font-semibold">{w.name}</span>
                <span className="font-bold text-leaf">
                  +{w.reveal_winnings}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <PillLink
        href="/leaderboard"
        className="mx-auto bg-ink px-6 py-3 text-cream shadow-lift"
      >
        Final leaderboard <Trophy className="h-4 w-4" aria-hidden />
      </PillLink>
    </main>
  );
}
