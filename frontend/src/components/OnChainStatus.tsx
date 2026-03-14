"use client";

import { useHookInfo } from "@/lib/useOnChainPool";
import { HOOK_ADDRESS } from "@/lib/wagmi";
import { useAccount } from "wagmi";

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function OnChainStatus() {
  const { isConnected } = useAccount();
  const { owner, poolManager, isLoading } = useHookInfo();

  if (!isConnected) return null;

  const items = [
    { label: "Hook", value: HOOK_ADDRESS, color: "text-nova-purple" },
    { label: "Owner", value: owner, color: "text-nova-green" },
    { label: "Pool Mgr", value: poolManager, color: "text-nova-cyan" },
  ];

  return (
    <div className="rounded-xl border border-card-border/50 bg-card/40 backdrop-blur-sm px-5 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span className="text-muted">{item.label}</span>
            <span className={`font-mono ${item.color}`}>
              {isLoading
                ? "..."
                : item.value
                  ? truncate(item.value)
                  : "--"}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Network</span>
          <span className="flex items-center gap-1.5 text-nova-blue">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-nova-green" />
            Unichain Sepolia
          </span>
        </div>
      </div>
    </div>
  );
}
