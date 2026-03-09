// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title INovaPool — Shared types for the NovaPool system
/// @notice Defines maturity levels, pool configuration, events, and errors
interface INovaPool {
    // ═══════════════════════════════════════════════════════════
    //                          ENUMS
    // ═══════════════════════════════════════════════════════════

    /// @notice Maturity phases that drive fee graduation and protection levels
    enum MaturityPhase {
        NASCENT,      // Phase 0: Just launched — max protection, highest fees
        EMERGING,     // Phase 1: Early traction — elevated protection
        GROWING,      // Phase 2: Building history — moderate protection
        ESTABLISHED   // Phase 3: Mature token — standard fees, minimal restrictions
    }

    // ═══════════════════════════════════════════════════════════
    //                         STRUCTS
    // ═══════════════════════════════════════════════════════════

    /// @notice Configuration set at pool initialization (immutable per pool)
    struct PoolConfig {
        uint24  baseFee;             // Starting fee in nascent phase (e.g. 10000 = 1%)
        uint24  matureFee;           // Target fee when established (e.g. 500 = 0.05%)
        uint16  maxSwapPctBps;       // Max single swap as % of liquidity (e.g. 500 = 5%)
        uint32  largeTradeCooldown;  // Seconds between large swaps from same address
        uint16  largeTradePctBps;    // Swap size threshold that triggers cooldown (e.g. 200 = 2%)
        uint256 volumeForEmerging;   // Cumulative volume (in token units) to reach EMERGING
        uint256 volumeForGrowing;    // Cumulative volume to reach GROWING
        uint256 volumeForEstablished;// Cumulative volume to reach ESTABLISHED
        uint32  minTradersEmerging;  // Unique trader count to reach EMERGING
        uint32  minTradersGrowing;   // Unique trader count to reach GROWING
        uint32  minTradersEstablished;// Unique trader count to reach ESTABLISHED
        uint32  minAgeEmerging;      // Minimum pool age (seconds) for EMERGING
        uint32  minAgeGrowing;       // Minimum pool age (seconds) for GROWING
        uint32  minAgeEstablished;   // Minimum pool age (seconds) for ESTABLISHED
    }

    /// @notice Live maturity metrics for a pool (updated on every swap)
    struct PoolMetrics {
        MaturityPhase phase;
        uint256 cumulativeVolume;    // Total swap volume in absolute token amount
        uint32  uniqueTraders;       // Number of distinct addresses that have swapped
        uint256 createdAt;           // Block timestamp when pool was initialized
        uint256 lastSwapAt;          // Block timestamp of the last swap
    }

    // ═══════════════════════════════════════════════════════════
    //                          EVENTS
    // ═══════════════════════════════════════════════════════════

    /// @notice Fired when a pool is initialized with NovaPool config
    event PoolConfigured(bytes32 indexed poolId, PoolConfig config);

    /// @notice Fired when a pool's maturity phase advances
    event PhaseAdvanced(
        bytes32 indexed poolId,
        MaturityPhase oldPhase,
        MaturityPhase newPhase,
        uint256 cumulativeVolume,
        uint32 uniqueTraders
    );

    /// @notice Fired when a swap fee is applied (for monitoring)
    event GraduatedFeeApplied(bytes32 indexed poolId, MaturityPhase phase, uint24 fee);

    /// @notice Fired when a swap is blocked by anti-manipulation guards
    event SwapBlocked(bytes32 indexed poolId, address indexed sender, string reason);

    /// @notice Fired when a large trade cooldown is applied
    event CooldownApplied(bytes32 indexed poolId, address indexed sender, uint256 cooldownUntil);

    // ═══════════════════════════════════════════════════════════
    //                          ERRORS
    // ═══════════════════════════════════════════════════════════

    error PoolMustUseDynamicFees();
    error SwapExceedsMaxSize();
    error CooldownNotExpired(uint256 cooldownUntil);
    error InvalidConfig();
    error NotOwner();
}
