"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { usePoolMaturity, usePoolConfig, useIsConfigured } from "@/lib/useOnChainPool";
import { PHASE_NAMES, MaturityPhase } from "@/lib/types";
import { formatEther } from "viem";

const PHASE_COLORS: Record<number, string> = {
  0: "text-nova-yellow",
  1: "text-nova-cyan",
  2: "text-nova-blue",
  3: "text-nova-green",
};

export function PoolLookup() {
  const { isConnected } = useAccount();
  const [poolIdInput, setPoolIdInput] = useState("");
  const [activePoolId, setActivePoolId] = useState<`0x${string}` | undefined>();

  const maturity = usePoolMaturity(activePoolId);
  const config = usePoolConfig(activePoolId);
  const configured = useIsConfigured(activePoolId);

  if (!isConnected) return null;

  const handleLookup = () => {
    const trimmed = poolIdInput.trim();
    if (trimmed.startsWith("0x") && trimmed.length === 66) {
      setActivePoolId(trimmed as `0x${string}`);
    }
  };

  const hasData =
    activePoolId && maturity.phase !== undefined && !maturity.isLoading;

  return (
    <div className="col-span-full rounded-xl border border-card-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
        Pool Lookup (On-Chain)
      </h2>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter Pool ID (0x...)"
          value={poolIdInput}
          onChange={(e) => setPoolIdInput(e.target.value)}
          className="flex-1 rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted/50 focus:border-nova-purple focus:outline-none"
        />
        <button
          onClick={handleLookup}
          className="rounded-lg bg-nova-purple px-4 py-2 text-sm font-medium text-white hover:bg-nova-purple/80 transition-colors"
        >
          Lookup
        </button>
      </div>

      {maturity.isLoading && (
        <p className="mt-3 text-sm text-muted animate-pulse">
          Querying on-chain state...
        </p>
      )}

      {maturity.error && (
        <p className="mt-3 text-sm text-red-400">
          Pool not found or not initialized
        </p>
      )}

      {hasData && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted text-sm">Status</span>
            <span className="text-sm">
              {configured.isConfigured ? (
                <span className="text-nova-green">Configured</span>
              ) : (
                <span className="text-muted">Not configured</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted text-sm">Phase</span>
            <span
              className={`text-sm font-bold ${PHASE_COLORS[maturity.phase!] ?? "text-foreground"}`}
            >
              {PHASE_NAMES[maturity.phase as MaturityPhase] ?? "UNKNOWN"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted text-sm">Current Fee</span>
            <span className="text-sm font-mono">
              {maturity.currentFee !== undefined
                ? `${(maturity.currentFee / 10000).toFixed(2)}%`
                : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted text-sm">Cumulative Volume</span>
            <span className="text-sm font-mono">
              {maturity.cumulativeVolume !== undefined
                ? `${formatEther(maturity.cumulativeVolume)} ETH`
                : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted text-sm">Unique Traders</span>
            <span className="text-sm font-mono">
              {maturity.uniqueTraders ?? "—"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted text-sm">Pool Age</span>
            <span className="text-sm font-mono">
              {maturity.age !== undefined
                ? formatAge(Number(maturity.age))
                : "—"}
            </span>
          </div>

          {config.config && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-muted hover:text-foreground transition-colors">
                View Config
              </summary>
              <div className="mt-2 rounded-lg bg-background p-3 text-xs font-mono space-y-1">
                <div>
                  Base Fee: {(config.config.baseFee / 10000).toFixed(2)}% |
                  Mature Fee: {(config.config.matureFee / 10000).toFixed(2)}%
                </div>
                <div>
                  Max Swap: {(config.config.maxSwapPctBps / 100).toFixed(1)}% |
                  Cooldown: {config.config.largeTradeCooldown}s
                </div>
                <div>
                  Vol thresholds:{" "}
                  {formatEther(config.config.volumeForEmerging)} /{" "}
                  {formatEther(config.config.volumeForGrowing)} /{" "}
                  {formatEther(config.config.volumeForEstablished)} ETH
                </div>
                <div>
                  Traders: {config.config.minTradersEmerging} /{" "}
                  {config.config.minTradersGrowing} /{" "}
                  {config.config.minTradersEstablished}
                </div>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function formatAge(seconds: number): string {
  if (seconds === 0) return "0s";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${seconds % 60}s`;
}
