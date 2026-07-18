import { Coins } from "lucide-react";
import type { Pools } from "@/lib/odds";
import { SideDot } from "./ui";

export function OddsBar({
  pools,
  compact = false,
}: {
  pools: Pools;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-display text-lg font-semibold">
        <span className="flex items-center gap-1.5 text-boy-deep">
          <SideDot side="boy" /> Boy · {pools.boyPrice}¢
        </span>
        <span className="flex items-center gap-1.5 text-girl-deep">
          {pools.girlPrice}¢ · Girl <SideDot side="girl" />
        </span>
      </div>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-line">
        <div
          className="bg-boy transition-all duration-700"
          style={{ width: `${pools.boyShare * 100}%` }}
        />
        <div
          className="bg-girl transition-all duration-700"
          style={{ width: `${pools.girlShare * 100}%` }}
        />
      </div>
      {!compact && (
        <div className="mt-2 flex justify-between text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1">
            {pools.boy} <Coins className="h-3 w-3" aria-hidden /> on Boy
          </span>
          <span className="inline-flex items-center gap-1">
            {pools.girl} <Coins className="h-3 w-3" aria-hidden /> on Girl
          </span>
        </div>
      )}
    </div>
  );
}
