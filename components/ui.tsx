import { Coins } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Side } from "@/lib/types";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const PILL_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-transform duration-100 active:scale-95 disabled:opacity-40 disabled:active:scale-100";

export function Pill({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cx(PILL_BASE, className)} {...props} />;
}

export function PillLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(PILL_BASE, className)}>
      {children}
    </Link>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-line bg-card p-5 shadow-soft",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CoinBadge({
  coins,
  className,
}: {
  coins: number;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold-soft px-3 py-1 text-sm font-bold text-ink",
        className
      )}
    >
      <Coins className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      {coins}
    </span>
  );
}

/** A small colored swatch marking which side (boy/girl) something belongs to. */
export function SideDot({
  side,
  className,
}: {
  side: Side;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-block h-2.5 w-2.5 rounded-full",
        side === "boy" ? "bg-boy" : "bg-girl",
        className
      )}
    />
  );
}
