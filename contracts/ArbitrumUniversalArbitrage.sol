// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ═══════════════════════════════════════════════════════════════
//  Interfaces de DEXes en Arbitrum One (ChainID 42161)
// ═══════════════════════════════════════════════════════════════

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface ICamelotV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 limitSqrtPrice;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface ICamelotV2Router {
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        address referrer,
        uint256 deadline
    ) external;

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
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

// Balancer V2 Flash Loan (0% fee!)
interface IBalancerVault {
    function flashLoan(
        address recipient,
        IERC20[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external;
}

interface IFlashLoanRecipient {
    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external;
}

contract ArbitrumUniversalArbitrage is IFlashLoanSimpleReceiver, IFlashLoanRecipient {
    using SafeERC20 for IERC20;

    // Constantes de Red en Arbitrum One (ChainID 42161)
    address public constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address public constant AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address public constant BALANCER_VAULT = 0xbA12222222228d8ba53bE47888D1630fE1aA9945;

    // DEX Routers en Arbitrum
    address public constant UNIV3_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address public constant CAMELOT_V3_ROUTER = 0x1F721E2E82F6676FCE4eA07A5958cF098D339e18;
    address public constant CAMELOT_V2_ROUTER = 0xc873fEcbd354f5A56E00E710B90EF4201db2448d;
    address public constant PANCAKE_V3_ROUTER = 0x1b81D678ffb9C0263b24A97847620C99d213eB14;
    address public constant SUSHISWAP_V3_ROUTER = 0xFB7eF66a7e61224DD6FcD0D7d9C3be5C8B049b9f;

    // Enum de DEXes en Arbitrum
    enum DexType {
        UNIV3,          // 0: Uniswap V3 (Concentrated Liquidity)
        CAMELOT_V3,     // 1: Camelot V3 / Algebra (CL)
        CAMELOT_V2,     // 2: Camelot Classic AMM V2
        PANCAKE_V3,     // 3: PancakeSwap V3 (CL)
        SUSHISWAP_V3    // 4: SushiSwap V3 (CL)
    }

    struct SpatialRoute {
        address tokenIn;
        address tokenIntermediate;
        uint8 dexBuy;
        uint8 dexSell;
        uint24 feeOrSpacingBuy;
        uint24 feeOrSpacingSell;
        uint256 minProfit;
    }

    struct TriangularRoute {
        address tokenA;
        address tokenB;
        address tokenC;
        uint8 dex1;
        uint8 dex2;
        uint8 dex3;
        uint24 feeOrSpacing1;
        uint24 feeOrSpacing2;
        uint24 feeOrSpacing3;
        uint256 minProfit;
    }

    address public owner;

    event SpatialExecuted(address indexed token, uint256 amountIn, uint256 amountOut, uint256 profit);
    event TriangularExecuted(address indexed token, uint256 amountIn, uint256 amountOut, uint256 profit);
    event FlashLoanExecuted(address indexed asset, uint256 loanAmount, uint256 premium, uint256 netProfit);

    error OnlyOwner();
    error NotAavePool();
    error NotBalancerVault();
    error NotProfitable(uint256 received, uint256 required);
    error InvalidDEX(uint8 dexId);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    function _getRouterAddress(uint8 dexId) internal pure returns (address) {
        if (dexId == uint8(DexType.UNIV3)) return UNIV3_ROUTER;
        if (dexId == uint8(DexType.CAMELOT_V3)) return CAMELOT_V3_ROUTER;
        if (dexId == uint8(DexType.CAMELOT_V2)) return CAMELOT_V2_ROUTER;
        if (dexId == uint8(DexType.PANCAKE_V3)) return PANCAKE_V3_ROUTER;
        if (dexId == uint8(DexType.SUSHISWAP_V3)) return SUSHISWAP_V3_ROUTER;
        revert InvalidDEX(dexId);
    }

    function _ensureAllowance(address token, address router, uint256 amount) internal {
        uint256 allowance = IERC20(token).allowance(address(this), router);
        if (allowance < amount) {
            IERC20(token).forceApprove(router, type(uint256).max);
        }
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint8 dexId,
        uint24 feeOrSpacing
    ) internal returns (uint256 amountOut) {
        address router = _getRouterAddress(dexId);
        _ensureAllowance(tokenIn, router, amountIn);

        if (dexId == uint8(DexType.UNIV3) || dexId == uint8(DexType.PANCAKE_V3) || dexId == uint8(DexType.SUSHISWAP_V3)) {
            IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: feeOrSpacing,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
            return IUniswapV3Router(router).exactInputSingle(params);
        } else if (dexId == uint8(DexType.CAMELOT_V3)) {
            ICamelotV3Router.ExactInputSingleParams memory params = ICamelotV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                limitSqrtPrice: 0
            });
            return ICamelotV3Router(router).exactInputSingle(params);
        } else if (dexId == uint8(DexType.CAMELOT_V2)) {
            address[] memory path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;
            uint256[] memory amounts = ICamelotV2Router(router).swapExactTokensForTokens(
                amountIn,
                0,
                path,
                address(this),
                block.timestamp
            );
            return amounts[amounts.length - 1];
        }
        revert InvalidDEX(dexId);
    }

    function executeSpotSpatial(SpatialRoute calldata route, uint256 amountIn) external onlyOwner {
        IERC20(route.tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 initialBalance = IERC20(route.tokenIn).balanceOf(address(this));

        uint256 interAmount = _swap(route.tokenIn, route.tokenIntermediate, amountIn, route.dexBuy, route.feeOrSpacingBuy);
        uint256 finalOut = _swap(route.tokenIntermediate, route.tokenIn, interAmount, route.dexSell, route.feeOrSpacingSell);

        uint256 finalBalance = IERC20(route.tokenIn).balanceOf(address(this));
        uint256 requiredAmount = initialBalance + route.minProfit;

        if (finalBalance < requiredAmount) {
            revert NotProfitable(finalBalance, requiredAmount);
        }

        uint256 profit = finalBalance - initialBalance;
        IERC20(route.tokenIn).safeTransfer(msg.sender, amountIn + profit);

        emit SpatialExecuted(route.tokenIn, amountIn, finalOut, profit);
    }

    function executeSpotTriangular(TriangularRoute calldata route, uint256 amountIn) external onlyOwner {
        IERC20(route.tokenA).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 initialBalance = IERC20(route.tokenA).balanceOf(address(this));

        uint256 amountB = _swap(route.tokenA, route.tokenB, amountIn, route.dex1, route.feeOrSpacing1);
        uint256 amountC = _swap(route.tokenB, route.tokenC, amountB, route.dex2, route.feeOrSpacing2);
        uint256 finalOut = _swap(route.tokenC, route.tokenA, amountC, route.dex3, route.feeOrSpacing3);

        uint256 finalBalance = IERC20(route.tokenA).balanceOf(address(this));
        uint256 requiredAmount = initialBalance + route.minProfit;

        if (finalBalance < requiredAmount) {
            revert NotProfitable(finalBalance, requiredAmount);
        }

        uint256 profit = finalBalance - initialBalance;
        IERC20(route.tokenA).safeTransfer(msg.sender, amountIn + profit);

        emit TriangularExecuted(route.tokenA, amountIn, finalOut, profit);
    }

    function executeFlashLoanSpatial(SpatialRoute calldata route, uint256 loanAmount) external onlyOwner {
        bytes memory params = abi.encode(uint8(0), abi.encode(route));
        IPool(AAVE_POOL).flashLoanSimple(address(this), route.tokenIn, loanAmount, params, 0);
    }

    function executeFlashLoanTriangular(TriangularRoute calldata route, uint256 loanAmount) external onlyOwner {
        bytes memory params = abi.encode(uint8(1), abi.encode(route));
        IPool(AAVE_POOL).flashLoanSimple(address(this), route.tokenA, loanAmount, params, 0);
    }

    function executeBalancerFlashLoanSpatial(SpatialRoute calldata route, uint256 loanAmount) external onlyOwner {
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(route.tokenIn);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = loanAmount;
        bytes memory userData = abi.encode(uint8(0), abi.encode(route));
        IBalancerVault(BALANCER_VAULT).flashLoan(address(this), tokens, amounts, userData);
    }

    function executeBalancerFlashLoanTriangular(TriangularRoute calldata route, uint256 loanAmount) external onlyOwner {
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(route.tokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = loanAmount;
        bytes memory userData = abi.encode(uint8(1), abi.encode(route));
        IBalancerVault(BALANCER_VAULT).flashLoan(address(this), tokens, amounts, userData);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address /* initiator */,
        bytes calldata params
    ) external override returns (bool) {
        if (msg.sender != AAVE_POOL) revert NotAavePool();

        (uint8 routeType, bytes memory routeData) = abi.decode(params, (uint8, bytes));
        uint256 amountOwed = amount + premium;

        if (routeType == 0) {
            SpatialRoute memory route = abi.decode(routeData, (SpatialRoute));
            uint256 interAmount = _swap(route.tokenIn, route.tokenIntermediate, amount, route.dexBuy, route.feeOrSpacingBuy);
            _swap(route.tokenIntermediate, route.tokenIn, interAmount, route.dexSell, route.feeOrSpacingSell);

            uint256 currentBalance = IERC20(asset).balanceOf(address(this));
            if (currentBalance < amountOwed + route.minProfit) {
                revert NotProfitable(currentBalance, amountOwed + route.minProfit);
            }

            IERC20(asset).safeIncreaseAllowance(AAVE_POOL, amountOwed);
            uint256 netProfit = currentBalance - amountOwed;
            if (netProfit > 0) {
                IERC20(asset).safeTransfer(owner, netProfit);
            }
            emit FlashLoanExecuted(asset, amount, premium, netProfit);
        } else if (routeType == 1) {
            TriangularRoute memory route = abi.decode(routeData, (TriangularRoute));
            uint256 amountB = _swap(route.tokenA, route.tokenB, amount, route.dex1, route.feeOrSpacing1);
            uint256 amountC = _swap(route.tokenB, route.tokenC, amountB, route.dex2, route.feeOrSpacing2);
            _swap(route.tokenC, route.tokenA, amountC, route.dex3, route.feeOrSpacing3);

            uint256 currentBalance = IERC20(asset).balanceOf(address(this));
            if (currentBalance < amountOwed + route.minProfit) {
                revert NotProfitable(currentBalance, amountOwed + route.minProfit);
            }

            IERC20(asset).safeIncreaseAllowance(AAVE_POOL, amountOwed);
            uint256 netProfit = currentBalance - amountOwed;
            if (netProfit > 0) {
                IERC20(asset).safeTransfer(owner, netProfit);
            }
            emit FlashLoanExecuted(asset, amount, premium, netProfit);
        }

        return true;
    }

    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        if (msg.sender != BALANCER_VAULT) revert NotBalancerVault();

        (uint8 routeType, bytes memory routeData) = abi.decode(userData, (uint8, bytes));
        address asset = address(tokens[0]);
        uint256 amount = amounts[0];
        uint256 amountOwed = amount + feeAmounts[0]; // Balancer fee is 0%

        if (routeType == 0) {
            SpatialRoute memory route = abi.decode(routeData, (SpatialRoute));
            uint256 interAmount = _swap(route.tokenIn, route.tokenIntermediate, amount, route.dexBuy, route.feeOrSpacingBuy);
            _swap(route.tokenIntermediate, route.tokenIn, interAmount, route.dexSell, route.feeOrSpacingSell);

            uint256 currentBalance = IERC20(asset).balanceOf(address(this));
            if (currentBalance < amountOwed + route.minProfit) {
                revert NotProfitable(currentBalance, amountOwed + route.minProfit);
            }

            IERC20(asset).safeTransfer(BALANCER_VAULT, amountOwed);
            uint256 netProfit = currentBalance - amountOwed;
            if (netProfit > 0) {
                IERC20(asset).safeTransfer(owner, netProfit);
            }
            emit FlashLoanExecuted(asset, amount, feeAmounts[0], netProfit);
        } else if (routeType == 1) {
            TriangularRoute memory route = abi.decode(routeData, (TriangularRoute));
            uint256 amountB = _swap(route.tokenA, route.tokenB, amount, route.dex1, route.feeOrSpacing1);
            uint256 amountC = _swap(route.tokenB, route.tokenC, amountB, route.dex2, route.feeOrSpacing2);
            _swap(route.tokenC, route.tokenA, amountC, route.dex3, route.feeOrSpacing3);

            uint256 currentBalance = IERC20(asset).balanceOf(address(this));
            if (currentBalance < amountOwed + route.minProfit) {
                revert NotProfitable(currentBalance, amountOwed + route.minProfit);
            }

            IERC20(asset).safeTransfer(BALANCER_VAULT, amountOwed);
            uint256 netProfit = currentBalance - amountOwed;
            if (netProfit > 0) {
                IERC20(asset).safeTransfer(owner, netProfit);
            }
            emit FlashLoanExecuted(asset, amount, feeAmounts[0], netProfit);
        }
    }

    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(owner, balance);
        }
    }

    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool s, ) = payable(owner).call{value: balance}("");
            require(s, "ETH Transfer failed");
        }
    }
}
