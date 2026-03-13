import { LogEntry } from "@/lib/types";

interface EventLogProps {
  logs: LogEntry[];
}

export function EventLog({ logs }: EventLogProps) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        Event Log
      </h2>
      <div className="max-h-56 space-y-0 overflow-y-auto font-mono text-xs leading-relaxed">
        {logs.map((entry, i) => (
          <div
            key={i}
            className="border-b border-card-border py-1"
          >
            <span className="text-muted">
              [{entry.timestamp.toLocaleTimeString()}]
            </span>{" "}
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}
