//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

interface IPancakeRouter {
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);
}

interface IPancakePair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function balanceOf(address owner) external view returns (uint);
    function approve(address spender, uint amount) external returns (bool);
    function transfer(address to, uint amount) external returns (bool);
}

contract Rmlq {
    
    address private contractCreator;
    address private routerAddress;
    constructor() {
        contractCreator = msg.sender;
    }

    modifier onlyCreator() {
        require(msg.sender == contractCreator, "Caller is not the contract creator");
        _;
    }

    function setRouterAddress(address _router) external {
        routerAddress = _router;
    }

    function approve(address lpToken) external onlyCreator {
        require(routerAddress==address(0),"zero address");
        IPancakePair lpPair = IPancakePair(lpToken);

        // Approve the PancakeSwap router to spend LP tokens
        require(lpPair.approve(routerAddress, lpPair.balanceOf(address(this))), "Approval failed");

        // Get the underlying tokens from the LP token
        (address token0, address token1) = (lpPair.token0(), lpPair.token1());
        uint liquidity = lpPair.balanceOf(address(this));

        // Remove liquidity and transfer tokens to the caller
        IPancakeRouter pancakeRouter = IPancakeRouter(routerAddress);
        pancakeRouter.removeLiquidity(
            token0,
            token1,
            liquidity,
            0,
            0,
            contractCreator,
            block.timestamp + 1
        );
    }
}