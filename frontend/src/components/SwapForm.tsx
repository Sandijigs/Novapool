"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { novaPoolRouterAbi, erc20Abi } from "@/lib/abi";
import {
  ROUTER_ADDRESS,
  HOOK_ADDRESS,
  DYNAMIC_FEE_FLAG,
  MIN_SQRT_PRICE,
  MAX_SQRT_PRICE,
  TOKEN_A_ADDRESS,
  TOKEN_B_ADDRESS,
} from "@/lib/wagmi";

const inputCls =
  "w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted/40 focus:border-nova-cyan/60 focus:outline-none focus:ring-1 focus:ring-nova-cyan/20 transition-colors";
const labelCls = "text-sm text-muted mb-1 block";

interface SwapFormProps {
  currency0?: string;
  currency1?: string;
  tickSpacing?: number;
}

export function SwapForm({ currency0, currency1, tickSpacing = 60 }: SwapFormProps) {
  const { isConnected, address } = useAccount();
  const [amount, setAmount] = useState("");
  const [zeroForOne, setZeroForOne] = useState(true);
  const [c0, setC0] = useState(currency0 ?? TOKEN_A_ADDRESS);
  const [c1, setC1] = useState(currency1 ?? TOKEN_B_ADDRESS);

  // Approve
  const {
    writeContract: writeApprove,
    data: approveTx,
    isPending: isApproving,
  } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveTx });

  // Swap
  const {
    writeContract: writeSwap,
    data: swapTx,
    isPending: isSwapping,
    error: swapWriteError,
    reset: resetSwap,
  } = useWriteContract();
  const {
    isLoading: isSwapConfirming,
    isSuccess: swapSuccess,
    isError: swapReceiptError,
    data: swapReceipt,
  } = useWaitForTransactionReceipt({ hash: swapTx });

  // Friendly error message state
  const [swapErrorMsg, setSwapErrorMsg] = useState<string | null>(null);

  // Parse errors into user-friendly messages
  useEffect(() => {
    if (swapWriteError) {
      const msg = swapWriteError.message;
      if (msg.includes("SwapExceedsMaxSize") || msg.includes("exceeds max")) {
        setSwapErrorMsg("Swap too large — exceeds max swap size cap (5% of liquidity)");
      } else if (msg.includes("CooldownNotExpired")) {
        setSwapErrorMsg("Cooldown active — wait before making another large swap");
      } else if (msg.includes("User rejected") || msg.includes("User denied")) {
        setSwapErrorMsg("Transaction rejected");
      } else if (msg.includes("reverted")) {
        setSwapErrorMsg("Transaction reverted — the swap was blocked by pool guards");
      } else {
        setSwapErrorMsg(msg.slice(0, 120));
      }
    } else if (swapReceiptError || (swapReceipt && swapReceipt.status === "reverted")) {
      setSwapErrorMsg("Transaction reverted on-chain — swap was blocked by anti-manipulation guards");
    } else if (swapSuccess) {
      setSwapErrorMsg(null);
    }
  }, [swapWriteError, swapReceiptError, swapReceipt, swapSuccess]);

  // Clear error when user starts a new swap
  const handleReset = () => {
    resetSwap();
    setSwapErrorMsg(null);
  };

  // Read allowance for the input token
  const inputToken = zeroForOne ? c0 : c1;
  const { data: allowance } = useReadContract({
    address: inputToken as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address!, ROUTER_ADDRESS],
    query: { enabled: !!address && !!inputToken },
  });

  // Read balance
  const { data: balance } = useReadContract({
    address: inputToken as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address && !!inputToken },
  });

  if (!isConnected) return null;

  const parsedAmount = amount ? parseEther(amount) : BigInt(0);
  const needsApproval =
    allowance !== undefined && parsedAmount > BigInt(0) && allowance < parsedAmount;

  const handleApprove = () => {
    if (!inputToken) return;
    writeApprove({
      address: inputToken as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [ROUTER_ADDRESS, parsedAmount],
    });
  };

  const handleSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!c0 || !c1 || !amount) return;
    handleReset();

    // Ensure correct ordering
    let sortedC0 = c0.toLowerCase();
    let sortedC1 = c1.toLowerCase();
    let actualZeroForOne = zeroForOne;
    if (sortedC0 > sortedC1) {
      [sortedC0, sortedC1] = [sortedC1, sortedC0];
      actualZeroForOne = !zeroForOne;
    }

    // Exact input: negative amountSpecified
    const amountSpecified = -parsedAmount;

    writeSwap({
      address: ROUTER_ADDRESS,
      abi: novaPoolRouterAbi,
      functionName: "swap",
      args: [
        {
          currency0: sortedC0 as `0x${string}`,
          currency1: sortedC1 as `0x${string}`,
          fee: DYNAMIC_FEE_FLAG,
          tickSpacing,
          hooks: HOOK_ADDRESS,
        },
        actualZeroForOne,
        amountSpecified,
        actualZeroForOne ? MIN_SQRT_PRICE + BigInt(1) : MAX_SQRT_PRICE - BigInt(1),
      ],
    });
  };

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-nova-cyan/10">
          <svg
            className="h-4 w-4 text-nova-cyan"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold">Swap</p>
          <p className="text-sm text-muted">
            Execute a swap through the NovaPool hook
          </p>
        </div>
      </div>

      <form onSubmit={handleSwap} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Token A</label>
            <input
              type="text"
              placeholder="0x..."
              value={c0}
              onChange={(e) => setC0(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Token B</label>
            <input
              type="text"
              placeholder="0x..."
              value={c1}
              onChange={(e) => setC1(e.target.value)}
              required
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Amount (exact input)</label>
            <input
              type="text"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className={inputCls}
            />
            {balance !== undefined && (
              <p className="mt-1 text-xs text-muted">
                Balance: {parseFloat(formatEther(balance)).toFixed(4)}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Direction</label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setZeroForOne(true)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  zeroForOne
                    ? "bg-nova-cyan/20 text-nova-cyan border border-nova-cyan/30"
                    : "bg-background border border-card-border text-muted hover:text-foreground"
                }`}
              >
                A &rarr; B
              </button>
              <button
                type="button"
                onClick={() => setZeroForOne(false)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  !zeroForOne
                    ? "bg-nova-cyan/20 text-nova-cyan border border-nova-cyan/30"
                    : "bg-background border border-card-border text-muted hover:text-foreground"
                }`}
              >
                B &rarr; A
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {needsApproval ? (
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving || isApproveConfirming}
                className="rounded-xl bg-linear-to-r from-nova-purple to-nova-blue px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isApproving
                  ? "Confirm Approve..."
                  : isApproveConfirming
                    ? "Approving..."
                    : "Approve Token"}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSwapping || isSwapConfirming || !amount}
                className="rounded-xl bg-linear-to-r from-nova-cyan to-nova-green px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSwapping
                  ? "Confirm in Wallet..."
                  : isSwapConfirming
                    ? "Swapping..."
                    : "Swap"}
              </button>
            )}
            {approveSuccess && !needsApproval && (
              <span className="text-sm text-nova-green font-medium">
                Approved!
              </span>
            )}
            {swapSuccess && (
              <span className="text-sm text-nova-green font-medium">
                Swap complete!
              </span>
            )}
          </div>
          {swapErrorMsg && (
            <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5">
              <span className="text-sm text-red-400">{swapErrorMsg}</span>
              <button
                type="button"
                onClick={handleReset}
                className="ml-auto shrink-0 rounded-lg bg-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
