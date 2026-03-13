import { PoolState } from "@/lib/types";

interface MetricsCardProps {
  state: PoolState;
}

function formatAge(seconds: number): string {
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m`;
  return `${seconds}s`;
}

export function MetricsCard({ state }: MetricsCardProps) {
  return (
    <div className="col-span-full rounded-2xl border border-card-border bg-card p-6">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
        Maturity Metrics
      </h2>
      <div className="grid grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold">{state.volume.toFixed(4)}</div>
          <div className="mt-1 text-xs text-muted">Cumulative Volume (ETH)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{state.traders}</div>
          <div className="mt-1 text-xs text-muted">Unique Traders</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{formatAge(state.age)}</div>
          <div className="mt-1 text-xs text-muted">Pool Age</div>
        </div>
      </div>
    </div>
  );
}
