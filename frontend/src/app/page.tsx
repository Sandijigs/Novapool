"use client";

import { EventLog } from "@/components/EventLog";
import { FeeCard } from "@/components/FeeCard";
import { FeeTiersCard } from "@/components/FeeTiersCard";
import { MetricsCard } from "@/components/MetricsCard";
import { PhaseCard } from "@/components/PhaseCard";
import { SimulateCard } from "@/components/SimulateCard";
import { SwapGuardCard } from "@/components/SwapGuardCard";
import { useNovaPool } from "@/lib/useNovaPool";

export default function Dashboard() {
  const pool = useNovaPool();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold">
          <span className="bg-linear-to-r from-nova-purple to-nova-cyan bg-clip-text text-transparent">
            NovaPool
          </span>
        </h1>
        <p className="mt-2 text-muted">
          Graduated liquidity for long-tail &amp; emerging tokens
        </p>
      </header>

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
