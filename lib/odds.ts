import type { Bet, Side } from "./types";

export interface Pools {
  boy: number;
  girl: number;
  total: number;
  /** Share of the pool on each side, 0..1. 0.5/0.5 when the pool is empty. */
  boyShare: number;
  girlShare: number;
  /** Kalshi-style price in cents: the chance the crowd is implying. */
  boyPrice: number;
  girlPrice: number;
}

export function computePools(bets: Pick<Bet, "side" | "amount">[]): Pools {
  let boy = 0;
  let girl = 0;
  for (const b of bets) {
    if (b.side === "boy") boy += b.amount;
    else girl += b.amount;
  }
  const total = boy + girl;
  const boyShare = total === 0 ? 0.5 : boy / total;
  const girlShare = 1 - boyShare;
  return {
    boy,
    girl,
    total,
    boyShare,
    girlShare,
    boyPrice: Math.round(boyShare * 100),
    girlPrice: Math.round(girlShare * 100),
  };
}

/** Coins a player would take home (stake + share of losing pool) if `side` wins,
 *  for a hypothetical additional stake, given current pools. */
export function projectedReturn(pools: Pools, side: Side, stake: number): number {
  const winPool = (side === "boy" ? pools.boy : pools.girl) + stake;
  const losePool = side === "boy" ? pools.girl : pools.boy;
  if (stake === 0 || winPool === 0) return 0;
  return stake + Math.floor((stake * losePool) / winPool);
}
