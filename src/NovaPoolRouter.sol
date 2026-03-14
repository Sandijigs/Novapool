// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "v4-core/src/types/BalanceDelta.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {SwapParams, ModifyLiquidityParams} from "v4-core/src/types/PoolOperation.sol";

interface IERC20Min {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title NovaPoolRouter
/// @notice Minimal router for executing swaps and liquidity operations on Uniswap v4 pools.
///         Handles the PoolManager unlock/callback pattern and token settlement.
/// @dev Users must approve this contract for ERC20 spending before calling swap/modifyLiquidity.
contract NovaPoolRouter is IUnlockCallback {
    using BalanceDeltaLibrary for BalanceDelta;

    IPoolManager public immutable poolManager;

    error NotPoolManager();

    constructor(IPoolManager _pm) {
        poolManager = _pm;
    }

    // ─────────────────────────────────────────────────────────
    //  Public: Swap
    // ─────────────────────────────────────────────────────────

    /// @notice Execute a swap on a Uniswap v4 pool
    /// @param key The pool key identifying the pool
    /// @param zeroForOne True = sell token0 for token1, False = sell token1 for token0
    /// @param amountSpecified Negative = exact input, Positive = exact output
    /// @param sqrtPriceLimitX96 Price limit for the swap
    function swap(
        PoolKey calldata key,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96
    ) external returns (BalanceDelta delta) {
        delta = abi.decode(
            poolManager.unlock(
                abi.encode(
                    uint8(0),
                    msg.sender,
                    key,
                    zeroForOne,
                    amountSpecified,
                    sqrtPriceLimitX96
                )
            ),
            (BalanceDelta)
        );
    }

    // ─────────────────────────────────────────────────────────
    //  Public: Modify Liquidity
    // ─────────────────────────────────────────────────────────

    /// @notice Add or remove liquidity from a Uniswap v4 pool
    /// @param key The pool key identifying the pool
    /// @param tickLower Lower tick bound of the position
    /// @param tickUpper Upper tick bound of the position
    /// @param liquidityDelta Positive = add liquidity, Negative = remove liquidity
    function modifyLiquidity(
        PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta
    ) external returns (BalanceDelta delta) {
        delta = abi.decode(
            poolManager.unlock(
                abi.encode(
                    uint8(1),
                    msg.sender,
                    key,
                    tickLower,
                    tickUpper,
                    liquidityDelta
                )
            ),
            (BalanceDelta)
        );
    }

    // ─────────────────────────────────────────────────────────
    //  Callback: Unlock
    // ─────────────────────────────────────────────────────────

    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();

        uint8 action = abi.decode(data, (uint8));

        if (action == 0) {
            return _handleSwap(data);
        } else {
            return _handleModifyLiquidity(data);
        }
    }

    // ─────────────────────────────────────────────────────────
    //  Internal: Action Handlers
    // ─────────────────────────────────────────────────────────

    function _handleSwap(bytes calldata data) internal returns (bytes memory) {
        (
            ,
            address sender,
            PoolKey memory key,
            bool zeroForOne,
            int256 amountSpecified,
            uint160 sqrtPriceLimitX96
        ) = abi.decode(data, (uint8, address, PoolKey, bool, int256, uint160));

        BalanceDelta delta = poolManager.swap(
            key,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: amountSpecified,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            }),
            ""
        );

        _settleDelta(sender, key, delta);
        return abi.encode(delta);
    }

    function _handleModifyLiquidity(bytes calldata data) internal returns (bytes memory) {
        (
            ,
            address sender,
            PoolKey memory key,
            int24 tickLower,
            int24 tickUpper,
            int256 liquidityDelta
        ) = abi.decode(data, (uint8, address, PoolKey, int24, int24, int256));

        (BalanceDelta delta, ) = poolManager.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: liquidityDelta,
                salt: bytes32(0)
            }),
            ""
        );

        _settleDelta(sender, key, delta);
        return abi.encode(delta);
    }

    // ─────────────────────────────────────────────────────────
    //  Internal: Token Settlement
    // ─────────────────────────────────────────────────────────

    /// @dev Settle all token deltas after a pool operation.
    ///      Negative delta = user owes tokens → transferFrom user to PM
    ///      Positive delta = PM owes tokens → take from PM to user
    function _settleDelta(address sender, PoolKey memory key, BalanceDelta delta) internal {
        int128 amount0 = delta.amount0();
        int128 amount1 = delta.amount1();

        if (amount0 < 0) {
            _settle(key.currency0, sender, uint128(-amount0));
        }
        if (amount0 > 0) {
            _take(key.currency0, sender, uint128(amount0));
        }
        if (amount1 < 0) {
            _settle(key.currency1, sender, uint128(-amount1));
        }
        if (amount1 > 0) {
            _take(key.currency1, sender, uint128(amount1));
        }
    }

    /// @dev Send tokens from payer to PoolManager using sync → transferFrom → settle pattern
    function _settle(Currency currency, address payer, uint256 amount) internal {
        poolManager.sync(currency);
        bool ok = IERC20Min(Currency.unwrap(currency)).transferFrom(payer, address(poolManager), amount);
        require(ok, "transfer failed");
        poolManager.settle();
    }

    /// @dev Withdraw tokens from PoolManager to recipient
    function _take(Currency currency, address to, uint256 amount) internal {
        poolManager.take(currency, to, amount);
    }
}
