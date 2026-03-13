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

export const wagmiConfig = getDefaultConfig({
  appName: "NovaPool",
  projectId: "novapool-demo", // WalletConnect project ID (placeholder for hackathon)
  chains: [unichainSepolia, unichain],
  ssr: true,
});
