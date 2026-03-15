"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { decodeAbiParameters } from "viem";
import { HOOK_ADDRESS } from "./wagmi";

export interface PoolEntry {
  poolId: `0x${string}`;
  configuredAt: Date;
  txHash: `0x${string}`;
  baseFee: number;
  matureFee: number;
}

// Pre-computed keccak256("PoolConfigured(bytes32,(uint24,uint24,uint16,uint32,uint16,uint256,uint256,uint256,uint32,uint32,uint32,uint32,uint32,uint32))")
const POOL_CONFIGURED_TOPIC =
  "0x118967a21dd658e0dacc158168a3f461a6b208233323b32ba4789cbe5ae6b849" as const;

const CONFIG_TUPLE_ABI = [
  {
    type: "tuple",
    components: [
      { name: "baseFee", type: "uint24" },
      { name: "matureFee", type: "uint24" },
      { name: "maxSwapPctBps", type: "uint16" },
      { name: "largeTradeCooldown", type: "uint32" },
      { name: "largeTradePctBps", type: "uint16" },
      { name: "volumeForEmerging", type: "uint256" },
      { name: "volumeForGrowing", type: "uint256" },
      { name: "volumeForEstablished", type: "uint256" },
      { name: "minTradersEmerging", type: "uint32" },
      { name: "minTradersGrowing", type: "uint32" },
      { name: "minTradersEstablished", type: "uint32" },
      { name: "minAgeEmerging", type: "uint32" },
      { name: "minAgeGrowing", type: "uint32" },
      { name: "minAgeEstablished", type: "uint32" },
    ],
  },
] as const;

/**
 * Unichain Sepolia's RPC rejects eth_getLogs with ranges > 10,000 blocks.
 * We scan backwards in 9,000-block chunks to cover enough history.
 */
const CHUNK_SIZE = BigInt(9_000);
const MAX_CHUNKS = 10; // 90K blocks back ≈ ~25 hours at 1s blocks

/**
 * Scans PoolConfigured events using getLogs with the known-correct
 * topic hash, then decodes the config tuple from raw log data.
 */
export function usePoolRegistry() {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [pools, setPools] = useState<PoolEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const hasDeepScannedRef = useRef(false);
  const poolsRef = useRef<PoolEntry[]>([]);

  const fetchPools = useCallback(async () => {
    if (!publicClient || !isConnected) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const currentBlock = await publicClient.getBlockNumber();
      // Deep scan on first load, shallow poll afterwards
      const isDeepScan = !hasDeepScannedRef.current;
      const chunks = isDeepScan ? MAX_CHUNKS : 1;
      console.log(`[PoolRegistry] ${isDeepScan ? "Deep" : "Poll"} scan from block ${currentBlock.toString()}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allLogs: any[] = [];
      let scanTo = currentBlock;
      let chunksSearched = 0;
      let anyChunkSucceeded = false;

      while (chunksSearched < chunks && scanTo > BigInt(0)) {
        const scanFrom = scanTo > CHUNK_SIZE ? scanTo - CHUNK_SIZE : BigInt(0);
        try {
          const logs = await publicClient.request({
            method: "eth_getLogs",
            params: [
              {
                address: HOOK_ADDRESS,
                topics: [POOL_CONFIGURED_TOPIC],
                fromBlock: `0x${scanFrom.toString(16)}`,
                toBlock: `0x${scanTo.toString(16)}`,
              },
            ],
          });
          anyChunkSucceeded = true;
          if ((logs as unknown[]).length > 0) {
            console.log(`[PoolRegistry] Chunk ${chunksSearched + 1} found ${(logs as unknown[]).length} logs!`);
            allLogs.push(...(logs as unknown[]));
          }
        } catch (chunkErr) {
          console.warn(`[PoolRegistry] Chunk ${chunksSearched + 1} failed:`, chunkErr);
        }

        scanTo = scanFrom;
        chunksSearched++;
      }

      if (isDeepScan) {
        hasDeepScannedRef.current = true;
        console.log(`[PoolRegistry] Deep scan complete: ${chunksSearched} chunks, ${allLogs.length} logs`);
      }

      if (!anyChunkSucceeded) {
        setError(
          "Unable to scan events. The RPC may be temporarily unavailable."
        );
        return;
      }

      // On poll scans with no new logs, keep existing pools
      if (!isDeepScan && allLogs.length === 0) {
        return;
      }

      console.log(`[PoolRegistry] Processing ${allLogs.length} logs...`);
      const entries: PoolEntry[] = [];
      for (const log of allLogs) {
        const poolId = log.topics?.[1] as `0x${string}` | undefined;
        console.log("[PoolRegistry] Log topics:", log.topics);
        console.log("[PoolRegistry] Log data length:", log.data?.length);
        if (!poolId) {
          console.warn("[PoolRegistry] Skipping log - no poolId in topics[1]");
          continue;
        }

        let baseFee = 0;
        let matureFee = 0;
        try {
          const [config] = decodeAbiParameters(CONFIG_TUPLE_ABI, log.data);
          baseFee = Number(config.baseFee);
          matureFee = Number(config.matureFee);
          console.log(`[PoolRegistry] Decoded pool ${poolId.slice(0, 10)}... baseFee=${baseFee} matureFee=${matureFee}`);
        } catch (decodeErr) {
          console.warn("[PoolRegistry] Decode failed for pool", poolId.slice(0, 10), decodeErr);
        }

        entries.push({
          poolId,
          configuredAt: new Date(),
          txHash: log.transactionHash!,
          baseFee,
          matureFee,
        });
      }

      // On poll scans, merge new entries with existing pools (dedup by poolId)
      if (!isDeepScan && entries.length > 0) {
        const existingIds = new Set(poolsRef.current.map((p) => p.poolId));
        const newEntries = entries.filter((e) => !existingIds.has(e.poolId));
        if (newEntries.length > 0) {
          const merged = [...poolsRef.current, ...newEntries];
          console.log(`[PoolRegistry] Merged: ${poolsRef.current.length} existing + ${newEntries.length} new = ${merged.length} pools`);
          poolsRef.current = merged;
          setPools(merged);
        }
      } else if (isDeepScan) {
        console.log(`[PoolRegistry] Deep scan found ${entries.length} pools`);
        poolsRef.current = entries;
        setPools(entries);
      }
    } catch (err) {
      console.error("[PoolRegistry] Top-level error:", err);
      const message =
        err instanceof Error && err.message.includes("HTTP request failed")
          ? "Unable to scan events. The RPC may be temporarily unavailable."
          : err instanceof Error
            ? err.message
            : "Failed to fetch pools";
      setError(message);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [publicClient, isConnected]);

  useEffect(() => {
    fetchPools();
    const interval = setInterval(fetchPools, 10_000);
    return () => clearInterval(interval);
  }, [fetchPools]);

  return { pools, isLoading, error, refetch: fetchPools };
}
