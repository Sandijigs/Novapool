"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { erc20Abi } from "@/lib/abi";
import { TOKEN_A_ADDRESS, TOKEN_B_ADDRESS } from "@/lib/wagmi";

export function MintTestTokens() {
  const { isConnected, address } = useAccount();
  const [mintAmount, setMintAmount] = useState("10000");

  const {
    writeContract: writeMintA,
    data: mintATx,
    isPending: isMintingA,
  } = useWriteContract();
  const { isLoading: isMintAConfirming, isSuccess: mintASuccess } =
    useWaitForTransactionReceipt({ hash: mintATx });

  const {
    writeContract: writeMintB,
    data: mintBTx,
    isPending: isMintingB,
  } = useWriteContract();
  const { isLoading: isMintBConfirming, isSuccess: mintBSuccess } =
    useWaitForTransactionReceipt({ hash: mintBTx });

  const { data: balA } = useReadContract({
    address: TOKEN_A_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address && TOKEN_A_ADDRESS !== "0x0000000000000000000000000000000000000000" },
  });

  const { data: balB } = useReadContract({
    address: TOKEN_B_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address && TOKEN_B_ADDRESS !== "0x0000000000000000000000000000000000000000" },
  });

  if (!isConnected) return null;

  const isZeroAddress =
    TOKEN_A_ADDRESS === "0x0000000000000000000000000000000000000000" ||
    TOKEN_B_ADDRESS === "0x0000000000000000000000000000000000000000";

  const handleMintA = () => {
    writeMintA({
      address: TOKEN_A_ADDRESS,
      abi: erc20Abi,
      functionName: "mint",
      args: [address!, parseEther(mintAmount)],
    });
  };

  const handleMintB = () => {
    writeMintB({
      address: TOKEN_B_ADDRESS,
      abi: erc20Abi,
      functionName: "mint",
      args: [address!, parseEther(mintAmount)],
    });
  };

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-nova-yellow/10">
          <svg
            className="h-4 w-4 text-nova-yellow"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold">Mint Test Tokens</p>
          <p className="text-sm text-muted">
            Get demo tokens (NOVA-A / NOVA-B) for testing
          </p>
        </div>
      </div>

      {isZeroAddress ? (
        <div className="rounded-lg bg-nova-yellow/5 border border-nova-yellow/20 px-4 py-3 text-sm text-muted">
          Demo tokens not yet deployed. Run{" "}
          <code className="rounded bg-card-border/50 px-1.5 py-0.5 text-xs font-mono text-nova-yellow">
            forge script script/DeployRouter.s.sol --rpc-url unichain-sepolia --broadcast
          </code>{" "}
          and update the addresses in <code className="text-xs font-mono text-nova-yellow">wagmi.ts</code>.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted mb-1 block">Mint Amount</label>
            <input
              type="text"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted/40 focus:border-nova-yellow/60 focus:outline-none focus:ring-1 focus:ring-nova-yellow/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-card-border bg-background/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-nova-purple">
                  NOVA-A
                </span>
                <span className="text-xs text-muted font-mono">
                  {balA !== undefined
                    ? parseFloat(formatEther(balA)).toFixed(2)
                    : "--"}
                </span>
              </div>
              <button
                onClick={handleMintA}
                disabled={isMintingA || isMintAConfirming}
                className="w-full rounded-lg bg-nova-purple/20 py-2 text-sm font-semibold text-nova-purple hover:bg-nova-purple/30 transition-colors disabled:opacity-40"
              >
                {isMintingA || isMintAConfirming ? "Minting..." : "Mint NOVA-A"}
              </button>
              {mintASuccess && (
                <p className="mt-1 text-xs text-nova-green text-center">Minted!</p>
              )}
            </div>

            <div className="rounded-lg border border-card-border bg-background/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-nova-blue">
                  NOVA-B
                </span>
                <span className="text-xs text-muted font-mono">
                  {balB !== undefined
                    ? parseFloat(formatEther(balB)).toFixed(2)
                    : "--"}
                </span>
              </div>
              <button
                onClick={handleMintB}
                disabled={isMintingB || isMintBConfirming}
                className="w-full rounded-lg bg-nova-blue/20 py-2 text-sm font-semibold text-nova-blue hover:bg-nova-blue/30 transition-colors disabled:opacity-40"
              >
                {isMintingB || isMintBConfirming ? "Minting..." : "Mint NOVA-B"}
              </button>
              {mintBSuccess && (
                <p className="mt-1 text-xs text-nova-green text-center">Minted!</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
