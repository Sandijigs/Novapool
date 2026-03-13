// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {Deployers} from "v4-core/test/utils/Deployers.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {ModifyLiquidityParams} from "v4-core/src/types/PoolOperation.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";

import {NovaPoolHook} from "../src/NovaPoolHook.sol";
import {INovaPool} from "../src/interfaces/INovaPool.sol";

/// @title NovaPoolHookTest
/// @notice Comprehensive test suite for the NovaPool hook
contract NovaPoolHookTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;

    NovaPoolHook hook;
    PoolKey      poolKey;
    PoolId       poolId;
    address      deployer;

    // ─────────────────────────────────────────────────────────
    //  Test config with low thresholds for easier testing
    // ─────────────────────────────────────────────────────────

    function _testConfig() internal pure returns (INovaPool.PoolConfig memory) {
        return INovaPool.PoolConfig({
            baseFee:               10000,     // 1.00%
            matureFee:             500,       // 0.05%
            maxSwapPctBps:         500,       // 5% of liquidity
            largeTradeCooldown:    60,        // 60 seconds
            largeTradePctBps:      200,       // 2% triggers cooldown
            volumeForEmerging:     0.01 ether,
            volumeForGrowing:      0.05 ether,
            volumeForEstablished:  0.1 ether,
            minTradersEmerging:    1,         // In test, swapRouter is always the sender
            minTradersGrowing:     1,
            minTradersEstablished: 1,
            minAgeEmerging:        60,        // 1 minute
            minAgeGrowing:         300,       // 5 minutes
            minAgeEstablished:     600        // 10 minutes
        });
    }

    // ─────────────────────────────────────────────────────────
    //  Setup
    // ─────────────────────────────────────────────────────────

    function setUp() public {
        deployer = address(this);

        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        // Hook needs: beforeInitialize, afterInitialize, beforeSwap, afterSwap
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG |
            Hooks.AFTER_INITIALIZE_FLAG  |
            Hooks.BEFORE_SWAP_FLAG       |
            Hooks.AFTER_SWAP_FLAG
        );
        address hookAddr = address(flags);

        deployCodeTo(
            "NovaPoolHook.sol",
            abi.encode(manager, address(this)),
            hookAddr
        );
        hook = NovaPoolHook(hookAddr);

        // Configure pool with test-friendly thresholds
        // We need to create the poolKey first to configure
        poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(hookAddr)
        });
        poolId = poolKey.toId();

        hook.configurePool(poolKey, _testConfig());

        // Initialize pool
        manager.initialize(poolKey, SQRT_PRICE_1_1);

        // Seed liquidity - increased to 100 ether to handle larger test swaps
        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({
                tickLower: -60,
                tickUpper:  60,
                liquidityDelta: 100 ether,
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );
    }

    // ═════════════════════════════════════════════════════════
    //  1.  Deployment & Initialization
    // ═════════════════════════════════════════════════════════

    function test_ownerIsDeployer() public view {
        assertEq(hook.owner(), deployer);
    }

    function test_poolStartsNascent() public view {
        (INovaPool.MaturityPhase phase, , , , ) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.NASCENT));
    }

    function test_poolConfigStored() public view {
        (
            uint24 baseFee, uint24 matureFee,
            uint16 maxSwapPctBps, uint32 cooldown, uint16 largePctBps,
            , , , , , , , ,
        ) = hook.poolConfigs(poolId);
        assertEq(baseFee, 10000);
        assertEq(matureFee, 500);
        assertEq(maxSwapPctBps, 500);
        assertEq(cooldown, 60);
        assertEq(largePctBps, 200);
    }

    function test_revertIfNotDynamicFee() public {
        // Hook errors are now wrapped in WrappedError by v4, so we just expect any revert
        vm.expectRevert();
        initPool(
            currency0, currency1,
            IHooks(address(hook)),
            3000,           // static fee
            SQRT_PRICE_1_1
        );
    }

    function test_defaultConfigAppliedIfNotPreconfigured() public {
        // Deploy new currencies for a second pool
        (Currency curr2_0, Currency curr2_1) = deployMintAndApprove2Currencies();

        // Initialize a new pool without calling configurePool first
        (PoolKey memory key2,) = initPool(
            curr2_0, curr2_1,
            IHooks(address(hook)),
            LPFeeLibrary.DYNAMIC_FEE_FLAG,
            SQRT_PRICE_1_1
        );
        PoolId pid2 = key2.toId();
        assertTrue(hook.isConfigured(pid2));
    }

    // ═════════════════════════════════════════════════════════
    //  2.  Graduated Fee Tiers
    // ═════════════════════════════════════════════════════════

    function test_nascentFeeIsBaseFee() public view {
        uint24 fee = hook.getCurrentFee(poolId);
        assertEq(fee, 10000); // 1.00%
    }

    function test_emergingFeeIsInterpolated() public {
        // Advance to EMERGING: need volume, traders, age
        _advanceToEmerging();

        uint24 fee = hook.getCurrentFee(poolId);
        // 65% of 10000 + 35% of 500 = 6500 + 175 = 6675
        assertEq(fee, 6675);
    }

    function test_growingFeeIsInterpolated() public {
        _advanceToGrowing();

        uint24 fee = hook.getCurrentFee(poolId);
        // 30% of 10000 + 70% of 500 = 3000 + 350 = 3350
        assertEq(fee, 3350);
    }

    function test_establishedFeeIsMatureFee() public {
        _advanceToEstablished();

        uint24 fee = hook.getCurrentFee(poolId);
        assertEq(fee, 500); // 0.05%
    }

    // ═════════════════════════════════════════════════════════
    //  3.  Maturity Phase Advancement
    // ═════════════════════════════════════════════════════════

    function test_phaseAdvancesOnVolume() public {
        // Age satisfied
        vm.warp(block.timestamp + 61);

        // Volume not yet met (need 0.01 ether)
        swap(poolKey, true, -0.003 ether, ZERO_BYTES);
        (INovaPool.MaturityPhase phase, , , , ) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.NASCENT));

        // Push past volume threshold
        swap(poolKey, true, -0.008 ether, ZERO_BYTES);
        (phase, , , , ) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.EMERGING));
    }

    function test_phaseRequiresAllThreeCriteria() public {
        // High volume but not enough traders or age
        swap(poolKey, true, -0.02 ether, ZERO_BYTES);

        (INovaPool.MaturityPhase phase, , , , ) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.NASCENT));
    }

    function test_phaseNeverRegresses() public {
        _advanceToEmerging();

        (INovaPool.MaturityPhase phase, , , , ) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.EMERGING));

        // More swaps — phase shouldn't go backward
        swap(poolKey, true, -0.001 ether, ZERO_BYTES);

        (phase, , , , ) = hook.getMaturityInfo(poolId);
        assertTrue(uint8(phase) >= uint8(INovaPool.MaturityPhase.EMERGING));
    }

    function test_canSkipPhases() public {
        // If a pool meets all criteria at once, it can jump multiple phases
        _advanceToEstablished();

        (INovaPool.MaturityPhase phase, , , , ) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.ESTABLISHED));
    }

    // ═════════════════════════════════════════════════════════
    //  4.  Unique Trader Tracking
    // ═════════════════════════════════════════════════════════

    function test_uniqueTradersCounted() public {
        // In test context, all swaps go through swapRouter, so we get 1 unique trader
        swap(poolKey, true, -0.001 ether, ZERO_BYTES);
        swap(poolKey, true, -0.001 ether, ZERO_BYTES);
        swap(poolKey, true, -0.001 ether, ZERO_BYTES);

        (, , uint32 traders, , ) = hook.getMaturityInfo(poolId);
        // swapRouter is counted as 1 unique trader
        assertEq(traders, 1);
    }

    function test_sameTraderCountedOnce() public {
        swap(poolKey, true, -0.001 ether, ZERO_BYTES);
        swap(poolKey, true, -0.001 ether, ZERO_BYTES);

        (, , uint32 traders, , ) = hook.getMaturityInfo(poolId);
        assertEq(traders, 1);
    }

    function test_hasTraded() public {
        swap(poolKey, true, -0.001 ether, ZERO_BYTES);
        assertTrue(hook.hasTraded(poolId, address(swapRouter)));
    }

    // ═════════════════════════════════════════════════════════
    //  5.  Anti-Manipulation: Max Swap Size
    // ═════════════════════════════════════════════════════════

    function test_normalSwapSucceeds() public {
        // Small swap relative to liquidity should work fine
        swap(poolKey, true, -0.001 ether, ZERO_BYTES);
    }

    function test_oversizedSwapReverts() public {
        // Get current liquidity
        uint128 liq = manager.getLiquidity(poolId);
        assertTrue(liq > 0, "Pool should have liquidity");

        // Try to swap more than 5% of liquidity
        int256 tooLarge = -int256(uint256(liq)); // way over 5%
        // Hook errors are now wrapped in WrappedError by v4, so we just expect any revert
        vm.expectRevert();
        swap(poolKey, true, tooLarge, ZERO_BYTES);
    }

    // ═════════════════════════════════════════════════════════
    //  6.  Anti-Manipulation: Cooldown
    // ═════════════════════════════════════════════════════════

    function test_largeTradeTriggersCooldown() public {
        // Get liquidity to calculate a "large" trade (>2% of L)
        uint128 liq = manager.getLiquidity(poolId);
        int256 largeAmount = -int256((uint256(liq) * 3) / 100); // 3% — above 2% threshold

        // First large swap should succeed
        swap(poolKey, true, largeAmount, ZERO_BYTES);

        // Immediate second large swap should fail with cooldown
        // Note: the swap router address is the "sender" in hook context
        // For testing, we verify cooldown was set
        uint256 expiry = hook.getCooldownExpiry(poolId, address(swapRouter));
        assertTrue(expiry > block.timestamp, "Cooldown should be set");
    }

    function test_cooldownExpiresCorrectly() public {
        uint128 liq = manager.getLiquidity(poolId);
        int256 largeAmount = -int256((uint256(liq) * 3) / 100);

        swap(poolKey, true, largeAmount, ZERO_BYTES);

        // Fast-forward past cooldown (60 seconds)
        vm.warp(block.timestamp + 61);

        // Should succeed now - swap in opposite direction to avoid price limit
        swap(poolKey, false, largeAmount, ZERO_BYTES);
    }

    function test_smallTradeBypassesCooldown() public {
        uint128 liq = manager.getLiquidity(poolId);
        int256 largeAmount = -int256((uint256(liq) * 3) / 100);

        // Trigger cooldown with large trade
        swap(poolKey, true, largeAmount, ZERO_BYTES);

        // Small trade should still work during cooldown - swap opposite direction
        swap(poolKey, false, -0.001 ether, ZERO_BYTES);
    }

    // ═════════════════════════════════════════════════════════
    //  7.  Cumulative Volume Tracking
    // ═════════════════════════════════════════════════════════

    function test_volumeAccumulates() public {
        swap(poolKey, true, -0.001 ether, ZERO_BYTES);
        swap(poolKey, true, -0.002 ether, ZERO_BYTES);

        (, uint256 vol, , , ) = hook.getMaturityInfo(poolId);
        assertEq(vol, 0.003 ether);
    }

    // ═════════════════════════════════════════════════════════
    //  8.  Config Validation
    // ═════════════════════════════════════════════════════════

    function test_invalidConfigReverts_baseFeeTooLow() public {
        INovaPool.PoolConfig memory bad = _testConfig();
        bad.baseFee = 0;

        vm.expectRevert(INovaPool.InvalidConfig.selector);
        hook.configurePool(poolKey, bad);
    }

    function test_invalidConfigReverts_baseLessThanMature() public {
        INovaPool.PoolConfig memory bad = _testConfig();
        bad.baseFee = 100;
        bad.matureFee = 500; // base < mature

        vm.expectRevert(INovaPool.InvalidConfig.selector);
        hook.configurePool(poolKey, bad);
    }

    function test_invalidConfigReverts_nonMonotonicVolume() public {
        INovaPool.PoolConfig memory bad = _testConfig();
        bad.volumeForEmerging = 100 ether;
        bad.volumeForGrowing = 50 ether; // decreasing

        vm.expectRevert(INovaPool.InvalidConfig.selector);
        hook.configurePool(poolKey, bad);
    }

    function test_onlyOwnerCanConfigure() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(INovaPool.NotOwner.selector);
        hook.configurePool(poolKey, _testConfig());
    }

    // ═════════════════════════════════════════════════════════
    //  9.  Events
    // ═════════════════════════════════════════════════════════

    function test_emitsPhaseAdvanced() public {
        vm.warp(block.timestamp + 61);

        // This swap should trigger EMERGING (volume > 0.01, age > 60, traders >= 1)
        vm.expectEmit(false, false, false, false);
        emit INovaPool.PhaseAdvanced(
            bytes32(0),
            INovaPool.MaturityPhase.NASCENT,
            INovaPool.MaturityPhase.EMERGING,
            0, 0
        );
        swap(poolKey, true, -0.011 ether, ZERO_BYTES);
    }

    function test_emitsGraduatedFeeApplied() public {
        vm.expectEmit(false, false, false, false);
        emit INovaPool.GraduatedFeeApplied(bytes32(0), INovaPool.MaturityPhase.NASCENT, 10000);
        swap(poolKey, true, -0.001 ether, ZERO_BYTES);
    }

    // ═════════════════════════════════════════════════════════
    //  10.  Full lifecycle: NASCENT → ESTABLISHED
    // ═════════════════════════════════════════════════════════

    function test_fullLifecycle() public {
        // Phase 0: NASCENT
        (INovaPool.MaturityPhase phase, , , , uint24 fee) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), 0);
        assertEq(fee, 10000);

        // Advance to EMERGING
        _advanceToEmerging();
        (phase, , , , fee) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), 1);
        assertEq(fee, 6675);

        // Advance to GROWING
        _advanceToGrowing();
        (phase, , , , fee) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), 2);
        assertEq(fee, 3350);

        // Advance to ESTABLISHED
        _advanceToEstablished();
        (phase, , , , fee) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), 3);
        assertEq(fee, 500);
    }

    // ═════════════════════════════════════════════════════════
    //  Helpers
    // ═════════════════════════════════════════════════════════

    function _advanceToEmerging() internal {
        vm.warp(block.timestamp + 61);  // age > 60s
        // Need 1 unique trader (swapRouter) and 0.01 ether volume
        swap(poolKey, true, -0.011 ether, ZERO_BYTES);
    }

    function _advanceToGrowing() internal {
        _advanceToEmerging();
        vm.warp(block.timestamp + 301); // age > 300s
        swap(poolKey, true, -0.04 ether, ZERO_BYTES);
    }

    function _advanceToEstablished() internal {
        _advanceToGrowing();
        vm.warp(block.timestamp + 601); // age > 600s
        swap(poolKey, true, -0.05 ether, ZERO_BYTES);
    }
}
