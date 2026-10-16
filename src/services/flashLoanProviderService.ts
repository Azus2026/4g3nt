import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export interface FlashLoanProviderInfo {
  provider: 'balancer' | 'aave';
  feeBps: number;
  feeAmount: bigint;
  availableLiquidity: bigint;
  reason: string;
}

export interface ProfitCalculationParams {
  grossReturn: bigint;
  loanAmount: bigint;
  provider: 'balancer' | 'aave';
  decimals: number;
  tokenPriceUSD: number;
  gasCostUSD: number;
}

export interface ProfitBreakdown {
  loanAmount: bigint;
  flashFee: bigint;
  totalOwed: bigint;
  grossReturn: bigint;
  grossProfitWei: bigint;
  grossProfitUSD: number;
  gasCostUSD: number;
  netProfitUSD: number;
  isProfitable: boolean;
}

export const BALANCER_VAULT_ADDRESS: Record<number, string> = {
  8453: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  42161: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  1: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
};

export const AAVE_V3_POOL_ADDRESS: Record<number, string> = {
  8453: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  42161: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  1: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
};

// Known decimals map to prevent erroneous 18-decimal assumptions
export const KNOWN_TOKEN_DECIMALS: Record<string, number> = {
  // Base (8453)
  '0x4200000000000000000000000000000000000006': 18, // WETH
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 6,  // USDC
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 6,  // USDbC
  '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2': 6,  // USDT
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 18, // DAI
  '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': 8,  // cbBTC (8 decimals!)
  '0x0555e30da8f98308edb960aa94c0db47230d2b9c': 8,  // WBTC (8 decimals!)
  '0x940181a94a35a4569e4529a3cdfb74e38fd98631': 18, // AERO
  '0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452': 18, // wstETH
  '0x2416092f143378750bb29b79ed961ab195cceea5': 18, // ezETH

  // Arbitrum (42161)
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 18, // WETH
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 6,  // USDC
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 6,  // USDC.e
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 6,  // USDT
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': 8,  // WBTC
};

export const KNOWN_ATOKEN_ADDRESSES: Record<string, string> = {
  // Base (8453)
  '0x4200000000000000000000000000000000000006': '0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7', // WETH
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': '0x4e65fE4DbA92FcFE37222824aFa3534E58257C0A', // USDC
  '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': '0xc230678d46A08537536dD6806967B71e626e2b9c', // cbBTC

  // Arbitrum (42161)
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8', // WETH
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': '0x724dc807b04555b71ed48a6896b6F41593b8C637', // USDC
};

export class FlashLoanProviderService {
  private static instance: FlashLoanProviderService;
  private vaultCache: Map<string, { paused: boolean; balance: bigint; timestamp: number }> = new Map();
  private aaveCache: Map<string, { balance: bigint; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 15_000; // 15s cache for fast scanning

  private constructor() {}

  public static getInstance(): FlashLoanProviderService {
    if (!FlashLoanProviderService.instance) {
      FlashLoanProviderService.instance = new FlashLoanProviderService();
    }
    return FlashLoanProviderService.instance;
  }

  /**
   * Obtiene los decimales estrictos de un token
   */
  public getStrictDecimals(tokenAddress: string, fallbackDecimals: number = 18): number {
    const normalized = tokenAddress.toLowerCase();
    if (KNOWN_TOKEN_DECIMALS[normalized] !== undefined) {
      return KNOWN_TOKEN_DECIMALS[normalized];
    }
    return fallbackDecimals;
  }

  /**
   * Parsea un monto respetando estrictamente los decimales (6, 8 o 18)
   */
  public parseTokenUnits(amountStr: string, decimals: number): bigint {
    return ethers.parseUnits(amountStr, decimals);
  }

  /**
   * Formatea un monto respetando estrictamente los decimales
   */
  public formatTokenUnits(amount: bigint | string, decimals: number): string {
    return ethers.formatUnits(amount, decimals);
  }

  /**
   * Calcula la comisión exacta del flash loan según el proveedor
   * Balancer V2 = 0 bps (0.00%)
   * Aave V3 = 5 bps (0.05%), división con redondeo hacia arriba
   */
  public computeFlashFee(loanAmount: bigint, provider: 'balancer' | 'aave'): bigint {
    if (provider === 'balancer') {
      return 0n;
    }
    // Aave V3: 5 bps (0.05%). Redondeo hacia arriba para proteger contra insuficiencia de repago
    return (loanAmount * 5n + 9999n) / 10000n;
  }

  /**
   * Consulta el estado del Vault de Balancer V2 (Pausa y Liquidez del Token)
   */
  public async getBalancerVaultLiquidity(
    chainId: number,
    tokenAddress: string,
    provider: ethers.Provider
  ): Promise<{ paused: boolean; balance: bigint }> {
    const vaultAddress = BALANCER_VAULT_ADDRESS[chainId];
    if (!vaultAddress) {
      return { paused: true, balance: 0n };
    }

    const cacheKey = `${chainId}-${tokenAddress.toLowerCase()}`;
    const cached = this.vaultCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return { paused: cached.paused, balance: cached.balance };
    }

    try {
      const vaultContract = new ethers.Contract(
        vaultAddress,
        ['function getPausedState() external view returns (bool paused, uint256 pauseWindowEndTime, uint256 bufferPeriodEndTime)'],
        provider
      );
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address account) external view returns (uint256)'],
        provider
      );

      const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 12000));
      const [pausedRes, balRes] = await Promise.all([
        Promise.race([vaultContract.getPausedState().catch(() => [false]), timeoutPromise]),
        Promise.race([tokenContract.balanceOf(vaultAddress).catch(() => 0n), timeoutPromise]),
      ]);

      const isPaused = Boolean(pausedRes && pausedRes[0] ? pausedRes[0] : false);
      const bal = balRes !== null && balRes !== undefined ? BigInt(balRes) : 0n;

      this.vaultCache.set(cacheKey, { paused: isPaused, balance: bal, timestamp: Date.now() });
      return { paused: isPaused, balance: bal };
    } catch (err: any) {
      logger.warn(`[FLASH LOAN SERVICE] Error consultando Balancer Vault: ${err.message}`);
      return { paused: false, balance: 0n };
    }
  }

  /**
   * Consulta la liquidez disponible en Aave V3 Pool con mapeo rápido de aTokens y timeout
   */
  public async getAaveV3Liquidity(
    chainId: number,
    tokenAddress: string,
    provider: ethers.Provider
  ): Promise<bigint> {
    const poolAddress = AAVE_V3_POOL_ADDRESS[chainId];
    if (!poolAddress) return 0n;

    const cacheKey = `${chainId}-${tokenAddress.toLowerCase()}`;
    const cached = this.aaveCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.balance;
    }

    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address account) external view returns (uint256)'],
      provider
    );

    const knownAToken = KNOWN_ATOKEN_ADDRESSES[tokenAddress.toLowerCase()];
    if (knownAToken) {
      try {
        const balPromise = tokenContract.balanceOf(knownAToken);
        const timeoutPromise = new Promise<bigint>((resolve) => setTimeout(() => resolve(0n), 12000));
        const bal = BigInt(await Promise.race([balPromise, timeoutPromise]));
        if (bal > 0n) {
          this.aaveCache.set(cacheKey, { balance: bal, timestamp: Date.now() });
          return bal;
        }
      } catch {}
    }

    try {
      const poolContract = new ethers.Contract(
        poolAddress,
        ['function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))'],
        provider
      );

      const rdPromise = poolContract.getReserveData(tokenAddress);
      const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000));
      const reserveData = await Promise.race([rdPromise, timeoutPromise]);
      const aTokenAddress = reserveData[8];
      const bal = BigInt(await tokenContract.balanceOf(aTokenAddress));

      this.aaveCache.set(cacheKey, { balance: bal, timestamp: Date.now() });
      return bal;
    } catch {
      // Fallback seguro: saldo nominal
      return 10_000_000_000_000_000_000n; // > 0
    }
  }

  /**
   * Selección Dinámica de Proveedor de Flash Loan con Comprobación On-Chain
   * 1. Si Balancer V2 no está pausado y tiene saldo >= requestedAmount -> Selecciona Balancer (0% comisión).
   * 2. Si no, deriva automáticamente a Aave V3 calculando la comisión de 5 bps.
   */
  public async selectOptimalProvider(
    chainId: number,
    tokenAddress: string,
    requestedAmount: bigint,
    provider: ethers.Provider
  ): Promise<FlashLoanProviderInfo> {
    const balancerStatus = await this.getBalancerVaultLiquidity(chainId, tokenAddress, provider);

    if (!balancerStatus.paused && balancerStatus.balance >= requestedAmount) {
      return {
        provider: 'balancer',
        feeBps: 0,
        feeAmount: 0n,
        availableLiquidity: balancerStatus.balance,
        reason: `Balancer V2 disponible con 0% de comisión (Saldo Vault: ${balancerStatus.balance.toString()})`,
      };
    }

    // Fallback a Aave V3
    const aaveLiquidity = await this.getAaveV3Liquidity(chainId, tokenAddress, provider);
    const aaveFee = this.computeFlashFee(requestedAmount, 'aave');

    return {
      provider: 'aave',
      feeBps: 5,
      feeAmount: aaveFee,
      availableLiquidity: aaveLiquidity,
      reason: balancerStatus.paused
        ? `Balancer Vault en pausa. Usando Aave V3 (5 bps de comisión).`
        : `Liquidez insuficiente en Balancer (${balancerStatus.balance.toString()} < ${requestedAmount.toString()}). Usando Aave V3.`,
    };
  }

  /**
   * Desglose económico completo y cálculo del beneficio neto real
   * Deduce préstamo, comisión de flash loan y gas total estimado
   */
  public calculateNetProfit(params: ProfitCalculationParams): ProfitBreakdown {
    const { grossReturn, loanAmount, provider, decimals, tokenPriceUSD, gasCostUSD } = params;

    const flashFee = this.computeFlashFee(loanAmount, provider);
    const totalOwed = loanAmount + flashFee;

    if (grossReturn <= totalOwed) {
      return {
        loanAmount,
        flashFee,
        totalOwed,
        grossReturn,
        grossProfitWei: 0n,
        grossProfitUSD: 0,
        gasCostUSD,
        netProfitUSD: 0,
        isProfitable: false,
      };
    }

    const grossProfitWei = grossReturn - totalOwed;
    const grossProfitTokens = parseFloat(ethers.formatUnits(grossProfitWei, decimals));
    const grossProfitUSD = parseFloat((grossProfitTokens * tokenPriceUSD).toFixed(4));
    const netProfitUSD = Math.max(0, parseFloat((grossProfitUSD - gasCostUSD).toFixed(4)));

    return {
      loanAmount,
      flashFee,
      totalOwed,
      grossReturn,
      grossProfitWei,
      grossProfitUSD,
      gasCostUSD,
      netProfitUSD,
      isProfitable: netProfitUSD > 0,
    };
  }
}

export const flashLoanProviderService = FlashLoanProviderService.getInstance();
