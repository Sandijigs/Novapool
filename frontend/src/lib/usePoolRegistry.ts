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
      const logs = await publicClient.getContractEvents({
        address: HOOK_ADDRESS,
        abi: novaPoolHookAbi,
        eventName: "PoolConfigured",
        fromBlock: BigInt(0),
        toBlock: "latest",
      });

      const entries: PoolEntry[] = logs.map((log) => {
        const args = log.args as {
          poolId: `0x${string}`;
          config: { baseFee: number; matureFee: number };
        };
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
      setError(err instanceof Error ? err.message : "Failed to fetch pools");
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, isConnected]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return { pools, isLoading, error, refetch: fetchPools };
}
