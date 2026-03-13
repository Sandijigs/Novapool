import { MaturityPhase, PHASE_FEE_PCT, PHASE_NAMES } from "@/lib/types";

interface FeeTiersCardProps {
  activePhase: MaturityPhase;
}

const TIERS = [
  {
    phase: MaturityPhase.NASCENT,
    bg: "bg-purple-950/40",
    text: "text-purple-400",
    border: "border-purple-400",
  },
  {
    phase: MaturityPhase.EMERGING,
    bg: "bg-blue-950/40",
    text: "text-blue-400",
    border: "border-blue-400",
  },
  {
    phase: MaturityPhase.GROWING,
    bg: "bg-green-950/40",
    text: "text-green-400",
    border: "border-green-400",
  },
  {
    phase: MaturityPhase.ESTABLISHED,
    bg: "bg-lime-950/40",
    text: "text-lime-400",
    border: "border-lime-400",
  },
];

export function FeeTiersCard({ activePhase }: FeeTiersCardProps) {
  return (
    <div className="col-span-full rounded-2xl border border-card-border bg-card p-6">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
        Fee Graduation Tiers
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TIERS.map((tier) => {
          const isActive = tier.phase === activePhase;
          return (
            <div
              key={tier.phase}
              className={`rounded-xl border-2 p-4 text-center transition-all ${tier.bg} ${
                isActive ? tier.border : "border-transparent"
              }`}
            >
              <div className="text-xs uppercase text-muted">
                {PHASE_NAMES[tier.phase]}
              </div>
              <div className={`mt-1 text-xl font-bold ${tier.text}`}>
                {PHASE_FEE_PCT[tier.phase]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
