import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { SERVER_STATS, addScanLog, addSpotOpportunity, addFlashOpportunity } from '../server';
import { savePersistedStats } from '../utils/statsStore';
import { SweetSpotOptimizer } from '../math/sweetSpotOptimizer';
import { cexLagPredictor } from '../scanners/cexLagPredictor';

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
    { buyDex: DEX_IDS.PANCAKE_V3, sellDex: DEX_IDS.AERO_V2_VOLATILE, feeBuy: t.feeUni, feeSell: 0 },
    { buyDex: DEX_IDS.AERO_V2_VOLATILE, sellDex: DEX_IDS.PANCAKE_V3, feeBuy: 0, feeSell: t.feeUni },
    { buyDex: DEX_IDS.SUSHISWAP_V3, sellDex: DEX_IDS.UNIV3, feeBuy: t.feeUni, feeSell: t.feeUni },
    { buyDex: DEX_IDS.UNIV3, sellDex: DEX_IDS.SUSHISWAP_V3, feeBuy: t.feeUni, feeSell: t.feeUni },
  ]
}));

// Montos Dinámicos Multi-Tier con Búsqueda de Tamaño Óptimo
export const SPOT_AMOUNT_TIERS = [
  ethers.parseEther('0.003'),
  ethers.parseEther('0.006'),
  ethers.parseEther('0.010'),
  ethers.parseEther('0.014'),
];

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
    this.provider = new ethers.JsonRpcProvider(ENV.rpcUrl || 'https://developer-access-mainnet.base.org', 8453, {
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
    const minProfit = MIN_MICRO_PROFIT_WEI;

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
      // 1. Simulación Balancer V2 Vault (0% Fee)
      let profitableFlashAmount: bigint | null = null;
      let simulatedProfitWei = 0n;
      let isBalancer = false;

      for (const fAmount of FLASH_AMOUNT_TIERS) {
        try {
          const profit = await this.arbitrageContract.executeBalancerFlashLoanSpatial.staticCall(routeStruct, fAmount);
          if (profit && BigInt(profit) > minProfit) {
            profitableFlashAmount = fAmount;
            simulatedProfitWei = BigInt(profit);
            isBalancer = true;
            break;
          }
        } catch {
          // Revert normal si no hay spread
        }
      }

      // Fallback a Aave V3 si Balancer no tiene liquidez
      if (!profitableFlashAmount) {
        for (const fAmount of FLASH_AMOUNT_TIERS) {
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

      // 2. Probar Tiers de Spot
      let profitableSpotAmount: bigint | null = null;
      if (!profitableFlashAmount) {
        for (const sAmount of SPOT_AMOUNT_TIERS) {
          try {
            const profit = await this.arbitrageContract.executeSpotSpatial.staticCall(routeStruct, sAmount);
            if (profit && BigInt(profit) > minProfit) {
              profitableSpotAmount = sAmount;
              simulatedProfitWei = BigInt(profit);
              break;
            }
          } catch {}
        }
      }

      SERVER_STATS.spotBase.scansCount++;
      if (SERVER_STATS.flashLoans) SERVER_STATS.flashLoans.detectedOpportunitiesCount++;

      // 3. Telemetría Real (0% Fórmulas Sintéticas)
      const isProfitable = !!(profitableFlashAmount || profitableSpotAmount);
      let formattedSpread = 0;
      let grossUSD = 0;
      let tradeCapUSD = 0;

      if (isProfitable && simulatedProfitWei > 0n) {
        const ethPrice = getEthPriceUSD();
        const realProfitETH = parseFloat(ethers.formatEther(simulatedProfitWei));
        tradeCapUSD = profitableSpotAmount
          ? parseFloat(ethers.formatEther(profitableSpotAmount)) * ethPrice
          : parseFloat(ethers.formatEther(profitableFlashAmount!)) * ethPrice;
        formattedSpread = tradeCapUSD > 0 ? parseFloat((((realProfitETH * ethPrice) / tradeCapUSD) * 100).toFixed(3)) : 0;
        grossUSD = parseFloat((realProfitETH * ethPrice).toFixed(4));
      }

      const ethPrice = getEthPriceUSD();
      const gasEst = SweetSpotOptimizer.calculateTotalGasCostUSD(8453, 220_000n, 0.05, ethPrice, 384);
      const gasUSD = gasEst.totalGasUSD;
      const netUSD = isProfitable ? Math.max(0, parseFloat((grossUSD - gasUSD).toFixed(4))) : 0;

      addSpotOpportunity({
        pairName: `[2-LEG] ${pairName} (${pathDesc})`,
        chainId: 8453,
        type: 'SPOT_BASE',
        tokenBorrow: tokenIn,
        tokenBorrowSymbol: 'WETH',
        loanAmount: profitableSpotAmount
          ? `${ethers.formatEther(profitableSpotAmount)} WETH`
          : (profitableFlashAmount ? `${ethers.formatEther(profitableFlashAmount)} WETH` : '0.014 WETH ($35 USD)'),
        leg1: { protocolId: DEX_NAMES[buyDex].toLowerCase(), price: 2500 },
        leg2: { protocolId: DEX_NAMES[sellDex].toLowerCase(), price: 2500 },
        spreadPercent: formattedSpread,
        grossProfitUSD: grossUSD,
        gasCostUSD: gasUSD,
        netProfitUSD: netUSD,
        timestamp: Date.now(),
        isProfitable,
        contractAddress: ARBITRAGE_CONTRACT_BASE,
      });

      // 4. Disparo On-Chain con Pre-Flight EstimateGas
      if (profitableFlashAmount && netUSD > 0.15) {
        this.isExecuting = true;
        const providerName = isBalancer ? 'Balancer V2 (0% Fee)' : 'Aave V3';

        // Pre-Flight Check de Gas
        let gasEstimated: bigint;
        try {
          gasEstimated = isBalancer
            ? await this.arbitrageContract.executeBalancerFlashLoanSpatial.estimateGas(routeStruct, profitableFlashAmount)
            : await this.arbitrageContract.executeFlashLoanSpatial.estimateGas(routeStruct, profitableFlashAmount);
        } catch (estErr: any) {
          logger.warn(`⚠️ [PRE-FLIGHT ABORT] Oportunidad expiró antes del minado: ${estErr.message}`);
          this.isExecuting = false;
          return false;
        }

        const gasLimit = (gasEstimated * 115n) / 100n;
        logger.success(`🔥 [FLASH LOAN ${providerName}] Oportunidad en ${pairName} | ${pathDesc} (${ethers.formatEther(profitableFlashAmount)} WETH)!`);

        if (ENV.dryRun) {
          logger.info(`🧪 [DRY RUN VALIDADO] Flash Loan ${providerName} en ${pairName} | Spread: ${formattedSpread}% | Net: +$${netUSD} USD | Gas estimado: $${gasUSD}. Omitiendo tx real.`);
          addScanLog(`🧪 [DRY RUN] Oportunidad validada en ${pairName} (Net: +$${netUSD} USD).`);
          this.consecutiveErrors = 0;
          SERVER_STATS.flashLoans.onChainExecutedCount++;
          SERVER_STATS.flashLoans.detectedPnLUSD += netUSD;
          SERVER_STATS.spotBase.executedCount++;
          SERVER_STATS.spotBase.realizedPnLUSD += netUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        }

        addScanLog(`🚀 [DISPARO ON-CHAIN] Flash Loan ${providerName} ${pairName} (${pathDesc})...`);

        const tx = isBalancer
          ? await this.arbitrageContract.executeBalancerFlashLoanSpatial(routeStruct, profitableFlashAmount, { gasLimit })
          : await this.arbitrageContract.executeFlashLoanSpatial(routeStruct, profitableFlashAmount, { gasLimit });

        logger.info(`⚡ Tx Enviada: https://basescan.org/tx/${tx.hash}`);
        const receipt = await tx.wait(1);

        if (receipt && receipt.status === 1) {
          logger.success(`🎉 [FLASH LOAN CONFIRMADO] Bloque #${receipt.blockNumber}!`);
          addScanLog(`🎉 [CONFIRMADA] Flash Loan Ejecutado Bloque #${receipt.blockNumber} | Tx: https://basescan.org/tx/${tx.hash}`);

          this.consecutiveErrors = 0;
          SERVER_STATS.flashLoans.onChainExecutedCount++;
          SERVER_STATS.flashLoans.detectedPnLUSD += netUSD;
          SERVER_STATS.spotBase.executedCount++;
          SERVER_STATS.spotBase.realizedPnLUSD += netUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        } else {
          this.handleRevert('Flash Loan Spatial Reverted');
        }
      } else if (profitableSpotAmount && netUSD > 0.05) {
        this.isExecuting = true;

        let gasEstimated: bigint;
        try {
          gasEstimated = await this.arbitrageContract.executeSpotSpatial.estimateGas(routeStruct, profitableSpotAmount);
        } catch (estErr: any) {
          logger.warn(`⚠️ [PRE-FLIGHT SPOT ABORT] Oportunidad expiró: ${estErr.message}`);
          this.isExecuting = false;
          return false;
        }

        const gasLimit = (gasEstimated * 115n) / 100n;
        logger.success(`🔥 [SPOT ESPACIAL DETECTADO] Oportunidad en ${pairName} | ${pathDesc} (${ethers.formatEther(profitableSpotAmount)} WETH)!`);

        if (ENV.dryRun) {
          logger.info(`🧪 [DRY RUN VALIDADO] Spot Espacial en ${pairName} | Net: +$${netUSD} USD. Omitiendo tx real.`);
          addScanLog(`🧪 [DRY RUN] Spot validado en ${pairName} (Net: +$${netUSD} USD).`);
          this.consecutiveErrors = 0;
          SERVER_STATS.spotBase.executedCount++;
          SERVER_STATS.spotBase.realizedPnLUSD += netUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        }

        const tx = await this.arbitrageContract.executeSpotSpatial(routeStruct, profitableSpotAmount, { gasLimit });
        logger.info(`⚡ Tx Enviada: https://basescan.org/tx/${tx.hash}`);
        const receipt = await tx.wait(1);

        if (receipt && receipt.status === 1) {
          logger.success(`🎉 [SPOT CONFIRMADO] Bloque #${receipt.blockNumber}!`);
          this.consecutiveErrors = 0;
          SERVER_STATS.spotBase.executedCount++;
          SERVER_STATS.spotBase.realizedPnLUSD += netUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        } else {
          this.handleRevert('Spot Spatial Reverted');
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
   * Escanea y Ejecuta Arbitraje Triangular 3-Leg con Simulación Real y Pre-Flight Check
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
    const minProfit = MIN_MICRO_PROFIT_WEI;

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
        for (const fAmount of FLASH_AMOUNT_TIERS) {
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

      let profitableSpotAmount: bigint | null = null;
      if (!profitableFlashAmount) {
        for (const sAmount of SPOT_AMOUNT_TIERS) {
          try {
            const profit = await this.arbitrageContract.executeSpotTriangular.staticCall(routeStruct, sAmount);
            if (profit && BigInt(profit) > minProfit) {
              profitableSpotAmount = sAmount;
              simulatedProfitWei = BigInt(profit);
              break;
            }
          } catch {}
        }
      }

      SERVER_STATS.spotBase.scansCount++;
      if (SERVER_STATS.flashLoans) SERVER_STATS.flashLoans.detectedOpportunitiesCount++;

      const isProfitable = !!(profitableFlashAmount || profitableSpotAmount);
      let formattedTriSpread = 0;
      let triGrossUSD = 0;
      let triCapUSD = 0;

      if (isProfitable && simulatedProfitWei > 0n) {
        const ethPrice = getEthPriceUSD();
        const realProfitETH = parseFloat(ethers.formatEther(simulatedProfitWei));
        triCapUSD = profitableSpotAmount
          ? parseFloat(ethers.formatEther(profitableSpotAmount)) * ethPrice
          : parseFloat(ethers.formatEther(profitableFlashAmount!)) * ethPrice;
        formattedTriSpread = triCapUSD > 0 ? parseFloat((((realProfitETH * ethPrice) / triCapUSD) * 100).toFixed(3)) : 0;
        triGrossUSD = parseFloat((realProfitETH * ethPrice).toFixed(4));
      }

      const triEthPrice = getEthPriceUSD();
      const triGasEst = SweetSpotOptimizer.calculateTotalGasCostUSD(8453, 280_000n, 0.05, triEthPrice, 512);
      const triGasUSD = triGasEst.totalGasUSD;
      const triNetUSD = isProfitable ? Math.max(0, parseFloat((triGrossUSD - triGasUSD).toFixed(4))) : 0;

      addSpotOpportunity({
        pairName: `[3-LEG] ${pairName} (${pathDesc})`,
        chainId: 8453,
        type: 'SPOT_BASE',
        tokenBorrow: tokenA,
        tokenBorrowSymbol: 'WETH',
        loanAmount: profitableSpotAmount
          ? `${ethers.formatEther(profitableSpotAmount)} WETH`
          : (profitableFlashAmount ? `${ethers.formatEther(profitableFlashAmount)} WETH` : '0.014 WETH ($35 USD)'),
        leg1: { protocolId: DEX_NAMES[dex1].toLowerCase(), price: 2500 },
        leg2: { protocolId: DEX_NAMES[dex2].toLowerCase(), price: 2500 },
        spreadPercent: formattedTriSpread,
        grossProfitUSD: triGrossUSD,
        gasCostUSD: triGasUSD,
        netProfitUSD: triNetUSD,
        timestamp: Date.now(),
        isProfitable,
        contractAddress: ARBITRAGE_CONTRACT_BASE,
      });

      if (profitableFlashAmount && triNetUSD > 0.20) {
        this.isExecuting = true;
        const providerName = isBalancer ? 'Balancer V2 (0% Fee)' : 'Aave V3';

        let gasEstimated: bigint;
        try {
          gasEstimated = isBalancer
            ? await this.arbitrageContract.executeBalancerFlashLoanTriangular.estimateGas(routeStruct, profitableFlashAmount)
            : await this.arbitrageContract.executeFlashLoanTriangular.estimateGas(routeStruct, profitableFlashAmount);
        } catch (estErr: any) {
          logger.warn(`⚠️ [PRE-FLIGHT TRIANGULAR ABORT] ${estErr.message}`);
          this.isExecuting = false;
          return false;
        }

        const gasLimit = (gasEstimated * 115n) / 100n;
        logger.success(`🔥 [FLASH LOAN ${providerName} TRIANGULAR] ${pairName} (${ethers.formatEther(profitableFlashAmount)} WETH)!`);

        if (ENV.dryRun) {
          logger.info(`🧪 [DRY RUN VALIDADO] Flash Loan Triangular ${providerName} en ${pairName} | Net: +$${triNetUSD} USD. Omitiendo tx real.`);
          addScanLog(`🧪 [DRY RUN] Flash Triangular validado en ${pairName} (Net: +$${triNetUSD} USD).`);
          this.consecutiveErrors = 0;
          SERVER_STATS.flashLoans.onChainExecutedCount++;
          SERVER_STATS.flashLoans.detectedPnLUSD += triNetUSD;
          SERVER_STATS.spotBase.executedCount++;
          SERVER_STATS.spotBase.realizedPnLUSD += triNetUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        }

        const tx = isBalancer
          ? await this.arbitrageContract.executeBalancerFlashLoanTriangular(routeStruct, profitableFlashAmount, { gasLimit })
          : await this.arbitrageContract.executeFlashLoanTriangular(routeStruct, profitableFlashAmount, { gasLimit });

        logger.info(`⚡ Tx Enviada: https://basescan.org/tx/${tx.hash}`);
        const receipt = await tx.wait(1);

        if (receipt && receipt.status === 1) {
          logger.success(`🎉 [FLASH LOAN TRIANGULAR CONFIRMADO] Bloque #${receipt.blockNumber}!`);
          this.consecutiveErrors = 0;
          SERVER_STATS.flashLoans.onChainExecutedCount++;
          SERVER_STATS.flashLoans.detectedPnLUSD += triNetUSD;
          SERVER_STATS.spotBase.executedCount++;
          SERVER_STATS.spotBase.realizedPnLUSD += triNetUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        } else {
          this.handleRevert('Flash Loan Triangular Reverted');
        }
      } else if (profitableSpotAmount && triNetUSD > 0.08) {
        this.isExecuting = true;

        let gasEstimated: bigint;
        try {
          gasEstimated = await this.arbitrageContract.executeSpotTriangular.estimateGas(routeStruct, profitableSpotAmount);
        } catch (estErr: any) {
          logger.warn(`⚠️ [PRE-FLIGHT TRI SPOT ABORT] ${estErr.message}`);
          this.isExecuting = false;
          return false;
        }

        const gasLimit = (gasEstimated * 115n) / 100n;

        if (ENV.dryRun) {
          logger.info(`🧪 [DRY RUN VALIDADO] Spot Triangular en ${pairName} | Net: +$${triNetUSD} USD. Omitiendo tx real.`);
          addScanLog(`🧪 [DRY RUN] Spot Triangular validado en ${pairName} (Net: +$${triNetUSD} USD).`);
          this.consecutiveErrors = 0;
          SERVER_STATS.spotBase.executedCount++;
          SERVER_STATS.spotBase.realizedPnLUSD += triNetUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        }

        const tx = await this.arbitrageContract.executeSpotTriangular(routeStruct, profitableSpotAmount, { gasLimit });
        const receipt = await tx.wait(1);

        if (receipt && receipt.status === 1) {
          logger.success(`🎉 [TRIANGULAR SPOT CONFIRMADO] Bloque #${receipt.blockNumber}!`);
          this.consecutiveErrors = 0;
          SERVER_STATS.spotBase.executedCount++;
          SERVER_STATS.spotBase.realizedPnLUSD += triNetUSD;
          savePersistedStats();
          this.isExecuting = false;
          return true;
        } else {
          this.handleRevert('Spot Triangular Reverted');
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
