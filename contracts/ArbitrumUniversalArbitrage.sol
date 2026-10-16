// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interfaces de DEX Routers en Arbitrum One
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

// Interfaz estándar de 8 parámetros (selector 0x414bf389) para PancakeSwap V3 y SushiSwap V3
interface IPancakeV3Router {
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
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

// Aave V3 Flash Loan Interfaces
interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
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

// Balancer V2 Flash Loan Interfaces (0% Fee)
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
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    // DEX Routers en Arbitrum One
    address public constant UNIV3_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address public constant CAMELOT_V3_ROUTER = 0x1F721E2E82F6676FCE4eA07A5958cF098D339e18;
    address public constant CAMELOT_V2_ROUTER = 0xc873fEcbd354f5A56E00E710B90EF4201db2448d;
    address public constant PANCAKE_V3_ROUTER = 0x1b81D678ffb9C0263b24A97847620C99d213eB14;
    // Dirección oficial de SushiSwap V3 Router en Arbitrum One
    address public constant SUSHISWAP_V3_ROUTER = 0x8A21F6768C1f8075791D08546Dadf6daA0bE820c;

    // Enum de DEXes en Arbitrum
    enum DexType {
        UNIV3,          // 0: Uniswap V3 (Concentrated Liquidity)
        CAMELOT_V3,     // 1: Camelot V3 / Algebra (CL)
        CAMELOT_V2,     // 2: Camelot Classic AMM V2
        PANCAKE_V3,     // 3: PancakeSwap V3 (CL - 8 params)
        SUSHISWAP_V3    // 4: SushiSwap V3 (CL - 8 params)
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

    // ── Variables de Retorno y Seguridad de Callbacks ──
    uint256 private _lastProfit;
    bool private _inFlashLoan;

    event FlashLoanExecuted(address indexed token, uint256 loanAmount, uint256 grossProfit, uint256 timestamp);

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

    function _approveTokenToRouters(address token) internal {
        IERC20(token).forceApprove(UNIV3_ROUTER, type(uint256).max);
        IERC20(token).forceApprove(CAMELOT_V3_ROUTER, type(uint256).max);
        IERC20(token).forceApprove(CAMELOT_V2_ROUTER, type(uint256).max);
        IERC20(token).forceApprove(PANCAKE_V3_ROUTER, type(uint256).max);
        IERC20(token).forceApprove(SUSHISWAP_V3_ROUTER, type(uint256).max);
    }

    function approveRouters(address[] calldata tokens) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            _approveTokenToRouters(tokens[i]);
        }
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint8 dexId,
        uint24 feeOrSpacing
    ) internal returns (uint256 amountOut) {
        address router;
        if (dexId == uint8(DexType.UNIV3)) router = UNIV3_ROUTER;
        else if (dexId == uint8(DexType.CAMELOT_V3)) router = CAMELOT_V3_ROUTER;
        else if (dexId == uint8(DexType.CAMELOT_V2)) router = CAMELOT_V2_ROUTER;
        else if (dexId == uint8(DexType.PANCAKE_V3)) router = PANCAKE_V3_ROUTER;
        else if (dexId == uint8(DexType.SUSHISWAP_V3)) router = SUSHISWAP_V3_ROUTER;
        else revert InvalidDEX(dexId);

        if (IERC20(tokenIn).allowance(address(this), router) < amountIn) {
            IERC20(tokenIn).forceApprove(router, type(uint256).max);
        }

        if (dexId == uint8(DexType.UNIV3)) {
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
        } else if (dexId == uint8(DexType.PANCAKE_V3) || dexId == uint8(DexType.SUSHISWAP_V3)) {
            // Variante de 8 parámetros con deadline para PancakeSwap V3 y SushiSwap V3 (selector 0x414bf389)
            IPancakeV3Router.ExactInputSingleParams memory params = IPancakeV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: feeOrSpacing,
                recipient: address(this),
                deadline: block.timestamp + 120,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
            return IPancakeV3Router(router).exactInputSingle(params);
        } else if (dexId == uint8(DexType.CAMELOT_V3)) {
            ICamelotV3Router.ExactInputSingleParams memory params = ICamelotV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                recipient: address(this),
                deadline: block.timestamp + 120,
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
                block.timestamp + 120
            );
            return amounts[amounts.length - 1];
        }
        revert InvalidDEX(dexId);
    }

    // ═══════════════════════════════════════════════════════════
    //  1. Flash Loans con Aave V3 (Arbitrum)
    // ═══════════════════════════════════════════════════════════
    function executeFlashLoanSpatial(SpatialRoute calldata route, uint256 loanAmount) external onlyOwner returns (uint256 profit) {
        _inFlashLoan = true;
        _lastProfit = 0;
        bytes memory params = abi.encode(uint8(0), abi.encode(route));
        IPool(AAVE_POOL).flashLoanSimple(address(this), route.tokenIn, loanAmount, params, 0);
        _inFlashLoan = false;
        return _lastProfit;
    }

    function executeFlashLoanTriangular(TriangularRoute calldata route, uint256 loanAmount) external onlyOwner returns (uint256 profit) {
        _inFlashLoan = true;
        _lastProfit = 0;
        bytes memory params = abi.encode(uint8(1), abi.encode(route));
        IPool(AAVE_POOL).flashLoanSimple(address(this), route.tokenA, loanAmount, params, 0);
        _inFlashLoan = false;
        return _lastProfit;
    }

    // ═══════════════════════════════════════════════════════════
    //  2. Flash Loans con Balancer V2 (Arbitrum - 0% Fee)
    // ═══════════════════════════════════════════════════════════
    function executeBalancerFlashLoanSpatial(SpatialRoute calldata route, uint256 loanAmount) external onlyOwner returns (uint256 profit) {
        _inFlashLoan = true;
        _lastProfit = 0;
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(route.tokenIn);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = loanAmount;
        bytes memory userData = abi.encode(uint8(0), abi.encode(route));
        IBalancerVault(BALANCER_VAULT).flashLoan(address(this), tokens, amounts, userData);
        _inFlashLoan = false;
        return _lastProfit;
    }

    function executeBalancerFlashLoanTriangular(TriangularRoute calldata route, uint256 loanAmount) external onlyOwner returns (uint256 profit) {
        _inFlashLoan = true;
        _lastProfit = 0;
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(route.tokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = loanAmount;
        bytes memory userData = abi.encode(uint8(1), abi.encode(route));
        IBalancerVault(BALANCER_VAULT).flashLoan(address(this), tokens, amounts, userData);
        _inFlashLoan = false;
        return _lastProfit;
    }

    // ═══════════════════════════════════════════════════════════
    //  3. Callback Aave V3 con AISLAMIENTO DE SALDO PREVIO
    // ═══════════════════════════════════════════════════════════
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        if (msg.sender != AAVE_POOL) revert NotAavePool();
        require(initiator == address(this), "Initiator not this contract");
        require(_inFlashLoan, "Unauthorized flash loan initiation");

        uint256 totalOwed = amount + premium;

        // AISLAMIENTO DE CAPITAL: Capturar saldo previo a la llegada del préstamo
        uint256 currentBalAtEntry = IERC20(asset).balanceOf(address(this));
        uint256 preExistingBalance = currentBalAtEntry > amount ? currentBalAtEntry - amount : 0;

        (uint8 routeType, bytes memory routeData) = abi.decode(params, (uint8, bytes));
        uint256 minProfit;

        if (routeType == 0) {
            SpatialRoute memory route = abi.decode(routeData, (SpatialRoute));
            minProfit = route.minProfit;
            uint256 interAmount = _swap(route.tokenIn, route.tokenIntermediate, amount, route.dexBuy, route.feeOrSpacingBuy);
            _swap(route.tokenIntermediate, route.tokenIn, interAmount, route.dexSell, route.feeOrSpacingSell);
        } else if (routeType == 1) {
            TriangularRoute memory route = abi.decode(routeData, (TriangularRoute));
            minProfit = route.minProfit;
            uint256 amountB = _swap(route.tokenA, route.tokenB, amount, route.dex1, route.feeOrSpacing1);
            uint256 amountC = _swap(route.tokenB, route.tokenC, amountB, route.dex2, route.feeOrSpacing2);
            _swap(route.tokenC, route.tokenA, amountC, route.dex3, route.feeOrSpacing3);
        }

        uint256 currentBalance = IERC20(asset).balanceOf(address(this));
        uint256 requiredBalance = preExistingBalance + totalOwed + minProfit;

        // Prohibido subsidiar operaciones perdedoras con saldo previo
        if (currentBalance < requiredBalance) {
            revert NotProfitable(currentBalance, requiredBalance);
        }

        IERC20(asset).forceApprove(AAVE_POOL, totalOwed);
        uint256 netProfit = currentBalance - totalOwed - preExistingBalance;
        _lastProfit = netProfit;

        if (netProfit > 0) {
            IERC20(asset).safeTransfer(owner, netProfit);
        }

        emit FlashLoanExecuted(asset, amount, netProfit, block.timestamp);
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    //  4. Callback Balancer V2 con AISLAMIENTO DE SALDO PREVIO
    // ═══════════════════════════════════════════════════════════
    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        if (msg.sender != BALANCER_VAULT) revert NotBalancerVault();
        require(_inFlashLoan, "Unauthorized flash loan initiation");

        address asset = address(tokens[0]);
        uint256 amount = amounts[0];
        uint256 amountOwed = amount + feeAmounts[0]; // Balancer fee is 0%

        // AISLAMIENTO DE CAPITAL: Capturar saldo previo a la llegada del préstamo
        uint256 currentBalAtEntry = IERC20(asset).balanceOf(address(this));
        uint256 preExistingBalance = currentBalAtEntry > amount ? currentBalAtEntry - amount : 0;

        (uint8 routeType, bytes memory routeData) = abi.decode(userData, (uint8, bytes));
        uint256 minProfit;

        if (routeType == 0) {
            SpatialRoute memory route = abi.decode(routeData, (SpatialRoute));
            minProfit = route.minProfit;
            uint256 interAmount = _swap(route.tokenIn, route.tokenIntermediate, amount, route.dexBuy, route.feeOrSpacingBuy);
            _swap(route.tokenIntermediate, route.tokenIn, interAmount, route.dexSell, route.feeOrSpacingSell);
        } else if (routeType == 1) {
            TriangularRoute memory route = abi.decode(routeData, (TriangularRoute));
            minProfit = route.minProfit;
            uint256 amountB = _swap(route.tokenA, route.tokenB, amount, route.dex1, route.feeOrSpacing1);
            uint256 amountC = _swap(route.tokenB, route.tokenC, amountB, route.dex2, route.feeOrSpacing2);
            _swap(route.tokenC, route.tokenA, amountC, route.dex3, route.feeOrSpacing3);
        }

        uint256 currentBalance = IERC20(asset).balanceOf(address(this));
        uint256 requiredBalance = preExistingBalance + amountOwed + minProfit;

        // Prohibido subsidiar operaciones perdedoras con saldo previo
        if (currentBalance < requiredBalance) {
            revert NotProfitable(currentBalance, requiredBalance);
        }

        IERC20(asset).safeTransfer(BALANCER_VAULT, amountOwed);
        uint256 netProfit = currentBalance - amountOwed - preExistingBalance;
        _lastProfit = netProfit;

        if (netProfit > 0) {
            IERC20(asset).safeTransfer(owner, netProfit);
        }

        emit FlashLoanExecuted(asset, amount, netProfit, block.timestamp);
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
