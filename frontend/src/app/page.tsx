"use client";

import { useState } from "react";
import { FeeCard } from "@/components/FeeCard";
import { FeeTiersCard } from "@/components/FeeTiersCard";
import { MetricsCard } from "@/components/MetricsCard";
import { PhaseCard } from "@/components/PhaseCard";
import { SwapGuardCard } from "@/components/SwapGuardCard";
import { OnChainStatus } from "@/components/OnChainStatus";
import { ConfigurePoolForm } from "@/components/ConfigurePoolForm";
import { OnChainEventLog } from "@/components/OnChainEventLog";
import { PoolRegistry } from "@/components/PoolRegistry";
import { PoolSelector } from "@/components/PoolSelector";
import { WalletButton } from "@/components/WalletButton";
import { useAccount } from "wagmi";
import { usePoolMaturity, usePoolConfig } from "@/lib/useOnChainPool";
import { MaturityPhase } from "@/lib/types";
import { formatEther } from "viem";

export default function Dashboard() {
  const { isConnected, address } = useAccount();
  const [selectedPoolId, setSelectedPoolId] = useState<`0x${string}` | undefined>();

  const maturity = usePoolMaturity(selectedPoolId);
  const poolConfig = usePoolConfig(selectedPoolId);

  // Calculate progress toward next phase from on-chain data
  const phaseProgress = (() => {
    if (maturity.phase === undefined || !poolConfig.config) return 0;
    if (maturity.phase === MaturityPhase.ESTABLISHED) return 100;

    const cfg = poolConfig.config;
    const vol = maturity.cumulativeVolume ?? BigInt(0);
    const age = maturity.age ?? BigInt(0);
    const traders = maturity.uniqueTraders ?? 0;

    const volTargets = [cfg.volumeForEmerging, cfg.volumeForGrowing, cfg.volumeForEstablished];
    const ageTargets = [BigInt(cfg.minAgeEmerging), BigInt(cfg.minAgeGrowing), BigInt(cfg.minAgeEstablished)];
    const traderTargets = [cfg.minTradersEmerging, cfg.minTradersGrowing, cfg.minTradersEstablished];

    const p = maturity.phase;
    const volTarget = volTargets[p];
    const ageTarget = ageTargets[p];
    const traderTarget = traderTargets[p];

    if (!volTarget || !ageTarget || !traderTarget) return 0;

    const volPct = volTarget > BigInt(0)
      ? Math.min(Number((vol * BigInt(100)) / volTarget), 100)
      : 100;
    const agePct = ageTarget > BigInt(0)
      ? Math.min(Number((age * BigInt(100)) / ageTarget), 100)
      : 100;
    const traderPct = traderTarget > 0
      ? Math.min(Math.round((traders / traderTarget) * 100), 100)
      : 100;

    return Math.round((volPct + agePct + traderPct) / 3);
  })();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              <span className="bg-linear-to-r from-nova-purple to-nova-cyan bg-clip-text text-transparent">
                NovaPool
              </span>
            </h1>
            <p className="mt-1 text-muted">
              Graduated liquidity for long-tail &amp; emerging tokens
            </p>
          </div>
          <WalletButton />
        </div>
        {isConnected && (
          <div className="mt-4 rounded-lg border border-card-border bg-card px-4 py-2 text-sm text-muted">
            Connected to Unichain Sepolia &middot;{" "}
            <span className="font-mono text-nova-green">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
        )}
      </header>

      {!isConnected ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-muted mb-2">
            Connect your wallet to get started
          </h2>
          <p className="text-muted">
            Connect to Unichain Sepolia to view pools, configure new ones, and
            monitor live on-chain activity.
          </p>
        </div>
      ) : (
        <>
          {/* Contract info */}
          <div className="grid grid-cols-1 gap-5 mb-8">
            <OnChainStatus />
          </div>

          {/* Configure pool (owner only) */}
          <div className="grid grid-cols-1 gap-5 mb-8">
            <ConfigurePoolForm />
          </div>

          {/* Pool selection */}
          <div className="grid grid-cols-1 gap-5 mb-8">
            <PoolSelector
              selectedPoolId={selectedPoolId}
              onSelectPool={setSelectedPoolId}
            />
            <PoolRegistry
              selectedPoolId={selectedPoolId}
              onSelectPool={setSelectedPoolId}
            />
          </div>

          {/* Live pool dashboard (only shown when a pool is selected) */}
          {selectedPoolId && (
            <>
              <h2 className="mb-4 text-lg font-semibold text-muted">
                Pool Dashboard
                <span className="ml-2 font-mono text-xs text-nova-cyan">
                  {selectedPoolId.slice(0, 10)}...{selectedPoolId.slice(-6)}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
                <PhaseCard
                  phase={maturity.phase}
                  progress={phaseProgress}
                  isLoading={maturity.isLoading}
                />
                <FeeCard
                  currentFee={maturity.currentFee}
                  isLoading={maturity.isLoading}
                />
                <SwapGuardCard
                  maxSwapPctBps={poolConfig.config?.maxSwapPctBps}
                  largeTradeCooldown={poolConfig.config?.largeTradeCooldown}
                  largeTradePctBps={poolConfig.config?.largeTradePctBps}
                  isLoading={poolConfig.isLoading}
                />
                <MetricsCard
                  cumulativeVolume={maturity.cumulativeVolume}
                  uniqueTraders={maturity.uniqueTraders}
                  age={maturity.age}
                  isLoading={maturity.isLoading}
                />
                <FeeTiersCard activePhase={maturity.phase ?? MaturityPhase.NASCENT} />
              </div>
            </>
          )}

          {/* Live events */}
          <div className="grid grid-cols-1 gap-5">
            <OnChainEventLog />
          </div>
        </>
      )}
    </main>
  );
}
