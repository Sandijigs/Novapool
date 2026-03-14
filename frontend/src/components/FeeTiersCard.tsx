"use client";

import { MaturityPhase, PHASE_FEE_PCT, PHASE_NAMES } from "@/lib/types";

const TIERS = [
  { phase: MaturityPhase.NASCENT, color: "#8b5cf6" },
  { phase: MaturityPhase.EMERGING, color: "#3b82f6" },
  { phase: MaturityPhase.GROWING, color: "#06b6d4" },
  { phase: MaturityPhase.ESTABLISHED, color: "#22c55e" },
];

interface FeeTiersCardProps {
  activePhase: MaturityPhase;
}

export function FeeTiersCard({ activePhase }: FeeTiersCardProps) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <p className="text-sm font-medium uppercase tracking-wider text-muted mb-6">
        Fee Graduation Timeline
      </p>

      <div className="relative flex items-start justify-between px-2">
        {/* Background connecting line */}
        <div className="absolute left-[calc(12.5%)] right-[calc(12.5%)] top-5 h-[2px] bg-card-border" />
        {/* Active progress line */}
        <div
          className="absolute left-[calc(12.5%)] top-5 h-[2px] transition-all duration-1000 ease-out"
          style={{
            width: `${(activePhase / 3) * 75}%`,
            background: `linear-gradient(90deg, #8b5cf6, ${TIERS[activePhase].color})`,
            boxShadow: `0 0 8px ${TIERS[activePhase].color}40`,
          }}
        />

        {TIERS.map((tier) => {
          const isActive = tier.phase === activePhase;
          const isPast = tier.phase < activePhase;

          return (
            <div
              key={tier.phase}
              className="relative z-10 flex flex-col items-center"
              style={{ width: "25%" }}
            >
              {/* Dot */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                  isActive ? "scale-110" : isPast ? "" : "opacity-40"
                }`}
                style={{
                  borderColor:
                    isActive || isPast ? tier.color : "var(--color-card-border)",
                  backgroundColor:
                    isActive
                      ? tier.color + "20"
                      : isPast
                        ? tier.color + "10"
                        : "var(--color-card)",
                  boxShadow: isActive
                    ? `0 0 16px ${tier.color}30`
                    : undefined,
                }}
              >
                <div
                  className="h-3 w-3 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor:
                      isActive || isPast
                        ? tier.color
                        : "var(--color-card-border)",
                    transform: isActive
                      ? "scale(1)"
                      : isPast
                        ? "scale(0.8)"
                        : "scale(0.5)",
                  }}
                />
              </div>

              {/* Label */}
              <span
                className={`mt-2 text-sm font-semibold transition-colors ${
                  isActive ? "text-foreground" : "text-muted/60"
                }`}
              >
                {PHASE_NAMES[tier.phase]}
              </span>
              <span
                className="text-base font-bold tabular-nums"
                style={{
                  color: isActive || isPast ? tier.color : "var(--color-muted)",
                }}
              >
                {PHASE_FEE_PCT[tier.phase]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
