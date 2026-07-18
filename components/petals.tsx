const COLORS = ["#f5c1d1", "#fbdce6", "#c9ddf2", "#f0a3ba", "#e8f1fa"];

// Deterministic configs (index math, no Math.random) so SSR and client agree.
const PETALS = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 61 + 7) % 100,
  size: 9 + (i % 4) * 4,
  delay: -((i * 1.9) % 14),
  duration: 10 + (i % 5) * 2.2,
  sway: i % 2 === 0 ? `${4 + (i % 3) * 3}vw` : `-${5 + (i % 3) * 3}vw`,
  spin: `${180 + (i % 4) * 90}deg`,
  color: COLORS[i % COLORS.length],
}));

export function Petals() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.15,
            backgroundColor: p.color,
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
