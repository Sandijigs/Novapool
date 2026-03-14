"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { novaPoolRouterAbi, erc20Abi } from "@/lib/abi";
import { ROUTER_ADDRESS, HOOK_ADDRESS, DYNAMIC_FEE_FLAG, TOKEN_A_ADDRESS, TOKEN_B_ADDRESS } from "@/lib/wagmi";

const inputCls =
  "w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted/40 focus:border-nova-green/60 focus:outline-none focus:ring-1 focus:ring-nova-green/20 transition-colors";
const labelCls = "text-sm text-muted mb-1 block";

interface AddLiquidityFormProps {
  currency0?: string;
  currency1?: string;
  tickSpacing?: number;
}

export function AddLiquidityForm({
  currency0,
  currency1,
  tickSpacing = 60,
}: AddLiquidityFormProps) {
  const { isConnected, address } = useAccount();
  const [c0, setC0] = useState(currency0 ?? TOKEN_A_ADDRESS);
  const [c1, setC1] = useState(currency1 ?? TOKEN_B_ADDRESS);
  const [tickLower, setTickLower] = useState("-600");
  const [tickUpper, setTickUpper] = useState("600");
  const [liquidityAmount, setLiquidityAmount] = useState("");

  // Approve token0
  const {
    writeContract: writeApprove0,
    data: approve0Tx,
    isPending: isApproving0,
  } = useWriteContract();
  const { isLoading: isApprove0Confirming, isSuccess: approve0Success } =
    useWaitForTransactionReceipt({ hash: approve0Tx });

  // Approve token1
  const {
    writeContract: writeApprove1,
    data: approve1Tx,
    isPending: isApproving1,
  } = useWriteContract();
  const { isLoading: isApprove1Confirming, isSuccess: approve1Success } =
    useWaitForTransactionReceipt({ hash: approve1Tx });

  // Modify liquidity
  const {
    writeContract: writeLiquidity,
    data: liquidityTx,
    isPending: isAdding,
    error: liquidityError,
  } = useWriteContract();
  const { isLoading: isAddConfirming, isSuccess: addSuccess } =
    useWaitForTransactionReceipt({ hash: liquidityTx });

  // Sort tokens
  let sortedC0 = c0.toLowerCase();
  let sortedC1 = c1.toLowerCase();
  if (sortedC0 > sortedC1 && sortedC0 && sortedC1) {
    [sortedC0, sortedC1] = [sortedC1, sortedC0];
  }

  const approvalAmount = parseEther("1000000"); // Approve plenty for LP

  // Read allowances
  const { data: allowance0 } = useReadContract({
    address: sortedC0 as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address!, ROUTER_ADDRESS],
    query: { enabled: !!address && !!sortedC0 },
  });

  const { data: allowance1 } = useReadContract({
    address: sortedC1 as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address!, ROUTER_ADDRESS],
    query: { enabled: !!address && !!sortedC1 },
  });

  // Balances
  const { data: balance0 } = useReadContract({
    address: sortedC0 as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address && !!sortedC0 },
  });

  const { data: balance1 } = useReadContract({
    address: sortedC1 as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address && !!sortedC1 },
  });

  if (!isConnected) return null;

  const needsApprove0 =
    allowance0 !== undefined && allowance0 < approvalAmount;
  const needsApprove1 =
    allowance1 !== undefined && allowance1 < approvalAmount;

  const handleApprove0 = () => {
    writeApprove0({
      address: sortedC0 as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [ROUTER_ADDRESS, approvalAmount],
    });
  };

  const handleApprove1 = () => {
    writeApprove1({
      address: sortedC1 as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [ROUTER_ADDRESS, approvalAmount],
    });
  };

  const handleAddLiquidity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sortedC0 || !sortedC1 || !liquidityAmount) return;

    writeLiquidity({
      address: ROUTER_ADDRESS,
      abi: novaPoolRouterAbi,
      functionName: "modifyLiquidity",
      args: [
        {
          currency0: sortedC0 as `0x${string}`,
          currency1: sortedC1 as `0x${string}`,
          fee: DYNAMIC_FEE_FLAG,
          tickSpacing,
          hooks: HOOK_ADDRESS,
        },
        parseInt(tickLower),
        parseInt(tickUpper),
        parseEther(liquidityAmount),
      ],
    });
  };

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-nova-green/10">
          <svg
            className="h-4 w-4 text-nova-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold">Add Liquidity</p>
          <p className="text-sm text-muted">
            Provide liquidity to earn fees as the pool matures
          </p>
        </div>
      </div>

      <form onSubmit={handleAddLiquidity} className="space-y-4">
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
            {balance0 !== undefined && (
              <p className="mt-1 text-xs text-muted">
                Balance: {parseFloat(formatEther(balance0)).toFixed(4)}
              </p>
            )}
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
            {balance1 !== undefined && (
              <p className="mt-1 text-xs text-muted">
                Balance: {parseFloat(formatEther(balance1)).toFixed(4)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Tick Lower</label>
            <input
              type="number"
              value={tickLower}
              onChange={(e) => setTickLower(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tick Upper</label>
            <input
              type="number"
              value={tickUpper}
              onChange={(e) => setTickUpper(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Liquidity Amount</label>
            <input
              type="text"
              placeholder="e.g. 1000"
              value={liquidityAmount}
              onChange={(e) => setLiquidityAmount(e.target.value)}
              required
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {needsApprove0 && (
            <button
              type="button"
              onClick={handleApprove0}
              disabled={isApproving0 || isApprove0Confirming}
              className="rounded-xl bg-linear-to-r from-nova-purple to-nova-blue px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isApproving0 || isApprove0Confirming
                ? "Approving A..."
                : "Approve Token A"}
            </button>
          )}
          {needsApprove1 && (
            <button
              type="button"
              onClick={handleApprove1}
              disabled={isApproving1 || isApprove1Confirming}
              className="rounded-xl bg-linear-to-r from-nova-blue to-nova-cyan px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isApproving1 || isApprove1Confirming
                ? "Approving B..."
                : "Approve Token B"}
            </button>
          )}
          {!needsApprove0 && !needsApprove1 && (
            <button
              type="submit"
              disabled={isAdding || isAddConfirming || !liquidityAmount}
              className="rounded-xl bg-linear-to-r from-nova-green to-nova-cyan px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isAdding
                ? "Confirm in Wallet..."
                : isAddConfirming
                  ? "Adding Liquidity..."
                  : "Add Liquidity"}
            </button>
          )}

          {(approve0Success || approve1Success) && (
            <span className="text-sm text-nova-green font-medium">
              Approved!
            </span>
          )}
          {addSuccess && (
            <span className="text-sm text-nova-green font-medium">
              Liquidity added!
            </span>
          )}
          {liquidityError && (
            <span className="text-sm text-red-400 truncate max-w-xs">
              {liquidityError.message.slice(0, 80)}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
