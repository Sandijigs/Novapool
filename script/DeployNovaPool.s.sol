// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";
import {NovaPoolHook} from "../src/NovaPoolHook.sol";

/// @title DeployNovaPool
/// @notice Deploys NovaPoolHook using CREATE2 with a mined salt so the
///         contract address encodes the correct hook permission flags.
///
/// Usage:
///   # Unichain Mainnet
///   forge script script/DeployNovaPool.s.sol \
///     --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
///
///   # Dry run (no broadcast)
///   forge script script/DeployNovaPool.s.sol --rpc-url $RPC_URL
contract DeployNovaPool is Script {
    /// @dev Standard CREATE2 deployer proxy — same address on every EVM chain
    address constant CREATE2_DEPLOYER = address(0x4e59b44847b379578588920cA78FbF26c0B4956C);

    function run() external {
        // ── Read config from environment ─────────────────────────
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        require(poolManager != address(0), "POOL_MANAGER_ADDRESS not set in .env");

        // Verify PoolManager has code on this chain
        require(poolManager.code.length > 0, "POOL_MANAGER_ADDRESS has no code - wrong chain?");

        console.log("PoolManager:", poolManager);

        // ── Define required hook flags ───────────────────────────
        // NovaPool uses: beforeInitialize, afterInitialize, beforeSwap, afterSwap
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG |
            Hooks.AFTER_INITIALIZE_FLAG  |
            Hooks.BEFORE_SWAP_FLAG       |
            Hooks.AFTER_SWAP_FLAG
        );

        // ── Mine a salt that produces an address with correct flag bits ──
        bytes memory constructorArgs = abi.encode(poolManager);
        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            type(NovaPoolHook).creationCode,
            constructorArgs
        );

        console.log("Mined hook address:", hookAddress);
        console.log("Salt:", vm.toString(salt));

        // ── Deploy ───────────────────────────────────────────────
        vm.startBroadcast();

        NovaPoolHook hook = new NovaPoolHook{salt: salt}(IPoolManager(poolManager));

        vm.stopBroadcast();

        // ── Verify deployment ────────────────────────────────────
        require(address(hook) == hookAddress, "Deployed address does not match mined address");

        console.log("");
        console.log("=== NovaPool Deployment Successful ===");
        console.log("Hook address:", address(hook));
        console.log("Owner:       ", hook.owner());
        console.log("Chain ID:    ", block.chainid);
        console.log("");
        console.log("Save this to your .env:");
        console.log(string.concat("HOOK_ADDRESS=", vm.toString(address(hook))));
    }
}
