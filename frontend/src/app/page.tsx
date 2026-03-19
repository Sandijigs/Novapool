"use client";

import { useState } from "react";
import { FeeCard } from "@/components/FeeCard";
import { FeeTiersCard } from "@/components/FeeTiersCard";
import { MetricsCard } from "@/components/MetricsCard";
import { PhaseCard } from "@/components/PhaseCard";
import { SwapGuardCard } from "@/components/SwapGuardCard";
import { OnChainStatus } from "@/components/OnChainStatus";
import { ConfigurePoolForm } from "@/components/ConfigurePoolForm";
import { InitializePoolForm } from "@/components/InitializePoolForm";
import { SwapForm } from "@/components/SwapForm";
import { AddLiquidityForm } from "@/components/AddLiquidityForm";
import { MintTestTokens } from "@/components/MintTestTokens";
import { OnChainEventLog } from "@/components/OnChainEventLog";
import { PoolRegistry } from "@/components/PoolRegistry";
import { PoolSelector } from "@/components/PoolSelector";
import { WalletButton } from "@/components/WalletButton";
import { useAccount } from "wagmi";
import { usePoolMaturity, usePoolConfig, useSwapCount } from "@/lib/useOnChainPool";
import { MaturityPhase } from "@/lib/types";

export default function Dashboard() {
  const { isConnected, address } = useAccount();
  const [selectedPoolId, setSelectedPoolId] = useState<
    `0x${string}` | undefined
  >();

  const maturity = usePoolMaturity(selectedPoolId);
  const poolConfig = usePoolConfig(selectedPoolId);
  const swapCount = useSwapCount(selectedPoolId);

  const phaseProgress = (() => {
    if (maturity.phase === undefined || !poolConfig.config) return 0;
    if (maturity.phase === MaturityPhase.ESTABLISHED) return 100;

    const cfg = poolConfig.config;
    const vol = maturity.cumulativeVolume ?? BigInt(0);
    const age = maturity.age ?? BigInt(0);
    const traders = maturity.uniqueTraders ?? 0;

    const volTargets = [
      cfg.volumeForEmerging,
      cfg.volumeForGrowing,
      cfg.volumeForEstablished,
    ];
    const ageTargets = [
      BigInt(cfg.minAgeEmerging),
      BigInt(cfg.minAgeGrowing),
      BigInt(cfg.minAgeEstablished),
    ];
    const traderTargets = [
      cfg.minTradersEmerging,
      cfg.minTradersGrowing,
      cfg.minTradersEstablished,
    ];

    const p = maturity.phase;
    const volTarget = volTargets[p];
    const ageTarget = ageTargets[p];
    const traderTarget = traderTargets[p];

    if (!volTarget || !ageTarget || !traderTarget) return 0;

    const volPct =
      volTarget > BigInt(0)
        ? Math.min(Number((vol * BigInt(100)) / volTarget), 100)
        : 100;
    const agePct =
      ageTarget > BigInt(0)
        ? Math.min(Number((age * BigInt(100)) / ageTarget), 100)
        : 100;
    const traderPct =
      traderTarget > 0
        ? Math.min(Math.round((traders / traderTarget) * 100), 100)
        : 100;

    return Math.round((volPct + agePct + traderPct) / 3);
  })();

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-card-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-nova-purple to-nova-cyan">
              <span className="text-lg font-black text-white">N</span>
            </div>
            <span className="text-xl font-bold">NovaPool</span>
          </div>
          <div className="flex items-center gap-4">
            {isConnected && (
              <span className="hidden sm:inline text-xs font-mono text-muted">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            )}
            <WalletButton />
          </div>
        </div>
      </nav>

      {!isConnected ? (
        /* ─── Landing Page ─── */
        <LandingPage />
      ) : (
        /* ─── Connected Dashboard ─── */
        <div className="relative">
          {/* Subtle ambient glow */}
          <div className="pointer-events-none fixed inset-0 -z-10">
            <div className="absolute top-0 left-1/3 h-[500px] w-[500px] rounded-full bg-nova-purple/3 blur-[160px]" />
            <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-nova-cyan/3 blur-[140px]" />
          </div>

          <div className="mx-auto max-w-6xl px-6 py-8 space-y-10">
            {/* ── Section 1: Contract Status ── */}
            <OnChainStatus />

            {/* ── Section 2: Concept Explainer ── */}
            <section>
              <div className="rounded-2xl border border-dashed border-nova-purple/30 bg-nova-purple/3 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-nova-purple/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-base font-semibold uppercase tracking-wider text-nova-purple/70">
                      How Graduated Fees Work
                    </h2>
                  </div>
                  <span className="rounded-full border border-nova-purple/20 bg-nova-purple/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-nova-purple/60">
                    Concept
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      phase: "Nascent",
                      fee: "1.00%",
                      desc: "High fees protect LPs from risky new tokens",
                      color: "#8b5cf6",
                    },
                    {
                      phase: "Emerging",
                      fee: "0.67%",
                      desc: "Early traction — traders and volume growing",
                      color: "#3b82f6",
                    },
                    {
                      phase: "Growing",
                      fee: "0.34%",
                      desc: "Proven trade history with diverse participants",
                      color: "#06b6d4",
                    },
                    {
                      phase: "Established",
                      fee: "0.05%",
                      desc: "Mature token — competitive standard fees",
                      color: "#22c55e",
                    },
                  ].map((tier, idx) => (
                    <div key={tier.phase} className="relative">
                      {idx > 0 && (
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 -translate-x-1/2 text-muted/30 text-lg hidden sm:block">
                          &rarr;
                        </div>
                      )}
                      <div
                        className="rounded-xl border border-dashed p-4 text-center"
                        style={{ borderColor: tier.color + "30" }}
                      >
                        <p className="text-xs font-bold uppercase tracking-wider text-muted/50 mb-1">
                          Phase {idx + 1}
                        </p>
                        <p
                          className="text-2xl font-bold tabular-nums"
                          style={{ color: tier.color + "90" }}
                        >
                          {tier.fee}
                        </p>
                        <p className="text-sm font-semibold text-foreground/60">
                          {tier.phase}
                        </p>
                        <p className="mt-1 text-xs text-muted/50 leading-tight">
                          {tier.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted/50 text-center italic">
                  This diagram shows the fee graduation concept. See the live Pool Dashboard below for real on-chain data.
                </p>
              </div>
            </section>

            {/* ── Section 3: Pool Selection ── */}
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nova-purple/10 text-base font-bold text-nova-purple">
                  1
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    Select or Configure a Pool
                  </h2>
                  <p className="text-base text-muted">
                    Configure fee graduation parameters, then select a pool from
                    the registry to monitor its live maturity data.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-5">
                  <PoolSelector
                    selectedPoolId={selectedPoolId}
                    onSelectPool={setSelectedPoolId}
                  />
                  <PoolRegistry
                    selectedPoolId={selectedPoolId}
                    onSelectPool={setSelectedPoolId}
                  />
                </div>
                <div>
                  <ConfigurePoolForm />
                </div>
              </div>
            </section>

            {/* ── Section 4: Pool Actions ── */}
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nova-blue/10 text-base font-bold text-nova-blue">
                  2
                </div>
                <div>
                  <h2 className="text-xl font-bold">Pool Actions</h2>
                  <p className="text-base text-muted">
                    Mint tokens, initialize a pool, add liquidity, then swap to
                    drive volume and trigger phase advancement.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <MintTestTokens />
                <InitializePoolForm />
                <AddLiquidityForm />
                <SwapForm />
              </div>
            </section>

            {/* ── Section 5: Pool Dashboard ── */}
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nova-cyan/10 text-base font-bold text-nova-cyan">
                  3
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">Pool Maturity Dashboard</h2>
                    <span className="rounded-full border border-nova-cyan/30 bg-nova-cyan/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-nova-cyan">
                      Live On-Chain
                    </span>
                  </div>
                  <p className="text-base text-muted">
                    {selectedPoolId ? (
                      <>
                        Real-time on-chain data for pool{" "}
                        <code className="rounded bg-nova-cyan/10 px-1.5 py-0.5 font-mono text-xs text-nova-cyan">
                          {selectedPoolId.slice(0, 10)}...
                          {selectedPoolId.slice(-6)}
                        </code>
                        {" "}&mdash; these values update as you trade.
                      </>
                    ) : (
                      "Select a pool above to view its live maturity phase, fees, and metrics."
                    )}
                  </p>
                </div>
              </div>

              {selectedPoolId ? (
                <div className="space-y-5">
                  {/* Row 1: Key metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      largeTradeCooldown={
                        poolConfig.config?.largeTradeCooldown
                      }
                      largeTradePctBps={poolConfig.config?.largeTradePctBps}
                      isLoading={poolConfig.isLoading}
                    />
                  </div>

                  {/* Row 2: Detailed metrics */}
                  <MetricsCard
                    cumulativeVolume={maturity.cumulativeVolume}
                    uniqueTraders={maturity.uniqueTraders}
                    age={maturity.age}
                    swapCount={swapCount}
                    isLoading={maturity.isLoading}
                  />

                  {/* Row 3: Fee graduation timeline */}
                  <FeeTiersCard
                    activePhase={maturity.phase ?? MaturityPhase.NASCENT}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-card-border/60 bg-card/20 py-16">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-nova-purple/10">
                      <svg
                        className="h-7 w-7 text-nova-purple/50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground/70">
                      No Pool Selected
                    </h3>
                    <p className="mt-1 max-w-sm text-base text-muted/60">
                      Select a pool from the registry above, or enter a pool ID
                      to view its live maturity phase, graduated fee, and
                      on-chain metrics.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* ── Section 6: Live Events ── */}
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nova-green/10 text-base font-bold text-nova-green">
                  4
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">Live On-Chain Events</h2>
                    <span className="rounded-full border border-nova-green/30 bg-nova-green/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-nova-green">
                      Live
                    </span>
                  </div>
                  <p className="text-base text-muted">
                    Real-time feed of PhaseAdvanced, GraduatedFeeApplied,
                    CooldownApplied, and PoolConfigured events emitted by the
                    hook contract.
                  </p>
                </div>
              </div>
              <OnChainEventLog />
            </section>
          </div>
        </div>
      )}
    </main>
  );
}

/* ─── Landing Page Component ─── */
function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-nova-purple/20 blur-[120px] animate-glow-pulse" />
        <div className="absolute top-20 right-1/4 h-80 w-80 rounded-full bg-nova-cyan/15 blur-[100px] animate-glow-pulse animation-delay-200" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-nova-blue/10 blur-[80px] animate-glow-pulse animation-delay-400" />
      </div>

      {/* Hero */}
      <section className="relative mx-auto max-w-5xl px-4 pt-24 pb-16 text-center">
        <div className="animate-slide-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-nova-purple/30 bg-nova-purple/10 px-4 py-1.5 text-sm text-nova-purple">
            <span className="inline-block h-2 w-2 rounded-full bg-nova-purple animate-pulse" />
            Built on Uniswap v4 Hooks
          </div>

          <h1 className="text-5xl font-black leading-tight sm:text-7xl">
            <span className="bg-linear-to-r from-nova-purple via-nova-blue to-nova-cyan bg-clip-text text-transparent">
              Graduated Liquidity
            </span>
            <br />
            <span className="text-foreground">for Emerging Tokens</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted leading-relaxed">
            NovaPool creates safer, smarter markets for long-tail tokens. Fees
            start high to protect LPs, then automatically decrease as the token
            proves itself through volume, traders, and time.
          </p>

          <div className="mt-10">
            <WalletButton />
          </div>
        </div>
      </section>

      {/* Fee graduation visual */}
      <section className="relative mx-auto max-w-5xl px-4 pb-20">
        <div className="animate-slide-up animation-delay-200 opacity-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                phase: "NASCENT",
                fee: "1.00%",
                desc: "Maximum LP protection",
                border: "border-purple-500/30",
                bg: "bg-purple-950/40",
                text: "text-purple-400",
                glow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]",
                delay: "",
              },
              {
                phase: "EMERGING",
                fee: "0.67%",
                desc: "Early traction building",
                border: "border-blue-500/30",
                bg: "bg-blue-950/40",
                text: "text-blue-400",
                glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
                delay: "animation-delay-100",
              },
              {
                phase: "GROWING",
                fee: "0.34%",
                desc: "Proven trade history",
                border: "border-green-500/30",
                bg: "bg-green-950/40",
                text: "text-green-400",
                glow: "hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]",
                delay: "animation-delay-200",
              },
              {
                phase: "ESTABLISHED",
                fee: "0.05%",
                desc: "Competitive standard fee",
                border: "border-lime-500/30",
                bg: "bg-lime-950/40",
                text: "text-lime-400",
                glow: "hover:shadow-[0_0_30px_rgba(163,230,53,0.15)]",
                delay: "animation-delay-300",
              },
            ].map((tier) => (
              <div
                key={tier.phase}
                className={`animate-slide-up opacity-0 ${tier.delay} rounded-2xl border ${tier.border} ${tier.bg} p-5 transition-all duration-300 hover:scale-105 ${tier.glow}`}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {tier.phase}
                </div>
                <div className={`mt-2 text-3xl font-black ${tier.text}`}>
                  {tier.fee}
                </div>
                <div className="mt-1 text-xs text-muted">{tier.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-muted">
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-card-border to-transparent" />
            <span className="text-xs uppercase tracking-widest">
              Fees decrease as tokens mature
            </span>
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-card-border to-transparent" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative mx-auto max-w-5xl px-4 pb-24">
        <div className="animate-slide-up animation-delay-400 opacity-0">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Why NovaPool?
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-card-border bg-card p-6 transition-all duration-300 hover:border-nova-purple/40 hover:shadow-[0_0_40px_rgba(139,92,246,0.1)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-nova-purple/20">
                <svg
                  className="h-5 w-5 text-nova-purple"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Graduated Fees</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Fees adapt automatically from 1.00% to 0.05% as the token
                matures through four phases, protecting LPs early and attracting
                volume later.
              </p>
            </div>

            <div className="rounded-2xl border border-card-border bg-card p-6 transition-all duration-300 hover:border-nova-cyan/40 hover:shadow-[0_0_40px_rgba(6,182,212,0.1)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-nova-cyan/20">
                <svg
                  className="h-5 w-5 text-nova-cyan"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Anti-Manipulation</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Max swap size caps (5% of liquidity) and large trade cooldowns
                prevent rug pulls, wash trading, and sandwich attacks on thin
                pools.
              </p>
            </div>

            <div className="rounded-2xl border border-card-border bg-card p-6 transition-all duration-300 hover:border-nova-green/40 hover:shadow-[0_0_40px_rgba(34,197,94,0.1)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-nova-green/20">
                <svg
                  className="h-5 w-5 text-nova-green"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold">On-Chain Maturity</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Phase advancement requires volume, unique traders, AND pool age.
                Three criteria, all at once — manipulation-resistant trust
                signals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative border-t border-card-border bg-card/30 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="animate-slide-up animation-delay-500 opacity-0">
            <h2 className="mb-10 text-center text-2xl font-bold">
              How It Works
            </h2>
            <div className="grid gap-6 sm:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "Deploy",
                  desc: "Hook deploys via CREATE2 with mined address flags",
                },
                {
                  step: "02",
                  title: "Configure",
                  desc: "Set fee tiers, swap guards, and maturity thresholds",
                },
                {
                  step: "03",
                  title: "Initialize",
                  desc: "Create a Uniswap v4 pool with NovaPool as the hook",
                },
                {
                  step: "04",
                  title: "Evolve",
                  desc: "Pool automatically matures as trading activity grows",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-nova-purple/30 bg-nova-purple/10 text-sm font-bold text-nova-purple">
                    {item.step}
                  </div>
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-card-border py-16 text-center">
        <div className="animate-slide-up animation-delay-600 opacity-0">
          <h2 className="text-2xl font-bold">Ready to explore?</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Connect your wallet to view configured pools, monitor live maturity
            data, and manage pool configurations on Unichain.
          </p>
          <div className="mt-8">
            <WalletButton />
          </div>
          <p className="mt-6 text-xs text-muted">
            Deployed on Unichain Sepolia &middot; Powered by Uniswap v4
          </p>
        </div>
      </section>
    </div>
  );
}
