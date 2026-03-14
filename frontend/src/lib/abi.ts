// ─── PoolManager ABI (initialize only) ───
export const poolManagerAbi = [
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "sqrtPriceX96", type: "uint160" },
    ],
    outputs: [{ name: "tick", type: "int24" }],
    stateMutability: "nonpayable",
  },
] as const;

// ─── NovaPoolRouter ABI ───
export const novaPoolRouterAbi = [
  {
    type: "function",
    name: "swap",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "zeroForOne", type: "bool" },
      { name: "amountSpecified", type: "int256" },
      { name: "sqrtPriceLimitX96", type: "uint160" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "modifyLiquidity",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "liquidityDelta", type: "int256" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
    stateMutability: "nonpayable",
  },
] as const;

// ─── ERC20 ABI (approve, balanceOf, allowance, mint, symbol, decimals) ───
export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;

// ─── NovaPoolHook ABI ───
export const novaPoolHookAbi = [
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "poolManager",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isConfigured",
    inputs: [{ name: "", type: "bytes32", internalType: "PoolId" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCurrentFee",
    inputs: [{ name: "pid", type: "bytes32", internalType: "PoolId" }],
    outputs: [{ name: "", type: "uint24" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMaturityInfo",
    inputs: [{ name: "pid", type: "bytes32", internalType: "PoolId" }],
    outputs: [
      { name: "phase", type: "uint8" },
      { name: "cumulativeVolume", type: "uint256" },
      { name: "uniqueTraders", type: "uint32" },
      { name: "age", type: "uint256" },
      { name: "currentFee", type: "uint24" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "poolConfigs",
    inputs: [{ name: "", type: "bytes32", internalType: "PoolId" }],
    outputs: [
      { name: "baseFee", type: "uint24" },
      { name: "matureFee", type: "uint24" },
      { name: "maxSwapPctBps", type: "uint16" },
      { name: "largeTradeCooldown", type: "uint32" },
      { name: "largeTradePctBps", type: "uint16" },
      { name: "volumeForEmerging", type: "uint256" },
      { name: "volumeForGrowing", type: "uint256" },
      { name: "volumeForEstablished", type: "uint256" },
      { name: "minTradersEmerging", type: "uint32" },
      { name: "minTradersGrowing", type: "uint32" },
      { name: "minTradersEstablished", type: "uint32" },
      { name: "minAgeEmerging", type: "uint32" },
      { name: "minAgeGrowing", type: "uint32" },
      { name: "minAgeEstablished", type: "uint32" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "poolMetrics",
    inputs: [{ name: "", type: "bytes32", internalType: "PoolId" }],
    outputs: [
      { name: "phase", type: "uint8" },
      { name: "cumulativeVolume", type: "uint256" },
      { name: "uniqueTraders", type: "uint32" },
      { name: "createdAt", type: "uint256" },
      { name: "lastSwapAt", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCooldownExpiry",
    inputs: [
      { name: "pid", type: "bytes32", internalType: "PoolId" },
      { name: "trader", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasTraded",
    inputs: [
      { name: "", type: "bytes32", internalType: "PoolId" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "configurePool",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "config",
        type: "tuple",
        components: [
          { name: "baseFee", type: "uint24" },
          { name: "matureFee", type: "uint24" },
          { name: "maxSwapPctBps", type: "uint16" },
          { name: "largeTradeCooldown", type: "uint32" },
          { name: "largeTradePctBps", type: "uint16" },
          { name: "volumeForEmerging", type: "uint256" },
          { name: "volumeForGrowing", type: "uint256" },
          { name: "volumeForEstablished", type: "uint256" },
          { name: "minTradersEmerging", type: "uint32" },
          { name: "minTradersGrowing", type: "uint32" },
          { name: "minTradersEstablished", type: "uint32" },
          { name: "minAgeEmerging", type: "uint32" },
          { name: "minAgeGrowing", type: "uint32" },
          { name: "minAgeEstablished", type: "uint32" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "PhaseAdvanced",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "oldPhase", type: "uint8", indexed: false },
      { name: "newPhase", type: "uint8", indexed: false },
      { name: "cumulativeVolume", type: "uint256", indexed: false },
      { name: "uniqueTraders", type: "uint32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GraduatedFeeApplied",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "phase", type: "uint8", indexed: false },
      { name: "fee", type: "uint24", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CooldownApplied",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "cooldownUntil", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PoolConfigured",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      {
        name: "config",
        type: "tuple",
        indexed: false,
        components: [
          { name: "baseFee", type: "uint24" },
          { name: "matureFee", type: "uint24" },
          { name: "maxSwapPctBps", type: "uint16" },
          { name: "largeTradeCooldown", type: "uint32" },
          { name: "largeTradePctBps", type: "uint16" },
          { name: "volumeForEmerging", type: "uint256" },
          { name: "volumeForGrowing", type: "uint256" },
          { name: "volumeForEstablished", type: "uint256" },
          { name: "minTradersEmerging", type: "uint32" },
          { name: "minTradersGrowing", type: "uint32" },
          { name: "minTradersEstablished", type: "uint32" },
          { name: "minAgeEmerging", type: "uint32" },
          { name: "minAgeGrowing", type: "uint32" },
          { name: "minAgeEstablished", type: "uint32" },
        ],
      },
    ],
  },
] as const;
