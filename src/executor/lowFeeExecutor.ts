import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { SERVER_STATS, addScanLog, addLowFeeOpportunity } from '../server';
import { savePersistedStats } from '../utils/statsStore';

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
      { buyDex: 0, sellDex: 4, feeBuy: 500, feeSell: 500 }, // Pancake V3 es índice 4
      { buyDex: 4, sellDex: 0, feeBuy: 500, feeSell: 500 },
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
  'function executeSpotSpatial((address tokenIn, address tokenIntermediate, uint8 dexBuy, uint8 dexSell, uint24 feeOrSpacingBuy, uint24 feeOrSpacingSell, uint256 minProfit) route, uint256 amountIn) external returns (uint256 profit)',
  'function executeFlashLoanSpatial((address tokenIn, address tokenIntermediate, uint8 dexBuy, uint8 dexSell, uint24 feeOrSpacingBuy, uint24 feeOrSpacingSell, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'function executeBalancerFlashLoanSpatial((address tokenIn, address tokenIntermediate, uint8 dexBuy, uint8 dexSell, uint24 feeOrSpacingBuy, uint24 feeOrSpacingSell, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'event SpatialExecuted(address indexed token, uint256 amountIn, uint256 amountOut, uint256 profit)',
  'event FlashLoanExecuted(address indexed asset, uint256 loanAmount, uint256 premium, uint256 netProfit)'
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
    this.providerBase = new ethers.JsonRpcProvider(ENV.rpcUrl || 'https://developer-access-mainnet.base.org', 8453, { staticNetwork: true });
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
    const minProfit = decimalsIn === 6 ? 100_000n : 40_000_000_000n; // $0.10 USD en token nativo

    const routeStruct = {
      tokenIn,
      tokenIntermediate: tokenOut,
      dexBuy: buyDex,
      dexSell: sellDex,
      feeOrSpacingBuy: feeBuy,
      feeOrSpacingSell: feeSell,
      minProfit
    };

    // Montos escalados según decimales reales
    const spotAmounts = decimalsIn === 6
      ? [ethers.parseUnits('10', 6), ethers.parseUnits('25', 6), ethers.parseUnits('35', 6)]
      : [ethers.parseEther('0.003'), ethers.parseEther('0.006'), ethers.parseEther('0.014')];

    const flashAmounts = decimalsIn === 6
      ? [ethers.parseUnits('2500', 6), ethers.parseUnits('5000', 6), ethers.parseUnits('15000', 6), ethers.parseUnits('50000', 6)]
      : [ethers.parseEther('1.0'), ethers.parseEther('2.5'), ethers.parseEther('6.0'), ethers.parseEther('15.0')];

    try {
      let profitableFlash: bigint | null = null;
      let simulatedProfit = 0n;
      let isBalancer = false;

      // 1. Simulación Balancer V2 (0% Fee)
      for (const fAmt of flashAmounts) {
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

      // Fallback a Aave V3
      if (!profitableFlash) {
        for (const fAmt of flashAmounts) {
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
      }

      // 2. Simulación Spot
      let profitableSpot: bigint | null = null;
      if (!profitableFlash) {
        for (const sAmt of spotAmounts) {
          try {
            const profit = await contract.executeSpotSpatial.staticCall(routeStruct, sAmt);
            if (profit && BigInt(profit) > minProfit) {
              profitableSpot = sAmt;
              simulatedProfit = BigInt(profit);
              break;
            }
          } catch {}
        }
      }

      SERVER_STATS.lowFee.scansCount++;

      // 3. Telemetría Real (0% Ondas Sinusoidales)
      const isProfitable = !!(profitableFlash || profitableSpot);
      let formattedSpread = 0;
      let grossUSD = 0;
      let loanUSD = 0;

      if (isProfitable && simulatedProfit > 0n) {
        const amt = profitableSpot || profitableFlash!;
        const amtNum = parseFloat(ethers.formatUnits(amt, decimalsIn));
        const profitNum = parseFloat(ethers.formatUnits(simulatedProfit, decimalsIn));
        const priceUSD = decimalsIn === 6 ? 1.0 : 2500.0;

        loanUSD = amtNum * priceUSD;
        grossUSD = parseFloat((profitNum * priceUSD).toFixed(2));
        formattedSpread = loanUSD > 0 ? parseFloat(((grossUSD / loanUSD) * 100).toFixed(3)) : 0;
      }

      const netUSD = isProfitable ? Math.max(0, parseFloat((grossUSD - 0.05).toFixed(2))) : 0;

      const dexBuyName = isBase ? (buyDex === 0 ? 'UniV3' : (buyDex === 1 ? 'AeroSlip' : (buyDex === 2 ? 'AeroVol' : (buyDex === 3 ? 'AeroStable' : 'PancakeV3')))) : 'UniV3';
      const dexSellName = isBase ? (sellDex === 0 ? 'UniV3' : (sellDex === 1 ? 'AeroSlip' : (sellDex === 2 ? 'AeroVol' : (sellDex === 3 ? 'AeroStable' : 'PancakeV3')))) : 'UniV3';

      addLowFeeOpportunity({
        pairName: `[${feeTier}] ${pairName} (${isBase ? 'Base' : 'Arbitrum'})`,
        chainId,
        type: 'LOW_FEE',
        feeTier,
        tokenBorrow: tokenIn,
        tokenBorrowSymbol: decimalsIn === 6 ? 'USDC' : 'WETH',
        loanAmount: profitableSpot ? `$35 USD` : (profitableFlash ? `$${loanUSD.toLocaleString()} USD` : '$25,000 USD'),
        protocolA: dexBuyName,
        protocolB: dexSellName,
        spreadPercent: formattedSpread,
        grossProfitUSD: grossUSD,
        netProfitUSD: netUSD,
        timestamp: Date.now(),
        isProfitable,
        contractAddress: isBase ? CONTRACT_BASE : CONTRACT_ARBITRUM
      });

      // 4. Disparo On-Chain con Pre-Flight EstimateGas
      if (profitableFlash && netUSD > 0.20) {
        this.isExecuting = true;
        const providerName = isBalancer ? 'Balancer V2 (0% Fee)' : 'Aave V3';

        let gasEstimated: bigint;
        try {
          gasEstimated = isBalancer
            ? await contract.executeBalancerFlashLoanSpatial.estimateGas(routeStruct, profitableFlash)
            : await contract.executeFlashLoanSpatial.estimateGas(routeStruct, profitableFlash);
        } catch (estErr: any) {
          logger.warn(`⚠️ [PRE-FLIGHT LOW-FEE ABORT] ${estErr.message}`);
          this.isExecuting = false;
          return false;
        }

        const gasLimit = (gasEstimated * 115n) / 100n;
        logger.success(`🔥 [LOW-FEE FLASH DISPARADO] ${pairName} vía ${providerName}!`);

        if (ENV.dryRun) {
          logger.info(`🧪 [DRY RUN VALIDADO LOW-FEE] Flash Loan ${providerName} en ${pairName} | Spread: ${formattedSpread}% | Net: +$${netUSD} USD. Omitiendo tx real.`);
          addScanLog(`🧪 [DRY RUN LOW-FEE] Oportunidad validada en ${pairName} (Net: +$${netUSD} USD).`, 'LOW_FEE');
          this.consecutiveErrors = 0;
          SERVER_STATS.lowFee.executedCount++;
          SERVER_STATS.lowFee.realizedPnLUSD += netUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        }

        addScanLog(`🚀 [DISPARO LOW-FEE ${isBase ? 'BASE' : 'ARBITRUM'}] ${pairName}...`, 'LOW_FEE');

        const tx = isBalancer
          ? await contract.executeBalancerFlashLoanSpatial(routeStruct, profitableFlash, { gasLimit })
          : await contract.executeFlashLoanSpatial(routeStruct, profitableFlash, { gasLimit });

        const receipt = await tx.wait(1);
        if (receipt && receipt.status === 1) {
          logger.success(`🎉 [LOW-FEE CONFIRMADO] Bloque #${receipt.blockNumber}!`);
          this.consecutiveErrors = 0;
          SERVER_STATS.lowFee.executedCount++;
          SERVER_STATS.lowFee.realizedPnLUSD += netUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        } else {
          this.handleRevert('Low-Fee Flash Reverted');
        }
      } else if (profitableSpot && netUSD > 0.05) {
        this.isExecuting = true;

        let gasEstimated: bigint;
        try {
          gasEstimated = await contract.executeSpotSpatial.estimateGas(routeStruct, profitableSpot);
        } catch (estErr: any) {
          logger.warn(`⚠️ [PRE-FLIGHT LOW-FEE SPOT ABORT] ${estErr.message}`);
          this.isExecuting = false;
          return false;
        }

        const gasLimit = (gasEstimated * 115n) / 100n;

        if (ENV.dryRun) {
          logger.info(`🧪 [DRY RUN VALIDADO LOW-FEE SPOT] Spot en ${pairName} | Spread: ${formattedSpread}% | Net: +$${netUSD} USD. Omitiendo tx real.`);
          addScanLog(`🧪 [DRY RUN LOW-FEE SPOT] Spot validado en ${pairName} (Net: +$${netUSD} USD).`, 'LOW_FEE');
          this.consecutiveErrors = 0;
          SERVER_STATS.lowFee.executedCount++;
          SERVER_STATS.lowFee.realizedPnLUSD += netUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        }

        const tx = await contract.executeSpotSpatial(routeStruct, profitableSpot, { gasLimit });
        const receipt = await tx.wait(1);

        if (receipt && receipt.status === 1) {
          logger.success(`🎉 [LOW-FEE SPOT CONFIRMADO] Bloque #${receipt.blockNumber}!`);
          this.consecutiveErrors = 0;
          SERVER_STATS.lowFee.executedCount++;
          SERVER_STATS.lowFee.realizedPnLUSD += netUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        } else {
          this.handleRevert('Low-Fee Spot Reverted');
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

        const pairArb = LOW_FEE_PAIRS_ARB[Math.floor(Math.random() * LOW_FEE_PAIRS_ARB.length)];
        const routeArb = pairArb.routes[Math.floor(Math.random() * pairArb.routes.length)];
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

        await Promise.allSettled(tasks);
      } catch (err: any) {
        // Silenciar errores de ciclo
      }
    }, 1200);
  }
}

export const lowFeeExecutor = LowFeeExecutor.getInstance();
