function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** A little flutter of motion — the kind a certain yellow bird leaves behind. */
export function Squiggle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 14"
      className={cx("h-3.5 w-10", className)}
      aria-hidden
    >
      <path
        d="M2 8 Q 9 2, 16 8 T 30 8 T 44 8 T 58 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
