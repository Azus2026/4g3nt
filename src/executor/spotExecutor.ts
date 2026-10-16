import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { SERVER_STATS, addScanLog, addSpotOpportunity, addFlashOpportunity } from '../server';
import { savePersistedStats } from '../utils/statsStore';
import { executionLedger } from '../utils/executionLedger';
import { SweetSpotOptimizer } from '../math/sweetSpotOptimizer';
import { cexLagPredictor } from '../scanners/cexLagPredictor';
import { flashLoanProviderService } from '../services/flashLoanProviderService';
import { EconomicMath } from '../math/economicMath';
import { transactionDispatcher } from '../services/transactionDispatcher';

const getEthPriceUSD = (): number => cexLagPredictor.getCEXPrice('ETH') || 2500;

// Contrato Universal de Arbitraje Desplegado en Base (ChainID 8453)
export const ARBITRAGE_CONTRACT_BASE = ENV.arbitrageContractBase || '0xdA593D75439364a864a92416430FFA1268724059';

// Routers Oficiales en Base (ChainID 8453)
export const UNISWAP_V3_ROUTER_BASE = '0x2626664c2603336E57B271c5C0b26F421741e481';
export const AERODROME_SLIPSTREAM_ROUTER = '0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5';
export const AERODROME_V2_ROUTER = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43';
export const PANCAKESWAP_V3_ROUTER = '0x1b81D678ffb9C0263b24A97847620C99d213eB14';
export const SUSHISWAP_V3_ROUTER = '0xFB7eF66a7e61224DD6FcD0D7d9C3be5C8B049b9f';

// Tokens Clave de Base
export const WETH_BASE_ADDRESS = '0x4200000000000000000000000000000000000006';
export const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Umbral mínimo de ganancia: 0.00000004 ETH (~$0.0001 USD netos)
export const MIN_MICRO_PROFIT_WEI = 40_000_000_000n;

// Protocol IDs
export const DEX_IDS = {
  UNIV3: 0,
  AERO_CL: 1,
  AERO_V2_VOLATILE: 2,
  AERO_V2_STABLE: 3,
  PANCAKE_V3: 4,
  SUSHISWAP_V3: 5,
};

export const DEX_NAMES: Record<number, string> = {
  0: 'UniV3',
  1: 'AeroCL',
  2: 'AeroV2',
  3: 'AeroV2_Stable',
  4: 'PancakeV3',
  5: 'SushiV3',
};

// Matriz de Tokens Verificados de Alto Volumen en Base
export const VOLATILE_TOKENS_BASE = [
  { symbol: 'BRETT', address: '0x532f27101965dd16442E59d40670FaF5eBB142E4', feeUni: 10000, spacingAero: 200 },
  { symbol: 'TOSHI', address: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4', feeUni: 10000, spacingAero: 200 },
  { symbol: 'DEGEN', address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', feeUni: 3000, spacingAero: 100 },
  { symbol: 'HIGHER', address: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe', feeUni: 10000, spacingAero: 200 },
  { symbol: 'KEYCAT', address: '0x9a26F5433671751C3276a065f57e5a02D2817973', feeUni: 10000, spacingAero: 200 },
  { symbol: 'VIRTUAL', address: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', feeUni: 3000, spacingAero: 100 },
  { symbol: 'AERO', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', feeUni: 3000, spacingAero: 100 },
  { symbol: 'CLANKER', address: '0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb', feeUni: 10000, spacingAero: 200 },
  { symbol: 'wstETH', address: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452', feeUni: 100, spacingAero: 1 },
  { symbol: 'cbBTC', address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', feeUni: 500, spacingAero: 100 },
  { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', feeUni: 500, spacingAero: 100 },
  { symbol: 'USDbC', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', feeUni: 500, spacingAero: 100 },
  { symbol: 'ezETH', address: '0x2416092f143378750bb29b79eD961ab195CcEea5', feeUni: 500, spacingAero: 100 },
  { symbol: 'tBTC', address: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b', feeUni: 3000, spacingAero: 200 },
  { symbol: 'WELL', address: '0xA88594D404727625A9437C3f886C7643872296AE', feeUni: 3000, spacingAero: 200 },
  { symbol: 'MOG', address: '0x2Da56AcB9Ea78330f947BD57C54119Debda7AF71', feeUni: 10000, spacingAero: 200 }
];

// Generar rutas espaciales dinámicamente para todos los tokens volátiles
export const SPATIAL_PAIRS_BASE = VOLATILE_TOKENS_BASE.map(t => ({
  name: `WETH ➔ ${t.symbol} ➔ WETH`,
  tokenIn: WETH_BASE_ADDRESS,
  tokenIntermediate: t.address,
  routes: [
    { buyDex: DEX_IDS.AERO_V2_VOLATILE, sellDex: DEX_IDS.UNIV3, feeBuy: 0, feeSell: t.feeUni },
    { buyDex: DEX_IDS.UNIV3, sellDex: DEX_IDS.AERO_V2_VOLATILE, feeBuy: t.feeUni, feeSell: 0 },
    { buyDex: DEX_IDS.AERO_CL, sellDex: DEX_IDS.AERO_V2_VOLATILE, feeBuy: t.spacingAero, feeSell: 0 },
    { buyDex: DEX_IDS.AERO_V2_VOLATILE, sellDex: DEX_IDS.AERO_CL, feeBuy: 0, feeSell: t.spacingAero },
      ...(ENV.enableSecondaryDex ? [
        { buyDex: DEX_IDS.PANCAKE_V3, sellDex: DEX_IDS.AERO_V2_VOLATILE, feeBuy: t.feeUni, feeSell: 0 },
        { buyDex: DEX_IDS.AERO_V2_VOLATILE, sellDex: DEX_IDS.PANCAKE_V3, feeBuy: 0, feeSell: t.feeUni },
        { buyDex: DEX_IDS.SUSHISWAP_V3, sellDex: DEX_IDS.UNIV3, feeBuy: t.feeUni, feeSell: t.feeUni },
        { buyDex: DEX_IDS.UNIV3, sellDex: DEX_IDS.SUSHISWAP_V3, feeBuy: t.feeUni, feeSell: t.feeUni },
      ] : [])
  ]
}));

// Montos Dinámicos Multi-Tier de Flash Loans (0% Capital Propio)
export const FLASH_AMOUNT_TIERS = [
  ethers.parseEther('0.5'),
  ethers.parseEther('1.5'),
  ethers.parseEther('3.0'),
  ethers.parseEther('6.0'),
  ethers.parseEther('10.0'),
  ethers.parseEther('25.0'),
  ethers.parseEther('50.0'),
];

export const ARBITRAGE_ABI = [
  'function executeFlashLoanSpatial((address tokenIn, address tokenIntermediate, uint8 dexBuy, uint8 dexSell, uint24 feeOrSpacingBuy, uint24 feeOrSpacingSell, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'function executeFlashLoanTriangular((address tokenA, address tokenB, address tokenC, uint8 dex1, uint8 dex2, uint8 dex3, uint24 feeOrSpacing1, uint24 feeOrSpacing2, uint24 feeOrSpacing3, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'function executeBalancerFlashLoanSpatial((address tokenIn, address tokenIntermediate, uint8 dexBuy, uint8 dexSell, uint24 feeOrSpacingBuy, uint24 feeOrSpacingSell, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'function executeBalancerFlashLoanTriangular((address tokenA, address tokenB, address tokenC, uint8 dex1, uint8 dex2, uint8 dex3, uint24 feeOrSpacing1, uint24 feeOrSpacing2, uint24 feeOrSpacing3, uint256 minProfit) route, uint256 loanAmount) external returns (uint256 profit)',
  'event FlashLoanExecuted(address indexed token, uint256 loanAmount, uint256 grossProfit, uint256 timestamp)'
];

export class SpotExecutor {
  private static instance: SpotExecutor;
  private provider: ethers.JsonRpcProvider;
  private wallet?: ethers.Wallet;
  private arbitrageContract: ethers.Contract;
  private isInitialized: boolean = false;
  private isExecuting: boolean = false;
  private consecutiveErrors: number = 0;
  private circuitBreakerCooldownUntil: number = 0;

  private constructor() {
    this.provider = new ethers.JsonRpcProvider(ENV.rpcUrl || 'https://mainnet.base.org', 8453, {
      staticNetwork: true,
    });

    if (ENV.privateKey && ENV.privateKey !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      try {
        const formattedKey = ENV.privateKey.startsWith('0x') ? ENV.privateKey : (`0x${ENV.privateKey}`);
        this.wallet = new ethers.Wallet(formattedKey, this.provider);
        this.arbitrageContract = new ethers.Contract(ARBITRAGE_CONTRACT_BASE, ARBITRAGE_ABI, this.wallet);
      } catch (err: any) {
        logger.warn(`SpotExecutor: Wallet no inicializada (${err.message}). Operando en modo observación.`);
        this.arbitrageContract = new ethers.Contract(ARBITRAGE_CONTRACT_BASE, ARBITRAGE_ABI, this.provider);
      }
    } else {
      this.arbitrageContract = new ethers.Contract(ARBITRAGE_CONTRACT_BASE, ARBITRAGE_ABI, this.provider);
    }
  }

  public static getInstance(): SpotExecutor {
    if (!SpotExecutor.instance) {
      SpotExecutor.instance = new SpotExecutor();
    }
    return SpotExecutor.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    logger.info(`[SPOT EXECUTOR] Inicializando motor de ejecución ultra-rápida en Base...`);
    this.startContinuousUniversalScanner();
    logger.success(`🚀 [SPOT EXECUTOR] Motor Spot & Flash Loans (0% Balancer Vault) ACTIVO.`);
  }

  /**
   * Método puente para llamadas desde agentWorker y cluster
   */
  public async executeSpot(opp: any): Promise<void> {
    if (!opp) return;
    try {
      if (opp.type === 'TRIANGULAR' || opp.legsCount === 3) {
        await this.scanAndExecuteTriangular(
          opp.pairName || 'WETH ➔ BRETT ➔ USDC ➔ WETH',
          opp.tokenA || WETH_BASE_ADDRESS,
          opp.tokenB || opp.tokenIntermediate || VOLATILE_TOKENS_BASE[0].address,
          opp.tokenC || USDC_BASE_ADDRESS,
          opp.dex1 || DEX_IDS.AERO_V2_VOLATILE,
          opp.dex2 || DEX_IDS.UNIV3,
          opp.dex3 || DEX_IDS.AERO_V2_VOLATILE,
          0,
          3000,
          0
        );
      } else {
        await this.scanAndExecuteSpatial(
          opp.pairName || `WETH ➔ ${opp.tokenBorrowSymbol || 'BRETT'} ➔ WETH`,
          opp.tokenIn || WETH_BASE_ADDRESS,
          opp.tokenIntermediate || VOLATILE_TOKENS_BASE[0].address,
          opp.buyDex || DEX_IDS.AERO_V2_VOLATILE,
          opp.sellDex || DEX_IDS.UNIV3,
          opp.feeBuy || 0,
          opp.feeSell || 10000
        );
      }
    } catch (err: any) {
      logger.error(`[EXECUTE SPOT BRIDGE ERROR] ${err.message}`);
    }
  }

  /**
   * Escanea y Ejecuta Arbitraje Espacial 2-Leg con Simulación Real y Pre-Flight Check
   */
  public async scanAndExecuteSpatial(
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

    const pathDesc = `${DEX_NAMES[buyDex]} ➔ ${DEX_NAMES[sellDex]}`;
    const tokenDecimals = flashLoanProviderService.getStrictDecimals(tokenIn, 18);
    const btcPrice = cexLagPredictor.getCEXPrice('BTC') || 68000;
    const ethPrice = getEthPriceUSD();
    const tokenPriceUSD = tokenDecimals === 6 ? 1.0 : (tokenDecimals === 8 ? btcPrice : ethPrice);
    const minProfit = EconomicMath.calculateContractMinProfit(ENV.minProfitUsd, tokenPriceUSD, tokenDecimals);

    const routeStruct = {
      tokenIn,
      tokenIntermediate,
      dexBuy: buyDex,
      dexSell: sellDex,
      feeOrSpacingBuy: feeBuy,
      feeOrSpacingSell: feeSell,
      minProfit,
    };

    try {
      // 1. Simulación Dinámica con Balancer V2 o Aave V3 según liquidez on-chain
      let profitableFlashAmount: bigint | null = null;
      let simulatedProfitWei = 0n;
      let isBalancer = false;

      for (const fAmount of FLASH_AMOUNT_TIERS) {
        const provInfo = await flashLoanProviderService.selectOptimalProvider(
          8453,
          tokenIn,
          fAmount,
          this.provider
        );

        if (provInfo.provider === 'balancer') {
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

        // Si Balancer no tiene liquidez, está en pausa o revierte, intentar Aave V3
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

      SERVER_STATS.spotBase.scansCount++;

      // 3. Telemetría Real y Evaluación Económica Rigurosa (100% Flash Loan)
      const evaluation = EconomicMath.evaluateOpportunity({
        chainId: 8453,
        loanTokenAddress: tokenIn,
        loanAmount: profitableFlashAmount || FLASH_AMOUNT_TIERS[0],
        simulatedGrossProfitUnits: simulatedProfitWei,
        tokenPriceUSD,
        ethPriceUSD: ethPrice,
        calldataSizeBytes: 384,
        slippageBufferBps: 15,
      });

      if (evaluation.isProfitable && SERVER_STATS.flashLoans) {
        SERVER_STATS.flashLoans.detectedOpportunitiesCount++;
      }

      const formattedSpread = evaluation.loanAmountUSD > 0
        ? parseFloat(((evaluation.grossProfitUSD / evaluation.loanAmountUSD) * 100).toFixed(3))
        : 0;

      addSpotOpportunity({
        pairName: `[2-LEG] ${pairName} (${pathDesc})`,
        chainId: 8453,
        type: 'FLASH_LOAN',
        tokenBorrow: tokenIn,
        tokenBorrowSymbol: evaluation.loanTokenSymbol,
        loanAmount: profitableFlashAmount ? `${ethers.formatUnits(profitableFlashAmount, tokenDecimals)} ${evaluation.loanTokenSymbol}` : `0.5 ${evaluation.loanTokenSymbol} (Flash)`,
        leg1: { protocolId: DEX_NAMES[buyDex].toLowerCase(), price: 2500 },
        leg2: { protocolId: DEX_NAMES[sellDex].toLowerCase(), price: 2500 },
        spreadPercent: formattedSpread,
        grossProfitUSD: evaluation.grossProfitUSD,
        gasCostUSD: evaluation.totalGasCostUSD,
        netProfitUSD: evaluation.netProfitUSD,
        timestamp: Date.now(),
        isProfitable: evaluation.isProfitable,
        contractAddress: ARBITRAGE_CONTRACT_BASE,
      });

      // 4. Disparo Centralizado con Mutex, Pre-Flight y Gas Guard (Exclusivamente Flash Loan)
      if (profitableFlashAmount && evaluation.isProfitable) {
        this.isExecuting = true;
        try {
          const result = await transactionDispatcher.dispatchSpatial({
            chainId: 8453,
            pairName: `[2-LEG] ${pairName} (${pathDesc})`,
            provider: isBalancer ? 'balancer' : 'aave',
            contract: this.arbitrageContract,
            routeStruct,
            loanAmount: profitableFlashAmount,
            evaluation,
          });

          if (result.success) {
            this.consecutiveErrors = 0;
            if (!result.simulated) {
              SERVER_STATS.spotBase.executedCount++;
              SERVER_STATS.spotBase.realizedPnLUSD += result.realizedNetProfitUSD ?? evaluation.netProfitUSD;
              SERVER_STATS.flashLoans.onChainExecutedCount++;
              SERVER_STATS.flashLoans.detectedPnLUSD += result.realizedNetProfitUSD ?? evaluation.netProfitUSD;
              savePersistedStats();
              return true;
            } else {
              SERVER_STATS.spotBase.simulatedCount++;
              SERVER_STATS.spotBase.simulatedPnLUSD += evaluation.netProfitUSD;
              SERVER_STATS.flashLoans.simulatedCount++;
              SERVER_STATS.flashLoans.simulatedPnLUSD += evaluation.netProfitUSD;
              savePersistedStats();
            }
          } else if (result.reason) {
            this.handleRevert(result.reason);
          }
        } finally {
          this.isExecuting = false;
        }
      } else {
        addScanLog(`🔍 [2-LEG ESPACIAL] ${pairName} | ${pathDesc} | Saldo Protegido (0 riesgo)`);
      }
    } catch (err: any) {
      if (this.isExecuting) {
        logger.error(`[SPOT ESPACIAL ERROR] ${pairName}: ${err.message}`);
        this.handleRevert(err.message);
      }
    } finally {
      this.isExecuting = false;
    }

    return false;
  }

  /**
   * Escanea y Ejecuta Arbitraje Triangular 3-Leg con Simulación Real y Pre-Flight Check (100% Flash Loan)
   */
  public async scanAndExecuteTriangular(
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

    const pathDesc = `${DEX_NAMES[dex1]} ➔ ${DEX_NAMES[dex2]} ➔ ${DEX_NAMES[dex3]}`;
    const tokenDecimals = 18;
    const triEthPrice = getEthPriceUSD();
    const minProfit = EconomicMath.calculateContractMinProfit(ENV.minProfitUsd, triEthPrice, tokenDecimals);

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
      minProfit,
    };

    try {
      let profitableFlashAmount: bigint | null = null;
      let simulatedProfitWei = 0n;
      let isBalancer = false;

      for (const fAmount of FLASH_AMOUNT_TIERS) {
        const provInfo = await flashLoanProviderService.selectOptimalProvider(
          8453,
          tokenA,
          fAmount,
          this.provider
        );

        if (provInfo.provider === 'balancer') {
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

      SERVER_STATS.spotBase.scansCount++;

      // 3. Telemetría Real y Evaluación Económica Rigurosa (100% Flash Loan)
      const evaluation = EconomicMath.evaluateOpportunity({
        chainId: 8453,
        loanTokenAddress: tokenA,
        loanAmount: profitableFlashAmount || FLASH_AMOUNT_TIERS[0],
        simulatedGrossProfitUnits: simulatedProfitWei,
        tokenPriceUSD: triEthPrice,
        ethPriceUSD: triEthPrice,
        calldataSizeBytes: 512,
        slippageBufferBps: 15,
      });

      if (evaluation.isProfitable && SERVER_STATS.flashLoans) {
        SERVER_STATS.flashLoans.detectedOpportunitiesCount++;
      }

      const formattedTriSpread = evaluation.loanAmountUSD > 0
        ? parseFloat(((evaluation.grossProfitUSD / evaluation.loanAmountUSD) * 100).toFixed(3))
        : 0;

      addSpotOpportunity({
        pairName: `[3-LEG] ${pairName} (${pathDesc})`,
        chainId: 8453,
        type: 'FLASH_LOAN',
        tokenBorrow: tokenA,
        tokenBorrowSymbol: 'WETH',
        loanAmount: profitableFlashAmount ? `${ethers.formatEther(profitableFlashAmount)} WETH` : '0.5 WETH (Flash)',
        leg1: { protocolId: DEX_NAMES[dex1].toLowerCase(), price: 2500 },
        leg2: { protocolId: DEX_NAMES[dex2].toLowerCase(), price: 2500 },
        spreadPercent: formattedTriSpread,
        grossProfitUSD: evaluation.grossProfitUSD,
        gasCostUSD: evaluation.totalGasCostUSD,
        netProfitUSD: evaluation.netProfitUSD,
        timestamp: Date.now(),
        isProfitable: evaluation.isProfitable,
        contractAddress: ARBITRAGE_CONTRACT_BASE,
      });

      // 4. Disparo Centralizado con Mutex, Pre-Flight y Gas Guard (Exclusivamente Flash Loan)
      if (profitableFlashAmount && evaluation.isProfitable) {
        this.isExecuting = true;
        try {
          const result = await transactionDispatcher.dispatchTriangular({
            chainId: 8453,
            pairName: `[3-LEG] ${pairName} (${pathDesc})`,
            provider: isBalancer ? 'balancer' : 'aave',
            contract: this.arbitrageContract,
            routeStruct,
            loanAmount: profitableFlashAmount,
            evaluation,
          });

          if (result.success) {
            this.consecutiveErrors = 0;
            if (!result.simulated) {
              SERVER_STATS.spotBase.executedCount++;
              SERVER_STATS.spotBase.realizedPnLUSD += result.realizedNetProfitUSD ?? evaluation.netProfitUSD;
              SERVER_STATS.flashLoans.onChainExecutedCount++;
              SERVER_STATS.flashLoans.detectedPnLUSD += result.realizedNetProfitUSD ?? evaluation.netProfitUSD;
              savePersistedStats();
              return true;
            } else {
              SERVER_STATS.spotBase.simulatedCount++;
              SERVER_STATS.spotBase.simulatedPnLUSD += evaluation.netProfitUSD;
              SERVER_STATS.flashLoans.simulatedCount++;
              SERVER_STATS.flashLoans.simulatedPnLUSD += evaluation.netProfitUSD;
              savePersistedStats();
            }
          } else if (result.reason) {
            this.handleRevert(result.reason);
          }
        } finally {
          this.isExecuting = false;
        }
      } else {
        addScanLog(`🔍 [3-LEG TRIANGULAR] ${pairName} | ${pathDesc} | Saldo Protegido (0 riesgo)`);
      }
    } catch (err: any) {
      if (this.isExecuting) {
        logger.error(`[TRIANGULAR ERROR] ${pairName}: ${err.message}`);
        this.handleRevert(err.message);
      }
    } finally {
      this.isExecuting = false;
    }

    return false;
  }

  private handleRevert(reason: string): void {
    this.consecutiveErrors++;
    logger.warn(`⚠️ [REVERSION ON-CHAIN] Fallo registrado (${this.consecutiveErrors}/5): ${reason}`);
    if (this.consecutiveErrors >= 5) {
      this.circuitBreakerCooldownUntil = Date.now() + 60_000;
      logger.error(`🛑 [CIRCUIT BREAKER ACTIVADO] 5 reversiones consecutivas. Bot en pausa por 60s para proteger gas.`);
      addScanLog(`🛑 [CIRCUIT BREAKER] 5 fallos consecutivos. Pausa de 60s activada para proteger saldo.`);
    }
  }

  /**
   * Ciclo continuo de escaneo en paralelo
   */
  public startContinuousUniversalScanner(): void {
    logger.info(`🚀 [SPOT EXECUTOR] Iniciando escáner en Base (0% sintéticos, simulación real on-chain)...`);

    setInterval(async () => {
      if (this.isExecuting || Date.now() < this.circuitBreakerCooldownUntil) return;

      try {
        const shuffled = [...SPATIAL_PAIRS_BASE].sort(() => 0.5 - Math.random());
        const batch = shuffled.slice(0, 3);

        const tasks: Promise<boolean>[] = [];

        for (const pair of batch) {
          for (const route of pair.routes.slice(0, 2)) {
            tasks.push(
              this.scanAndExecuteSpatial(
                pair.name,
                pair.tokenIn,
                pair.tokenIntermediate,
                route.buyDex,
                route.sellDex,
                route.feeBuy,
                route.feeSell
              ).catch(() => false)
            );
          }
        }

        const triangularExamples = [
          { name: 'WETH ➔ BRETT ➔ USDC ➔ WETH', tB: '0x532f27101965dd16442E59d40670FaF5eBB142E4', tC: USDC_BASE_ADDRESS },
          { name: 'WETH ➔ TOSHI ➔ USDC ➔ WETH', tB: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4', tC: USDC_BASE_ADDRESS },
          { name: 'WETH ➔ DEGEN ➔ AERO ➔ WETH', tB: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', tC: '0x940181a94A35A4569E4529A3CDfB74e38FD98631' },
          { name: 'WETH ➔ VIRTUAL ➔ USDC ➔ WETH', tB: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', tC: USDC_BASE_ADDRESS },
        ];
        const triChoice = triangularExamples[Math.floor(Math.random() * triangularExamples.length)];

        tasks.push(
          this.scanAndExecuteTriangular(
            triChoice.name,
            WETH_BASE_ADDRESS,
            triChoice.tB,
            triChoice.tC,
            DEX_IDS.AERO_V2_VOLATILE,
            DEX_IDS.UNIV3,
            DEX_IDS.AERO_V2_VOLATILE,
            0,
            3000,
            0
          ).catch(() => false)
        );

        await Promise.allSettled(tasks);
      } catch (err: any) {
        // Silenciar errores de ciclo
      }
    }, 750);
  }
}

export const spotExecutor = SpotExecutor.getInstance();
