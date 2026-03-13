// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {INovaPool} from "./interfaces/INovaPool.sol";

/// @title NovaPoolHook
/// @author NovaPool Team
/// @notice Uniswap v4 hook purpose-built for long-tail and newly launched tokens.
///
/// @dev Implements graduated fees, anti-manipulation guards, and on-chain maturity
///      scoring to create safer, more efficient markets for emerging assets.
///
///      Fee Graduation:
///        NASCENT      → baseFee      (e.g. 1.00%)  — maximum LP protection
///        EMERGING     → 65% of base  (e.g. 0.65%)  — traction building
///        GROWING      → 30% of base  (e.g. 0.30%)  — proven history
///        ESTABLISHED  → matureFee    (e.g. 0.05%)  — standard operation
///
///      Anti-Manipulation:
///        • Max swap size relative to pool liquidity
///        • Per-address cooldown after large trades
///
///      Maturity Score:
///        • Cumulative volume
///        • Unique trader count
///        • Pool age
///        All three must meet thresholds for phase advancement.
contract NovaPoolHook is BaseHook, INovaPool {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;
    using LPFeeLibrary for uint24;

    // ─────────────────────────────────────────────────────────
    //  Immutables & Storage
    // ─────────────────────────────────────────────────────────

    address public immutable owner;

    /// Pool ID → configuration (set at initialization, immutable per pool)
    mapping(PoolId => PoolConfig) public poolConfigs;

    /// Pool ID → live maturity metrics
    mapping(PoolId => PoolMetrics) public poolMetrics;

    /// Pool ID → whether this pool has been configured
    mapping(PoolId => bool) public isConfigured;

    /// Pool ID → trader address → whether they've traded (for unique count)
    mapping(PoolId => mapping(address => bool)) public hasTraded;

    /// Pool ID → trader address → timestamp when cooldown expires
    mapping(PoolId => mapping(address => uint256)) public cooldownExpiry;

    // ─────────────────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────

    constructor(IPoolManager _pm) BaseHook(_pm) {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────────────────
    //  Hook Permissions
    // ─────────────────────────────────────────────────────────

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize:  true,
            beforeAddLiquidity: false,
            afterAddLiquidity:  false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity:  false,
            beforeSwap:  true,
            afterSwap:   true,
            beforeDonate: false,
            afterDonate:  false,
            beforeSwapReturnDelta:  false,
            afterSwapReturnDelta:   false,
            afterAddLiquidityReturnDelta:    false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ─────────────────────────────────────────────────────────
    //  beforeInitialize — validate dynamic fees
    // ─────────────────────────────────────────────────────────

    function _beforeInitialize(address, PoolKey calldata key, uint160)
        internal pure override returns (bytes4)
    {
        if (!key.fee.isDynamicFee()) revert PoolMustUseDynamicFees();
        return this.beforeInitialize.selector;
    }

    // ─────────────────────────────────────────────────────────
    //  afterInitialize — store pool creation timestamp
    // ─────────────────────────────────────────────────────────

    function _afterInitialize(address, PoolKey calldata key, uint160, int24)
        internal override returns (bytes4)
    {
        PoolId pid = key.toId();

        // If already configured via configurePool(), just set creation time
        if (!isConfigured[pid]) {
            // Apply default config if none set
            poolConfigs[pid] = _defaultConfig();
            isConfigured[pid] = true;
        }

        poolMetrics[pid].createdAt = block.timestamp;
        poolMetrics[pid].phase = MaturityPhase.NASCENT;

        emit PoolConfigured(PoolId.unwrap(pid), poolConfigs[pid]);

        return this.afterInitialize.selector;
    }

    // ─────────────────────────────────────────────────────────
    //  beforeSwap — graduated fees + anti-manipulation
    // ─────────────────────────────────────────────────────────

    function _beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata
    )
        internal override returns (bytes4, BeforeSwapDelta, uint24)
    {
        PoolId pid = key.toId();
        PoolConfig storage cfg = poolConfigs[pid];
        PoolMetrics storage met = poolMetrics[pid];

        // ── Anti-manipulation: max swap size ─────────────────
        if (cfg.maxSwapPctBps > 0) {
            uint128 liquidity = poolManager.getLiquidity(pid);
            if (liquidity > 0) {
                uint256 absAmount = params.amountSpecified < 0
                    ? uint256(-params.amountSpecified)
                    : uint256(params.amountSpecified);

                // Max allowed = liquidity * maxSwapPctBps / 10000
                // This is a proxy: L and token amounts aren't identical units,
                // but L scales with pool depth, making this an effective guard.
                uint256 maxAllowed = (uint256(liquidity) * cfg.maxSwapPctBps) / 10000;
                if (absAmount > maxAllowed) {
                    revert SwapExceedsMaxSize();
                }

                // ── Anti-manipulation: cooldown for large trades ──
                if (cfg.largeTradeCooldown > 0 && cfg.largeTradePctBps > 0) {
                    uint256 largeThreshold = (uint256(liquidity) * cfg.largeTradePctBps) / 10000;

                    if (absAmount > largeThreshold) {
                        // Check cooldown
                        uint256 expiry = cooldownExpiry[pid][sender];
                        if (block.timestamp < expiry) {
                            revert CooldownNotExpired(expiry);
                        }
                        // Set new cooldown
                        cooldownExpiry[pid][sender] = block.timestamp + cfg.largeTradeCooldown;
                        emit CooldownApplied(PoolId.unwrap(pid), sender, block.timestamp + cfg.largeTradeCooldown);
                    }
                }
            }
        }

        // ── Graduated fee based on maturity ──────────────────
        uint24 fee = _graduatedFee(cfg, met.phase);

        emit GraduatedFeeApplied(PoolId.unwrap(pid), met.phase, fee);

        return (
            this.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            fee | LPFeeLibrary.OVERRIDE_FEE_FLAG
        );
    }

    // ─────────────────────────────────────────────────────────
    //  afterSwap — update maturity metrics
    // ─────────────────────────────────────────────────────────

    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta,
        bytes calldata
    )
        internal override returns (bytes4, int128)
    {
        PoolId pid = key.toId();
        PoolMetrics storage met = poolMetrics[pid];

        // ── Update volume ────────────────────────────────────
        uint256 absAmount = params.amountSpecified < 0
            ? uint256(-params.amountSpecified)
            : uint256(params.amountSpecified);
        met.cumulativeVolume += absAmount;

        // ── Update unique traders ────────────────────────────
        if (!hasTraded[pid][sender]) {
            hasTraded[pid][sender] = true;
            met.uniqueTraders++;
        }

        // ── Update last swap time ────────────────────────────
        met.lastSwapAt = block.timestamp;

        // ── Check phase advancement ──────────────────────────
        _checkPhaseAdvancement(pid);

        return (this.afterSwap.selector, 0);
    }

    // ─────────────────────────────────────────────────────────
    //  Admin: configure pool before initialization
    // ─────────────────────────────────────────────────────────

    /// @notice Sets custom configuration for a pool. Must be called BEFORE pool
    ///         initialization. If not called, default config is used.
    /// @param key The pool key
    /// @param config The NovaPool configuration
    function configurePool(PoolKey calldata key, PoolConfig calldata config) external onlyOwner {
        _validateConfig(config);
        PoolId pid = key.toId();
        poolConfigs[pid] = config;
        isConfigured[pid] = true;
    }

    // ─────────────────────────────────────────────────────────
    //  View helpers
    // ─────────────────────────────────────────────────────────

    /// @notice Returns the current fee for a pool based on its maturity phase
    function getCurrentFee(PoolId pid) external view returns (uint24) {
        return _graduatedFee(poolConfigs[pid], poolMetrics[pid].phase);
    }

    /// @notice Returns full maturity info for a pool
    function getMaturityInfo(PoolId pid)
        external view
        returns (
            MaturityPhase phase,
            uint256 cumulativeVolume,
            uint32 uniqueTraders,
            uint256 age,
            uint24 currentFee
        )
    {
        PoolMetrics storage m = poolMetrics[pid];
        uint256 poolAge = m.createdAt > 0 ? block.timestamp - m.createdAt : 0;
        return (
            m.phase,
            m.cumulativeVolume,
            m.uniqueTraders,
            poolAge,
            _graduatedFee(poolConfigs[pid], m.phase)
        );
    }

    /// @notice Returns cooldown expiry for a specific address in a pool
    function getCooldownExpiry(PoolId pid, address trader) external view returns (uint256) {
        return cooldownExpiry[pid][trader];
    }

    // ─────────────────────────────────────────────────────────
    //  Internal: Graduated fee calculation
    // ─────────────────────────────────────────────────────────

    /// @dev Linearly interpolates between baseFee and matureFee based on phase.
    ///
    ///   NASCENT     → 100% baseFee
    ///   EMERGING    →  65% baseFee + 35% matureFee
    ///   GROWING     →  30% baseFee + 70% matureFee
    ///   ESTABLISHED → 100% matureFee
    function _graduatedFee(PoolConfig storage cfg, MaturityPhase phase)
        internal view returns (uint24)
    {
        if (phase == MaturityPhase.ESTABLISHED) return cfg.matureFee;
        if (phase == MaturityPhase.NASCENT)     return cfg.baseFee;

        uint256 base   = uint256(cfg.baseFee);
        uint256 mature = uint256(cfg.matureFee);

        if (phase == MaturityPhase.EMERGING) {
            // 65% base + 35% mature
            return uint24((base * 65 + mature * 35) / 100);
        }
        // GROWING: 30% base + 70% mature
        return uint24((base * 30 + mature * 70) / 100);
    }

    // ─────────────────────────────────────────────────────────
    //  Internal: Phase advancement
    // ─────────────────────────────────────────────────────────

    /// @dev Checks if the pool qualifies for the next maturity phase.
    ///      All three criteria (volume, traders, age) must be met.
    ///      Phase can only advance forward, never regress.
    function _checkPhaseAdvancement(PoolId pid) internal {
        PoolConfig storage cfg = poolConfigs[pid];
        PoolMetrics storage met = poolMetrics[pid];

        uint256 age = block.timestamp - met.createdAt;
        MaturityPhase current = met.phase;
        MaturityPhase next = current;

        // Check each phase transition — can advance multiple phases in one check
        if (current == MaturityPhase.NASCENT) {
            if (met.cumulativeVolume >= cfg.volumeForEmerging &&
                met.uniqueTraders    >= cfg.minTradersEmerging &&
                age                  >= cfg.minAgeEmerging)
            {
                next = MaturityPhase.EMERGING;
            }
        }

        if (next == MaturityPhase.EMERGING) {
            if (met.cumulativeVolume >= cfg.volumeForGrowing &&
                met.uniqueTraders    >= cfg.minTradersGrowing &&
                age                  >= cfg.minAgeGrowing)
            {
                next = MaturityPhase.GROWING;
            }
        }

        if (next == MaturityPhase.GROWING) {
            if (met.cumulativeVolume >= cfg.volumeForEstablished &&
                met.uniqueTraders    >= cfg.minTradersEstablished &&
                age                  >= cfg.minAgeEstablished)
            {
                next = MaturityPhase.ESTABLISHED;
            }
        }

        if (next != current) {
            met.phase = next;
            emit PhaseAdvanced(
                PoolId.unwrap(pid), current, next,
                met.cumulativeVolume, met.uniqueTraders
            );
        }
    }

    // ─────────────────────────────────────────────────────────
    //  Internal: Config validation
    // ─────────────────────────────────────────────────────────

    function _validateConfig(PoolConfig calldata c) internal pure {
        if (c.baseFee == 0 || c.matureFee == 0)      revert InvalidConfig();
        if (c.baseFee < c.matureFee)                  revert InvalidConfig();
        if (c.volumeForEmerging > c.volumeForGrowing) revert InvalidConfig();
        if (c.volumeForGrowing > c.volumeForEstablished) revert InvalidConfig();
        if (c.minTradersEmerging > c.minTradersGrowing)   revert InvalidConfig();
        if (c.minTradersGrowing > c.minTradersEstablished) revert InvalidConfig();
        if (c.minAgeEmerging > c.minAgeGrowing)       revert InvalidConfig();
        if (c.minAgeGrowing > c.minAgeEstablished)    revert InvalidConfig();
    }

    /// @dev Default config used when pool creator doesn't provide one
    function _defaultConfig() internal pure returns (PoolConfig memory) {
        return PoolConfig({
            baseFee:               10000,   // 1.00%
            matureFee:             500,     // 0.05%
            maxSwapPctBps:         500,     // 5% of liquidity
            largeTradeCooldown:    60,      // 60 seconds
            largeTradePctBps:      200,     // 2% of liquidity triggers cooldown
            volumeForEmerging:     100 ether,
            volumeForGrowing:      1000 ether,
            volumeForEstablished:  10000 ether,
            minTradersEmerging:    10,
            minTradersGrowing:     50,
            minTradersEstablished: 200,
            minAgeEmerging:        1 days,
            minAgeGrowing:         7 days,
            minAgeEstablished:     30 days
        });
    }
}
