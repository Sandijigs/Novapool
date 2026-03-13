"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { novaPoolHookAbi } from "@/lib/abi";
import { HOOK_ADDRESS } from "@/lib/wagmi";
import { useHookInfo } from "@/lib/useOnChainPool";

const DYNAMIC_FEE_FLAG = 0x800000;

export function ConfigurePoolForm() {
  const { isConnected, address } = useAccount();
  const { owner } = useHookInfo();
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Pool key fields
  const [currency0, setCurrency0] = useState("");
  const [currency1, setCurrency1] = useState("");
  const [tickSpacing, setTickSpacing] = useState("60");

  // Config fields with defaults matching the contract
  const [baseFee, setBaseFee] = useState("10000");
  const [matureFee, setMatureFee] = useState("500");
  const [maxSwapPctBps, setMaxSwapPctBps] = useState("500");
  const [largeTradeCooldown, setLargeTradeCooldown] = useState("60");
  const [largeTradePctBps, setLargeTradePctBps] = useState("200");
  const [volumeForEmerging, setVolumeForEmerging] = useState("100");
  const [volumeForGrowing, setVolumeForGrowing] = useState("1000");
  const [volumeForEstablished, setVolumeForEstablished] = useState("10000");
  const [minTradersEmerging, setMinTradersEmerging] = useState("10");
  const [minTradersGrowing, setMinTradersGrowing] = useState("50");
  const [minTradersEstablished, setMinTradersEstablished] = useState("200");
  const [minAgeEmerging, setMinAgeEmerging] = useState("86400");
  const [minAgeGrowing, setMinAgeGrowing] = useState("604800");
  const [minAgeEstablished, setMinAgeEstablished] = useState("2592000");

  if (!isConnected) return null;

  const isOwner =
    owner && address && owner.toLowerCase() === address.toLowerCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const poolKey = {
      currency0: currency0 as `0x${string}`,
      currency1: currency1 as `0x${string}`,
      fee: DYNAMIC_FEE_FLAG,
      tickSpacing: parseInt(tickSpacing),
      hooks: HOOK_ADDRESS,
    };

    const config = {
      baseFee: parseInt(baseFee),
      matureFee: parseInt(matureFee),
      maxSwapPctBps: parseInt(maxSwapPctBps),
      largeTradeCooldown: parseInt(largeTradeCooldown),
      largeTradePctBps: parseInt(largeTradePctBps),
      volumeForEmerging: parseEther(volumeForEmerging),
      volumeForGrowing: parseEther(volumeForGrowing),
      volumeForEstablished: parseEther(volumeForEstablished),
      minTradersEmerging: parseInt(minTradersEmerging),
      minTradersGrowing: parseInt(minTradersGrowing),
      minTradersEstablished: parseInt(minTradersEstablished),
      minAgeEmerging: parseInt(minAgeEmerging),
      minAgeGrowing: parseInt(minAgeGrowing),
      minAgeEstablished: parseInt(minAgeEstablished),
    };

    writeContract({
      address: HOOK_ADDRESS,
      abi: novaPoolHookAbi,
      functionName: "configurePool",
      args: [poolKey, config],
    });
  };

  return (
    <div className="col-span-full rounded-xl border border-card-border bg-card p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted">
        Configure Pool
      </h2>
      <p className="mb-4 text-xs text-muted">
        Set custom fee graduation and anti-manipulation params before pool
        initialization.{" "}
        {!isOwner && (
          <span className="text-nova-yellow">
            Only the hook owner can configure pools.
          </span>
        )}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pool Key */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted mb-1">
            Pool Key
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Currency0 (0x...)"
              value={currency0}
              onChange={(e) => setCurrency0(e.target.value)}
              required
              className="rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted/50 focus:border-nova-purple focus:outline-none"
            />
            <input
              type="text"
              placeholder="Currency1 (0x...)"
              value={currency1}
              onChange={(e) => setCurrency1(e.target.value)}
              required
              className="rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted/50 focus:border-nova-purple focus:outline-none"
            />
          </div>
          <input
            type="number"
            placeholder="Tick Spacing"
            value={tickSpacing}
            onChange={(e) => setTickSpacing(e.target.value)}
            className="w-32 rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted/50 focus:border-nova-purple focus:outline-none"
          />
        </fieldset>

        {/* Fee Config */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted mb-1">
            Fee Graduation (basis points)
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs text-muted">Base Fee</span>
              <input
                type="number"
                value={baseFee}
                onChange={(e) => setBaseFee(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Mature Fee</span>
              <input
                type="number"
                value={matureFee}
                onChange={(e) => setMatureFee(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Max Swap %</span>
              <input
                type="number"
                value={maxSwapPctBps}
                onChange={(e) => setMaxSwapPctBps(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Large Trade %</span>
              <input
                type="number"
                value={largeTradePctBps}
                onChange={(e) => setLargeTradePctBps(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <span className="text-xs text-muted">Cooldown (sec)</span>
            <input
              type="number"
              value={largeTradeCooldown}
              onChange={(e) => setLargeTradeCooldown(e.target.value)}
              className="w-24 rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
            />
          </label>
        </fieldset>

        {/* Volume Thresholds */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted mb-1">
            Volume Thresholds (ETH)
          </legend>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-muted">Emerging</span>
              <input
                type="text"
                value={volumeForEmerging}
                onChange={(e) => setVolumeForEmerging(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Growing</span>
              <input
                type="text"
                value={volumeForGrowing}
                onChange={(e) => setVolumeForGrowing(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Established</span>
              <input
                type="text"
                value={volumeForEstablished}
                onChange={(e) => setVolumeForEstablished(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
          </div>
        </fieldset>

        {/* Trader Thresholds */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted mb-1">
            Minimum Traders
          </legend>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-muted">Emerging</span>
              <input
                type="number"
                value={minTradersEmerging}
                onChange={(e) => setMinTradersEmerging(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Growing</span>
              <input
                type="number"
                value={minTradersGrowing}
                onChange={(e) => setMinTradersGrowing(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Established</span>
              <input
                type="number"
                value={minTradersEstablished}
                onChange={(e) => setMinTradersEstablished(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
          </div>
        </fieldset>

        {/* Age Thresholds */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted mb-1">
            Minimum Age (seconds)
          </legend>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-muted">Emerging</span>
              <input
                type="number"
                value={minAgeEmerging}
                onChange={(e) => setMinAgeEmerging(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Growing</span>
              <input
                type="number"
                value={minAgeGrowing}
                onChange={(e) => setMinAgeGrowing(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Established</span>
              <input
                type="number"
                value={minAgeEstablished}
                onChange={(e) => setMinAgeEstablished(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-nova-purple focus:outline-none"
              />
            </label>
          </div>
        </fieldset>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!isOwner || isPending || isConfirming}
            className="rounded-lg bg-nova-purple px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending
              ? "Confirm in Wallet..."
              : isConfirming
                ? "Confirming..."
                : "Configure Pool"}
          </button>

          {isSuccess && (
            <span className="text-sm text-nova-green">
              Pool configured on-chain!
            </span>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400">
            {error.message.slice(0, 120)}
          </p>
        )}
      </form>
    </div>
  );
}
