// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockPancakeV3Router {
    using SafeERC20 for IERC20;

    bool public selectorVerified;
    uint256 public multiplierBps = 10000; // 100% by default

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function setMultiplierBps(uint256 bps) external {
        multiplierBps = bps;
    }

    // Selector: 0x414bf389
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        if (msg.sig == 0x414bf389) {
            selectorVerified = true;
        }
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        amountOut = (params.amountIn * multiplierBps) / 10000;
        IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);
    }
}

contract MockUniV3Router {
    using SafeERC20 for IERC20;

    bool public selectorVerified;
    uint256 public multiplierBps = 10000;

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function setMultiplierBps(uint256 bps) external {
        multiplierBps = bps;
    }

    // Selector: 0x04e45aaf
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        if (msg.sig == 0x04e45aaf) {
            selectorVerified = true;
        }
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        amountOut = (params.amountIn * multiplierBps) / 10000;
        IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);
    }
}
