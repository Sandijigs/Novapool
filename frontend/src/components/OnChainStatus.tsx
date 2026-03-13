"use client";

import { useHookInfo } from "@/lib/useOnChainPool";
import { HOOK_ADDRESS } from "@/lib/wagmi";
import { useAccount } from "wagmi";

export function OnChainStatus() {
  const { isConnected } = useAccount();
  const { owner, poolManager, isLoading, error } = useHookInfo();

  if (!isConnected) return null;

  return (
    <div className="col-span-full rounded-xl border border-card-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
        On-Chain Contract
      </h2>

      {isLoading && (
        <p className="text-sm text-muted animate-pulse">
          Reading contract state...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400">
          Error reading contract: {error.message.slice(0, 80)}
        </p>
      )}

      {!isLoading && !error && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Hook Address</span>
            <span className="font-mono text-nova-cyan">
              {HOOK_ADDRESS.slice(0, 6)}...{HOOK_ADDRESS.slice(-4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Owner</span>
            <span className="font-mono text-nova-green">
              {owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Pool Manager</span>
            <span className="font-mono text-nova-blue">
              {poolManager
                ? `${poolManager.slice(0, 6)}...${poolManager.slice(-4)}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Network</span>
            <span className="text-nova-purple">Unichain Sepolia</span>
          </div>
        </div>
      )}
    </div>
  );
}
