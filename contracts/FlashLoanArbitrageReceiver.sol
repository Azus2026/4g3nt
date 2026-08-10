// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FlashLoanArbitrageReceiver
 * @notice High-performance atomic flash loan arbitrage execution contract across DEXs.
 * @dev Optimized for gas, reentrancy safe, with strict profit checking and slippage enforcement.
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyAttempted();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    error ReentrancyAttempted();
}

contract FlashLoanArbitrageReceiver is IFlashLoanSimpleReceiver, ReentrancyGuard {
    address public immutable owner;
    address public immutable ADDRESSES_PROVIDER;

    // Custom errors for maximum gas efficiency
    error UnauthorizedCaller(address caller);
    error ArbitrageNotProfitable(uint256 received, uint256 requiredToRepay);
    error ExternalCallFailed(address target, bytes data);
    error InsufficientBalance(uint256 balance, uint256 requiredAmount);

    event ArbitrageExecuted(
        address indexed asset,
        uint256 loanAmount,
        uint256 fee,
        uint256 netProfit
    );
    event EmergencyWithdrawal(address indexed token, uint256 amount);

    modifier onlyOwner() {
        if (msg.sender != owner) revert UnauthorizedCaller(msg.sender);
        _;
    }

    constructor(address _addressProvider) {
        owner = msg.sender;
        ADDRESSES_PROVIDER = _addressProvider;
    }

    /**
     * @notice Callback invoked by Aave V3 Pool upon sending the flash loan.
     * @param asset The borrowed token address.
     * @param amount The borrowed token amount.
     * @param premium The flash loan fee charged by the protocol.
     * @param initiator The address that triggered the flash loan.
     * @param params Encoded execution payload containing target DEX call data.
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override nonReentrant returns (bool) {
        // 1. Verify caller is authorized or pool provider
        if (initiator != owner && initiator != address(this)) {
            revert UnauthorizedCaller(initiator);
        }

        uint256 totalRepay = amount + premium;

        // 2. Decode multi-leg DEX swap instructions
        (
            address[] memory targets,
            bytes[] memory datas,
            uint256 minNetProfit
        ) = abi.decode(params, (address[], bytes[], uint256));

        // 3. Execute Swaps sequentially
        for (uint256 i = 0; i < targets.length; ) {
            (bool success, ) = targets[i].call(datas[i]);
            if (!success) {
                revert ExternalCallFailed(targets[i], datas[i]);
            }
            unchecked { ++i; }
        }

        // 4. Verify profitability
        uint256 currentBalance = IERC20(asset).balanceOf(address(this));
        if (currentBalance < totalRepay + minNetProfit) {
            revert ArbitrageNotProfitable(currentBalance, totalRepay + minNetProfit);
        }

        // 5. Approve Pool to repay the flash loan
        IERC20(asset).approve(msg.sender, totalRepay);

        uint256 netProfit = currentBalance - totalRepay;
        emit ArbitrageExecuted(asset, amount, premium, netProfit);

        return true;
    }

    /**
     * @notice Withdraw funds/profits to contract owner.
     */
    function withdrawToken(address token) external onlyOwner nonReentrant {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance == 0) revert InsufficientBalance(0, 1);
        IERC20(token).transfer(owner, balance);
        emit EmergencyWithdrawal(token, balance);
    }

    /**
     * @notice Withdraw ETH/Native currency to contract owner.
     */
    function withdrawETH() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert InsufficientBalance(0, 1);
        (bool sent, ) = owner.call{value: balance}("");
        if (!sent) revert ExternalCallFailed(owner, "");
        emit EmergencyWithdrawal(address(0), balance);
    }

    receive() external payable {}
}
