"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { HOOK_ADDRESS } from "@/lib/wagmi";
import { PHASE_NAMES, MaturityPhase } from "@/lib/types";
import { decodeAbiParameters, formatEther } from "viem";

interface OnChainEvent {
  timestamp: Date;
  type: "phase" | "fee" | "cooldown" | "config";
  message: string;
  txHash: `0x${string}`;
  blockNumber: bigint;
}

const TYPE_STYLES: Record<string, { color: string; icon: string; bg: string }> =
  {
    phase: { color: "text-nova-green", icon: "^", bg: "bg-nova-green/10" },
    fee: { color: "text-nova-cyan", icon: "%", bg: "bg-nova-cyan/10" },
    cooldown: { color: "text-nova-yellow", icon: "~", bg: "bg-nova-yellow/10" },
    config: { color: "text-nova-purple", icon: "+", bg: "bg-nova-purple/10" },
  };

// Pre-computed keccak256 event signature hashes
const TOPICS: Record<string, OnChainEvent["type"]> = {
  "0x118967a21dd658e0dacc158168a3f461a6b208233323b32ba4789cbe5ae6b849": "config",
  "0xd1ec2e8e7500469ade0bb29fb01526211bc1630be865b5d40d29f558489a8813": "phase",
  "0x4806684bda0a2c2091aac6ec4b0dd139aa034252588210dbb80b73a468e8c65b": "fee",
  "0x3810c8fbf340d6250dd0cb788be895eca65ae294837a58fa3e6fe6ae0d7ce233": "cooldown",
};

function decodeEvent(
  type: OnChainEvent["type"],
  data: `0x${string}`,
  topics: readonly `0x${string}`[]
): string {
  try {
    switch (type) {
      case "config":
        return "Pool configured on-chain";
      case "phase": {
        // data: (uint8 from, uint8 to, uint256 cumulativeVolume, uint32 uniqueTraders)
        const [from, to, vol, traders] = decodeAbiParameters(
          [
            { type: "uint8", name: "from" },
            { type: "uint8", name: "to" },
            { type: "uint256", name: "cumulativeVolume" },
            { type: "uint32", name: "uniqueTraders" },
          ],
          data
        );
        const fromName = PHASE_NAMES[Number(from) as MaturityPhase] ?? "?";
        const toName = PHASE_NAMES[Number(to) as MaturityPhase] ?? "?";
        return `Phase: ${fromName} -> ${toName} | Vol: ${formatEther(vol)} ETH | Traders: ${traders}`;
      }
      case "fee": {
        // data: (uint8 phase, uint24 fee)
        const [phase, fee] = decodeAbiParameters(
          [
            { type: "uint8", name: "phase" },
            { type: "uint24", name: "fee" },
          ],
          data
        );
        const phaseName = PHASE_NAMES[Number(phase) as MaturityPhase] ?? "?";
        return `Fee applied: ${(Number(fee) / 10000).toFixed(2)}% (${phaseName})`;
      }
      case "cooldown": {
        // topics[2] = indexed address sender; data: (uint256 expiresAt)
        const trader = topics[2]
          ? `0x${topics[2].slice(26)}`
          : "0x";
        return `Cooldown: ${trader.slice(0, 6)}...${trader.slice(-4)} locked`;
      }
      default:
        return type;
    }
  } catch {
    return type === "config"
      ? "Pool configured on-chain"
      : type === "phase"
        ? "Phase advanced"
        : type === "fee"
          ? "Graduated fee applied"
          : "Cooldown applied";
  }
}

export function OnChainEventLog() {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<OnChainEvent[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  const lastBlockRef = useRef<bigint>(BigInt(0));
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isConnected || !publicClient) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval>;

    const fetchLogs = async (from: bigint, to: bigint): Promise<OnChainEvent[]> => {
      const results: OnChainEvent[] = [];
      try {
        // Use raw eth_getLogs (viem's getLogs can silently fail on some RPCs)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logs: any[] = await publicClient.request({
          method: "eth_getLogs",
          params: [
            {
              address: HOOK_ADDRESS,
              fromBlock: `0x${from.toString(16)}`,
              toBlock: `0x${to.toString(16)}`,
            },
          ],
        });

        for (const log of logs) {
          const sig = log.topics?.[0] as string | undefined;
          if (!sig) continue;
          const type = TOPICS[sig];
          if (!type) continue;

          const key = `${log.transactionHash}-${log.logIndex}`;
          if (seenRef.current.has(key)) continue;
          seenRef.current.add(key);

          results.push({
            timestamp: new Date(),
            type,
            message: decodeEvent(type, log.data, log.topics as `0x${string}`[]),
            txHash: log.transactionHash!,
            blockNumber: BigInt(log.blockNumber),
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (!cancelled) {
          setDebugInfo(`Scan error: ${msg.slice(0, 80)}`);
        }
      }
      return results;
    };

    const CHUNK = BigInt(9000);
    const MAX_INIT_CHUNKS = 15; // ~37 hours back

    const init = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        console.log("[LiveEvents] Deep scan starting from block", currentBlock.toString());
        if (!cancelled) setDebugInfo(`Scanning history...`);

        const allHistorical: OnChainEvent[] = [];
        let scanTo = currentBlock;

        for (let i = 0; i < MAX_INIT_CHUNKS && scanTo > BigInt(0); i++) {
          if (cancelled) break;
          const scanFrom = scanTo > CHUNK ? scanTo - CHUNK : BigInt(0);
          console.log(`[LiveEvents] Chunk ${i + 1}/${MAX_INIT_CHUNKS}: blocks ${scanFrom}..${scanTo}`);
          const chunk = await fetchLogs(scanFrom, scanTo);
          if (chunk.length > 0) {
            console.log(`[LiveEvents] Chunk ${i + 1} found ${chunk.length} events!`);
          }
          allHistorical.push(...chunk);
          scanTo = scanFrom;
        }

        allHistorical.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));
        console.log(`[LiveEvents] Deep scan complete: ${allHistorical.length} events found`);

        if (!cancelled) {
          setEvents(allHistorical.slice(0, 100));
          lastBlockRef.current = currentBlock;
          setIsWatching(true);
          if (allHistorical.length > 0) {
            setDebugInfo("");
          } else {
            setDebugInfo(`No events found in last ${MAX_INIT_CHUNKS * 9000} blocks`);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDebugInfo(`Init: ${err instanceof Error ? err.message.slice(0, 80) : "error"}`);
          setIsWatching(true);
          try { lastBlockRef.current = await publicClient.getBlockNumber(); } catch { /* */ }
        }
      }

      pollTimer = setInterval(async () => {
        if (cancelled) return;
        try {
          const latest = await publicClient.getBlockNumber();
          if (latest <= lastBlockRef.current) return;

          const newEvts = await fetchLogs(lastBlockRef.current + BigInt(1), latest);
          if (!cancelled && newEvts.length > 0) {
            setEvents((prev) => [...newEvts, ...prev].slice(0, 100));
            setDebugInfo("");
          }
          lastBlockRef.current = latest;
        } catch { /* retry */ }
      }, 4000);
    };

    init();
    return () => { cancelled = true; clearInterval(pollTimer); setIsWatching(false); };
  }, [isConnected, publicClient]);

  if (!isConnected) return null;

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium uppercase tracking-wider text-muted">
          Live Events
        </p>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isWatching ? "animate-ping bg-nova-green" : "bg-muted"}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${isWatching ? "bg-nova-green" : "bg-muted"}`} />
          </span>
          <span className={`text-sm ${isWatching ? "text-nova-green" : "text-muted"}`}>
            {isWatching ? "Watching" : "Disconnected"}
          </span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <p className="text-base text-muted/50">Listening for on-chain events...</p>
          <p className="text-xs text-muted/30">Events appear after pool initialization, swaps, and phase changes</p>
          {debugInfo && <p className="text-xs text-muted/40 font-mono mt-2">{debugInfo}</p>}
        </div>
      ) : (
        <div className="max-h-60 space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
          {events.map((ev, i) => {
            const style = TYPE_STYLES[ev.type];
            return (
              <div key={`${ev.txHash}-${ev.type}-${i}`} className="flex items-center gap-3 rounded-lg bg-background/40 px-3 py-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${style.bg} ${style.color}`}>
                  {style.icon}
                </span>
                <span className={`text-sm font-medium ${style.color}`}>{ev.message}</span>
                <span className="ml-auto shrink-0 text-xs text-muted/60">{ev.timestamp.toLocaleTimeString()}</span>
                <a
                  href={`https://sepolia.uniscan.xyz/tx/${ev.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded bg-card-border/50 px-1.5 py-0.5 text-xs text-muted hover:text-foreground transition-colors"
                >
                  tx
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
