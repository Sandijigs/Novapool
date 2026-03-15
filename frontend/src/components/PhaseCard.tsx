"use client";

import { MaturityPhase, PHASE_NAMES } from "@/lib/types";

const PHASE_CONFIG: Record<
  MaturityPhase,
  { color: string; gradient: string; bgFrom: string }
> = {
  [MaturityPhase.NASCENT]: {
    color: "#8b5cf6",
    gradient: "from-purple-500/20 to-purple-900/5",
    bgFrom: "from-purple-500/10",
  },
  [MaturityPhase.EMERGING]: {
    color: "#3b82f6",
    gradient: "from-blue-500/20 to-blue-900/5",
    bgFrom: "from-blue-500/10",
  },
  [MaturityPhase.GROWING]: {
    color: "#06b6d4",
    gradient: "from-cyan-500/20 to-cyan-900/5",
    bgFrom: "from-cyan-500/10",
  },
  [MaturityPhase.ESTABLISHED]: {
    color: "#22c55e",
    gradient: "from-green-500/20 to-green-900/5",
    bgFrom: "from-green-500/10",
  },
};

interface PhaseCardProps {
  phase: MaturityPhase | undefined;
  progress: number;
  isLoading?: boolean;
}

export function PhaseCard({ phase, progress, isLoading }: PhaseCardProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const config = phase !== undefined ? PHASE_CONFIG[phase] : null;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-20 rounded bg-card-border/60 animate-pulse" />
            <div className="mt-4 h-7 w-28 rounded bg-card-border/60 animate-pulse" />
            <div className="mt-3 h-3 w-24 rounded bg-card-border/60 animate-pulse" />
          </div>
          <div className="h-[96px] w-[96px] rounded-full bg-card-border/30 animate-pulse" />
        </div>
      </div>
    );
  }

  if (phase === undefined) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <p className="text-sm font-medium uppercase tracking-wider text-muted">
          Maturity Phase
        </p>
        <p className="mt-3 text-base text-muted/60">Select a pool</p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-card-border bg-gradient-to-br ${config?.gradient} p-6 transition-all duration-300`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-wider text-muted">
            Maturity Phase
          </p>
          <p
            className="mt-1 text-2xl font-bold tracking-tight"
            style={{ color: config?.color }}
          >
            {PHASE_NAMES[phase]}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-card-border">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.max(progress, 4)}%`,
                  backgroundColor: config?.color,
                }}
              />
            </div>
            <span className="text-sm text-muted">
              {progress >= 100 ? "Fully mature" : `${progress}% to next`}
            </span>
          </div>
        </div>

        {/* Ring Gauge */}
        <div className="relative flex-shrink-0">
          <svg
            width="96"
            height="96"
            viewBox="0 0 100 100"
            className="-rotate-90"
          >
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              className="text-card-border/50"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={config?.color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 6px ${config?.color}40)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-xl font-bold tabular-nums"
              style={{ color: config?.color }}
            >
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
