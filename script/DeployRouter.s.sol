// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {NovaPoolRouter} from "../src/NovaPoolRouter.sol";
import {MockERC20} from "../src/MockERC20.sol";

/// @title DeployRouter
/// @notice Deploys NovaPoolRouter + two MockERC20 demo tokens to testnet
contract DeployRouter is Script {
    // Unichain Sepolia PoolManager
    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Router
        NovaPoolRouter router = new NovaPoolRouter(IPoolManager(POOL_MANAGER));
        console2.log("Router deployed at:", address(router));

        // 2. Deploy Mock Tokens
        MockERC20 tokenA = new MockERC20("Nova Token A", "NOVA-A", 18);
        MockERC20 tokenB = new MockERC20("Nova Token B", "NOVA-B", 18);
        console2.log("Token A deployed at:", address(tokenA));
        console2.log("Token B deployed at:", address(tokenB));

        // 3. Mint initial supply to deployer (1M each)
        uint256 mintAmount = 1_000_000 ether;
        tokenA.mint(deployer, mintAmount);
        tokenB.mint(deployer, mintAmount);
        console2.log("Minted", mintAmount / 1e18, "of each token to deployer");

        vm.stopBroadcast();

        // Sort tokens for pool key (currency0 < currency1)
        address c0 = address(tokenA) < address(tokenB) ? address(tokenA) : address(tokenB);
        address c1 = address(tokenA) < address(tokenB) ? address(tokenB) : address(tokenA);
        console2.log("currency0 (lower):", c0);
        console2.log("currency1 (higher):", c1);
    }
}
