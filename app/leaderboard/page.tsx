"use client";

import { useEffect, useState } from "react";
import { NotConfigured } from "@/components/not-configured";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui";
import { usePlayer } from "@/lib/player-context";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Bet, Player, TriviaAnswer } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

interface Row extends Player {
  boyStake: number;
  girlStake: number;
  triviaCorrect: number;
}

export default function LeaderboardPage() {
  const { player } = usePlayer();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;

    const fetchAll = async () => {
      const [{ data: players }, { data: bets }, { data: answers }] =
        await Promise.all([
          supabase
            .from("players")
            .select("*")
            .order("coins", { ascending: false })
            .order("created_at", { ascending: true }),
          supabase.from("bets").select("player_id, side, amount"),
          supabase.from("trivia_answers").select("player_id, is_correct"),
        ]);
      if (cancelled || !players) return;
      const built = (players as Player[]).map((p) => {
        const mine = ((bets ?? []) as Bet[]).filter(
          (b) => b.player_id === p.id
        );
        return {
          ...p,
          boyStake: mine
            .filter((b) => b.side === "boy")
            .reduce((s, b) => s + b.amount, 0),
          girlStake: mine
            .filter((b) => b.side === "girl")
            .reduce((s, b) => s + b.amount, 0),
          triviaCorrect: ((answers ?? []) as TriviaAnswer[]).filter(
            (a) => a.player_id === p.id && a.is_correct
          ).length,
        };
      });
      setRows(built);
    };

    fetchAll();
    const channel = supabase
      .channel("leaderboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        fetchAll
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bets" },
        fetchAll
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  if (!supabaseConfigured) {
    return (
      <main className="relative z-10">
        <TopBar title="Leaderboard" />
        <NotConfigured />
      </main>
    );
  }

  return (
    <main className="relative z-10 flex flex-col gap-4">
      <TopBar title="Leaderboard" />
      {rows === null ? (
        <div className="mt-10 text-center text-3xl soft-pulse">🏆</div>
      ) : rows.length === 0 ? (
        <Card className="text-center text-sm text-ink-soft">
          Nobody has joined yet — be the first!
        </Card>
      ) : (
        <Card className="p-3">
          <ul className="flex flex-col">
            {rows.map((row, i) => {
              const isMe = player?.id === row.id;
              return (
                <li
                  key={row.id}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                    isMe ? "bg-gold-soft" : ""
                  }`}
                >
                  <span className="w-8 text-center text-lg">
                    {MEDALS[i] ?? (
                      <span className="text-sm text-ink-soft">{i + 1}</span>
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">
                      {row.name}
                      {isMe && " (you)"}
                    </span>
                    <span className="block text-xs text-ink-soft">
                      {[
                        row.triviaCorrect > 0 &&
                          `${row.triviaCorrect} trivia ✓`,
                        row.boyStake > 0 && `${row.boyStake}🪙 on 💙`,
                        row.girlStake > 0 && `${row.girlStake}🪙 on 🩷`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "just getting started"}
                    </span>
                  </span>
                  <span className="font-display text-lg font-bold">
                    {row.coins} 🪙
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </main>
  );
}
