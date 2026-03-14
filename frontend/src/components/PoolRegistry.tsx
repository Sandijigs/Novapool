"use client";

import { useAccount } from "wagmi";
import { usePoolRegistry } from "@/lib/usePoolRegistry";

interface PoolRegistryProps {
  selectedPoolId: `0x${string}` | undefined;
  onSelectPool: (poolId: `0x${string}`) => void;
}

export function PoolRegistry({
  selectedPoolId,
  onSelectPool,
}: PoolRegistryProps) {
  const { isConnected } = useAccount();
  const { pools, isLoading, error, refetch } = usePoolRegistry();

  if (!isConnected) return null;

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium uppercase tracking-wider text-muted">
          Pool Registry
        </p>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="rounded-lg border border-card-border px-3 py-1 text-xs text-muted hover:text-foreground hover:border-muted transition-colors disabled:opacity-50"
        >
          {isLoading ? "Scanning..." : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400/80 mb-2 truncate">
          {error.slice(0, 80)}
        </p>
      )}

      {!isLoading && pools.length === 0 && (
        <p className="text-base text-muted/60 py-4 text-center">
          No pools configured yet.
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
                className={`w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-nova-purple/50 bg-nova-purple/10 shadow-[0_0_20px_rgba(139,92,246,0.08)]"
                    : "border-card-border bg-background/50 hover:border-muted hover:bg-background"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-foreground truncate">
                      {pool.poolId}
                    </p>
                    <div className="mt-1 flex gap-3 text-sm text-muted">
                      <span>
                        Base: {(pool.baseFee / 10000).toFixed(2)}%
                      </span>
                      <span>
                        Mature: {(pool.matureFee / 10000).toFixed(2)}%
                      </span>
                      {isSelected && (
                        <span className="text-nova-purple font-medium">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`https://sepolia.uniscan.xyz/tx/${pool.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 rounded-lg bg-card-border/50 px-2 py-0.5 text-xs text-muted hover:text-foreground transition-colors"
                  >
                    tx
                  </a>
                </div>
              </button>
            );
          })}
          <p className="text-xs text-muted text-center pt-1">
            {pools.length} pool{pools.length !== 1 ? "s" : ""} found
          </p>
        </div>
      )}
    </div>
  );
}
