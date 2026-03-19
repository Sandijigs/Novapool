"use client";

import { useReadContract, useAccount, usePublicClient } from "wagmi";
import { useEffect, useState } from "react";
import { novaPoolHookAbi } from "./abi";
import { HOOK_ADDRESS } from "./wagmi";
import { MaturityPhase } from "./types";

/** Read the hook owner and pool manager addresses */
export function useHookInfo() {
  const owner = useReadContract({
    address: HOOK_ADDRESS,
    abi: novaPoolHookAbi,
    functionName: "owner",
  });

  const poolManager = useReadContract({
    address: HOOK_ADDRESS,
    abi: novaPoolHookAbi,
    functionName: "poolManager",
  });

  return {
    owner: owner.data as `0x${string}` | undefined,
    poolManager: poolManager.data as `0x${string}` | undefined,
    isLoading: owner.isLoading || poolManager.isLoading,
    error: owner.error || poolManager.error,
  };
}

/** Read maturity info for a specific pool */
export function usePoolMaturity(poolId: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: HOOK_ADDRESS,
    abi: novaPoolHookAbi,
    functionName: "getMaturityInfo",
    args: poolId ? [poolId] : undefined,
    query: { enabled: !!poolId, refetchInterval: 5000 },
  });

  const result = data as
    | [number, bigint, number, bigint, number]
    | undefined;

  return {
    phase: result ? (result[0] as MaturityPhase) : undefined,
    cumulativeVolume: result ? result[1] : undefined,
    uniqueTraders: result ? result[2] : undefined,
    age: result ? result[3] : undefined,
    currentFee: result ? result[4] : undefined,
    isLoading,
    error,
    refetch,
  };
}

/** Read pool config for a specific pool */
export function usePoolConfig(poolId: `0x${string}` | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: HOOK_ADDRESS,
    abi: novaPoolHookAbi,
    functionName: "poolConfigs",
    args: poolId ? [poolId] : undefined,
    query: { enabled: !!poolId },
  });

  const result = data as
    | [number, number, number, number, number, bigint, bigint, bigint, number, number, number, number, number, number]
    | undefined;

  return {
    config: result
      ? {
          baseFee: result[0],
          matureFee: result[1],
          maxSwapPctBps: result[2],
          largeTradeCooldown: result[3],
          largeTradePctBps: result[4],
          volumeForEmerging: result[5],
          volumeForGrowing: result[6],
          volumeForEstablished: result[7],
          minTradersEmerging: result[8],
          minTradersGrowing: result[9],
          minTradersEstablished: result[10],
          minAgeEmerging: result[11],
          minAgeGrowing: result[12],
          minAgeEstablished: result[13],
        }
      : undefined,
    isLoading,
    error,
  };
}

/** Check if a pool is configured */
export function useIsConfigured(poolId: `0x${string}` | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: HOOK_ADDRESS,
    abi: novaPoolHookAbi,
    functionName: "isConfigured",
    args: poolId ? [poolId] : undefined,
    query: { enabled: !!poolId },
  });

  return {
    isConfigured: data as boolean | undefined,
    isLoading,
    error,
  };
}

/** Check cooldown for the connected wallet on a specific pool */
export function useCooldownExpiry(poolId: `0x${string}` | undefined) {
  const { address } = useAccount();

  const { data, isLoading, error } = useReadContract({
    address: HOOK_ADDRESS,
    abi: novaPoolHookAbi,
    functionName: "getCooldownExpiry",
    args: poolId && address ? [poolId, address] : undefined,
    query: { enabled: !!poolId && !!address },
  });

  return {
    cooldownExpiry: data as bigint | undefined,
    isLoading,
    error,
  };
}

/** Check if connected wallet has traded in a specific pool */
export function useHasTraded(poolId: `0x${string}` | undefined) {
  const { address } = useAccount();

  const { data, isLoading, error } = useReadContract({
    address: HOOK_ADDRESS,
    abi: novaPoolHookAbi,
    functionName: "hasTraded",
    args: poolId && address ? [poolId, address] : undefined,
    query: { enabled: !!poolId && !!address },
  });

  return {
    hasTraded: data as boolean | undefined,
    isLoading,
    error,
  };
}

// GraduatedFeeApplied(bytes32 indexed poolId, uint8 phase, uint24 fee)
const GRADUATED_FEE_SIG =
  "0x4806684bda0a2c2091aac6ec4b0dd139aa034252588210dbb80b73a468e8c65b";

/** Count on-chain swaps for a specific pool by reading GraduatedFeeApplied events.
 *  Each swap emits exactly one GraduatedFeeApplied — so the count = total swaps. */
export function useSwapCount(poolId: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!poolId || !publicClient) return;
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock =
          currentBlock > BigInt(200000)
            ? currentBlock - BigInt(200000)
            : BigInt(0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logs: any[] = await publicClient.request({
          method: "eth_getLogs",
          params: [
            {
              address: HOOK_ADDRESS,
              topics: [GRADUATED_FEE_SIG, poolId],
              fromBlock: `0x${fromBlock.toString(16)}`,
              toBlock: `0x${currentBlock.toString(16)}`,
            },
          ],
        });
        if (!cancelled) setCount(logs.length);
      } catch {
        /* retry next interval */
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [poolId, publicClient]);

  return count;
}
