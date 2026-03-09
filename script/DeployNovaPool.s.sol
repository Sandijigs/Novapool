// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {NovaPoolHook} from "../src/NovaPoolHook.sol";

/// @title DeployNovaPool
/// @notice Deploys NovaPoolHook with the correct hook address prefix.
///
/// Usage:
///   forge script script/DeployNovaPool.s.sol \
///     --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
contract DeployNovaPool is Script {
    address constant POOL_MANAGER = address(0);  // TODO: set actual PoolManager

    function run() external {
        require(POOL_MANAGER != address(0), "Set POOL_MANAGER address");

        vm.startBroadcast();

        NovaPoolHook hook = new NovaPoolHook(IPoolManager(POOL_MANAGER));

        vm.stopBroadcast();

        console.log("NovaPoolHook deployed at:", address(hook));
        console.log("Owner:", hook.owner());
    }
}
