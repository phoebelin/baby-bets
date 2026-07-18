import type { Side } from "@/lib/types";

const PALETTES: Record<Side, string[]> = {
  boy: ["#9bcf8f", "#4c8a53", "#c7e8c0", "#e9f5e5", "#dfa93d"],
  girl: ["#ecd35e", "#a9862a", "#f5e6a8", "#faf3d6", "#dfa93d"],
};

// Deterministic index math — no Math.random, so hydration stays stable.
const PIECES = Array.from({ length: 90 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 6 + (i % 5) * 2,
  delay: (i % 20) * 0.12,
  duration: 3.2 + (i % 7) * 0.55,
  sway: i % 2 === 0 ? `${2 + (i % 4) * 2}vw` : `-${3 + (i % 4) * 2}vw`,
  spin: `${360 + (i % 5) * 180}deg`,
  round: i % 3 === 0,
}));

export function Confetti({ side }: { side: Side }) {
  const colors = PALETTES[side];
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? "50%" : "2px",
            backgroundColor: colors[i % colors.length],
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--sway" as string]: p.sway,
            ["--spin" as string]: p.spin,
          }}
        />
      ))}
    </div>
  );
}
