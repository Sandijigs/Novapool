import { PoolConfig } from "@/lib/types";

interface SwapGuardCardProps {
  config: PoolConfig;
}

export function SwapGuardCard({ config }: SwapGuardCardProps) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        Swap Guard
      </h2>
      <div className="text-2xl font-bold">
        {config.maxSwapPctBps / 100}%
        <span className="ml-1 text-sm font-normal text-muted">max swap</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {config.largeTradeCooldown}s cooldown on large trades (&gt;{config.largeTradePctBps / 100}%)
      </p>
    </div>
  );
}
