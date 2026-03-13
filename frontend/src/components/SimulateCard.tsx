interface SimulateCardProps {
  onSwap: (amount: number) => void;
  onAge: (seconds: number) => void;
  onAddTrader: () => void;
  onReset: () => void;
}

export function SimulateCard({ onSwap, onAge, onAddTrader, onReset }: SimulateCardProps) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6 sm:col-span-2">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
        Simulate Activity
      </h2>
      <p className="mb-4 text-sm text-muted">
        Simulate trades and time to drive maturity progression.
      </p>

      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Swap Volume</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSwap(0.005)}
              className="rounded-lg bg-nova-purple px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85"
            >
              0.005 ETH
            </button>
            <button
              onClick={() => onSwap(0.05)}
              className="rounded-lg bg-nova-blue px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85"
            >
              0.05 ETH
            </button>
            <button
              onClick={() => onSwap(0.2)}
              className="rounded-lg bg-nova-cyan px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-85"
            >
              0.2 ETH
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Time & Traders</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onAge(3600)}
              className="rounded-lg bg-nova-green px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-85"
            >
              +1 Hour
            </button>
            <button
              onClick={() => onAge(86400)}
              className="rounded-lg bg-nova-green px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-85"
            >
              +1 Day
            </button>
            <button
              onClick={() => onAddTrader()}
              className="rounded-lg bg-nova-yellow px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-85"
            >
              +1 Trader
            </button>
          </div>
        </div>

        <div className="pt-1">
          <button
            onClick={onReset}
            className="rounded-lg border border-card-border px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-muted hover:text-foreground"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
