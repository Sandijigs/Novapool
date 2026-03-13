"use client";

interface SwapGuardCardProps {
  maxSwapPctBps: number | undefined;
  largeTradeCooldown: number | undefined;
  largeTradePctBps: number | undefined;
  isLoading?: boolean;
}

export function SwapGuardCard({
  maxSwapPctBps,
  largeTradeCooldown,
  largeTradePctBps,
  isLoading,
}: SwapGuardCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6 animate-pulse">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
          Swap Guard
        </h2>
        <div className="h-8 w-24 rounded bg-card-border" />
      </div>
    );
  }

  if (maxSwapPctBps === undefined) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
          Swap Guard
        </h2>
        <p className="text-sm text-muted">Select a pool to view</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        Swap Guard
      </h2>
      <div className="text-2xl font-bold">
        {(maxSwapPctBps / 100).toFixed(1)}%
        <span className="ml-1 text-sm font-normal text-muted">max swap</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {largeTradeCooldown}s cooldown on large trades (&gt;{((largeTradePctBps ?? 0) / 100).toFixed(1)}%)
      </p>
    </div>
  );
}
