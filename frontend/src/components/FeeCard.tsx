"use client";

interface FeeCardProps {
  currentFee: number | undefined;
  isLoading?: boolean;
}

export function FeeCard({ currentFee, isLoading }: FeeCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6 animate-pulse">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
          Current Fee
        </h2>
        <div className="h-10 w-24 rounded bg-card-border" />
      </div>
    );
  }

  if (currentFee === undefined) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
          Current Fee
        </h2>
        <p className="text-sm text-muted">Select a pool to view</p>
      </div>
    );
  }

  const pct = (currentFee / 10000).toFixed(2);

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        Current Fee
      </h2>
      <div className="text-4xl font-bold">{pct}%</div>
      <p className="mt-1 text-sm text-muted">
        {currentFee} / 1,000,000 bps
      </p>
    </div>
  );
}
