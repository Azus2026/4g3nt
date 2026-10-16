// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IFlashLoanReceiver {
    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external;
}

interface IAaveFlashLoanReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

// Emula el Vault de Balancer V2 (0% Fee)
contract MockBalancerVault {
    using SafeERC20 for IERC20;

    function flashLoan(
        address recipient,
        IERC20[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external {
        IERC20 token = tokens[0];
        uint256 amount = amounts[0];
        uint256 fee = 0;

        uint256 balBefore = token.balanceOf(address(this));
        token.safeTransfer(recipient, amount);

        uint256[] memory feeAmounts = new uint256[](1);
        feeAmounts[0] = fee;

        IFlashLoanReceiver(recipient).receiveFlashLoan(tokens, amounts, feeAmounts, userData);

        uint256 balAfter = token.balanceOf(address(this));
        require(balAfter >= balBefore, "Flash loan not repaid to Balancer");
    }
}
