"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigured } from "./supabase";
import { computePools } from "./odds";
import type { Bet } from "./types";

/** All bets (newest first, with bettor names) kept live via realtime. */
export function useBets() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    const fetchBets = async () => {
      const { data } = await supabase
        .from("bets")
        .select("*, players(name)")
        .order("created_at", { ascending: false });
      if (!cancelled && data) {
        setBets(data as Bet[]);
        setLoaded(true);
      }
    };
    fetchBets();
    const channel = supabase
      .channel("bets-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bets" },
        // Refetch instead of appending: the payload has no joined player name.
        fetchBets
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const pools = useMemo(() => computePools(bets), [bets]);
  return { bets, pools, loaded };
}
