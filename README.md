# NovaPool

**Graduated liquidity for long-tail and newly launched tokens on Uniswap v4.**

NovaPool is a Uniswap v4 hook that creates safer, more efficient markets for emerging assets by implementing graduated fee curves, anti-manipulation guards, and on-chain maturity scoring — with a full-featured frontend for configuring, trading, and monitoring pools in real time.

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

┌──────────────────────────────────────────────────────────┐
│                  NovaPoolRouter.sol                       │
│                                                          │
│  Handles PoolManager unlock/callback pattern so users    │
│  can execute swaps and liquidity operations from the     │
│  frontend. Manages token settlement (sync → transfer     │
│  → settle for payments, take for withdrawals).           │
│                                                          │
│  • swap(PoolKey, zeroForOne, amount, priceLimit)         │
│  • modifyLiquidity(PoolKey, tickLower, tickUpper, delta) │
│  • unlockCallback(data) — dispatches to internal handler │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Deployed Contracts

All contracts are deployed on **Unichain Sepolia (chain ID 1301)**.

| Contract | Address |
|----------|---------|
| **NovaPoolHook** | `0xBF4110c00e87c6658264F7E4dDbd6857045330c0` |
| **NovaPoolRouter** | `0xf8eC9B25c12B2FAE1F0C63cFa92fCcf0285b27B7` |
| **MockERC20 (NOVA-A)** | `0x8d3E422597eAB29CF008E690e0297f547E1f8C48` |
| **MockERC20 (NOVA-B)** | `0x1976a08748c01F51FedA58Fe31f68fB42083E9C1` |
| PoolManager (Uniswap v4) | `0x00B036B58a818B1BC34d502D3fE730Db729e62AC` |

The hook is deployed using CREATE2 with a mined salt so the contract address encodes the correct Uniswap v4 hook permission flags (beforeInitialize, afterInitialize, beforeSwap, afterSwap).

---

## Project Structure

```
novapool/
├── src/
│   ├── NovaPoolHook.sol              # Uniswap v4 hook — all core logic
│   ├── NovaPoolRouter.sol            # Router for swaps & liquidity (unlock/callback)
│   ├── MockERC20.sol                 # Mintable ERC20 for demo tokens
│   └── interfaces/
│       └── INovaPool.sol             # Shared types, events, errors
├── test/
│   ├── NovaPoolHook.t.sol            # 29 unit tests
│   ├── NovaPoolE2E.t.sol             # End-to-end lifecycle test
│   └── NovaPoolFullE2E.t.sol         # 8 comprehensive E2E tests
├── script/
│   ├── DeployNovaPool.s.sol          # CREATE2 deployment with HookMiner
│   └── DeployRouter.s.sol            # Deploy Router + MockERC20 demo tokens
├── frontend/                         # Next.js 16 + TypeScript + Tailwind
│   ├── src/app/                      # App router pages
│   ├── src/components/
│   │   ├── Providers.tsx             # wagmi + RainbowKit + React Query
│   │   ├── WalletButton.tsx          # Wallet connect button
│   │   ├── OnChainStatus.tsx         # Live hook contract info
│   │   ├── ConfigurePoolForm.tsx     # Pool configuration form (on-chain tx)
│   │   ├── InitializePoolForm.tsx    # Create new pool on PoolManager
│   │   ├── SwapForm.tsx              # Execute swaps via Router
│   │   ├── AddLiquidityForm.tsx      # Provide liquidity via Router
│   │   ├── MintTestTokens.tsx        # Mint demo NOVA-A/NOVA-B tokens
│   │   ├── PoolSelector.tsx          # Manual pool ID input
│   │   ├── PoolRegistry.tsx          # All configured pools from events
│   │   ├── OnChainEventLog.tsx       # Live event subscription feed
│   │   ├── PhaseCard.tsx             # Phase badge + progress bar
│   │   ├── FeeCard.tsx               # Current fee display
│   │   ├── SwapGuardCard.tsx         # Anti-manipulation params
│   │   ├── MetricsCard.tsx           # Volume, traders, age
│   │   └── FeeTiersCard.tsx          # 4-tier fee graduation visual
│   └── src/lib/
│       ├── wagmi.ts                  # Wagmi config + chain definitions + addresses
│       ├── abi.ts                    # ABIs: Hook, Router, PoolManager, ERC20
│       ├── types.ts                  # TypeScript types + constants
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

#### 1. Deploy Hook (CREATE2)

```bash
cp .env.example .env
# Edit .env with your PRIVATE_KEY and DEPLOYER_ADDRESS

source .env
forge script script/DeployNovaPool.s.sol \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

The deploy script uses `HookMiner` to find a CREATE2 salt that produces an address with the correct hook permission flags.

#### 2. Deploy Router + Demo Tokens

```bash
source .env
forge script script/DeployRouter.s.sol \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

This deploys `NovaPoolRouter` (for swap/liquidity operations) and two `MockERC20` tokens (NOVA-A, NOVA-B) for demo purposes. Update the deployed addresses in `frontend/src/lib/wagmi.ts`.

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — connect your wallet via RainbowKit to access all features.

---

## Frontend Features

| Feature | Description |
|---------|-------------|
| **Wallet Connection** | RainbowKit + wagmi with Unichain Sepolia/Mainnet chain support |
| **On-Chain Contract Info** | Live reads of hook owner, pool manager from deployed contract |
| **Configure Pool** | Form to call `configurePool()` on-chain — set fee tiers, swap guards, maturity thresholds (owner only) |
| **Initialize Pool** | Create a new Uniswap v4 pool with NovaPool as the hook via `PoolManager.initialize()` |
| **Mint Test Tokens** | One-click mint of NOVA-A / NOVA-B demo tokens with live balance display |
| **Add Liquidity** | Provide liquidity to a pool via Router with ERC20 approve flow and tick range selection |
| **Swap** | Execute exact-input swaps via Router with approve flow, direction toggle, and balance display |
| **Pool Registry** | Scans `PoolConfigured` events to list all NovaPool-managed pools |
| **Pool Selector** | Click any registered pool or enter a pool ID manually to view its dashboard |
| **Pool Maturity Dashboard** | Live on-chain display of current phase, graduated fee, swap guards, volume, traders, and pool age |
| **Fee Graduation Timeline** | Visual 4-phase timeline with active phase highlight and progress indicator |
| **Live Event Log** | Real-time subscription to PhaseAdvanced, GraduatedFeeApplied, CooldownApplied, and PoolConfigured events |

---

## Demo Flow

The complete user journey from zero to observing graduated fee changes:

1. **Connect wallet** — Unichain Sepolia with test ETH
2. **Mint test tokens** — get NOVA-A and NOVA-B from the faucet card
3. **Configure pool** — set fee graduation parameters and maturity thresholds (owner only)
4. **Initialize pool** — create the pool on Uniswap v4 PoolManager
5. **Add liquidity** — approve both tokens to the Router, provide LP in a tick range
6. **Swap** — execute trades; watch volume, trader count, and fees update live
7. **Observe phase advancement** — once cumulative volume + unique traders + pool age all cross their thresholds, the pool advances from NASCENT to EMERGING (fees drop from 1.00% to 0.67%)
8. **Test anti-manipulation** — attempt a swap > 5% of liquidity and observe the revert

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

**Why a separate Router contract?**
Uniswap v4's PoolManager uses an unlock/callback pattern — `swap()` and `modifyLiquidity()` cannot be called directly from an EOA. The Router handles `poolManager.unlock()` → `unlockCallback()` → token settlement, so the frontend can execute swaps and liquidity operations with standard wallet transactions.

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
