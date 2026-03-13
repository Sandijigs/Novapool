import { MaturityPhase, PHASE_FEE_PCT, PHASE_FEES } from "@/lib/types";

interface FeeCardProps {
  phase: MaturityPhase;
}

export function FeeCard({ phase }: FeeCardProps) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        Current Fee
      </h2>
      <div className="text-4xl font-bold">{PHASE_FEE_PCT[phase]}</div>
      <p className="mt-1 text-sm text-muted">
        {PHASE_FEES[phase]} / 1,000,000 bps
      </p>
    </div>
  );
}
