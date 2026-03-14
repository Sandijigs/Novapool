"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { poolManagerAbi } from "@/lib/abi";
import {
  POOL_MANAGER_ADDRESS,
  HOOK_ADDRESS,
  DYNAMIC_FEE_FLAG,
  SQRT_PRICE_1_1,
  TOKEN_A_ADDRESS,
  TOKEN_B_ADDRESS,
} from "@/lib/wagmi";

const inputCls =
  "w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted/40 focus:border-nova-blue/60 focus:outline-none focus:ring-1 focus:ring-nova-blue/20 transition-colors";
const labelCls = "text-sm text-muted mb-1 block";

interface InitializePoolFormProps {
  onPoolInitialized?: (poolId: string) => void;
}

export function InitializePoolForm({
  onPoolInitialized,
}: InitializePoolFormProps) {
  const { isConnected } = useAccount();
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  const [currency0, setCurrency0] = useState(TOKEN_A_ADDRESS as string);
  const [currency1, setCurrency1] = useState(TOKEN_B_ADDRESS as string);
  const [tickSpacing, setTickSpacing] = useState("60");

  if (!isConnected) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Sort currencies so currency0 < currency1
    let c0 = currency0.toLowerCase() as `0x${string}`;
    let c1 = currency1.toLowerCase() as `0x${string}`;
    if (c0 > c1) [c0, c1] = [c1, c0];

    writeContract({
      address: POOL_MANAGER_ADDRESS,
      abi: poolManagerAbi,
      functionName: "initialize",
      args: [
        {
          currency0: c0,
          currency1: c1,
          fee: DYNAMIC_FEE_FLAG,
          tickSpacing: parseInt(tickSpacing),
          hooks: HOOK_ADDRESS,
        },
        SQRT_PRICE_1_1,
      ],
    });
  };

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-nova-blue/10">
          <svg
            className="h-4 w-4 text-nova-blue"
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
          <p className="text-base font-semibold">Initialize Pool</p>
          <p className="text-sm text-muted">
            Create a new Uniswap v4 pool with NovaPool hook
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>Token A Address</label>
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
            <label className={labelCls}>Token B Address</label>
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

        <div className="rounded-lg bg-nova-blue/5 border border-nova-blue/10 px-4 py-2 text-sm text-muted">
          Pool starts at 1:1 price ratio. Make sure to{" "}
          <strong className="text-foreground">configurePool</strong> first on the
          hook before initializing.
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="rounded-xl bg-linear-to-r from-nova-blue to-nova-cyan px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending
              ? "Confirm in Wallet..."
              : isConfirming
                ? "Confirming..."
                : "Initialize Pool"}
          </button>
          {isSuccess && (
            <span className="text-sm text-nova-green font-medium">
              Pool initialized!
            </span>
          )}
          {error && (
            <span className="text-sm text-red-400 truncate max-w-xs">
              {error.message.slice(0, 80)}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
