"use client";

import { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { novaPoolHookAbi } from "@/lib/abi";
import { HOOK_ADDRESS } from "@/lib/wagmi";
import { PHASE_NAMES, MaturityPhase } from "@/lib/types";
import { formatEther, type Log } from "viem";

interface OnChainEvent {
  timestamp: Date;
  type: "phase" | "fee" | "cooldown" | "config";
  message: string;
  txHash: `0x${string}`;
}

const EVENT_COLORS: Record<string, string> = {
  phase: "text-nova-green",
  fee: "text-nova-cyan",
  cooldown: "text-nova-yellow",
  config: "text-nova-purple",
};

export function OnChainEventLog() {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<OnChainEvent[]>([]);
  const [isWatching, setIsWatching] = useState(false);

  useEffect(() => {
    if (!isConnected || !publicClient) return;

    setIsWatching(true);

    const unwatchPhase = publicClient.watchContractEvent({
      address: HOOK_ADDRESS,
      abi: novaPoolHookAbi,
      eventName: "PhaseAdvanced",
      onLogs: (logs) => {
        const newEvents = logs.map((log) => {
          const args = (log as Log & { args: Record<string, unknown> }).args;
          const from = PHASE_NAMES[(args.from as number) as MaturityPhase] ?? "?";
          const to = PHASE_NAMES[(args.to as number) as MaturityPhase] ?? "?";
          return {
            timestamp: new Date(),
            type: "phase" as const,
            message: `Phase: ${from} → ${to} | Vol: ${formatEther(args.cumulativeVolume as bigint)} ETH | Traders: ${args.uniqueTraders}`,
            txHash: log.transactionHash!,
          };
        });
        setEvents((prev) => [...newEvents, ...prev].slice(0, 100));
      },
    });

    const unwatchFee = publicClient.watchContractEvent({
      address: HOOK_ADDRESS,
      abi: novaPoolHookAbi,
      eventName: "GraduatedFeeApplied",
      onLogs: (logs) => {
        const newEvents = logs.map((log) => {
          const args = (log as Log & { args: Record<string, unknown> }).args;
          const phase = PHASE_NAMES[(args.phase as number) as MaturityPhase] ?? "?";
          const fee = (args.fee as number) / 10000;
          return {
            timestamp: new Date(),
            type: "fee" as const,
            message: `Fee applied: ${fee.toFixed(2)}% (${phase})`,
            txHash: log.transactionHash!,
          };
        });
        setEvents((prev) => [...newEvents, ...prev].slice(0, 100));
      },
    });

    const unwatchCooldown = publicClient.watchContractEvent({
      address: HOOK_ADDRESS,
      abi: novaPoolHookAbi,
      eventName: "CooldownApplied",
      onLogs: (logs) => {
        const newEvents = logs.map((log) => {
          const args = (log as Log & { args: Record<string, unknown> }).args;
          const trader = args.trader as string;
          return {
            timestamp: new Date(),
            type: "cooldown" as const,
            message: `Cooldown: ${trader.slice(0, 6)}...${trader.slice(-4)} locked`,
            txHash: log.transactionHash!,
          };
        });
        setEvents((prev) => [...newEvents, ...prev].slice(0, 100));
      },
    });

    const unwatchConfig = publicClient.watchContractEvent({
      address: HOOK_ADDRESS,
      abi: novaPoolHookAbi,
      eventName: "PoolConfigured",
      onLogs: (logs) => {
        const newEvents = logs.map((log) => ({
          timestamp: new Date(),
          type: "config" as const,
          message: `Pool configured on-chain`,
          txHash: log.transactionHash!,
        }));
        setEvents((prev) => [...newEvents, ...prev].slice(0, 100));
      },
    });

    return () => {
      unwatchPhase();
      unwatchFee();
      unwatchCooldown();
      unwatchConfig();
      setIsWatching(false);
    };
  }, [isConnected, publicClient]);

  if (!isConnected) return null;

  return (
    <div className="col-span-full rounded-xl border border-card-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Live On-Chain Events
        </h2>
        <span
          className={`flex items-center gap-1.5 text-xs ${isWatching ? "text-nova-green" : "text-muted"}`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${isWatching ? "bg-nova-green animate-pulse" : "bg-muted"}`}
          />
          {isWatching ? "Watching" : "Disconnected"}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted">
          No events yet. Events will appear here when swaps, phase changes, or
          pool configurations happen on-chain.
        </p>
      ) : (
        <div className="max-h-64 space-y-0 overflow-y-auto font-mono text-xs leading-relaxed">
          {events.map((event, i) => (
            <div key={i} className="border-b border-card-border py-1.5">
              <span className="text-muted">
                [{event.timestamp.toLocaleTimeString()}]
              </span>{" "}
              <span className={EVENT_COLORS[event.type] ?? "text-foreground"}>
                {event.message}
              </span>
              <a
                href={`https://sepolia.uniscan.xyz/tx/${event.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-muted hover:text-foreground transition-colors"
              >
                tx
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
