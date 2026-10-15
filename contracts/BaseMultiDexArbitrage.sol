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
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
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
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
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

// ═══════════════════════════════════════════════════════════════
//  Contrato Principal: Arbitraje Atómico Multi-DEX en Base
// ═══════════════════════════════════════════════════════════════

contract BaseMultiDexArbitrage {
    using SafeERC20 for IERC20;

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

    address public immutable owner;

    // ── Routers en Base (Inmutables) ──
    IUniswapV3Router public constant UNIV3_ROUTER =
        IUniswapV3Router(0x2626664c2603336E57B271c5C0b26F421741e481);

    IAerodromeSlipstreamRouter public constant AERO_CL_ROUTER =
        IAerodromeSlipstreamRouter(0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5);

    IPool public constant AAVE_POOL =
        IPool(0xA238Dd80C259a72e81d7e4664a9801593F98d1c5);

    // ── Identificadores de DEX ──
    uint8 public constant DEX_UNIV3 = 0;
    uint8 public constant DEX_AERO_CL = 1;

    // ── Reentrancy Guard Gas-Efficient ──
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    // ── Errores Personalizados ──
    error NotOwner();
    error NotProfitable(uint256 received, uint256 required);
    error Reentrancy();
    error SwapFailed(uint8 leg);

    event TriangularExecuted(
        address indexed tokenStart,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit
    );
    event FlashLoanExecuted(
        address indexed asset,
        uint256 loanAmount,
        uint256 premium,
        uint256 netProfit
    );

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
    //  MODO 1: Arbitraje Spot Atómico con Saldo Propio ($35 WETH)
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Ejecuta arbitraje triangular atómico con saldo spot.
     *         Si out3 < amountIn + minProfit, la transacción revierte por completo (0 pérdidas).
     */
    function executeSpotTriangular(
        TriangularRoute calldata route,
        uint256 amountIn
    ) external onlyOwner nonReentrant {
        // 1. Transferir tokens del caller al contrato
        IERC20(route.tokenA).safeTransferFrom(msg.sender, address(this), amountIn);

        // 2. Ejecutar los 3 saltos secuencialmente
        uint256 out1 = _swap(route.dex1, route.tokenA, route.tokenB, amountIn, route.feeOrSpacing1);
        uint256 out2 = _swap(route.dex2, route.tokenB, route.tokenC, out1, route.feeOrSpacing2);
        uint256 out3 = _swap(route.dex3, route.tokenC, route.tokenA, out2, route.feeOrSpacing3);

        // 3. Verificar rentabilidad estricta
        if (out3 < amountIn + route.minProfit) {
            revert NotProfitable(out3, amountIn + route.minProfit);
        }

        // 4. Devolver capital + ganancias al owner
        uint256 finalBalance = IERC20(route.tokenA).balanceOf(address(this));
        IERC20(route.tokenA).safeTransfer(owner, finalBalance);

        emit TriangularExecuted(route.tokenA, amountIn, out3, out3 - amountIn);
    }

    // ═══════════════════════════════════════════════════════════
    //  MODO 2: Arbitraje con Flash Loan de Aave V3 ($0 Capital)
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Inicia un flash loan de Aave V3 y ejecuta arbitraje triangular multi-DEX.
     */
    function executeFlashLoanTriangular(
        TriangularRoute calldata route,
        uint256 loanAmount
    ) external onlyOwner nonReentrant {
        bytes memory params = abi.encode(route);

        AAVE_POOL.flashLoanSimple(
            address(this),
            route.tokenA,
            loanAmount,
            params,
            0
        );
    }

    /**
     * @notice Callback de Aave V3 ejecutado automáticamente al recibir el flash loan.
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(AAVE_POOL), "Caller not Aave Pool");
        require(initiator == address(this), "Initiator not self");

        TriangularRoute memory route = abi.decode(params, (TriangularRoute));

        // Ejecutar los 3 saltos
        uint256 out1 = _swap(route.dex1, asset, route.tokenB, amount, route.feeOrSpacing1);
        uint256 out2 = _swap(route.dex2, route.tokenB, route.tokenC, out1, route.feeOrSpacing2);
        uint256 out3 = _swap(route.dex3, route.tokenC, asset, out2, route.feeOrSpacing3);

        uint256 totalOwed = amount + premium;
        if (out3 < totalOwed + route.minProfit) {
            revert NotProfitable(out3, totalOwed + route.minProfit);
        }

        // Aprobar repago exacto a Aave Pool
        IERC20(asset).forceApprove(address(AAVE_POOL), totalOwed);

        // Transferir ganancia neta al owner
        uint256 profit = IERC20(asset).balanceOf(address(this)) - totalOwed;
        if (profit > 0) {
            IERC20(asset).safeTransfer(owner, profit);
        }

        emit FlashLoanExecuted(asset, amount, premium, profit);
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    //  Lógica de Swap Interna Multi-DEX
    // ═══════════════════════════════════════════════════════════

    function _swap(
        uint8 dex,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 feeOrSpacing
    ) internal returns (uint256 amountOut) {
        address router = dex == DEX_UNIV3 ? address(UNIV3_ROUTER) : address(AERO_CL_ROUTER);
        
        // Garantizar aprobación del router si la asignación es insuficiente
        if (IERC20(tokenIn).allowance(address(this), router) < amountIn) {
            IERC20(tokenIn).forceApprove(router, type(uint256).max);
        }

        if (dex == DEX_UNIV3) {
            amountOut = UNIV3_ROUTER.exactInputSingle(
                IUniswapV3Router.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: feeOrSpacing,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
        } else if (dex == DEX_AERO_CL) {
            amountOut = AERO_CL_ROUTER.exactInputSingle(
                IAerodromeSlipstreamRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    tickSpacing: int24(uint24(feeOrSpacing)),
                    recipient: address(this),
                    deadline: block.timestamp + 120,
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            revert SwapFailed(dex);
        }

        if (amountOut == 0) revert SwapFailed(dex);
    }

    // ═══════════════════════════════════════════════════════════
    //  Administración y Pre-Aprobaciones
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Pre-aprueba una lista de tokens a los routers para maximizar ahorro de gas en swaps.
     */
    function approveRouters(address[] calldata tokens) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20(tokens[i]).forceApprove(address(UNIV3_ROUTER), type(uint256).max);
            IERC20(tokens[i]).forceApprove(address(AERO_CL_ROUTER), type(uint256).max);
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
