"use client";

import { formatEther } from "viem";

interface MetricsCardProps {
  cumulativeVolume: bigint | undefined;
  uniqueTraders: number | undefined;
  age: bigint | undefined;
  swapCount?: number;
  isLoading?: boolean;
}

function formatAge(seconds: number): string {
  if (seconds === 0) return "0s";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${seconds}s`;
}

const METRICS_CONFIG = [
  {
    label: "Volume",
    icon: (
      <svg
        className="h-4 w-4"
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
    ),
    color: "text-nova-cyan",
    bg: "bg-nova-cyan/10",
  },
  {
    label: "Traders",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    color: "text-nova-blue",
    bg: "bg-nova-blue/10",
  },
  {
    label: "Pool Age",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: "text-nova-green",
    bg: "bg-nova-green/10",
  },
  {
    label: "Swaps",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    ),
    color: "text-nova-purple",
    bg: "bg-nova-purple/10",
  },
];

export function MetricsCard({
  cumulativeVolume,
  uniqueTraders,
  age,
  swapCount,
  isLoading,
}: MetricsCardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-card-border bg-card p-5"
          >
            <div className="h-3 w-14 rounded bg-card-border/60 animate-pulse" />
            <div className="mt-4 h-7 w-20 rounded bg-card-border/60 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const values = [
    {
      value: cumulativeVolume !== undefined
        ? parseFloat(formatEther(cumulativeVolume)).toFixed(4)
        : "--",
      unit: "ETH",
    },
    { value: uniqueTraders?.toString() ?? "--", unit: "unique" },
    {
      value: age !== undefined ? formatAge(Number(age)) : "--",
      unit: "",
    },
    {
      value: swapCount !== undefined ? swapCount.toString() : "--",
      unit: "on-chain",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {METRICS_CONFIG.map((cfg, i) => (
        <div
          key={cfg.label}
          className="rounded-2xl border border-card-border bg-card p-5"
        >
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${cfg.bg} ${cfg.color}`}
            >
              {cfg.icon}
            </div>
            <p className="text-sm font-medium uppercase tracking-wider text-muted">
              {cfg.label}
            </p>
          </div>
          <p className={`mt-3 text-3xl font-bold tabular-nums ${cfg.color}`}>
            {values[i].value}
            {values[i].unit && (
              <span className="ml-1 text-sm font-normal text-muted">
                {values[i].unit}
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
