"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase, supabaseConfigured } from "./supabase";
import type { GameState, Player } from "./types";

const STORAGE_KEY = "bb_player_id";

interface PlayerContextValue {
  /** false until the initial localStorage + fetch pass finishes. */
  ready: boolean;
  player: Player | null;
  gameState: GameState | null;
  join: (name: string) => Promise<Player>;
  leave: () => void;
  /** Apply a fresh player row returned by an RPC without waiting for realtime. */
  applyPlayer: (p: Player) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }
    const savedId = localStorage.getItem(STORAGE_KEY);
    (async () => {
      const { data: gs } = await supabase
        .from("game_state")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (gs) setGameState(gs as GameState);
      if (savedId) {
        const { data } = await supabase
          .from("players")
          .select("*")
          .eq("id", savedId)
          .maybeSingle();
        if (data) setPlayer(data as Player);
        else localStorage.removeItem(STORAGE_KEY);
      }
      setReady(true);
    })();
  }, []);

  // Game state (betting/trivia toggles, the reveal) pushes to every phone live.
  useEffect(() => {
    if (!supabaseConfigured) return;
    const channel = supabase
      .channel("game-state")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_state" },
        (payload) => setGameState(payload.new as GameState)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Keep this player's coin balance live (trivia awards, payouts).
  useEffect(() => {
    if (!supabaseConfigured || !player?.id) return;
    const channel = supabase
      .channel(`player-${player.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `id=eq.${player.id}`,
        },
        (payload) => setPlayer(payload.new as Player)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [player?.id]);

  const join = useCallback(async (name: string) => {
    const { data, error } = await supabase.rpc("join_game", { p_name: name });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as Player;
    setPlayer(row);
    localStorage.setItem(STORAGE_KEY, row.id);
    return row;
  }, []);

  const leave = useCallback(() => {
    setPlayer(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const applyPlayer = useCallback((p: Player) => setPlayer(p), []);

  return (
    <PlayerContext.Provider
      value={{ ready, player, gameState, join, leave, applyPlayer }}
    >
      {children}
    </PlayerContext.Provider>
  );
}
