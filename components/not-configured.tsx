import { Unplug } from "lucide-react";
import { Card } from "./ui";

export function NotConfigured() {
  return (
    <Card className="mt-10 text-center">
      <Unplug
        className="mx-auto h-9 w-9 text-ink-soft"
        strokeWidth={1.5}
        aria-hidden
      />
      <h2 className="mt-2 font-display text-lg font-semibold">
        Backend not connected yet
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
        <code className="font-mono">.env.local</code>, then restart. See the
        README for the 5-minute Supabase setup.
      </p>
    </Card>
  );
}
