"use client";

import { Baby, Coins, Lock, PartyPopper, Wallet } from "lucide-react";
import { useState } from "react";
import { NotConfigured } from "@/components/not-configured";
import { OddsBar } from "@/components/odds-bar";
import { TopBar } from "@/components/top-bar";
import { Card, Pill, PillLink, SideDot } from "@/components/ui";
import { projectedReturn, type Pools } from "@/lib/odds";
import { usePlayer } from "@/lib/player-context";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { SIDE_META, type Player, type Side } from "@/lib/types";
import { useBets } from "@/lib/use-bets";

export default function MarketPage() {
  const { ready, player, gameState } = usePlayer();
  const { bets, pools, loaded } = useBets();

  if (!supabaseConfigured) {
    return (
      <main className="relative z-10">
        <TopBar title="The Market" />
        <NotConfigured />
      </main>
    );
  }

  const bettingOpen = Boolean(
    gameState && gameState.betting_open && !gameState.revealed
  );
  const myBets = player ? bets.filter((b) => b.player_id === player.id) : [];
  const myBoy = myBets
    .filter((b) => b.side === "boy")
    .reduce((s, b) => s + b.amount, 0);
  const myGirl = myBets
    .filter((b) => b.side === "girl")
    .reduce((s, b) => s + b.amount, 0);

  return (
    <main className="relative z-10 flex flex-col gap-4">
      <TopBar title="The Market" />

      <Card>
        <p className="mb-3 font-display text-lg font-semibold">
          Will it be a boy or a girl?
        </p>
        {loaded ? (
          <>
            <OddsBar pools={pools} />
            <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-ink-soft">
              {pools.total} <Coins className="h-3 w-3" aria-hidden /> in the
              pot · winners split the losing side
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-soft">Loading the board…</p>
        )}
      </Card>

      {ready && !player ? (
        <Card className="text-center">
          <p className="font-display font-semibold">Join first to bet!</p>
          <PillLink
            href="/"
            className="mt-3 bg-ink px-6 py-3 text-cream shadow-lift"
          >
            Join the game
          </PillLink>
        </Card>
      ) : !gameState ? null : bettingOpen ? (
        player && <BetForm player={player} pools={pools} />
      ) : (
        <Card className="text-center">
          <Lock
            className="mx-auto h-8 w-8 text-ink-soft"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="mt-2 font-display font-semibold">Betting is closed</p>
          {gameState.revealed ? (
            <PillLink
              href="/reveal"
              className="mt-3 bg-ink px-6 py-3 text-cream shadow-lift"
            >
              See the reveal <PartyPopper className="h-4 w-4" aria-hidden />
            </PillLink>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">
              Hold tight — the reveal is coming.
            </p>
          )}
        </Card>
      )}

      {(myBoy > 0 || myGirl > 0) && (
        <Card>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Your positions
          </p>
          <div className="flex gap-3">
            {myBoy > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-boy-soft px-4 py-2 text-sm font-semibold text-boy-deep">
                <SideDot side="boy" /> {myBoy} on Boy
              </span>
            )}
            {myGirl > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-girl-soft px-4 py-2 text-sm font-semibold text-girl-deep">
                <SideDot side="girl" /> {myGirl} on Girl
              </span>
            )}
          </div>
        </Card>
      )}

      {bets.length > 0 && (
        <Card>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Latest action
          </p>
          <ul className="flex flex-col gap-2">
            {bets.slice(0, 8).map((b) => (
              <li key={b.id} className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold">
                  {b.players?.name ?? "Someone"}
                </span>
                put {b.amount} on <SideDot side={b.side} />{" "}
                {SIDE_META[b.side].label}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}

function BetForm({ player, pools }: { player: Player; pools: Pools }) {
  const { applyPlayer } = usePlayer();
  const [side, setSide] = useState<Side | null>(null);
  const [amount, setAmount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ side: Side; amount: number } | null>(
    null
  );

  const max = player.coins;
  const clamped = Math.min(amount, Math.max(max, 1));

  const place = async () => {
    if (!side || busy) return;
    setBusy(true);
    setError(null);
    setPlaced(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("place_bet", {
        p_player_id: player.id,
        p_side: side,
        p_amount: clamped,
      });
      if (rpcError) throw new Error(rpcError.message);
      const row = (Array.isArray(data) ? data[0] : data) as Player;
      applyPlayer(row);
      setPlaced({ side, amount: clamped });
      setAmount(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bet failed — try again");
    } finally {
      setBusy(false);
    }
  };

  if (max === 0) {
    return (
      <Card className="text-center">
        <Wallet
          className="mx-auto h-8 w-8 text-ink-soft"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="mt-2 font-display font-semibold">
          Good grief — your purse is empty!
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Earn more coins in baby trivia, then come back.
        </p>
        <PillLink
          href="/trivia"
          className="mt-3 bg-ink px-6 py-3 text-cream shadow-lift"
        >
          Play trivia <Baby className="h-4 w-4" aria-hidden />
        </PillLink>
      </Card>
    );
  }

  return (
    <Card>
      <p className="mb-3 font-display text-lg font-semibold">Place a bet</p>
      <div className="grid grid-cols-2 gap-3">
        {(["boy", "girl"] as const).map((s) => {
          const selected = side === s;
          const price = s === "boy" ? pools.boyPrice : pools.girlPrice;
          return (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`rounded-2xl border-2 p-4 text-center transition-transform active:scale-95 ${
                selected
                  ? s === "boy"
                    ? "border-boy-deep bg-boy-soft"
                    : "border-girl-deep bg-girl-soft"
                  : "border-line bg-cream"
              }`}
            >
              <SideDot side={s} className="mx-auto h-3.5 w-3.5" />
              <span className="mt-1 block font-display text-lg font-semibold">
                {SIDE_META[s].label}
              </span>
              <span className="block text-xs text-ink-soft">{price}¢</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-5">
        <Pill
          aria-label="Bet less"
          onClick={() => setAmount((a) => Math.max(1, a - 1))}
          disabled={clamped <= 1}
          className="h-12 w-12 border border-line bg-cream text-xl"
        >
          −
        </Pill>
        <span className="flex min-w-16 items-center justify-center gap-1.5 text-center font-display text-3xl font-bold">
          {clamped} <Coins className="h-5 w-5" aria-hidden />
        </span>
        <Pill
          aria-label="Bet more"
          onClick={() => setAmount((a) => Math.min(max, a + 1))}
          disabled={clamped >= max}
          className="h-12 w-12 border border-line bg-cream text-xl"
        >
          +
        </Pill>
      </div>

      {side && (
        <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-ink-soft">
          If {SIDE_META[side].label} wins, this bet returns about{" "}
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            {projectedReturn(pools, side, clamped)}{" "}
            <Coins className="h-3 w-3" aria-hidden />
          </span>{" "}
          at current odds.
        </p>
      )}

      {error && <p className="mt-3 text-center text-sm text-oops">{error}</p>}
      {placed && !error && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-leaf pop-in">
          Bet placed: {placed.amount} on <SideDot side={placed.side} />{" "}
          {SIDE_META[placed.side].label}
        </p>
      )}

      <Pill
        onClick={place}
        disabled={!side || busy}
        className="mt-4 w-full bg-ink py-3.5 text-base text-cream shadow-lift"
      >
        {busy ? (
          "Placing…"
        ) : side ? (
          <>
            Bet {clamped} <Coins className="h-4 w-4" aria-hidden /> on{" "}
            {SIDE_META[side].label}
          </>
        ) : (
          "Pick a side"
        )}
      </Pill>
    </Card>
  );
}
