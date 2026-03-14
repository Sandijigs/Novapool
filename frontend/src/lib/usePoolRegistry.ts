"use client";

import { useState, useEffect, useCallback } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { novaPoolHookAbi } from "./abi";
import { HOOK_ADDRESS } from "./wagmi";

export interface PoolEntry {
  poolId: `0x${string}`;
  configuredAt: Date;
  txHash: `0x${string}`;
  baseFee: number;
  matureFee: number;
}

/**
 * Block ranges to try, in order from largest to smallest.
 * Unichain Sepolia's RPC rejects eth_getLogs with large ranges,
 * so we start small and fall back to even smaller windows.
 */
const BLOCK_RANGE_ATTEMPTS = [
  BigInt(500),
  BigInt(2_000),
  BigInt(5_000),
  BigInt(10_000),
];

/**
 * Scans PoolConfigured events from the hook contract to build
 * a client-side registry of all NovaPool-managed pools.
 */
export function usePoolRegistry() {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [pools, setPools] = useState<PoolEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    if (!publicClient || !isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentBlock = await publicClient.getBlockNumber();

      let logs: Awaited<ReturnType<typeof publicClient.getContractEvents>> = [];
      let succeeded = false;

      // Try progressively smaller block ranges until one works
      for (const range of BLOCK_RANGE_ATTEMPTS) {
        const fromBlock = currentBlock > range ? currentBlock - range : BigInt(0);

        try {
          logs = await publicClient.getContractEvents({
            address: HOOK_ADDRESS,
            abi: novaPoolHookAbi,
            eventName: "PoolConfigured",
            fromBlock,
            toBlock: "latest",
          });
          succeeded = true;
          break;
        } catch {
          // This range was too large for the RPC — try a smaller one
          continue;
        }
      }

      // If all ranged queries failed, try with no fromBlock (RPC default)
      if (!succeeded) {
        try {
          logs = await publicClient.getContractEvents({
            address: HOOK_ADDRESS,
            abi: novaPoolHookAbi,
            eventName: "PoolConfigured",
          });
          succeeded = true;
        } catch {
          // Final fallback failed too
        }
      }

      if (!succeeded) {
        setError("Unable to scan events. The RPC may be temporarily unavailable.");
        return;
      }

      const entries: PoolEntry[] = logs.map((log) => {
        const args = (log as unknown as { args: {
          poolId: `0x${string}`;
          config: { baseFee: number; matureFee: number };
        } }).args;
        return {
          poolId: args.poolId,
          configuredAt: new Date(),
          txHash: log.transactionHash!,
          baseFee: args.config?.baseFee ?? 0,
          matureFee: args.config?.matureFee ?? 0,
        };
      });

      setPools(entries);
    } catch (err) {
      // Catch-all for unexpected errors (e.g. getBlockNumber failing)
      const message =
        err instanceof Error && err.message.includes("HTTP request failed")
          ? "Unable to scan events. The RPC may be temporarily unavailable."
          : err instanceof Error
            ? err.message
            : "Failed to fetch pools";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, isConnected]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return { pools, isLoading, error, refetch: fetchPools };
}
