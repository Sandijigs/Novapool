"use client";

import { useAccount } from "wagmi";
import { usePoolRegistry } from "@/lib/usePoolRegistry";

interface PoolRegistryProps {
  selectedPoolId: `0x${string}` | undefined;
  onSelectPool: (poolId: `0x${string}`) => void;
}

export function PoolRegistry({ selectedPoolId, onSelectPool }: PoolRegistryProps) {
  const { isConnected } = useAccount();
  const { pools, isLoading, error, refetch } = usePoolRegistry();

  if (!isConnected) return null;

  return (
    <div className="col-span-full rounded-xl border border-card-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Pool Registry
        </h2>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="rounded-lg border border-card-border px-3 py-1 text-xs text-muted hover:text-foreground hover:border-muted transition-colors disabled:opacity-50"
        >
          {isLoading ? "Scanning..." : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-2">{error.slice(0, 100)}</p>
      )}

      {!isLoading && pools.length === 0 && (
        <p className="text-sm text-muted">
          No pools configured yet. Use the Configure Pool form above to create
          one.
        </p>
      )}

      {pools.length > 0 && (
        <div className="space-y-2">
          {pools.map((pool, i) => {
            const isSelected = selectedPoolId === pool.poolId;
            return (
              <button
                key={i}
                onClick={() => onSelectPool(pool.poolId)}
                className={`w-full rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? "border-nova-purple bg-nova-purple/10"
                    : "border-card-border bg-background hover:border-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-foreground truncate">
                      {pool.poolId}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
                      <span>Base: {(pool.baseFee / 10000).toFixed(2)}%</span>
                      <span>Mature: {(pool.matureFee / 10000).toFixed(2)}%</span>
                      {isSelected && (
                        <span className="text-nova-purple font-medium">Selected</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`https://sepolia.uniscan.xyz/tx/${pool.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 rounded bg-card-border px-2 py-0.5 text-xs text-muted hover:text-foreground transition-colors"
                  >
                    tx
                  </a>
                </div>
              </button>
            );
          })}
          <p className="text-xs text-muted pt-1">
            {pools.length} pool{pools.length !== 1 ? "s" : ""} found — click to select
          </p>
        </div>
      )}
    </div>
  );
}
