"use client";

import { useCallback, useEffect, useState } from "react";
import { NotConfigured } from "@/components/not-configured";
import { OddsBar } from "@/components/odds-bar";
import { TopBar } from "@/components/top-bar";
import { Card, Pill } from "@/components/ui";
import { computePools } from "@/lib/odds";
import { usePlayer } from "@/lib/player-context";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import {
  SIDE_META,
  type Bet,
  type Player,
  type Side,
  type TriviaAnswer,
} from "@/lib/types";

const PASS_KEY = "bb_admin_pass";

export default function AdminPage() {
  const [passcode, setPasscode] = useState<string | null>(null);

  if (!supabaseConfigured) {
    return (
      <main className="relative z-10">
        <TopBar title="Host tools" />
        <NotConfigured />
      </main>
    );
  }

  return (
    <main className="relative z-10 flex flex-col gap-4">
      <TopBar title="Host tools" />
      {passcode === null ? (
        <PasscodeGate onUnlock={setPasscode} />
      ) : (
        <Dashboard passcode={passcode} onLock={() => setPasscode(null)} />
      )}
    </main>
  );
}

function PasscodeGate({ onUnlock }: { onUnlock: (pass: string) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(
    async (pass: string, silent = false) => {
      setBusy(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc("verify_admin", {
        p_passcode: pass,
      });
      setBusy(false);
      if (rpcError || data !== true) {
        sessionStorage.removeItem(PASS_KEY);
        if (!silent) setError("That's not the passcode 🤔");
        return;
      }
      sessionStorage.setItem(PASS_KEY, pass);
      onUnlock(pass);
    },
    [onUnlock]
  );

  useEffect(() => {
    const saved = sessionStorage.getItem(PASS_KEY);
    if (saved) verify(saved, true);
  }, [verify]);

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value) verify(value);
        }}
        className="flex flex-col gap-3"
      >
        <p className="font-display text-lg font-semibold">Hosts only 🤫</p>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Admin passcode"
          className="rounded-2xl border border-line bg-cream px-4 py-3.5 text-base outline-none focus:border-blush"
        />
        {error && <p className="text-sm text-blush-deep">{error}</p>}
        <Pill
          type="submit"
          disabled={!value || busy}
          className="bg-ink px-6 py-3 text-cream shadow-lift"
        >
          {busy ? "Checking…" : "Unlock"}
        </Pill>
      </form>
    </Card>
  );
}

interface Overview {
  players: Player[];
  bets: Bet[];
  answers: TriviaAnswer[];
  questionCount: number;
}

function Dashboard({
  passcode,
  onLock,
}: {
  passcode: string;
  onLock: () => void;
}) {
  const { gameState } = usePlayer();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealSide, setRevealSide] = useState<Side | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchOverview = useCallback(async () => {
    const [{ data: players }, { data: bets }, { data: answers }, { data: qs }] =
      await Promise.all([
        supabase
          .from("players")
          .select("*")
          .order("coins", { ascending: false }),
        supabase.from("bets").select("*"),
        supabase.from("trivia_answers").select("*"),
        supabase.from("trivia_public").select("id"),
      ]);
    setOverview({
      players: (players ?? []) as Player[],
      bets: (bets ?? []) as Bet[],
      answers: (answers ?? []) as TriviaAnswer[],
      questionCount: qs?.length ?? 0,
    });
  }, []);

  useEffect(() => {
    fetchOverview();
    const channel = supabase
      .channel("admin-overview")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        fetchOverview
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bets" },
        fetchOverview
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trivia_answers" },
        fetchOverview
      )
      .subscribe();
    const interval = setInterval(fetchOverview, 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchOverview]);

  const toggle = async (field: "betting_open" | "trivia_open") => {
    if (!gameState || busyAction) return;
    setBusyAction(field);
    setError(null);
    const { error: rpcError } = await supabase.rpc("admin_update_state", {
      p_passcode: passcode,
      p_betting_open:
        field === "betting_open" ? !gameState.betting_open : undefined,
      p_trivia_open:
        field === "trivia_open" ? !gameState.trivia_open : undefined,
    });
    if (rpcError) setError(rpcError.message);
    setBusyAction(null);
  };

  const reveal = async () => {
    if (!revealSide || busyAction) return;
    setBusyAction("reveal");
    setError(null);
    const { error: rpcError } = await supabase.rpc("settle_reveal", {
      p_passcode: passcode,
      p_gender: revealSide,
    });
    if (rpcError) setError(rpcError.message);
    setBusyAction(null);
    setConfirming(false);
    fetchOverview();
  };

  const pools = computePools(overview?.bets ?? []);

  return (
    <>
      <Card>
        <p className="mb-3 font-display text-lg font-semibold">Game controls</p>
        <div className="flex flex-col gap-3">
          <ToggleRow
            label="Betting"
            on={gameState?.betting_open ?? false}
            disabled={gameState?.revealed || busyAction !== null}
            onToggle={() => toggle("betting_open")}
          />
          <ToggleRow
            label="Trivia"
            on={gameState?.trivia_open ?? false}
            disabled={gameState?.revealed || busyAction !== null}
            onToggle={() => toggle("trivia_open")}
          />
        </div>
        {error && <p className="mt-3 text-sm text-blush-deep">{error}</p>}
      </Card>

      <Card>
        <p className="mb-3 font-display text-lg font-semibold">The pot</p>
        <OddsBar pools={pools} />
        <p className="mt-2 text-center text-xs text-ink-soft">
          {pools.total} 🪙 total from {overview?.players.length ?? 0} players
        </p>
      </Card>

      <Card
        className={gameState?.revealed ? "" : "border-gold/50 bg-gold-soft"}
      >
        <p className="mb-2 font-display text-lg font-semibold">
          {gameState?.revealed ? "Revealed 🎉" : "The Big Reveal"}
        </p>
        {gameState?.revealed && gameState.actual_gender ? (
          <p className="text-sm text-ink-soft">
            It&apos;s {SIDE_META[gameState.actual_gender].noun}{" "}
            {SIDE_META[gameState.actual_gender].emoji} — payouts are settled.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-ink-soft">
              This closes betting &amp; trivia, announces the gender on
              everyone&apos;s phone, and pays out the pool. No undo!
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["boy", "girl"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setRevealSide(s);
                    setConfirming(false);
                  }}
                  className={`rounded-2xl border-2 px-4 py-3 font-semibold transition-transform active:scale-95 ${
                    revealSide === s
                      ? s === "boy"
                        ? "border-sky-deep bg-sky-soft"
                        : "border-blush-deep bg-blush-soft"
                      : "border-line bg-card"
                  }`}
                >
                  {SIDE_META[s].emoji} {SIDE_META[s].label}
                </button>
              ))}
            </div>
            {!confirming ? (
              <Pill
                onClick={() => setConfirming(true)}
                disabled={!revealSide}
                className="mt-3 w-full bg-ink py-3 text-cream shadow-lift"
              >
                {revealSide
                  ? `Reveal: it's ${SIDE_META[revealSide].noun}!`
                  : "Pick the answer first"}
              </Pill>
            ) : (
              <div className="mt-3 flex gap-2">
                <Pill
                  onClick={() => setConfirming(false)}
                  className="flex-1 border border-line bg-card py-3"
                >
                  Cancel
                </Pill>
                <Pill
                  onClick={reveal}
                  disabled={busyAction === "reveal"}
                  className="flex-1 bg-blush-deep py-3 text-white shadow-lift"
                >
                  {busyAction === "reveal" ? "Revealing…" : "Yes — reveal! 🎉"}
                </Pill>
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="p-3">
        <p className="mb-2 px-2 font-display text-lg font-semibold">
          Everyone at a glance
        </p>
        {overview === null ? (
          <p className="px-2 pb-2 text-sm text-ink-soft">Loading…</p>
        ) : overview.players.length === 0 ? (
          <p className="px-2 pb-2 text-sm text-ink-soft">No players yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-2 py-2 font-medium">Player</th>
                  <th className="px-2 py-2 text-right font-medium">🪙</th>
                  <th className="px-2 py-2 text-right font-medium">💙</th>
                  <th className="px-2 py-2 text-right font-medium">🩷</th>
                  <th className="px-2 py-2 text-right font-medium">Trivia</th>
                </tr>
              </thead>
              <tbody>
                {overview.players.map((p) => {
                  const mine = overview.bets.filter(
                    (b) => b.player_id === p.id
                  );
                  const boy = mine
                    .filter((b) => b.side === "boy")
                    .reduce((s, b) => s + b.amount, 0);
                  const girl = mine
                    .filter((b) => b.side === "girl")
                    .reduce((s, b) => s + b.amount, 0);
                  const correct = overview.answers.filter(
                    (a) => a.player_id === p.id && a.is_correct
                  ).length;
                  const attempted = overview.answers.filter(
                    (a) => a.player_id === p.id
                  ).length;
                  return (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-2 py-2.5 font-semibold">{p.name}</td>
                      <td className="px-2 py-2.5 text-right font-bold">
                        {p.coins}
                      </td>
                      <td className="px-2 py-2.5 text-right">{boy || "–"}</td>
                      <td className="px-2 py-2.5 text-right">{girl || "–"}</td>
                      <td className="px-2 py-2.5 text-right text-xs">
                        {attempted
                          ? `${correct}/${attempted} of ${overview.questionCount}`
                          : "–"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <button
        onClick={() => {
          sessionStorage.removeItem(PASS_KEY);
          onLock();
        }}
        className="mx-auto text-xs text-ink-soft underline underline-offset-2"
      >
        Lock host tools
      </button>
    </>
  );
}

function ToggleRow({
  label,
  on,
  disabled,
  onToggle,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold">{label}</span>
      <Pill
        onClick={onToggle}
        disabled={disabled}
        className={`px-5 py-2 text-sm ${
          on ? "bg-leaf text-white" : "border border-line bg-cream text-ink-soft"
        }`}
      >
        {on ? "Open — tap to close" : "Closed — tap to open"}
      </Pill>
    </div>
  );
}
