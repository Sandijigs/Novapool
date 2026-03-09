# 🌟 NovaPool

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

## Project Structure

```
novapool/
├── src/
│   ├── NovaPoolHook.sol              # Uniswap v4 hook — all logic
│   └── interfaces/
│       └── INovaPool.sol             # Shared types, events, errors
├── test/
│   └── NovaPoolHook.t.sol            # Comprehensive test suite
├── script/
│   └── DeployNovaPool.s.sol          # Deployment script
├── frontend/
│   └── index.html                    # Demo dashboard
├── foundry.toml
├── remappings.txt
├── setup.sh
├── .env.example
└── README.md
```

---

## Getting Started

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/novapool.git
cd novapool
chmod +x setup.sh
./setup.sh
```

### Run Tests

```bash
forge test -vvv
```

### Test Coverage

The test suite covers:

1. **Deployment & initialization** — owner, config storage, dynamic fee validation
2. **Graduated fee tiers** — correct fee at each maturity phase
3. **Phase advancement** — volume-driven, requires all criteria, no regression, can skip phases
4. **Unique trader tracking** — counted correctly, no double-counting
5. **Anti-manipulation: max swap size** — normal swaps pass, oversized swaps revert
6. **Anti-manipulation: cooldown** — triggers on large trades, expires correctly, small trades bypass
7. **Volume tracking** — accumulates across swaps
8. **Config validation** — rejects invalid configs, owner-only access
9. **Events** — phase advancement and fee application events
10. **Full lifecycle** — NASCENT → EMERGING → GROWING → ESTABLISHED with fee verification

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

---

## License

MIT
