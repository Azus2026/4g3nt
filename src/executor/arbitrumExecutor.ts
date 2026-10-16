import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { SERVER_STATS, addScanLog, addFlashOpportunity } from '../server';
import { savePersistedStats } from '../utils/statsStore';
import { executionLedger } from '../utils/executionLedger';
import { SweetSpotOptimizer } from '../math/sweetSpotOptimizer';
import { cexLagPredictor } from '../scanners/cexLagPredictor';

const getEthPriceUSD = (): number => cexLagPredictor.getCEXPrice('ETH') || 2500;

// Contrato Universal de Arbitraje Desplegado en Arbitrum One (ChainID 42161)
export const ARBITRAGE_CONTRACT_ARBITRUM = ENV.arbitrageContractArbitrum || '0x2bE126e838bC253457a44f56f10352ff15d2B23F';

// Routers Oficiales en Arbitrum One (ChainID 42161)
export const UNISWAP_V3_ROUTER_ARB = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
export const CAMELOT_V3_ROUTER_ARB = '0x1F721E2E82F6676FCE4eA07A5958cF098D339e18';
export const CAMELOT_V2_ROUTER_ARB = '0xc873fEcbd354f5A56E00E710B90EF4201db2448d';
export const PANCAKESWAP_V3_ROUTER_ARB = '0x1b81D678ffb9C0263b24A97847620C99d213eB14';
export const SUSHISWAP_V3_ROUTER_ARB = '0xFB7eF66a7e61224DD6FcD0D7d9C3be5C8B049b9f';

// Tokens Clave de Arbitrum One
export const WETH_ARB_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
export const USDC_ARB_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
export const ARB_TOKEN_ADDRESS = '0x912CE59144191C1204E64559FE8253a0e49E6548';
export const GMX_TOKEN_ADDRESS = '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a';
export const WBTC_ARB_ADDRESS = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f';
export const LINK_ARB_ADDRESS = '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4';

// Enum de DEX IDs en Arbitrum
export const ARB_DEX_IDS = {
  UNIV3: 0,
  CAMELOT_V3: 1,
  CAMELOT_V2: 2,
  PANCAKE_V3: 3,
  SUSHISWAP_V3: 4
};

export const ARB_DEX_NAMES: Record<number, string> = {
  0: 'UniV3',
  1: 'CamelotV3',
  2: 'CamelotV2',
  3: 'PancakeV3',
  4: 'SushiV3'
};

// Umbral mínimo de ganancia en Arbitrum
export const ARB_MIN_PROFIT_WEI = 50_000_000_000n; // 0.00000005 ETH

export const ARB_DYNAMIC_LOAN_TIERS = [
  ethers.parseEther('1.0'),
  ethers.parseEther('2.5'),
  ethers.parseEther('5.0'),
  ethers.parseEther('10.0'),
  ethers.parseEther('25.0'),
  ethers.parseEther('50.0'),
];

export const ARB_SPATIAL_PAIRS = [
  {
    name: 'WETH ➔ ARB ➔ WETH',
    tokenIn: WETH_ARB_ADDRESS,
    tokenIntermediate: ARB_TOKEN_ADDRESS,
    routes: [
      { buyDex: ARB_DEX_IDS.UNIV3, sellDex: ARB_DEX_IDS.CAMELOT_V3, feeBuy: 500, feeSell: 0 },
      { buyDex: ARB_DEX_IDS.CAMELOT_V3, sellDex: ARB_DEX_IDS.UNIV3, feeBuy: 0, feeSell: 500 },
      { buyDex: ARB_DEX_IDS.PANCAKE_V3, sellDex: ARB_DEX_IDS.UNIV3, feeBuy: 500, feeSell: 500 },
      { buyDex: ARB_DEX_IDS.UNIV3, sellDex: ARB_DEX_IDS.PANCAKE_V3, feeBuy: 500, feeSell: 500 },
    ]
  },
  {
    name: 'WETH ➔ GMX ➔ WETH',
    tokenIn: WETH_ARB_ADDRESS,
    tokenIntermediate: GMX_TOKEN_ADDRESS,
    routes: [
      { buyDex: ARB_DEX_IDS.UNIV3, sellDex: ARB_DEX_IDS.CAMELOT_V3, feeBuy: 3000, feeSell: 0 },
      { buyDex: ARB_DEX_IDS.CAMELOT_V3, sellDex: ARB_DEX_IDS.UNIV3, feeBuy: 0, feeSell: 3000 },
      { buyDex: ARB_DEX_IDS.CAMELOT_V2, sellDex: ARB_DEX_IDS.UNIV3, feeBuy: 0, feeSell: 3000 },
      { buyDex: ARB_DEX_IDS.UNIV3, sellDex: ARB_DEX_IDS.CAMELOT_V2, feeBuy: 3000, feeSell: 0 },
    ]
  },
  {
    name: 'WETH ➔ USDC ➔ WETH',
    tokenIn: WETH_ARB_ADDRESS,
    tokenIntermediate: USDC_ARB_ADDRESS,
    routes: [
      { buyDex: ARB_DEX_IDS.UNIV3, sellDex: ARB_DEX_IDS.CAMELOT_V3, feeBuy: 500, feeSell: 0 },
      { buyDex: ARB_DEX_IDS.CAMELOT_V3, sellDex: ARB_DEX_IDS.UNIV3, feeBuy: 0, feeSell: 500 },
      { buyDex: ARB_DEX_IDS.PANCAKE_V3, sellDex: ARB_DEX_IDS.UNIV3, feeBuy: 500, feeSell: 500 },
      { buyDex: ARB_DEX_IDS.UNIV3, sellDex: ARB_DEX_IDS.PANCAKE_V3, feeBuy: 500, feeSell: 500 },
    ]
  },
  {
    name: 'WETH ➔ LINK ➔ WETH',
    tokenIn: WETH_ARB_ADDRESS,
    tokenIntermediate: LINK_ARB_ADDRESS,
    routes: [
      { buyDex: ARB_DEX_IDS.UNIV3, sellDex: ARB_DEX_IDS.CAMELOT_V3, feeBuy: 3000, feeSell: 0 },
      { buyDex: ARB_DEX_IDS.CAMELOT_V3, sellDex: ARB_DEX_IDS.UNIV3, feeBuy: 0, feeSell: 3000 },
    ]
  }
];

export const ARB_TRIANGULAR_PAIRS = [
  {
    name: 'WETH ➔ ARB ➔ USDC ➔ WETH',
    tokenA: WETH_ARB_ADDRESS,
    tokenB: ARB_TOKEN_ADDRESS,
    tokenC: USDC_ARB_ADDRESS,
    routes: [
      { dex1: ARB_DEX_IDS.UNIV3, dex2: ARB_DEX_IDS.CAMELOT_V3, dex3: ARB_DEX_IDS.UNIV3, fee1: 500, fee2: 0, fee3: 500 },
      { dex1: ARB_DEX_IDS.CAMELOT_V3, dex2: ARB_DEX_IDS.UNIV3, dex3: ARB_DEX_IDS.PANCAKE_V3, fee1: 0, fee2: 500, fee3: 500 },
    ]
  },
  {
    name: 'WETH ➔ GMX ➔ USDC ➔ WETH',
    tokenA: WETH_ARB_ADDRESS,
    tokenB: GMX_TOKEN_ADDRESS,
    tokenC: USDC_ARB_ADDRESS,
    routes: [
      { dex1: ARB_DEX_IDS.UNIV3, dex2: ARB_DEX_IDS.CAMELOT_V3, dex3: ARB_DEX_IDS.UNIV3, fee1: 3000, fee2: 0, fee3: 500 },
    ]
  }
];

export const ARB_ARBITRAGE_ABI = [
  'function executeSpotSpatial((address tokenIn, address tokenIntermediate, uint8 dexBuy, uint8 dexSell, uint24 feeOrSpacingBuy, uint24 feeOrSpacingSell, uint256 minProfit) route, uint256 amountIn) external returns (uint256 profit)',
  'function executeSpotTriangular((address tokenA, address tokenB, address tokenC, uint8 dex1, uint8 dex2, uint8 dex3, uint24 feeOrSpacing1, uint24 feeOrSpacing2, uint24 feeOrSpacing3, uint256 minProfit) route, uint256 amountIn) external returns (uint256 profit)',
  'function executeFlashLoanSpatial((address tokenIn, address tokenIntermediate, uint8 dexBuy, uint8 dexSell, uint24 feeOrSpacingBuy, uint24 feeOrSpacingSell, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'function executeFlashLoanTriangular((address tokenA, address tokenB, address tokenC, uint8 dex1, uint8 dex2, uint8 dex3, uint24 feeOrSpacing1, uint24 feeOrSpacing2, uint24 feeOrSpacing3, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'function executeBalancerFlashLoanSpatial((address tokenIn, address tokenIntermediate, uint8 dexBuy, uint8 dexSell, uint24 feeOrSpacingBuy, uint24 feeOrSpacingSell, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'function executeBalancerFlashLoanTriangular((address tokenA, address tokenB, address tokenC, uint8 dex1, uint8 dex2, uint8 dex3, uint24 feeOrSpacing1, uint24 feeOrSpacing2, uint24 feeOrSpacing3, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'event SpatialExecuted(address indexed token, uint256 amountIn, uint256 amountOut, uint256 profit)',
  'event TriangularExecuted(address indexed token, uint256 amountIn, uint256 amountOut, uint256 profit)',
  'event FlashLoanExecuted(address indexed asset, uint256 loanAmount, uint256 premium, uint256 netProfit)'
];

export class ArbitrumExecutor {
  private static instance: ArbitrumExecutor;
  private provider: ethers.JsonRpcProvider;
  private wallet?: ethers.Wallet;
  private arbitrageContract: ethers.Contract;
  private isInitialized: boolean = false;
  private isExecuting: boolean = false;
  private consecutiveErrors: number = 0;
  private circuitBreakerCooldownUntil: number = 0;

  private constructor() {
    this.provider = new ethers.JsonRpcProvider(ENV.arbitrumRpcUrl || 'https://arb1.arbitrum.io/rpc', 42161, {
      staticNetwork: true
    });

    if (ENV.privateKey && ENV.privateKey !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      try {
        const formattedKey = ENV.privateKey.startsWith('0x') ? ENV.privateKey : (`0x${ENV.privateKey}`);
        this.wallet = new ethers.Wallet(formattedKey, this.provider);
        this.arbitrageContract = new ethers.Contract(ARBITRAGE_CONTRACT_ARBITRUM, ARB_ARBITRAGE_ABI, this.wallet);
      } catch (err: any) {
        logger.warn(`ArbitrumExecutor: Wallet no inicializada (${err.message}).`);
        this.arbitrageContract = new ethers.Contract(ARBITRAGE_CONTRACT_ARBITRUM, ARB_ARBITRAGE_ABI, this.provider);
      }
    } else {
      this.arbitrageContract = new ethers.Contract(ARBITRAGE_CONTRACT_ARBITRUM, ARB_ARBITRAGE_ABI, this.provider);
    }
  }

  public static getInstance(): ArbitrumExecutor {
    if (!ArbitrumExecutor.instance) {
      ArbitrumExecutor.instance = new ArbitrumExecutor();
    }
    return ArbitrumExecutor.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    logger.info(`[ARBITRUM BOT] Inicializando motor de Flash Loans en Arbitrum One...`);
    this.startContinuousArbitrumScanner();
    logger.success(`🚀 [ARBITRUM BOT] Motor de Flash Loans Activo (0% Balancer V2 Vault).`);
  }

  public async scanArbitrumSpatial(
    pairName: string,
    tokenIn: string,
    tokenIntermediate: string,
    buyDex: number,
    sellDex: number,
    feeBuy: number,
    feeSell: number
  ): Promise<boolean> {
    if (this.isExecuting) return false;
    if (Date.now() < this.circuitBreakerCooldownUntil) return false;

    const pathDesc = `${ARB_DEX_NAMES[buyDex]} ➔ ${ARB_DEX_NAMES[sellDex]}`;
    const minProfit = ARB_MIN_PROFIT_WEI;

    const routeStruct = {
      tokenIn,
      tokenIntermediate,
      dexBuy: buyDex,
      dexSell: sellDex,
      feeOrSpacingBuy: feeBuy,
      feeOrSpacingSell: feeSell,
      minProfit
    };

    try {
      let profitableFlashAmount: bigint | null = null;
      let simulatedProfitWei = 0n;
      let isBalancer = false;

      // 1. Simulación Balancer V2 (0% Fee)
      for (const fAmount of ARB_DYNAMIC_LOAN_TIERS) {
        try {
          const profit = await this.arbitrageContract.executeBalancerFlashLoanSpatial.staticCall(routeStruct, fAmount);
          if (profit && BigInt(profit) > minProfit) {
            profitableFlashAmount = fAmount;
            simulatedProfitWei = BigInt(profit);
            isBalancer = true;
            break;
          }
        } catch {}
      }

      // Fallback a Aave V3
      if (!profitableFlashAmount) {
        for (const fAmount of ARB_DYNAMIC_LOAN_TIERS) {
          try {
            const profit = await this.arbitrageContract.executeFlashLoanSpatial.staticCall(routeStruct, fAmount);
            if (profit && BigInt(profit) > minProfit) {
              profitableFlashAmount = fAmount;
              simulatedProfitWei = BigInt(profit);
              isBalancer = false;
              break;
            }
          } catch {}
        }
      }

      // 2. Telemetría Real (0% Ondas Sinusoidales)
      const isProfitable = !!profitableFlashAmount;
      let formattedSpread = 0;
      let grossUSD = 0;
      let loanUSD = 0;

      if (isProfitable && simulatedProfitWei > 0n) {
        const ethPrice = getEthPriceUSD();
        const realProfitETH = parseFloat(ethers.formatEther(simulatedProfitWei));
        loanUSD = parseFloat(ethers.formatEther(profitableFlashAmount!)) * ethPrice;
        formattedSpread = loanUSD > 0 ? parseFloat((((realProfitETH * ethPrice) / loanUSD) * 100).toFixed(3)) : 0;
        grossUSD = parseFloat((realProfitETH * ethPrice).toFixed(2));
      }

      const ethPrice = getEthPriceUSD();
      const arbGasEst = SweetSpotOptimizer.calculateTotalGasCostUSD(42161, 280_000n, 0.1, ethPrice, 384);
      const netUSD = isProfitable ? Math.max(0, parseFloat((grossUSD - arbGasEst.totalGasUSD).toFixed(2))) : 0;

      addFlashOpportunity({
        pairName: `${pairName} (Arbitrum)`,
        chainId: 42161,
        type: 'FLASH_LOAN',
        tokenBorrow: tokenIn,
        tokenBorrowSymbol: 'WETH',
        loanAmount: profitableFlashAmount ? `${ethers.formatEther(profitableFlashAmount)} WETH` : '10.0 WETH ($25k USD)',
        protocolA: ARB_DEX_NAMES[buyDex].toLowerCase(),
        protocolB: ARB_DEX_NAMES[sellDex].toLowerCase(),
        spreadPercent: formattedSpread,
        grossProfitUSD: grossUSD,
        netProfitUSD: netUSD,
        timestamp: Date.now(),
        isProfitable,
        contractAddress: ARBITRAGE_CONTRACT_ARBITRUM
      });

      // 3. Disparo On-Chain con Pre-Flight EstimateGas
      if (profitableFlashAmount && netUSD > 0.25) {
        this.isExecuting = true;
        const providerName = isBalancer ? 'Balancer V2 (0% Fee)' : 'Aave V3';

        let gasEstimated: bigint;
        try {
          gasEstimated = isBalancer
            ? await this.arbitrageContract.executeBalancerFlashLoanSpatial.estimateGas(routeStruct, profitableFlashAmount)
            : await this.arbitrageContract.executeFlashLoanSpatial.estimateGas(routeStruct, profitableFlashAmount);
        } catch (estErr: any) {
          logger.warn(`⚠️ [PRE-FLIGHT ARB ABORT] Oportunidad expiró: ${estErr.message}`);
          this.isExecuting = false;
          return false;
        }

        const gasLimit = (gasEstimated * 115n) / 100n;
        logger.success(`🔥 [FLASH LOAN ${providerName} ARBITRUM] ${pairName} (${ethers.formatEther(profitableFlashAmount)} WETH)!`);

        if (ENV.dryRun) {
          logger.info(`🧪 [DRY RUN VALIDADO ARBITRUM] Flash Loan ${providerName} en ${pairName} | Spread: ${formattedSpread}% | Net: +$${netUSD} USD. Omitiendo tx real.`);
          addScanLog(`🧪 [DRY RUN ARBITRUM] Oportunidad validada en ${pairName} (Net: +$${netUSD} USD).`, 'FLASH_LOAN');
          this.consecutiveErrors = 0;
          SERVER_STATS.simulatedExecutedCount++;
          SERVER_STATS.simulatedPnLUSD += netUSD;
          SERVER_STATS.flashLoans.simulatedCount++;
          SERVER_STATS.flashLoans.simulatedPnLUSD += netUSD;
          SERVER_STATS.flashLoans.detectedPnLUSD += netUSD;
          executionLedger.recordSimulation({
            chainId: 42161,
            pairName: `${pairName} (Arbitrum)`,
            provider: isBalancer ? 'balancer' : 'aave',
            loanTokenSymbol: 'WETH',
            loanAmount: ethers.formatEther(profitableFlashAmount),
            simulatedGrossProfitUSD: grossUSD,
            simulatedGasUSD: arbGasEst.totalGasUSD,
            simulatedNetProfitUSD: netUSD,
          });
          savePersistedStats();
          this.isExecuting = false;
          return false;
        }

        addScanLog(`🚀 [DISPARO ON-CHAIN ARBITRUM] ${pairName} (${pathDesc})...`, 'FLASH_LOAN');

        const tx = isBalancer
          ? await this.arbitrageContract.executeBalancerFlashLoanSpatial(routeStruct, profitableFlashAmount, { gasLimit })
          : await this.arbitrageContract.executeFlashLoanSpatial(routeStruct, profitableFlashAmount, { gasLimit });

        logger.info(`⚡ Tx Enviada a Arbitrum: https://arbiscan.io/tx/${tx.hash}`);
        const receipt = await tx.wait(1);

        const ledgerEntry = executionLedger.recordMinedTransaction({
          chainId: 42161,
          pairName: `${pairName} (Arbitrum)`,
          provider: isBalancer ? 'balancer' : 'aave',
          loanTokenSymbol: 'WETH',
          loanTokenDecimals: 18,
          loanTokenPriceUSD: ethPrice,
          loanAmount: ethers.formatEther(profitableFlashAmount),
          ethPriceUSD: ethPrice,
          simulatedGrossProfitUSD: grossUSD,
          simulatedGasUSD: arbGasEst.totalGasUSD,
          simulatedNetProfitUSD: netUSD,
          receipt,
        });

        if (receipt && receipt.status === 1) {
          logger.success(`🎉 [ARBITRUM CONFIRMADO] Bloque #${receipt.blockNumber}!`);
          addScanLog(`🎉 [CONFIRMADA] Flash Loan Arbitrum Bloque #${receipt.blockNumber} | Tx: https://arbiscan.io/tx/${tx.hash}`, 'FLASH_LOAN');

          const realizedUSD = ledgerEntry.realizedNetProfitUSD ?? netUSD;
          this.consecutiveErrors = 0;
          SERVER_STATS.onChainExecutedCount++;
          SERVER_STATS.onChainRealizedPnLUSD += realizedUSD;
          SERVER_STATS.flashLoans.onChainExecutedCount++;
          SERVER_STATS.flashLoans.detectedPnLUSD += realizedUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        } else {
          this.handleRevert('Arbitrum Spatial Revert');
        }
      } else {
        addScanLog(`🔍 [FLASH LOAN ARBITRUM] ${pairName} (${pathDesc}) | Saldo Protegido (0 riesgo)`, 'FLASH_LOAN');
      }
    } catch (err: any) {
      if (this.isExecuting) {
        logger.error(`[ARBITRUM ERROR] ${pairName}: ${err.message}`);
        this.handleRevert(err.message);
      }
    } finally {
      this.isExecuting = false;
    }

    return false;
  }

  public async scanArbitrumTriangular(
    pairName: string,
    tokenA: string,
    tokenB: string,
    tokenC: string,
    dex1: number,
    dex2: number,
    dex3: number,
    fee1: number,
    fee2: number,
    fee3: number
  ): Promise<boolean> {
    if (this.isExecuting) return false;
    if (Date.now() < this.circuitBreakerCooldownUntil) return false;

    const pathDesc = `${ARB_DEX_NAMES[dex1]} ➔ ${ARB_DEX_NAMES[dex2]} ➔ ${ARB_DEX_NAMES[dex3]}`;
    const minProfit = ARB_MIN_PROFIT_WEI;

    const routeStruct = {
      tokenA,
      tokenB,
      tokenC,
      dex1,
      dex2,
      dex3,
      feeOrSpacing1: fee1,
      feeOrSpacing2: fee2,
      feeOrSpacing3: fee3,
      minProfit
    };

    try {
      let profitableFlashAmount: bigint | null = null;
      let simulatedProfitWei = 0n;
      let isBalancer = false;

      for (const fAmount of ARB_DYNAMIC_LOAN_TIERS) {
        try {
          const profit = await this.arbitrageContract.executeBalancerFlashLoanTriangular.staticCall(routeStruct, fAmount);
          if (profit && BigInt(profit) > minProfit) {
            profitableFlashAmount = fAmount;
            simulatedProfitWei = BigInt(profit);
            isBalancer = true;
            break;
          }
        } catch {}
      }

      if (!profitableFlashAmount) {
        for (const fAmount of ARB_DYNAMIC_LOAN_TIERS) {
          try {
            const profit = await this.arbitrageContract.executeFlashLoanTriangular.staticCall(routeStruct, fAmount);
            if (profit && BigInt(profit) > minProfit) {
              profitableFlashAmount = fAmount;
              simulatedProfitWei = BigInt(profit);
              isBalancer = false;
              break;
            }
          } catch {}
        }
      }

      const isProfitable = !!profitableFlashAmount;
      let formattedTriSpread = 0;
      let triGrossUSD = 0;
      let loanUSD = 0;

      if (isProfitable && simulatedProfitWei > 0n) {
        const ethPrice = getEthPriceUSD();
        const realProfitETH = parseFloat(ethers.formatEther(simulatedProfitWei));
        loanUSD = parseFloat(ethers.formatEther(profitableFlashAmount!)) * ethPrice;
        formattedTriSpread = loanUSD > 0 ? parseFloat((((realProfitETH * ethPrice) / loanUSD) * 100).toFixed(3)) : 0;
        triGrossUSD = parseFloat((realProfitETH * ethPrice).toFixed(2));
      }

      const triEthPrice = getEthPriceUSD();
      const triGasEst = SweetSpotOptimizer.calculateTotalGasCostUSD(42161, 350_000n, 0.1, triEthPrice, 512);
      const triNetUSD = isProfitable ? Math.max(0, parseFloat((triGrossUSD - triGasEst.totalGasUSD).toFixed(2))) : 0;

      addFlashOpportunity({
        pairName: `[3-LEG] ${pairName} (Arbitrum)`,
        chainId: 42161,
        type: 'FLASH_LOAN',
        tokenBorrow: tokenA,
        tokenBorrowSymbol: 'WETH',
        loanAmount: profitableFlashAmount ? `${ethers.formatEther(profitableFlashAmount)} WETH` : '10.0 WETH ($25k USD)',
        protocolA: ARB_DEX_NAMES[dex1].toLowerCase(),
        protocolB: ARB_DEX_NAMES[dex2].toLowerCase(),
        spreadPercent: formattedTriSpread,
        grossProfitUSD: triGrossUSD,
        gasCostUSD: triGasEst.totalGasUSD,
        netProfitUSD: triNetUSD,
        timestamp: Date.now(),
        isProfitable,
        contractAddress: ARBITRAGE_CONTRACT_ARBITRUM
      });

      if (profitableFlashAmount && triNetUSD > 0.35) {
        this.isExecuting = true;
        const providerName = isBalancer ? 'Balancer V2 (0% Fee)' : 'Aave V3';

        let gasEstimated: bigint;
        try {
          gasEstimated = isBalancer
            ? await this.arbitrageContract.executeBalancerFlashLoanTriangular.estimateGas(routeStruct, profitableFlashAmount)
            : await this.arbitrageContract.executeFlashLoanTriangular.estimateGas(routeStruct, profitableFlashAmount);
        } catch (estErr: any) {
          logger.warn(`⚠️ [PRE-FLIGHT ARB TRI ABORT] ${estErr.message}`);
          this.isExecuting = false;
          return false;
        }

        const gasLimit = (gasEstimated * 115n) / 100n;
        if (ENV.dryRun) {
          logger.info(`🧪 [DRY RUN VALIDADO ARBITRUM] Flash Loan Triangular ${providerName} en ${pairName} | Spread: ${formattedTriSpread}% | Net: +$${triNetUSD} USD. Omitiendo tx real.`);
          addScanLog(`🧪 [DRY RUN ARBITRUM] Triangular validado en ${pairName} (Net: +$${triNetUSD} USD).`, 'FLASH_LOAN');
          this.consecutiveErrors = 0;
          SERVER_STATS.simulatedExecutedCount++;
          SERVER_STATS.simulatedPnLUSD += triNetUSD;
          SERVER_STATS.flashLoans.simulatedCount++;
          SERVER_STATS.flashLoans.simulatedPnLUSD += triNetUSD;
          SERVER_STATS.flashLoans.detectedPnLUSD += triNetUSD;
          executionLedger.recordSimulation({
            chainId: 42161,
            pairName: `[3-LEG] ${pairName} (Arbitrum)`,
            provider: isBalancer ? 'balancer' : 'aave',
            loanTokenSymbol: 'WETH',
            loanAmount: ethers.formatEther(profitableFlashAmount),
            simulatedGrossProfitUSD: triGrossUSD,
            simulatedGasUSD: triGasEst.totalGasUSD,
            simulatedNetProfitUSD: triNetUSD,
          });
          savePersistedStats();
          this.isExecuting = false;
          return false;
        }

        const tx = isBalancer
          ? await this.arbitrageContract.executeBalancerFlashLoanTriangular(routeStruct, profitableFlashAmount, { gasLimit })
          : await this.arbitrageContract.executeFlashLoanTriangular(routeStruct, profitableFlashAmount, { gasLimit });

        const receipt = await tx.wait(1);
        const ledgerEntry = executionLedger.recordMinedTransaction({
          chainId: 42161,
          pairName: `[3-LEG] ${pairName} (Arbitrum)`,
          provider: isBalancer ? 'balancer' : 'aave',
          loanTokenSymbol: 'WETH',
          loanTokenDecimals: 18,
          loanTokenPriceUSD: triEthPrice,
          loanAmount: ethers.formatEther(profitableFlashAmount),
          ethPriceUSD: triEthPrice,
          simulatedGrossProfitUSD: triGrossUSD,
          simulatedGasUSD: triGasEst.totalGasUSD,
          simulatedNetProfitUSD: triNetUSD,
          receipt,
        });

        if (receipt && receipt.status === 1) {
          logger.success(`🎉 [TRIANGULAR ARBITRUM CONFIRMADO] Bloque #${receipt.blockNumber}!`);
          const realizedUSD = ledgerEntry.realizedNetProfitUSD ?? triNetUSD;
          this.consecutiveErrors = 0;
          SERVER_STATS.onChainExecutedCount++;
          SERVER_STATS.onChainRealizedPnLUSD += realizedUSD;
          SERVER_STATS.flashLoans.onChainExecutedCount++;
          SERVER_STATS.flashLoans.detectedPnLUSD += realizedUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        } else {
          this.handleRevert('Arbitrum Triangular Revert');
        }
      } else {
        addScanLog(`🔍 [3-LEG TRIANGULAR ARB] ${pairName} (${pathDesc}) | Saldo Protegido (0 riesgo)`, 'FLASH_LOAN');
      }
    } catch (err: any) {
      if (this.isExecuting) {
        logger.error(`[ARBITRUM TRI ERROR] ${pairName}: ${err.message}`);
        this.handleRevert(err.message);
      }
    } finally {
      this.isExecuting = false;
    }

    return false;
  }

  private handleRevert(reason: string): void {
    this.consecutiveErrors++;
    logger.warn(`⚠️ [ARBITRUM REVERT] (${this.consecutiveErrors}/5): ${reason}`);
    if (this.consecutiveErrors >= 5) {
      this.circuitBreakerCooldownUntil = Date.now() + 60_000;
      logger.error(`🛑 [CIRCUIT BREAKER ARBITRUM] 5 fallos consecutivos. Pausa de 60s activada.`);
    }
  }

  public startContinuousArbitrumScanner(): void {
    logger.info(`🚀 [ARBITRUM EXECUTOR] Escáner Real en Arbitrum (0% sintéticos, intervalo: 1500ms)...`);

    setInterval(async () => {
      if (this.isExecuting || Date.now() < this.circuitBreakerCooldownUntil) return;

      try {
        const tasks: Promise<boolean>[] = [];

        const spatial = ARB_SPATIAL_PAIRS[Math.floor(Math.random() * ARB_SPATIAL_PAIRS.length)];
        for (const route of spatial.routes.slice(0, 2)) {
          tasks.push(
            this.scanArbitrumSpatial(
              spatial.name,
              spatial.tokenIn,
              spatial.tokenIntermediate,
              route.buyDex,
              route.sellDex,
              route.feeBuy,
              route.feeSell
            ).catch(() => false)
          );
        }

        const tri = ARB_TRIANGULAR_PAIRS[Math.floor(Math.random() * ARB_TRIANGULAR_PAIRS.length)];
        for (const route of tri.routes) {
          tasks.push(
            this.scanArbitrumTriangular(
              tri.name,
              tri.tokenA,
              tri.tokenB,
              tri.tokenC,
              route.dex1,
              route.dex2,
              route.dex3,
              route.fee1,
              route.fee2,
              route.fee3
            ).catch(() => false)
          );
        }

        await Promise.allSettled(tasks);
      } catch (err: any) {
        // Silenciar errores de ciclo
      }
    }, 1500);
  }
}

export const arbitrumExecutor = ArbitrumExecutor.getInstance();
