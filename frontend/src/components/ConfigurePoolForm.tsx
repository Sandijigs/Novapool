"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import { novaPoolHookAbi } from "@/lib/abi";
import { HOOK_ADDRESS, TOKEN_A_ADDRESS, TOKEN_B_ADDRESS } from "@/lib/wagmi";
import { useHookInfo } from "@/lib/useOnChainPool";

const DYNAMIC_FEE_FLAG = 0x800000;

const inputCls =
  "w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted/40 focus:border-nova-purple/60 focus:outline-none focus:ring-1 focus:ring-nova-purple/20 transition-colors";
const labelCls = "text-sm text-muted mb-1 block";

export function ConfigurePoolForm() {
  const { isConnected, address } = useAccount();
  const { owner } = useHookInfo();
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (txHash) console.log("[ConfigurePool] Tx submitted:", txHash);
  }, [txHash]);
  useEffect(() => {
    if (isSuccess) console.log("[ConfigurePool] Tx CONFIRMED:", txHash);
  }, [isSuccess, txHash]);
  useEffect(() => {
    if (error) console.error("[ConfigurePool] Error:", error.message);
  }, [error]);

  const [currency0, setCurrency0] = useState(TOKEN_A_ADDRESS as string);
  const [currency1, setCurrency1] = useState(TOKEN_B_ADDRESS as string);
  const [tickSpacing, setTickSpacing] = useState("60");
  const [baseFee, setBaseFee] = useState("10000");
  const [matureFee, setMatureFee] = useState("500");
  const [maxSwapPctBps, setMaxSwapPctBps] = useState("500");
  const [largeTradeCooldown, setLargeTradeCooldown] = useState("60");
  const [largeTradePctBps, setLargeTradePctBps] = useState("200");
  const [volumeForEmerging, setVolumeForEmerging] = useState("0.01");
  const [volumeForGrowing, setVolumeForGrowing] = useState("0.05");
  const [volumeForEstablished, setVolumeForEstablished] = useState("0.1");
  const [minTradersEmerging, setMinTradersEmerging] = useState("1");
  const [minTradersGrowing, setMinTradersGrowing] = useState("1");
  const [minTradersEstablished, setMinTradersEstablished] = useState("1");
  const [minAgeEmerging, setMinAgeEmerging] = useState("60");
  const [minAgeGrowing, setMinAgeGrowing] = useState("120");
  const [minAgeEstablished, setMinAgeEstablished] = useState("180");

  if (!isConnected) return null;

  const isOwner =
    owner && address && owner.toLowerCase() === address.toLowerCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Sort currencies so currency0 < currency1 (must match pool key)
    let c0 = currency0.toLowerCase() as `0x${string}`;
    let c1 = currency1.toLowerCase() as `0x${string}`;
    if (c0 > c1) [c0, c1] = [c1, c0];

    const poolKey = {
      currency0: c0,
      currency1: c1,
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

    console.log("[ConfigurePool] Submitting...");
    console.log("[ConfigurePool] Hook address:", HOOK_ADDRESS);
    console.log("[ConfigurePool] Pool key:", JSON.stringify(poolKey, (_, v) => typeof v === "bigint" ? v.toString() : v));
    console.log("[ConfigurePool] Config:", JSON.stringify(config, (_, v) => typeof v === "bigint" ? v.toString() : v));
    console.log("[ConfigurePool] Connected address:", address);
    console.log("[ConfigurePool] Hook owner:", owner);

    writeContract({
      address: HOOK_ADDRESS,
      abi: novaPoolHookAbi,
      functionName: "configurePool",
      args: [poolKey, config],
    });
  };

  return (
    <div className="rounded-2xl border border-card-border bg-card overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left hover:bg-card-border/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-nova-purple/10">
            <svg
              className="h-4 w-4 text-nova-purple"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold">Configure New Pool</p>
            <p className="text-sm text-muted">
              Set fee graduation and anti-manipulation params
            </p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-muted transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Collapsible Form */}
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="border-t border-card-border p-5 space-y-5"
        >
          {!isOwner && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
              Only the hook owner can configure pools.
            </div>
          )}

          {/* Pool Key */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
              Pool Key
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>Currency 0</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={currency0}
                  onChange={(e) => setCurrency0(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Currency 1</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={currency1}
                  onChange={(e) => setCurrency1(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Tick Spacing</label>
                <input
                  type="number"
                  value={tickSpacing}
                  onChange={(e) => setTickSpacing(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Fees & Guards */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
              Fees & Guards (bps)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className={labelCls}>Base Fee</label>
                <input
                  type="number"
                  value={baseFee}
                  onChange={(e) => setBaseFee(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Mature Fee</label>
                <input
                  type="number"
                  value={matureFee}
                  onChange={(e) => setMatureFee(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Max Swap %</label>
                <input
                  type="number"
                  value={maxSwapPctBps}
                  onChange={(e) => setMaxSwapPctBps(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Large Trade %</label>
                <input
                  type="number"
                  value={largeTradePctBps}
                  onChange={(e) => setLargeTradePctBps(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Cooldown (s)</label>
                <input
                  type="number"
                  value={largeTradeCooldown}
                  onChange={(e) => setLargeTradeCooldown(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Thresholds Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
                Volume Thresholds (ETH)
              </p>
              <div className="space-y-2">
                <div>
                  <label className={labelCls}>Emerging</label>
                  <input
                    type="text"
                    value={volumeForEmerging}
                    onChange={(e) => setVolumeForEmerging(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Growing</label>
                  <input
                    type="text"
                    value={volumeForGrowing}
                    onChange={(e) => setVolumeForGrowing(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Established</label>
                  <input
                    type="text"
                    value={volumeForEstablished}
                    onChange={(e) => setVolumeForEstablished(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
                Min Traders
              </p>
              <div className="space-y-2">
                <div>
                  <label className={labelCls}>Emerging</label>
                  <input
                    type="number"
                    value={minTradersEmerging}
                    onChange={(e) => setMinTradersEmerging(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Growing</label>
                  <input
                    type="number"
                    value={minTradersGrowing}
                    onChange={(e) => setMinTradersGrowing(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Established</label>
                  <input
                    type="number"
                    value={minTradersEstablished}
                    onChange={(e) => setMinTradersEstablished(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
                Min Age (seconds)
              </p>
              <div className="space-y-2">
                <div>
                  <label className={labelCls}>Emerging</label>
                  <input
                    type="number"
                    value={minAgeEmerging}
                    onChange={(e) => setMinAgeEmerging(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Growing</label>
                  <input
                    type="number"
                    value={minAgeGrowing}
                    onChange={(e) => setMinAgeGrowing(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Established</label>
                  <input
                    type="number"
                    value={minAgeEstablished}
                    onChange={(e) => setMinAgeEstablished(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={!isOwner || isPending || isConfirming}
              className="rounded-xl bg-linear-to-r from-nova-purple to-nova-blue px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending
                ? "Confirm in Wallet..."
                : isConfirming
                  ? "Confirming..."
                  : "Configure Pool"}
            </button>
            {isSuccess && (
              <span className="text-sm text-nova-green font-medium">
                Pool configured!
              </span>
            )}
            {error && (
              <span className="text-sm text-red-400 truncate max-w-xs">
                {error.message.slice(0, 80)}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
