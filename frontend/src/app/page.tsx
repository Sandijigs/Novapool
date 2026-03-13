"use client";

import { EventLog } from "@/components/EventLog";
import { FeeCard } from "@/components/FeeCard";
import { FeeTiersCard } from "@/components/FeeTiersCard";
import { MetricsCard } from "@/components/MetricsCard";
import { PhaseCard } from "@/components/PhaseCard";
import { SimulateCard } from "@/components/SimulateCard";
import { SwapGuardCard } from "@/components/SwapGuardCard";
import { OnChainStatus } from "@/components/OnChainStatus";
import { PoolLookup } from "@/components/PoolLookup";
import { useNovaPool } from "@/lib/useNovaPool";
import { WalletButton } from "@/components/WalletButton";
import { useAccount } from "wagmi";

export default function Dashboard() {
  const pool = useNovaPool();
  const { isConnected, address } = useAccount();

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

      {/* On-chain contract info + pool lookup (visible when wallet connected) */}
      <div className="grid grid-cols-1 gap-5 mb-5">
        <OnChainStatus />
        <PoolLookup />
      </div>

      {/* Simulation dashboard */}
      <h2 className="mb-4 text-lg font-semibold text-muted">
        Simulation Dashboard
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <PhaseCard phase={pool.state.phase} progress={pool.phaseProgress} />
        <FeeCard phase={pool.state.phase} />
        <SwapGuardCard config={pool.config} />

        <MetricsCard state={pool.state} />
        <FeeTiersCard activePhase={pool.state.phase} />

        <SimulateCard
          onSwap={pool.simulateSwap}
          onAge={pool.simulateAge}
          onAddTrader={pool.addTrader}
          onReset={pool.reset}
        />
        <EventLog logs={pool.logs} />
      </div>
    </main>
  );
}
