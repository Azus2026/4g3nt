import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { SERVER_STATS, addScanLog, addLowFeeOpportunity } from '../server';
import { savePersistedStats } from '../utils/statsStore';
import { executionLedger } from '../utils/executionLedger';
import { cexLagPredictor } from '../scanners/cexLagPredictor';
import { SweetSpotOptimizer } from '../math/sweetSpotOptimizer';
import { flashLoanProviderService } from '../services/flashLoanProviderService';
import { EconomicMath } from '../math/economicMath';
import { transactionDispatcher } from '../services/transactionDispatcher';

// Contratos Universales
const CONTRACT_BASE = ENV.arbitrageContractBase || '0xdA593D75439364a864a92416430FFA1268724059';
const CONTRACT_ARBITRUM = ENV.arbitrageContractArbitrum || '0x2bE126e838bC253457a44f56f10352ff15d2B23F';

// Tokens Base
const WETH_BASE = '0x4200000000000000000000000000000000000006';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDBC_BASE = '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA';
const WSTETH_BASE = '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452';
const CBBTC_BASE = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const EZETH_BASE = '0x2416092f143378750bb29b79eD961ab195CcEea5';

// Tokens Arbitrum
const WETH_ARB = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const USDC_ARB = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USDT_ARB = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';
const WSTETH_ARB = '0x5979D7b546E38E414F7E9822514be443A4800529';

// DEX IDs en Base: 0: UniV3, 1: AeroCL, 2: AeroV2Volatile, 3: AeroV2Stable, 4: PancakeV3, 5: SushiV3
export const LOW_FEE_PAIRS_BASE = [
  {
    name: 'WETH ➔ USDC ➔ WETH (Pool 0.05%)',
    tokenIn: WETH_BASE,
    tokenOut: USDC_BASE,
    feeTier: '0.05%',
    feeNum: 500,
    decimalsIn: 18,
    routes: [
      { buyDex: 0, sellDex: 1, feeBuy: 500, feeSell: 100 },
      { buyDex: 1, sellDex: 0, feeBuy: 100, feeSell: 500 },
      ...(ENV.enableSecondaryDex ? [
        { buyDex: 0, sellDex: 4, feeBuy: 500, feeSell: 500 },
        { buyDex: 4, sellDex: 0, feeBuy: 500, feeSell: 500 },
      ] : []),
    ]
  },
  {
    name: 'USDC ➔ USDbC ➔ USDC (Stable 0.01%)',
    tokenIn: USDC_BASE,
    tokenOut: USDBC_BASE,
    feeTier: '0.01%',
    feeNum: 100,
    decimalsIn: 6,
    routes: [
      { buyDex: 0, sellDex: 3, feeBuy: 100, feeSell: 0 }, // Aero Stable es índice 3
      { buyDex: 3, sellDex: 0, feeBuy: 0, feeSell: 100 },
    ]
  },
  {
    name: 'WETH ➔ wstETH ➔ WETH (Pool 0.01%)',
    tokenIn: WETH_BASE,
    tokenOut: WSTETH_BASE,
    feeTier: '0.01%',
    feeNum: 100,
    decimalsIn: 18,
    routes: [
      { buyDex: 0, sellDex: 1, feeBuy: 100, feeSell: 100 },
      { buyDex: 1, sellDex: 0, feeBuy: 100, feeSell: 100 },
    ]
  },
  {
    name: 'WETH ➔ ezETH ➔ WETH (Pool 0.05%)',
    tokenIn: WETH_BASE,
    tokenOut: EZETH_BASE,
    feeTier: '0.05%',
    feeNum: 500,
    decimalsIn: 18,
    routes: [
      { buyDex: 0, sellDex: 1, feeBuy: 500, feeSell: 100 },
      { buyDex: 1, sellDex: 0, feeBuy: 100, feeSell: 500 },
    ]
  },
  {
    name: 'cbBTC ➔ WETH ➔ cbBTC (Pool 0.05%)',
    tokenIn: CBBTC_BASE,
    tokenOut: WETH_BASE,
    feeTier: '0.05%',
    feeNum: 500,
    decimalsIn: 8,
    routes: [
      { buyDex: 0, sellDex: 1, feeBuy: 500, feeSell: 500 },
      { buyDex: 1, sellDex: 0, feeBuy: 500, feeSell: 500 },
    ]
  }
];

// DEX IDs en Arbitrum: 0: UniV3, 1: CamelotV3, 2: CamelotV2, 3: PancakeV3, 4: SushiV3
export const LOW_FEE_PAIRS_ARB = [
  {
    name: 'WETH ➔ USDC ➔ WETH (Pool 0.05%)',
    tokenIn: WETH_ARB,
    tokenOut: USDC_ARB,
    feeTier: '0.05%',
    feeNum: 500,
    decimalsIn: 18,
    routes: [
      { buyDex: 0, sellDex: 1, feeBuy: 500, feeSell: 0 },
      { buyDex: 1, sellDex: 0, feeBuy: 0, feeSell: 500 },
      { buyDex: 3, sellDex: 0, feeBuy: 500, feeSell: 500 },
    ]
  },
  {
    name: 'USDC ➔ USDT ➔ USDC (Stable 0.01%)',
    tokenIn: USDC_ARB,
    tokenOut: USDT_ARB,
    feeTier: '0.01%',
    feeNum: 100,
    decimalsIn: 6,
    routes: [
      { buyDex: 0, sellDex: 1, feeBuy: 100, feeSell: 0 },
      { buyDex: 1, sellDex: 0, feeBuy: 0, feeSell: 100 },
    ]
  },
  {
    name: 'WETH ➔ wstETH ➔ WETH (Pool 0.01%)',
    tokenIn: WETH_ARB,
    tokenOut: WSTETH_ARB,
    feeTier: '0.01%',
    feeNum: 100,
    decimalsIn: 18,
    routes: [
      { buyDex: 0, sellDex: 1, feeBuy: 100, feeSell: 0 },
      { buyDex: 1, sellDex: 0, feeBuy: 0, feeSell: 100 },
    ]
  }
];

const CONTRACT_ABI = [
  'function executeFlashLoanSpatial((address tokenIn, address tokenIntermediate, uint8 dexBuy, uint8 dexSell, uint24 feeOrSpacingBuy, uint24 feeOrSpacingSell, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'function executeBalancerFlashLoanSpatial((address tokenIn, address tokenIntermediate, uint8 dexBuy, uint8 dexSell, uint24 feeOrSpacingBuy, uint24 feeOrSpacingSell, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'event FlashLoanExecuted(address indexed token, uint256 loanAmount, uint256 grossProfit, uint256 timestamp)'
];

export class LowFeeExecutor {
  private static instance: LowFeeExecutor;
  private providerBase: ethers.JsonRpcProvider;
  private providerArb: ethers.JsonRpcProvider;
  private walletBase?: ethers.Wallet;
  private walletArb?: ethers.Wallet;
  private contractBase: ethers.Contract;
  private contractArb: ethers.Contract;
  private isInitialized: boolean = false;
  private isExecuting: boolean = false;
  private consecutiveErrors: number = 0;
  private circuitBreakerCooldownUntil: number = 0;

  private constructor() {
    this.providerBase = new ethers.JsonRpcProvider(ENV.rpcUrl || 'https://mainnet.base.org', 8453, { staticNetwork: true });
    this.providerArb = new ethers.JsonRpcProvider(ENV.arbitrumRpcUrl || 'https://arb1.arbitrum.io/rpc', 42161, { staticNetwork: true });

    if (ENV.privateKey && ENV.privateKey !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      try {
        const formattedKey = ENV.privateKey.startsWith('0x') ? ENV.privateKey : (`0x${ENV.privateKey}`);
        this.walletBase = new ethers.Wallet(formattedKey, this.providerBase);
        this.walletArb = new ethers.Wallet(formattedKey, this.providerArb);
        this.contractBase = new ethers.Contract(CONTRACT_BASE, CONTRACT_ABI, this.walletBase);
        this.contractArb = new ethers.Contract(CONTRACT_ARBITRUM, CONTRACT_ABI, this.walletArb);
      } catch (err: any) {
        logger.warn(`LowFeeExecutor: Wallet inválida (${err.message}). Operando en modo observación.`);
        this.contractBase = new ethers.Contract(CONTRACT_BASE, CONTRACT_ABI, this.providerBase);
        this.contractArb = new ethers.Contract(CONTRACT_ARBITRUM, CONTRACT_ABI, this.providerArb);
      }
    } else {
      this.contractBase = new ethers.Contract(CONTRACT_BASE, CONTRACT_ABI, this.providerBase);
      this.contractArb = new ethers.Contract(CONTRACT_ARBITRUM, CONTRACT_ABI, this.providerArb);
    }
  }

  public static getInstance(): LowFeeExecutor {
    if (!LowFeeExecutor.instance) {
      LowFeeExecutor.instance = new LowFeeExecutor();
    }
    return LowFeeExecutor.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    logger.info(`[LOW-FEE BOT] Iniciando motor dedicado a Pools de Baja Comisión (0% sintéticos)...`);
    this.startContinuousLowFeeScanner();
    logger.success(`🚀 [LOW-FEE BOT] Escáner Real de Pools 0.01% y 0.05% ACTIVO.`);
  }

  public async scanLowFeePair(
    chainId: number,
    pairName: string,
    feeTier: string,
    tokenIn: string,
    tokenOut: string,
    buyDex: number,
    sellDex: number,
    feeBuy: number,
    feeSell: number,
    decimalsIn: number = 18
  ): Promise<boolean> {
    if (this.isExecuting) return false;
    if (Date.now() < this.circuitBreakerCooldownUntil) return false;

    const isBase = chainId === 8453;
    const contract = isBase ? this.contractBase : this.contractArb;
    const ethPrice = cexLagPredictor.getCEXPrice('ETH') || 2500.0;
    const btcPrice = cexLagPredictor.getCEXPrice('BTC') || 68000.0;
    const priceUSD = decimalsIn === 6 ? 1.0 : (decimalsIn === 8 ? btcPrice : ethPrice);
    const minProfit = EconomicMath.calculateContractMinProfit(ENV.minProfitUsd, priceUSD, decimalsIn);

    const routeStruct = {
      tokenIn,
      tokenIntermediate: tokenOut,
      dexBuy: buyDex,
      dexSell: sellDex,
      feeOrSpacingBuy: feeBuy,
      feeOrSpacingSell: feeSell,
      minProfit
    };

    const flashAmounts = decimalsIn === 6
      ? [ethers.parseUnits('2500', 6), ethers.parseUnits('5000', 6), ethers.parseUnits('15000', 6), ethers.parseUnits('50000', 6)]
      : (decimalsIn === 8
        ? [ethers.parseUnits('0.05', 8), ethers.parseUnits('0.15', 8), ethers.parseUnits('0.5', 8)]
        : [ethers.parseEther('1.0'), ethers.parseEther('2.5'), ethers.parseEther('6.0'), ethers.parseEther('15.0')]);

    try {
      let profitableFlash: bigint | null = null;
      let simulatedProfit = 0n;
      let isBalancer = false;

      // 1. Consulta dinámica y simulación con Balancer V2 o Aave V3 según liquidez on-chain
      for (const fAmt of flashAmounts) {
        const provInfo = await flashLoanProviderService.selectOptimalProvider(
          chainId,
          tokenIn,
          fAmt,
          isBase ? this.providerBase : this.providerArb
        );

        if (provInfo.provider === 'balancer') {
          try {
            const profit = await contract.executeBalancerFlashLoanSpatial.staticCall(routeStruct, fAmt);
            if (profit && BigInt(profit) > minProfit) {
              profitableFlash = fAmt;
              simulatedProfit = BigInt(profit);
              isBalancer = true;
              break;
            }
          } catch {}
        }

        // Si Balancer no tiene liquidez, está pausado o revierte, intentar Aave V3
        try {
          const profit = await contract.executeFlashLoanSpatial.staticCall(routeStruct, fAmt);
          if (profit && BigInt(profit) > minProfit) {
            profitableFlash = fAmt;
            simulatedProfit = BigInt(profit);
            isBalancer = false;
            break;
          }
        } catch {}
      }

      SERVER_STATS.lowFee.scansCount++;

      // 2. Telemetría Real y Evaluación Económica Rigurosa (0% Ondas Sinusoidales - 100% Flash Loan)
      const evaluation = EconomicMath.evaluateOpportunity({
        chainId,
        loanTokenAddress: tokenIn,
        loanAmount: profitableFlash || flashAmounts[0],
        simulatedGrossProfitUnits: simulatedProfit,
        tokenPriceUSD: priceUSD,
        ethPriceUSD: ethPrice,
        calldataSizeBytes: 384,
        slippageBufferBps: 15,
      });

      const formattedSpread = evaluation.loanAmountUSD > 0
        ? parseFloat(((evaluation.grossProfitUSD / evaluation.loanAmountUSD) * 100).toFixed(3))
        : 0;

      const dexBuyName = isBase ? (buyDex === 0 ? 'UniV3' : (buyDex === 1 ? 'AeroSlip' : (buyDex === 2 ? 'AeroVol' : (buyDex === 3 ? 'AeroStable' : 'PancakeV3')))) : 'UniV3';
      const dexSellName = isBase ? (sellDex === 0 ? 'UniV3' : (sellDex === 1 ? 'AeroSlip' : (sellDex === 2 ? 'AeroVol' : (sellDex === 3 ? 'AeroStable' : 'PancakeV3')))) : 'UniV3';

      addLowFeeOpportunity({
        pairName: `[${feeTier}] ${pairName} (${isBase ? 'Base' : 'Arbitrum'})`,
        chainId,
        type: 'LOW_FEE',
        feeTier,
        tokenBorrow: tokenIn,
        tokenBorrowSymbol: evaluation.loanTokenSymbol,
        loanAmount: profitableFlash ? `$${evaluation.loanAmountUSD.toLocaleString()} USD` : '$25,000 USD',
        protocolA: dexBuyName,
        protocolB: dexSellName,
        spreadPercent: formattedSpread,
        grossProfitUSD: evaluation.grossProfitUSD,
        netProfitUSD: evaluation.netProfitUSD,
        timestamp: Date.now(),
        isProfitable: evaluation.isProfitable,
        contractAddress: isBase ? CONTRACT_BASE : CONTRACT_ARBITRUM
      });

      // 3. Disparo Centralizado con Mutex, Pre-Flight y Gas Guard (Exclusivamente Flash Loan)
      if (profitableFlash && evaluation.isProfitable) {
        this.isExecuting = true;
        try {
          const result = await transactionDispatcher.dispatchSpatial({
            chainId,
            pairName: `[${feeTier}] ${pairName}`,
            provider: isBalancer ? 'balancer' : 'aave',
            contract,
            routeStruct,
            loanAmount: profitableFlash,
            evaluation,
          });

          if (result.success) {
            this.consecutiveErrors = 0;
            if (!result.simulated) {
              SERVER_STATS.lowFee.executedCount++;
              SERVER_STATS.lowFee.realizedPnLUSD += result.realizedNetProfitUSD ?? evaluation.netProfitUSD;
              savePersistedStats();
              return true;
            } else {
              SERVER_STATS.lowFee.simulatedCount++;
              SERVER_STATS.lowFee.simulatedPnLUSD += evaluation.netProfitUSD;
              savePersistedStats();
            }
          } else if (result.reason) {
            this.handleRevert(result.reason);
          }
        } finally {
          this.isExecuting = false;
        }
      } else {
        addScanLog(`🔍 [${feeTier}] ${pairName} | Saldo Protegido (0 riesgo)`, 'LOW_FEE');
      }
    } catch (err: any) {
      if (this.isExecuting) {
        logger.error(`[LOW-FEE ERROR] ${pairName}: ${err.message}`);
        this.handleRevert(err.message);
      }
    } finally {
      this.isExecuting = false;
    }

    return false;
  }

  private handleRevert(reason: string): void {
    this.consecutiveErrors++;
    logger.warn(`⚠️ [LOW-FEE REVERT] (${this.consecutiveErrors}/5): ${reason}`);
    if (this.consecutiveErrors >= 5) {
      this.circuitBreakerCooldownUntil = Date.now() + 60_000;
      logger.error(`🛑 [CIRCUIT BREAKER LOW-FEE] 5 fallos consecutivos. Pausa de 60s activada.`);
    }
  }

  public startContinuousLowFeeScanner(): void {
    logger.info(`🚀 [LOW-FEE SCANNER] Iniciando escáner en Base y Arbitrum (Intervalo: 1200ms)...`);

    setInterval(async () => {
      if (this.isExecuting || Date.now() < this.circuitBreakerCooldownUntil) return;

      try {
        const tasks: Promise<boolean>[] = [];

        const pairBase = LOW_FEE_PAIRS_BASE[Math.floor(Math.random() * LOW_FEE_PAIRS_BASE.length)];
        const routeBase = pairBase.routes[Math.floor(Math.random() * pairBase.routes.length)];
        tasks.push(
          this.scanLowFeePair(
            8453,
            pairBase.name,
            pairBase.feeTier,
            pairBase.tokenIn,
            pairBase.tokenOut,
            routeBase.buyDex,
            routeBase.sellDex,
            routeBase.feeBuy,
            routeBase.feeSell,
            pairBase.decimalsIn
          ).catch(() => false)
        );

        if (ENV.enableArbitrum) {
          const pairArb = LOW_FEE_PAIRS_ARB[Math.floor(Math.random() * LOW_FEE_PAIRS_ARB.length)];
          const routeArb = pairArb.routes[Math.floor(Math.random() * pairArb.routes.length)];
          if (routeArb) {
            tasks.push(
              this.scanLowFeePair(
                42161,
                pairArb.name,
                pairArb.feeTier,
                pairArb.tokenIn,
                pairArb.tokenOut,
                routeArb.buyDex,
                routeArb.sellDex,
                routeArb.feeBuy,
                routeArb.feeSell,
                pairArb.decimalsIn
              ).catch(() => false)
            );
          }
        }

        await Promise.allSettled(tasks);
      } catch (err: any) {
        // Silenciar errores de ciclo
      }
    }, 1200);
  }
}

export const lowFeeExecutor = LowFeeExecutor.getInstance();
