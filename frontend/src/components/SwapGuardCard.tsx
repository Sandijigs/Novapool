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
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <div className="h-3 w-20 rounded bg-card-border/60 animate-pulse" />
        <div className="mt-4 h-7 w-28 rounded bg-card-border/60 animate-pulse" />
        <div className="mt-3 h-3 w-32 rounded bg-card-border/60 animate-pulse" />
      </div>
    );
  }

  if (maxSwapPctBps === undefined) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <p className="text-sm font-medium uppercase tracking-wider text-muted">
          Swap Guard
        </p>
        <p className="mt-3 text-base text-muted/60">Select a pool</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-card-border bg-card p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nova-yellow/10">
          <svg
            className="h-5 w-5 text-nova-yellow"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-muted">
            Swap Guard
          </p>
          <div className="mt-1">
            <span className="text-3xl font-bold text-nova-yellow tabular-nums">
              {(maxSwapPctBps / 100).toFixed(1)}%
            </span>
            <span className="ml-1.5 text-sm text-muted">max swap size</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-4">
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-nova-cyan" />
          {largeTradeCooldown}s cooldown
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-nova-blue" />
          &gt;{((largeTradePctBps ?? 0) / 100).toFixed(1)}% = large
        </div>
      </div>
    </div>
  );
}
