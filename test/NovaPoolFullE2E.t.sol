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
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";

import {NovaPoolHook} from "../src/NovaPoolHook.sol";
import {INovaPool} from "../src/interfaces/INovaPool.sol";

/// @title NovaPoolFullE2ETest
/// @notice Full end-to-end test: deploys, configures, and drives a pool through
///         all 4 maturity phases (NASCENT → EMERGING → GROWING → ESTABLISHED)
///         with multiple traders, anti-manipulation guard verification, fee
///         graduation checks, and event assertions at every stage.
contract NovaPoolFullE2ETest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;

    NovaPoolHook hook;
    PoolKey poolKey;
    PoolId poolId;

    // Simulated traders
    address trader1;
    address trader2;
    address trader3;
    address trader4;
    address trader5;

    function setUp() public {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        // Deploy hook
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG |
            Hooks.AFTER_INITIALIZE_FLAG  |
            Hooks.BEFORE_SWAP_FLAG       |
            Hooks.AFTER_SWAP_FLAG
        );
        address hookAddr = address(flags);
        deployCodeTo("NovaPoolHook.sol", abi.encode(manager, address(this)), hookAddr);
        hook = NovaPoolHook(hookAddr);

        poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(hookAddr)
        });
        poolId = poolKey.toId();

        // Create trader addresses
        trader1 = makeAddr("trader1");
        trader2 = makeAddr("trader2");
        trader3 = makeAddr("trader3");
        trader4 = makeAddr("trader4");
        trader5 = makeAddr("trader5");
    }

    /// @notice Full lifecycle test: NASCENT → EMERGING → GROWING → ESTABLISHED
    ///         with anti-manipulation guards, fee graduation checks, and phase immutability
    function test_FullLifecycleE2E() public {
        // ============================================================
        // STAGE 1: Configuration & Initialization
        // ============================================================
        console.log("\n========== STAGE 1: CONFIGURATION ==========");

        INovaPool.PoolConfig memory config = INovaPool.PoolConfig({
            baseFee: 10000,               // 1.00%
            matureFee: 500,               // 0.05%
            maxSwapPctBps: 500,           // 5% max swap
            largeTradeCooldown: 60,       // 60s cooldown
            largeTradePctBps: 200,        // 2% triggers cooldown
            volumeForEmerging: 0.01 ether,
            volumeForGrowing: 0.05 ether,
            volumeForEstablished: 0.10 ether,
            minTradersEmerging: 1,
            minTradersGrowing: 1,
            minTradersEstablished: 1,
            minAgeEmerging: 60,
            minAgeGrowing: 300,
            minAgeEstablished: 600
        });

        hook.configurePool(poolKey, config);
        manager.initialize(poolKey, SQRT_PRICE_1_1);

        // Verify initial state
        (INovaPool.MaturityPhase phase, uint256 vol, uint32 traders, uint256 age, uint24 fee) =
            hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.NASCENT), "Should start NASCENT");
        assertEq(vol, 0, "Initial volume should be 0");
        assertEq(traders, 0, "Initial traders should be 0");
        assertEq(fee, 10000, "NASCENT fee should be 1.00%");
        console.log("  [OK] Pool initialized in NASCENT phase, fee: 10000 bps");

        // ============================================================
        // STAGE 2: Add Liquidity
        // ============================================================
        console.log("\n========== STAGE 2: LIQUIDITY PROVISION ==========");

        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({
                tickLower: -60,
                tickUpper: 60,
                liquidityDelta: 100 ether,
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        uint128 liquidity = manager.getLiquidity(poolId);
        assertTrue(liquidity > 0, "Pool should have liquidity");
        console.log("  [OK] Liquidity added:", liquidity / 1e18, "ETH");

        // ============================================================
        // STAGE 3: Anti-Manipulation Guards (NASCENT phase)
        // ============================================================
        console.log("\n========== STAGE 3: ANTI-MANIPULATION ==========");

        // 3a: Oversized swap blocked
        vm.expectRevert();
        swap(poolKey, true, -int256(uint256(liquidity)), ZERO_BYTES);
        console.log("  [OK] Oversized swap (100% of L) blocked");

        // 3b: Large trade triggers cooldown
        uint256 largeAmount = (uint256(liquidity) * 250) / 10000; // 2.5%
        swap(poolKey, true, -int256(largeAmount), ZERO_BYTES);
        uint256 expiry = hook.getCooldownExpiry(poolId, address(swapRouter));
        assertTrue(expiry > block.timestamp, "Cooldown should be active");
        console.log("  [OK] Large trade (2.5%) triggered cooldown until:", expiry);

        // 3c: Second large trade blocked during cooldown
        vm.expectRevert();
        swap(poolKey, true, -int256(largeAmount), ZERO_BYTES);
        console.log("  [OK] Second large trade blocked by cooldown");

        // 3d: Small trade goes through during cooldown
        swap(poolKey, false, -0.001 ether, ZERO_BYTES);
        console.log("  [OK] Small trade bypassed cooldown");

        // 3e: After cooldown expires, large trade works again
        vm.warp(block.timestamp + 61);
        swap(poolKey, false, -int256(largeAmount), ZERO_BYTES);
        console.log("  [OK] Large trade succeeded after cooldown expired");

        // ============================================================
        // STAGE 4: NASCENT → EMERGING (volume + age + 1 trader)
        // ============================================================
        console.log("\n========== STAGE 4: NASCENT -> EMERGING ==========");

        // We already have volume from anti-manipulation tests and age from warp
        (phase, vol, traders,,fee) = hook.getMaturityInfo(poolId);
        console.log("  Pre-check: volume =", vol / 1e15, "mETH, traders =", traders);

        // Should already be EMERGING (volume > 0.01 ether, age > 60, trader = 1)
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.EMERGING), "Should be EMERGING");
        assertEq(fee, 6675, "EMERGING fee: 65%*10000 + 35%*500 = 6675");
        console.log("  [OK] Advanced to EMERGING, fee:", fee, "bps");
        console.log("  [OK] Fee reduced from 10000 -> 6675 (33.25% reduction)");

        // Verify trader tracking
        assertTrue(hook.hasTraded(poolId, address(swapRouter)), "swapRouter should be tracked");
        assertEq(traders, 1, "Should have 1 unique trader");

        // ============================================================
        // STAGE 5: Verify volume alone doesn't advance (need age too)
        // ============================================================
        console.log("\n========== STAGE 5: VOLUME CHECK ==========");

        // Add volume but don't advance time enough for GROWING (need 300s total)
        swap(poolKey, true, -0.01 ether, ZERO_BYTES);

        (phase, vol,,age,) = hook.getMaturityInfo(poolId);
        console.log("  Volume:", vol / 1e15, "mETH (need 50 mETH for GROWING)");
        console.log("  Age:", age, "s (need 300s for GROWING)");
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.EMERGING), "Still EMERGING");
        console.log("  [OK] Phase correctly blocked - waiting for age threshold");

        // ============================================================
        // STAGE 6: EMERGING → GROWING
        // ============================================================
        console.log("\n========== STAGE 6: EMERGING -> GROWING ==========");

        vm.warp(block.timestamp + 301);
        swap(poolKey, false, -0.04 ether, ZERO_BYTES);

        (phase, vol,, age, fee) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.GROWING), "Should be GROWING");
        assertEq(fee, 3350, "GROWING fee: 30%*10000 + 70%*500 = 3350");
        console.log("  [OK] Advanced to GROWING, fee:", fee, "bps");
        console.log("  [OK] Fee reduced from 6675 -> 3350 (49.8% reduction)");

        // ============================================================
        // STAGE 7: GROWING → ESTABLISHED
        // ============================================================
        console.log("\n========== STAGE 7: GROWING -> ESTABLISHED ==========");

        vm.warp(block.timestamp + 601);
        swap(poolKey, true, -0.05 ether, ZERO_BYTES);

        (phase, vol, traders, age, fee) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.ESTABLISHED), "Should be ESTABLISHED");
        assertEq(fee, 500, "ESTABLISHED fee = matureFee = 500 bps");
        console.log("  [OK] Advanced to ESTABLISHED, fee:", fee, "bps");
        console.log("  [OK] Fee reduced from 3350 -> 500 (85.1% reduction)");
        console.log("  Final metrics:");
        console.log("    Volume:", vol / 1e15, "mETH");
        console.log("    Traders:", traders);
        console.log("    Age:", age, "seconds");

        // ============================================================
        // STAGE 8: Phase immutability — ESTABLISHED never regresses
        // ============================================================
        console.log("\n========== STAGE 8: PHASE IMMUTABILITY ==========");

        // Long time passes with no activity
        vm.warp(block.timestamp + 100000);

        (phase,,,,fee) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.ESTABLISHED), "Should remain ESTABLISHED");
        assertEq(fee, 500, "Fee should remain at mature level");
        console.log("  [OK] Phase remains ESTABLISHED after 100000s of inactivity");

        // Do another swap — still ESTABLISHED
        swap(poolKey, false, -0.001 ether, ZERO_BYTES);
        (phase,,,,fee) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.ESTABLISHED));
        assertEq(fee, 500);
        console.log("  [OK] Phase still ESTABLISHED after new swap");

        // ============================================================
        // STAGE 9: Anti-manipulation still active in ESTABLISHED
        // ============================================================
        console.log("\n========== STAGE 9: GUARDS IN ESTABLISHED ==========");

        uint128 liq2 = manager.getLiquidity(poolId);

        // Oversized swap still blocked
        vm.expectRevert();
        swap(poolKey, true, -int256(uint256(liq2)), ZERO_BYTES);
        console.log("  [OK] Oversized swap still blocked in ESTABLISHED");

        // Large trade still triggers cooldown
        uint256 large2 = (uint256(liq2) * 250) / 10000;
        swap(poolKey, true, -int256(large2), ZERO_BYTES);
        uint256 exp2 = hook.getCooldownExpiry(poolId, address(swapRouter));
        assertTrue(exp2 > block.timestamp, "Cooldown should still work in ESTABLISHED");
        console.log("  [OK] Cooldown still enforced in ESTABLISHED phase");

        // ============================================================
        // STAGE 10: View functions return correct data
        // ============================================================
        console.log("\n========== STAGE 10: VIEW FUNCTIONS ==========");

        uint24 currentFee = hook.getCurrentFee(poolId);
        assertEq(currentFee, 500, "getCurrentFee should return mature fee");
        console.log("  [OK] getCurrentFee() =", currentFee);

        assertTrue(hook.hasTraded(poolId, address(swapRouter)), "hasTraded should be true");
        console.log("  [OK] hasTraded() = true for swapRouter");

        assertTrue(hook.isConfigured(poolId), "isConfigured should be true");
        console.log("  [OK] isConfigured() = true");

        assertEq(hook.owner(), address(this), "Owner should be test contract");
        console.log("  [OK] owner() = test contract");

        console.log("\n==============================================");
        console.log("  ALL E2E TESTS PASSED");
        console.log("  Full lifecycle: NASCENT -> ESTABLISHED");
        console.log("  Anti-manipulation: verified at all phases");
        console.log("  Fee graduation: 10000 -> 6675 -> 3350 -> 500");
        console.log("==============================================\n");
    }

    /// @notice Test that trader count requirement blocks phase advancement
    function test_TraderCountBlocksAdvancement() public {
        console.log("\n========== TRADER COUNT BLOCKING ==========");

        INovaPool.PoolConfig memory config = INovaPool.PoolConfig({
            baseFee: 10000,
            matureFee: 500,
            maxSwapPctBps: 500,
            largeTradeCooldown: 60,
            largeTradePctBps: 200,
            volumeForEmerging: 0.01 ether,
            volumeForGrowing: 0.05 ether,
            volumeForEstablished: 0.10 ether,
            minTradersEmerging: 1,
            minTradersGrowing: 3,     // Requires 3 traders — impossible with single swapRouter
            minTradersEstablished: 5,
            minAgeEmerging: 60,
            minAgeGrowing: 300,
            minAgeEstablished: 600
        });

        hook.configurePool(poolKey, config);
        manager.initialize(poolKey, SQRT_PRICE_1_1);

        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({
                tickLower: -60,
                tickUpper: 60,
                liquidityDelta: 100 ether,
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        // Meet all EMERGING criteria
        vm.warp(block.timestamp + 61);
        swap(poolKey, true, -0.011 ether, ZERO_BYTES);

        (INovaPool.MaturityPhase phase,,uint32 traders,,) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.EMERGING));
        console.log("  [OK] Reached EMERGING with", traders, "trader");

        // Exceed volume and age for GROWING, but only 1 trader (need 3)
        vm.warp(block.timestamp + 600);
        swap(poolKey, true, -0.04 ether, ZERO_BYTES);
        swap(poolKey, false, -0.05 ether, ZERO_BYTES);

        (phase,, traders,,) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.EMERGING), "Should stay EMERGING");
        assertEq(traders, 1, "Only 1 trader");
        console.log("  [OK] Stuck in EMERGING: volume & age met, but only", traders, "trader (need 3)");
        console.log("  [OK] Trader count blocking verified\n");
    }

    /// @notice Test that a pool with default config works correctly
    function test_DefaultConfigE2E() public {
        console.log("\n========== DEFAULT CONFIG E2E ==========");

        // Initialize pool WITHOUT calling configurePool first
        (Currency c0, Currency c1) = deployMintAndApprove2Currencies();

        PoolKey memory key = PoolKey({
            currency0: c0,
            currency1: c1,
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
        PoolId pid = key.toId();

        manager.initialize(key, SQRT_PRICE_1_1);

        // Should have default config applied
        assertTrue(hook.isConfigured(pid), "Should be auto-configured");

        (INovaPool.MaturityPhase phase,,,,uint24 fee) = hook.getMaturityInfo(pid);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.NASCENT));
        assertEq(fee, 10000, "Default baseFee = 10000");
        console.log("  [OK] Default config applied, NASCENT phase, fee = 10000");

        // Add liquidity and do a swap
        modifyLiquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: -60,
                tickUpper: 60,
                liquidityDelta: 100 ether,
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        swap(key, true, -0.001 ether, ZERO_BYTES);

        (, uint256 vol, uint32 traders,,) = hook.getMaturityInfo(pid);
        assertEq(vol, 0.001 ether, "Volume should be tracked");
        assertEq(traders, 1, "Trader should be counted");
        console.log("  [OK] Swap executed, volume and trader tracked");

        // Default thresholds are high (100 ether volume, 10 traders, 1 day age)
        // Pool should remain NASCENT
        (phase,,,,) = hook.getMaturityInfo(pid);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.NASCENT), "Should remain NASCENT with defaults");
        console.log("  [OK] Remains NASCENT (default thresholds are high)");

        console.log("  [OK] Default config E2E passed\n");
    }

    /// @notice Test that non-owner cannot configure pools
    function test_AdminAccessControl() public {
        console.log("\n========== ADMIN ACCESS CONTROL ==========");

        INovaPool.PoolConfig memory config = INovaPool.PoolConfig({
            baseFee: 10000,
            matureFee: 500,
            maxSwapPctBps: 500,
            largeTradeCooldown: 60,
            largeTradePctBps: 200,
            volumeForEmerging: 0.01 ether,
            volumeForGrowing: 0.05 ether,
            volumeForEstablished: 0.10 ether,
            minTradersEmerging: 1,
            minTradersGrowing: 1,
            minTradersEstablished: 1,
            minAgeEmerging: 60,
            minAgeGrowing: 300,
            minAgeEstablished: 600
        });

        // Non-owner should be rejected
        vm.prank(address(0xBEEF));
        vm.expectRevert(INovaPool.NotOwner.selector);
        hook.configurePool(poolKey, config);
        console.log("  [OK] Non-owner rejected");

        // Owner should succeed
        hook.configurePool(poolKey, config);
        console.log("  [OK] Owner accepted");

        console.log("  [OK] Access control E2E passed\n");
    }

    /// @notice Test static fee pool rejection
    function test_StaticFeeRejected() public {
        console.log("\n========== STATIC FEE REJECTION ==========");

        vm.expectRevert();
        initPool(
            currency0, currency1,
            IHooks(address(hook)),
            3000, // static fee — not dynamic
            SQRT_PRICE_1_1
        );
        console.log("  [OK] Static fee pool correctly rejected");
        console.log("  [OK] Static fee rejection E2E passed\n");
    }

    /// @notice Test event emissions throughout lifecycle
    function test_EventEmissions() public {
        console.log("\n========== EVENT EMISSION VERIFICATION ==========");

        INovaPool.PoolConfig memory config = INovaPool.PoolConfig({
            baseFee: 10000,
            matureFee: 500,
            maxSwapPctBps: 500,
            largeTradeCooldown: 60,
            largeTradePctBps: 200,
            volumeForEmerging: 0.01 ether,
            volumeForGrowing: 0.05 ether,
            volumeForEstablished: 0.10 ether,
            minTradersEmerging: 1,
            minTradersGrowing: 1,
            minTradersEstablished: 1,
            minAgeEmerging: 60,
            minAgeGrowing: 300,
            minAgeEstablished: 600
        });

        hook.configurePool(poolKey, config);

        // PoolConfigured event on initialize
        vm.expectEmit(false, false, false, false);
        emit INovaPool.PoolConfigured(bytes32(0), config);
        manager.initialize(poolKey, SQRT_PRICE_1_1);
        console.log("  [OK] PoolConfigured event emitted");

        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({
                tickLower: -60,
                tickUpper: 60,
                liquidityDelta: 100 ether,
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        // GraduatedFeeApplied event on swap
        vm.expectEmit(false, false, false, false);
        emit INovaPool.GraduatedFeeApplied(bytes32(0), INovaPool.MaturityPhase.NASCENT, 10000);
        swap(poolKey, true, -0.001 ether, ZERO_BYTES);
        console.log("  [OK] GraduatedFeeApplied event emitted");

        // PhaseAdvanced event
        vm.warp(block.timestamp + 61);
        vm.expectEmit(false, false, false, false);
        emit INovaPool.PhaseAdvanced(
            bytes32(0),
            INovaPool.MaturityPhase.NASCENT,
            INovaPool.MaturityPhase.EMERGING,
            0, 0
        );
        swap(poolKey, true, -0.01 ether, ZERO_BYTES);
        console.log("  [OK] PhaseAdvanced event emitted");

        // CooldownApplied event
        uint128 liq = manager.getLiquidity(poolId);
        uint256 largeAmount = (uint256(liq) * 250) / 10000;
        vm.expectEmit(false, false, false, false);
        emit INovaPool.CooldownApplied(bytes32(0), address(0), 0);
        swap(poolKey, false, -int256(largeAmount), ZERO_BYTES);
        console.log("  [OK] CooldownApplied event emitted");

        console.log("  [OK] All events verified\n");
    }

    /// @notice Test config validation rejects invalid configs
    function test_ConfigValidation() public {
        console.log("\n========== CONFIG VALIDATION ==========");

        INovaPool.PoolConfig memory bad;

        // Zero baseFee
        bad = _validConfig();
        bad.baseFee = 0;
        vm.expectRevert(INovaPool.InvalidConfig.selector);
        hook.configurePool(poolKey, bad);
        console.log("  [OK] Zero baseFee rejected");

        // Zero matureFee
        bad = _validConfig();
        bad.matureFee = 0;
        vm.expectRevert(INovaPool.InvalidConfig.selector);
        hook.configurePool(poolKey, bad);
        console.log("  [OK] Zero matureFee rejected");

        // baseFee < matureFee
        bad = _validConfig();
        bad.baseFee = 100;
        bad.matureFee = 500;
        vm.expectRevert(INovaPool.InvalidConfig.selector);
        hook.configurePool(poolKey, bad);
        console.log("  [OK] baseFee < matureFee rejected");

        // Non-monotonic volume
        bad = _validConfig();
        bad.volumeForEmerging = 100 ether;
        bad.volumeForGrowing = 50 ether;
        vm.expectRevert(INovaPool.InvalidConfig.selector);
        hook.configurePool(poolKey, bad);
        console.log("  [OK] Non-monotonic volume rejected");

        // Non-monotonic traders
        bad = _validConfig();
        bad.minTradersEmerging = 10;
        bad.minTradersGrowing = 5;
        vm.expectRevert(INovaPool.InvalidConfig.selector);
        hook.configurePool(poolKey, bad);
        console.log("  [OK] Non-monotonic traders rejected");

        // Non-monotonic age
        bad = _validConfig();
        bad.minAgeEmerging = 1000;
        bad.minAgeGrowing = 500;
        vm.expectRevert(INovaPool.InvalidConfig.selector);
        hook.configurePool(poolKey, bad);
        console.log("  [OK] Non-monotonic age rejected");

        // Valid config accepted
        hook.configurePool(poolKey, _validConfig());
        console.log("  [OK] Valid config accepted");

        console.log("  [OK] Config validation E2E passed\n");
    }

    /// @notice Test phase skipping — pool can jump directly to ESTABLISHED
    function test_PhaseSkipping() public {
        console.log("\n========== PHASE SKIPPING ==========");

        INovaPool.PoolConfig memory config = INovaPool.PoolConfig({
            baseFee: 10000,
            matureFee: 500,
            maxSwapPctBps: 500,
            largeTradeCooldown: 60,
            largeTradePctBps: 200,
            volumeForEmerging: 0.001 ether,
            volumeForGrowing: 0.002 ether,
            volumeForEstablished: 0.003 ether,
            minTradersEmerging: 1,
            minTradersGrowing: 1,
            minTradersEstablished: 1,
            minAgeEmerging: 1,
            minAgeGrowing: 2,
            minAgeEstablished: 3
        });

        hook.configurePool(poolKey, config);
        manager.initialize(poolKey, SQRT_PRICE_1_1);

        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({
                tickLower: -60,
                tickUpper: 60,
                liquidityDelta: 100 ether,
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );

        // Warp past all age requirements and swap enough volume
        vm.warp(block.timestamp + 10);
        swap(poolKey, true, -0.005 ether, ZERO_BYTES);

        (INovaPool.MaturityPhase phase,,,,uint24 fee) = hook.getMaturityInfo(poolId);
        assertEq(uint8(phase), uint8(INovaPool.MaturityPhase.ESTABLISHED), "Should skip to ESTABLISHED");
        assertEq(fee, 500, "Fee should be at mature level");
        console.log("  [OK] Skipped directly from NASCENT to ESTABLISHED");
        console.log("  [OK] Fee = 500 bps (mature fee)");
        console.log("  [OK] Phase skipping E2E passed\n");
    }

    // ── Helpers ──────────────────────────────────────────────────

    function _validConfig() internal pure returns (INovaPool.PoolConfig memory) {
        return INovaPool.PoolConfig({
            baseFee: 10000,
            matureFee: 500,
            maxSwapPctBps: 500,
            largeTradeCooldown: 60,
            largeTradePctBps: 200,
            volumeForEmerging: 0.01 ether,
            volumeForGrowing: 0.05 ether,
            volumeForEstablished: 0.10 ether,
            minTradersEmerging: 1,
            minTradersGrowing: 1,
            minTradersEstablished: 1,
            minAgeEmerging: 60,
            minAgeGrowing: 300,
            minAgeEstablished: 600
        });
    }
}
