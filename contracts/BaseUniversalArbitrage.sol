// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ═══════════════════════════════════════════════════════════════
//  Interfaces de DEXes en Base (ChainID 8453)
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

interface IAerodromeSlipstreamRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        int24 tickSpacing;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IAerodromeV2Router {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
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

// ═══════════════════════════════════════════════════════════════
//  Contrato Universal de Arbitraje en Base
//  Soporta Spot Directo, Aave V3 y Balancer V2 (0% Fee)
// ═══════════════════════════════════════════════════════════════

contract BaseUniversalArbitrage is IFlashLoanRecipient {
    using SafeERC20 for IERC20;

    address public owner;

    // ── Direcciones Inmutables en Base Mainnet (ChainID 8453) ──
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    IUniswapV3Router public constant UNIV3_ROUTER = IUniswapV3Router(0x2626664c2603336E57B271c5C0b26F421741e481);
    IAerodromeSlipstreamRouter public constant AERO_CL_ROUTER = IAerodromeSlipstreamRouter(0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5);
    IAerodromeV2Router public constant AERO_V2_ROUTER = IAerodromeV2Router(0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43);
    address public constant AERO_V2_FACTORY = 0x420DD381b31aEf6683db6B902084cB0FFECe40Da;
    IUniswapV3Router public constant PANCAKE_V3_ROUTER = IUniswapV3Router(0x1b81D678ffb9C0263b24A97847620C99d213eB14);
    IUniswapV3Router public constant SUSHISWAP_V3_ROUTER = IUniswapV3Router(0xFB7eF66a7e61224DD6FcD0D7d9C3be5C8B049b9f);
    IPool public constant AAVE_POOL = IPool(0xA238Dd80C259a72e81d7e4664a9801593F98d1c5);
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    // ── Identificadores de DEX ──
    uint8 public constant DEX_UNIV3 = 0;
    uint8 public constant DEX_AERO_CL = 1;
    uint8 public constant DEX_AERO_V2_VOLATILE = 2;
    uint8 public constant DEX_AERO_V2_STABLE = 3;
    uint8 public constant DEX_PANCAKE_V3 = 4;
    uint8 public constant DEX_SUSHISWAP_V3 = 5;

    // ── Reentrancy Guard Gas-Efficient ──
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    // ── Variables de Retorno y Seguridad de Callbacks ──
    uint256 private _lastProfit;
    bool private _inFlashLoan;

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

    // ── Errores Personalizados ──
    error NotOwner();
    error NotProfitable(uint256 received, uint256 required);
    error Reentrancy();
    error SwapFailed(uint8 dex);

    // ── Eventos con Telemetría On-Chain ──
    event SpatialExecuted(address indexed token, uint256 amountIn, uint256 amountOut, uint256 profit);
    event TriangularExecuted(address indexed token, uint256 amountIn, uint256 amountOut, uint256 profit);
    event FlashLoanExecuted(address indexed asset, uint256 loanAmount, uint256 premium, uint256 netProfit);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_status == _ENTERED) revert Reentrancy();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor() {
        owner = msg.sender;
    }

    // ═══════════════════════════════════════════════════════════
    //  1. Arbitraje Espacial Directo 2-Leg Spot
    // ═══════════════════════════════════════════════════════════
    function executeSpotSpatial(SpatialRoute calldata route, uint256 amountIn) external onlyOwner nonReentrant returns (uint256 profit) {
        IERC20(route.tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 intermediateAmount = _swap(route.dexBuy, route.tokenIn, route.tokenIntermediate, amountIn, route.feeOrSpacingBuy);
        uint256 finalAmount = _swap(route.dexSell, route.tokenIntermediate, route.tokenIn, intermediateAmount, route.feeOrSpacingSell);

        if (finalAmount < amountIn + route.minProfit) {
            revert NotProfitable(finalAmount, amountIn + route.minProfit);
        }

        profit = finalAmount - amountIn;
        IERC20(route.tokenIn).safeTransfer(owner, finalAmount);
        emit SpatialExecuted(route.tokenIn, amountIn, finalAmount, profit);
        return profit;
    }

    // ═══════════════════════════════════════════════════════════
    //  2. Arbitraje Triangular 3-Leg Spot
    // ═══════════════════════════════════════════════════════════
    function executeSpotTriangular(TriangularRoute calldata route, uint256 amountIn) external onlyOwner nonReentrant returns (uint256 profit) {
        IERC20(route.tokenA).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 out1 = _swap(route.dex1, route.tokenA, route.tokenB, amountIn, route.feeOrSpacing1);
        uint256 out2 = _swap(route.dex2, route.tokenB, route.tokenC, out1, route.feeOrSpacing2);
        uint256 out3 = _swap(route.dex3, route.tokenC, route.tokenA, out2, route.feeOrSpacing3);

        if (out3 < amountIn + route.minProfit) {
            revert NotProfitable(out3, amountIn + route.minProfit);
        }

        profit = out3 - amountIn;
        IERC20(route.tokenA).safeTransfer(owner, out3);
        emit TriangularExecuted(route.tokenA, amountIn, out3, profit);
        return profit;
    }

    // ═══════════════════════════════════════════════════════════
    //  3. Flash Loans con Aave V3
    // ═══════════════════════════════════════════════════════════
    function executeFlashLoanSpatial(SpatialRoute calldata route, uint256 loanAmount) external onlyOwner nonReentrant returns (uint256 profit) {
        _inFlashLoan = true;
        _lastProfit = 0;
        bytes memory params = abi.encode(uint8(2), abi.encode(route));
        AAVE_POOL.flashLoanSimple(address(this), route.tokenIn, loanAmount, params, 0);
        _inFlashLoan = false;
        return _lastProfit;
    }

    function executeFlashLoanTriangular(TriangularRoute calldata route, uint256 loanAmount) external onlyOwner nonReentrant returns (uint256 profit) {
        _inFlashLoan = true;
        _lastProfit = 0;
        bytes memory params = abi.encode(uint8(3), abi.encode(route));
        AAVE_POOL.flashLoanSimple(address(this), route.tokenA, loanAmount, params, 0);
        _inFlashLoan = false;
        return _lastProfit;
    }

    // ── Flash Loans con Balancer V2 (0% Fee) ──
    function executeBalancerFlashLoanSpatial(SpatialRoute calldata route, uint256 loanAmount) external onlyOwner nonReentrant returns (uint256 profit) {
        _inFlashLoan = true;
        _lastProfit = 0;
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(route.tokenIn);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = loanAmount;
        bytes memory userData = abi.encode(uint8(2), abi.encode(route));
        IBalancerVault(BALANCER_VAULT).flashLoan(address(this), tokens, amounts, userData);
        _inFlashLoan = false;
        return _lastProfit;
    }

    function executeBalancerFlashLoanTriangular(TriangularRoute calldata route, uint256 loanAmount) external onlyOwner nonReentrant returns (uint256 profit) {
        _inFlashLoan = true;
        _lastProfit = 0;
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(route.tokenA);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = loanAmount;
        bytes memory userData = abi.encode(uint8(3), abi.encode(route));
        IBalancerVault(BALANCER_VAULT).flashLoan(address(this), tokens, amounts, userData);
        _inFlashLoan = false;
        return _lastProfit;
    }

    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        require(msg.sender == BALANCER_VAULT, "Caller not Balancer Vault");
        require(_inFlashLoan, "Unauthorized flash loan initiation");

        (uint8 mode, bytes memory routeData) = abi.decode(userData, (uint8, bytes));
        address asset = address(tokens[0]);
        uint256 amount = amounts[0];
        uint256 amountOwed = amount + feeAmounts[0]; // Balancer fee is 0%
        uint256 finalOut;
        uint256 minProfit;

        if (mode == 2) {
            SpatialRoute memory route = abi.decode(routeData, (SpatialRoute));
            minProfit = route.minProfit;
            uint256 mid = _swap(route.dexBuy, asset, route.tokenIntermediate, amount, route.feeOrSpacingBuy);
            finalOut = _swap(route.dexSell, route.tokenIntermediate, asset, mid, route.feeOrSpacingSell);
        } else {
            TriangularRoute memory route = abi.decode(routeData, (TriangularRoute));
            minProfit = route.minProfit;
            uint256 out1 = _swap(route.dex1, asset, route.tokenB, amount, route.feeOrSpacing1);
            uint256 out2 = _swap(route.dex2, route.tokenB, route.tokenC, out1, route.feeOrSpacing2);
            finalOut = _swap(route.dex3, route.tokenC, asset, out2, route.feeOrSpacing3);
        }

        uint256 currentBalance = IERC20(asset).balanceOf(address(this));
        if (currentBalance < amountOwed + minProfit) {
            revert NotProfitable(currentBalance, amountOwed + minProfit);
        }

        IERC20(asset).safeTransfer(BALANCER_VAULT, amountOwed);
        uint256 profit = currentBalance - amountOwed;
        _lastProfit = profit;
        if (profit > 0) {
            IERC20(asset).safeTransfer(owner, profit);
        }

        emit FlashLoanExecuted(asset, amount, feeAmounts[0], profit);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(AAVE_POOL), "Invalid caller");
        require(initiator == address(this), "Invalid initiator");
        require(_inFlashLoan, "Unauthorized flash loan initiation");

        (uint8 mode, bytes memory routeData) = abi.decode(params, (uint8, bytes));
        uint256 totalOwed = amount + premium;
        uint256 finalOut;
        uint256 minProfit;

        if (mode == 2) {
            SpatialRoute memory route = abi.decode(routeData, (SpatialRoute));
            minProfit = route.minProfit;
            uint256 mid = _swap(route.dexBuy, asset, route.tokenIntermediate, amount, route.feeOrSpacingBuy);
            finalOut = _swap(route.dexSell, route.tokenIntermediate, asset, mid, route.feeOrSpacingSell);
        } else {
            TriangularRoute memory route = abi.decode(routeData, (TriangularRoute));
            minProfit = route.minProfit;
            uint256 out1 = _swap(route.dex1, asset, route.tokenB, amount, route.feeOrSpacing1);
            uint256 out2 = _swap(route.dex2, route.tokenB, route.tokenC, out1, route.feeOrSpacing2);
            finalOut = _swap(route.dex3, route.tokenC, asset, out2, route.feeOrSpacing3);
        }

        if (finalOut < totalOwed + minProfit) {
            revert NotProfitable(finalOut, totalOwed + minProfit);
        }

        IERC20(asset).forceApprove(address(AAVE_POOL), totalOwed);
        uint256 profit = finalOut - totalOwed;
        _lastProfit = profit;
        if (profit > 0) {
            IERC20(asset).safeTransfer(owner, profit);
        }

        emit FlashLoanExecuted(asset, amount, premium, profit);
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    //  Motor Interno de Enrutamiento Multi-DEX
    // ═══════════════════════════════════════════════════════════
    function _swap(
        uint8 dex,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 feeOrSpacing
    ) internal returns (uint256 amountOut) {
        if (dex == DEX_UNIV3) {
            _ensureAllowance(tokenIn, address(UNIV3_ROUTER), amountIn);
            amountOut = UNIV3_ROUTER.exactInputSingle(IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: feeOrSpacing,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            }));
        } else if (dex == DEX_AERO_CL) {
            _ensureAllowance(tokenIn, address(AERO_CL_ROUTER), amountIn);
            amountOut = AERO_CL_ROUTER.exactInputSingle(IAerodromeSlipstreamRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                tickSpacing: int24(uint24(feeOrSpacing)),
                recipient: address(this),
                deadline: block.timestamp + 120,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            }));
        } else if (dex == DEX_AERO_V2_VOLATILE || dex == DEX_AERO_V2_STABLE) {
            _ensureAllowance(tokenIn, address(AERO_V2_ROUTER), amountIn);
            bool isStable = (dex == DEX_AERO_V2_STABLE);
            IAerodromeV2Router.Route[] memory routes = new IAerodromeV2Router.Route[](1);
            routes[0] = IAerodromeV2Router.Route({
                from: tokenIn,
                to: tokenOut,
                stable: isStable,
                factory: AERO_V2_FACTORY
            });
            uint256[] memory amounts = AERO_V2_ROUTER.swapExactTokensForTokens(
                amountIn,
                0,
                routes,
                address(this),
                block.timestamp + 120
            );
            amountOut = amounts[amounts.length - 1];
        } else if (dex == DEX_PANCAKE_V3) {
            _ensureAllowance(tokenIn, address(PANCAKE_V3_ROUTER), amountIn);
            amountOut = PANCAKE_V3_ROUTER.exactInputSingle(IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: feeOrSpacing,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            }));
        } else if (dex == DEX_SUSHISWAP_V3) {
            _ensureAllowance(tokenIn, address(SUSHISWAP_V3_ROUTER), amountIn);
            amountOut = SUSHISWAP_V3_ROUTER.exactInputSingle(IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: feeOrSpacing,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            }));
        } else {
            revert SwapFailed(dex);
        }

        if (amountOut == 0) revert SwapFailed(dex);
    }

    function _ensureAllowance(address token, address spender, uint256 amount) internal {
        if (IERC20(token).allowance(address(this), spender) < amount) {
            IERC20(token).forceApprove(spender, type(uint256).max);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Administración y Pre-Aprobaciones
    // ═══════════════════════════════════════════════════════════
    function approveRouters(address[] calldata tokens) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20(tokens[i]).forceApprove(address(UNIV3_ROUTER), type(uint256).max);
            IERC20(tokens[i]).forceApprove(address(AERO_CL_ROUTER), type(uint256).max);
            IERC20(tokens[i]).forceApprove(address(AERO_V2_ROUTER), type(uint256).max);
            IERC20(tokens[i]).forceApprove(address(PANCAKE_V3_ROUTER), type(uint256).max);
            IERC20(tokens[i]).forceApprove(address(SUSHISWAP_V3_ROUTER), type(uint256).max);
        }
    }

    function withdrawToken(address token) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) IERC20(token).safeTransfer(owner, bal);
    }

    function withdrawETH() external onlyOwner {
        uint256 bal = address(this).balance;
        if (bal > 0) {
            (bool ok, ) = owner.call{value: bal}("");
            require(ok, "ETH transfer failed");
        }
    }

    receive() external payable {}
}
