import type { Pools } from "@/lib/odds";

export function OddsBar({
  pools,
  compact = false,
}: {
  pools: Pools;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between font-display text-lg font-semibold">
        <span className="text-sky-deep">💙 Boy · {pools.boyPrice}¢</span>
        <span className="text-blush-deep">{pools.girlPrice}¢ · Girl 🩷</span>
      </div>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-line">
        <div
          className="bg-sky transition-all duration-700"
          style={{ width: `${pools.boyShare * 100}%` }}
        />
        <div
          className="bg-blush transition-all duration-700"
          style={{ width: `${pools.girlShare * 100}%` }}
        />
      </div>
      {!compact && (
        <div className="mt-2 flex justify-between text-xs text-ink-soft">
          <span>{pools.boy} 🪙 on Boy</span>
          <span>{pools.girl} 🪙 on Girl</span>
        </div>
      )}
    </div>
  );
}
