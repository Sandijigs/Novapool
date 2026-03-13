"use client";

import { formatEther } from "viem";

interface MetricsCardProps {
  cumulativeVolume: bigint | undefined;
  uniqueTraders: number | undefined;
  age: bigint | undefined;
  isLoading?: boolean;
}

function formatAge(seconds: number): string {
  if (seconds === 0) return "0s";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${seconds}s`;
}

export function MetricsCard({ cumulativeVolume, uniqueTraders, age, isLoading }: MetricsCardProps) {
  if (isLoading) {
    return (
      <div className="col-span-full rounded-2xl border border-card-border bg-card p-6 animate-pulse">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
          Maturity Metrics
        </h2>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="h-8 w-20 rounded bg-card-border" />
              <div className="mt-2 h-3 w-28 rounded bg-card-border" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasData = cumulativeVolume !== undefined;

  return (
    <div className="col-span-full rounded-2xl border border-card-border bg-card p-6">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
        Maturity Metrics
      </h2>
      {!hasData ? (
        <p className="text-sm text-muted">Select a pool to view live metrics</p>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold font-mono">
              {formatEther(cumulativeVolume)}
            </div>
            <div className="mt-1 text-xs text-muted">Cumulative Volume (ETH)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono">
              {uniqueTraders ?? 0}
            </div>
            <div className="mt-1 text-xs text-muted">Unique Traders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono">
              {age !== undefined ? formatAge(Number(age)) : "—"}
            </div>
            <div className="mt-1 text-xs text-muted">Pool Age</div>
          </div>
        </div>
      )}
    </div>
  );
}
