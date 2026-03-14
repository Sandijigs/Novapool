"use client";

interface FeeCardProps {
  currentFee: number | undefined;
  isLoading?: boolean;
}

export function FeeCard({ currentFee, isLoading }: FeeCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <div className="h-3 w-20 rounded bg-card-border/60 animate-pulse" />
        <div className="mt-4 h-10 w-28 rounded bg-card-border/60 animate-pulse" />
        <div className="mt-3 h-3 w-24 rounded bg-card-border/60 animate-pulse" />
      </div>
    );
  }

  if (currentFee === undefined) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <p className="text-sm font-medium uppercase tracking-wider text-muted">
          Current Fee
        </p>
        <p className="mt-3 text-base text-muted/60">Select a pool</p>
      </div>
    );
  }

  const feePct = (currentFee / 10000).toFixed(2);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-card-border bg-card p-6">
      <p className="text-sm font-medium uppercase tracking-wider text-muted">
        Current Fee
      </p>
      <div className="mt-2">
        <span className="bg-gradient-to-r from-nova-purple via-nova-blue to-nova-cyan bg-clip-text text-5xl font-black tabular-nums text-transparent">
          {feePct}%
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">
        {currentFee.toLocaleString()} basis points
      </p>

      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-gradient-to-br from-nova-purple/8 to-nova-cyan/8 blur-2xl" />
    </div>
  );
}
