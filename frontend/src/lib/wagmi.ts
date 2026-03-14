import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const unichainSepolia = defineChain({
  id: 1301,
  name: "Unichain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.unichain.org"] },
  },
  blockExplorers: {
    default: {
      name: "Uniscan",
      url: "https://sepolia.uniscan.xyz",
    },
  },
  testnet: true,
});

export const unichain = defineChain({
  id: 130,
  name: "Unichain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.unichain.org"] },
  },
  blockExplorers: {
    default: {
      name: "Uniscan",
      url: "https://uniscan.xyz",
    },
  },
});

export const HOOK_ADDRESS =
  "0xBF4110c00e87c6658264F7E4dDbd6857045330c0" as const;

export const POOL_MANAGER_ADDRESS =
  "0x00B036B58a818B1BC34d502D3fE730Db729e62AC" as const;

// Router + Demo tokens — update after deployment with script/DeployRouter.s.sol
export const ROUTER_ADDRESS =
  "0xf8eC9B25c12B2FAE1F0C63cFa92fCcf0285b27B7" as `0x${string}`;

export const TOKEN_A_ADDRESS =
  "0x8d3E422597eAB29CF008E690e0297f547E1f8C48" as `0x${string}`;

export const TOKEN_B_ADDRESS =
  "0x1976a08748c01F51FedA58Fe31f68fB42083E9C1" as `0x${string}`;

// Uniswap v4 constants
export const DYNAMIC_FEE_FLAG = 0x800000;
export const SQRT_PRICE_1_1 = BigInt("79228162514264337593543950336");
export const MIN_SQRT_PRICE = BigInt("4295128739");
export const MAX_SQRT_PRICE = BigInt(
  "1461446703485210103287273052203988822378723970342"
);

export const wagmiConfig = getDefaultConfig({
  appName: "NovaPool",
  projectId: "6b87a3c69cbd8b52055d7aef763148d6",
  chains: [unichainSepolia, unichain],
  ssr: true,
});
