# NovaPool

**Graduated liquidity for long-tail and newly launched tokens on Uniswap v4.**

NovaPool is a Uniswap v4 hook that creates safer, more efficient markets for emerging assets by implementing graduated fee curves, anti-manipulation guards, and on-chain maturity scoring.

> **Hookathon Submission** — UHI8 "Specialized Markets" theme

---

## The Problem

Long-tail tokens — newly launched tokens, meme coins, community tokens, and low-liquidity assets — face a fundamentally different market-making challenge than established pairs. Standard AMM parameters designed for ETH/USDC don't work for a token with $10K in liquidity:

- **Extreme price impact:** A single $500 swap can move the price 10%+ in a thin pool
- **Rug-pull vulnerability:** Without guardrails, a single wallet can drain the pool in one transaction
- **LP exploitation:** Sandwich attacks and wash trading are trivially cheap on thin pools
- **One-size-fits-all fees:** Static 0.30% fees over-charge mature pairs and under-charge risky ones

Yet long-tail tokens represent one of the fastest-growing segments of on-chain activity. Meme coins, creator tokens, and RWA tokens need specialized infrastructure.

## The Solution

NovaPool creates a **specialized market-making hook** that adapts to a token's lifecycle:

### Graduated Fees
Fees start high to compensate LPs for the elevated risk of providing liquidity to unproven tokens, then decrease as the token builds a track record:

| Phase | Fee | Behavior |
|-------|-----|----------|
| **NASCENT** | 1.00% (baseFee) | Maximum protection — new token, high risk |
| **EMERGING** | 0.67% | Early traction — first traders arriving |
| **GROWING** | 0.34% | Proven history — organic volume growing |
| **ESTABLISHED** | 0.05% (matureFee) | Mature token — standard competitive fees |

### Anti-Manipulation Guards
- **Max swap size:** No single swap can exceed 5% of pool liquidity, preventing one-transaction manipulation
- **Large trade cooldown:** After a swap exceeding 2% of liquidity, the same address must wait 60 seconds before another large trade — reducing wash trading and sandwich attacks

### On-Chain Maturity Score
Phase advancement requires meeting **all three criteria simultaneously**:

1. **Cumulative volume** — proves organic trading demand
2. **Unique trader count** — proves broad participation (not one whale)
3. **Pool age** — proves sustained existence over time

Phases only advance forward — they never regress. This creates a transparent, manipulation-resistant trust signal.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   NovaPoolHook.sol                        │
│                                                          │
│  ┌─────────────────┐   ┌──────────────────────────────┐  │
│  │ beforeInitialize │   │ Pool Config (per-pool)       │  │
│  │ • Validate       │   │ • baseFee / matureFee        │  │
│  │   dynamic fee    │   │ • maxSwapPctBps              │  │
│  └─────────────────┘   │ • cooldown / largeThreshold   │  │
│                         │ • volume / traders / age      │  │
│  ┌─────────────────┐   │   thresholds per phase        │  │
│  │ afterInitialize  │   └──────────────────────────────┘  │
│  │ • Record creation│                                    │
│  │   timestamp      │   ┌──────────────────────────────┐  │
│  └─────────────────┘   │ Pool Metrics (live)           │  │
│                         │ • currentPhase               │  │
│  ┌─────────────────┐   │ • cumulativeVolume            │  │
│  │ beforeSwap       │   │ • uniqueTraders              │  │
│  │ • Enforce max    │   │ • createdAt / lastSwapAt     │  │
│  │   swap size      │   └──────────────────────────────┘  │
│  │ • Check cooldown │                                    │
│  │ • Return         │   ┌──────────────────────────────┐  │
│  │   graduated fee  │   │ Anti-Manipulation State      │  │
│  └─────────────────┘   │ • hasTraded[pool][addr]       │  │
│                         │ • cooldownExpiry[pool][addr]  │  │
│  ┌─────────────────┐   └──────────────────────────────┘  │
│  │ afterSwap        │                                    │
│  │ • Update volume  │                                    │
│  │ • Track traders  │                                    │
│  │ • Check phase    │                                    │
│  │   advancement    │                                    │
│  └─────────────────┘                                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Deployed Contracts

| Contract | Network | Address |
|----------|---------|---------|
| **NovaPoolHook** | Unichain Sepolia (1301) | `0xBF4110c00e87c6658264F7E4dDbd6857045330c0` |
| PoolManager | Unichain Sepolia (1301) | `0x00B036B58a818B1BC34d502D3fE730Db729e62AC` |

The hook is deployed using CREATE2 with a mined salt so the contract address encodes the correct Uniswap v4 hook permission flags (beforeInitialize, afterInitialize, beforeSwap, afterSwap).

---

## Project Structure

```
novapool/
├── src/
│   ├── NovaPoolHook.sol              # Uniswap v4 hook — all core logic
│   └── interfaces/
│       └── INovaPool.sol             # Shared types, events, errors
├── test/
│   ├── NovaPoolHook.t.sol            # 29 unit tests
│   ├── NovaPoolE2E.t.sol             # End-to-end lifecycle test
│   └── NovaPoolFullE2E.t.sol         # 8 comprehensive E2E tests
├── script/
│   └── DeployNovaPool.s.sol          # CREATE2 deployment with HookMiner
├── frontend/                         # Next.js 16 + TypeScript + Tailwind
│   ├── src/app/                      # App router pages
│   ├── src/components/
│   │   ├── Providers.tsx             # wagmi + RainbowKit + React Query
│   │   ├── WalletButton.tsx          # Wallet connect button
│   │   ├── OnChainStatus.tsx         # Live hook contract info
│   │   ├── ConfigurePoolForm.tsx     # Pool configuration form (on-chain tx)
│   │   ├── PoolLookup.tsx            # Query pool maturity by ID
│   │   ├── PoolRegistry.tsx          # All configured pools from events
│   │   ├── OnChainEventLog.tsx       # Live event subscription feed
│   │   ├── PhaseCard.tsx             # Phase badge + progress bar
│   │   ├── FeeCard.tsx               # Current fee display
│   │   ├── SwapGuardCard.tsx         # Anti-manipulation params
│   │   ├── MetricsCard.tsx           # Volume, traders, age
│   │   ├── FeeTiersCard.tsx          # 4-tier fee graduation visual
│   │   ├── SimulateCard.tsx          # Swap/time/trader simulation
│   │   └── EventLog.tsx              # Simulation event log
│   └── src/lib/
│       ├── wagmi.ts                  # Wagmi config + Unichain chains
│       ├── abi.ts                    # NovaPoolHook ABI
│       ├── types.ts                  # TypeScript types + constants
│       ├── useNovaPool.ts            # Simulation state hook
│       ├── useOnChainPool.ts         # On-chain read hooks (wagmi)
│       └── usePoolRegistry.ts        # Event-based pool registry
├── foundry.toml
├── remappings.txt
├── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites

- [Foundry](https://getfoundry.sh/) (forge, cast)
- [Node.js](https://nodejs.org/) >= 18
- A wallet with Unichain Sepolia ETH ([faucet](https://faucet.unichain.org/))

### Setup

```bash
git clone https://github.com/Sandijigs/Novapool.git
cd novapool
forge install
```

### Run Tests

```bash
forge test -v
```

**38 tests** across 3 test suites covering:

1. **Deployment & initialization** — owner, config storage, dynamic fee validation
2. **Graduated fee tiers** — correct fee at each maturity phase
3. **Phase advancement** — volume-driven, requires all criteria, no regression, can skip phases
4. **Unique trader tracking** — counted correctly, no double-counting
5. **Anti-manipulation: max swap size** — normal swaps pass, oversized swaps revert
6. **Anti-manipulation: cooldown** — triggers on large trades, expires correctly, small trades bypass
7. **Volume tracking** — accumulates across swaps
8. **Config validation** — rejects invalid configs, owner-only access
9. **Events** — phase advancement and fee application events
10. **Full lifecycle** — NASCENT -> EMERGING -> GROWING -> ESTABLISHED with fee verification

### Deploy to Unichain

```bash
# Copy and fill in your .env
cp .env.example .env
# Edit .env with your PRIVATE_KEY and DEPLOYER_ADDRESS

# Deploy to Sepolia testnet
source .env
forge script script/DeployNovaPool.s.sol \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

The deploy script uses `HookMiner` to find a CREATE2 salt that produces an address with the correct hook permission flags, then deploys via the standard CREATE2 proxy.

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — connect your wallet via RainbowKit to access on-chain features.

---

## Frontend Features

| Feature | Description |
|---------|-------------|
| **Wallet Connection** | RainbowKit + wagmi with Unichain Sepolia/Mainnet chain support |
| **On-Chain Contract Info** | Live reads of hook owner, pool manager from deployed contract |
| **Configure Pool** | Form to call `configurePool()` on-chain (owner only) |
| **Pool Lookup** | Enter any pool ID to query live maturity phase, fee, volume, traders, age |
| **Pool Registry** | Scans `PoolConfigured` events to list all NovaPool-managed pools |
| **Live Event Log** | Real-time subscription to PhaseAdvanced, GraduatedFeeApplied, CooldownApplied, PoolConfigured events |
| **Simulation Dashboard** | Interactive simulation of swap volume, time progression, and trader count to visualize fee graduation |

---

## Design Decisions

**Why graduated fees instead of fixed tiers?**
A fixed low fee on a brand-new token pool is an invitation for manipulation. A fixed high fee kills volume on a mature token. Graduated fees solve both: high fees protect LPs early when the risk is real, then decrease to attract volume as the token proves itself.

**Why three criteria for phase advancement?**
Using volume alone is gameable (one whale can inflate volume). Using traders alone misses organic demand signals. Using age alone is meaningless without activity. Requiring all three creates a manipulation-resistant maturity signal.

**Why can phases skip forward but never regress?**
If a token simultaneously meets all criteria for ESTABLISHED (perhaps through a viral launch), it shouldn't be forced through intermediate phases. But once established, regression would create confusion and instability — a mature token shouldn't suddenly charge 1% fees because volume dipped.

**Why max swap size as a percentage of liquidity?**
A fixed dollar cap doesn't scale — $100 is a huge trade for a $1K pool but meaningless for a $10M pool. Using liquidity as the reference ensures the guard scales naturally with pool depth.

**Why CREATE2 deployment?**
Uniswap v4 requires hook contract addresses to encode permission flags in the lowest 14 bits. The deploy script mines a CREATE2 salt that produces an address with the correct bits set for beforeInitialize, afterInitialize, beforeSwap, and afterSwap.

**Why explicit owner in constructor?**
When deploying via the CREATE2 proxy (`0x4e59...956C`), `msg.sender` is the proxy itself, not the deployer wallet. The constructor accepts an explicit `_owner` parameter to ensure the deployer retains admin control over `configurePool()`.

---

## Tech Stack

- **Smart Contracts:** Solidity 0.8.26, Foundry, Uniswap v4 Core + Periphery
- **Deployment:** CREATE2 with HookMiner salt mining, Unichain Sepolia
- **Frontend:** Next.js 16, TypeScript, Tailwind CSS v4
- **Wallet Integration:** wagmi v2, viem v2, RainbowKit, TanStack Query
- **Chain:** Unichain (Uniswap's L2) — Sepolia testnet + Mainnet ready

---

## License

MIT
