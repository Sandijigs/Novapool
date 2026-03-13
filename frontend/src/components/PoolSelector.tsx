"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

interface PoolSelectorProps {
  selectedPoolId: `0x${string}` | undefined;
  onSelectPool: (poolId: `0x${string}`) => void;
}

export function PoolSelector({ selectedPoolId, onSelectPool }: PoolSelectorProps) {
  const { isConnected } = useAccount();
  const [input, setInput] = useState("");

  if (!isConnected) return null;

  const handleLookup = () => {
    const trimmed = input.trim();
    if (trimmed.startsWith("0x") && trimmed.length === 66) {
      onSelectPool(trimmed as `0x${string}`);
    }
  };

  return (
    <div className="col-span-full rounded-xl border border-card-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
        Select Pool
      </h2>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter Pool ID (0x...) or select from registry below"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          className="flex-1 rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted/50 focus:border-nova-purple focus:outline-none"
        />
        <button
          onClick={handleLookup}
          className="rounded-lg bg-nova-purple px-4 py-2 text-sm font-medium text-white hover:bg-nova-purple/80 transition-colors"
        >
          Lookup
        </button>
      </div>
      {selectedPoolId && (
        <p className="mt-2 text-xs text-muted">
          Active:{" "}
          <span className="font-mono text-nova-cyan">
            {selectedPoolId.slice(0, 10)}...{selectedPoolId.slice(-8)}
          </span>
        </p>
      )}
    </div>
  );
}
