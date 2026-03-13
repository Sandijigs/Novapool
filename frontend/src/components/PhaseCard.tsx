import { MaturityPhase, PHASE_NAMES } from "@/lib/types";

const PHASE_STYLES: Record<MaturityPhase, { bg: string; text: string; bar: string }> = {
  [MaturityPhase.NASCENT]: {
    bg: "bg-purple-950/60",
    text: "text-purple-400",
    bar: "bg-nova-purple",
  },
  [MaturityPhase.EMERGING]: {
    bg: "bg-blue-950/60",
    text: "text-blue-400",
    bar: "bg-nova-blue",
  },
  [MaturityPhase.GROWING]: {
    bg: "bg-green-950/60",
    text: "text-green-400",
    bar: "bg-nova-green",
  },
  [MaturityPhase.ESTABLISHED]: {
    bg: "bg-lime-950/60",
    text: "text-lime-400",
    bar: "bg-nova-lime",
  },
};

interface PhaseCardProps {
  phase: MaturityPhase;
  progress: number;
}

export function PhaseCard({ phase, progress }: PhaseCardProps) {
  const style = PHASE_STYLES[phase];

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        Maturity Phase
      </h2>
      <span
        className={`inline-block rounded-full px-4 py-1.5 text-lg font-bold ${style.bg} ${style.text}`}
      >
        {PHASE_NAMES[phase]}
      </span>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-card-border">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${style.bar}`}
          style={{ width: `${Math.max(progress, 5)}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-muted">
        Phase {phase} of 3
      </p>
    </div>
  );
}
