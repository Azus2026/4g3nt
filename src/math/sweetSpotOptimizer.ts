import { ArbitragePair } from '../config/registry';
import { ArbitrageOpportunity } from '../protocolink/protocolinkClient';

export interface SweetSpotResult {
  optimalLoanAmount: string;
  optimalLoanUSD: number;
  expectedGrossProfitUSD: number;
  expectedNetProfitUSD: number;
  priceImpactPercent: number;
  sweetSpotRatio: number;
  isViable: boolean;
  l1DataFeeUSD?: number;
  l2ExecutionGasUSD?: number;
}

export class SweetSpotOptimizer {
  private static PHI = (1 + Math.sqrt(5)) / 2; // Golden Ratio (~1.6180339887)
  private static RES_PHI = 2 - SweetSpotOptimizer.PHI; // (~0.3819660113)

  // Live L1 Fee Cache (EIP-4844 Blobs & BaseFee)
  public static liveL1BaseFeeBase: bigint = 62000000n; // ~0.062 gwei in wei
  public static liveBlobBaseFeeBase: bigint = 3800000n; // ~0.0038 gwei in wei
  public static liveBaseFeeScalarBase: number = 2269;
  public static liveBlobBaseFeeScalarBase: number = 1055762;
  public static liveL1BaseFeeArb: bigint = 1200000n; // ~0.0012 gwei in wei
  public static lastL1UpdateTimestamp: number = 0;
  private static isUpdatingL1Fees: boolean = false;

  /**
   * Actualiza los parámetros en tiempo real de L1 Data Fee desde los oráculos oficiales on-chain:
   * - Base: GasPriceOracle en 0x420000000000000000000000000000000000000F
   * - Arbitrum: ArbGasInfo precompile en 0x000000000000000000000000000000000000006C
   */
  public static async updateL1GasFees(providerBase?: any, providerArb?: any): Promise<void> {
    if (this.isUpdatingL1Fees) return;
    this.isUpdatingL1Fees = true;

    try {
      // 1. Base GasPriceOracle
      if (providerBase) {
        try {
          const oracleAbi = [
            'function l1BaseFee() view returns (uint256)',
            'function blobBaseFee() view returns (uint256)',
            'function baseFeeScalar() view returns (uint32)',
            'function blobBaseFeeScalar() view returns (uint32)'
          ];
          const oracle = new (providerBase.constructor as any) ? (providerBase as any) : null;
          // Si providerBase es un JsonRpcProvider o similar
          const ethersModule = await import('ethers');
          const contract = new ethersModule.Contract('0x420000000000000000000000000000000000000F', oracleAbi, providerBase);
          const [l1BaseFee, blobBaseFee, baseFeeScalar, blobBaseFeeScalar] = await Promise.all([
            contract.l1BaseFee().catch(() => null),
            contract.blobBaseFee().catch(() => null),
            contract.baseFeeScalar().catch(() => null),
            contract.blobBaseFeeScalar().catch(() => null)
          ]);

          if (l1BaseFee != null) this.liveL1BaseFeeBase = BigInt(l1BaseFee);
          if (blobBaseFee != null) this.liveBlobBaseFeeBase = BigInt(blobBaseFee);
          if (baseFeeScalar != null) this.liveBaseFeeScalarBase = Number(baseFeeScalar);
          if (blobBaseFeeScalar != null) this.liveBlobBaseFeeScalarBase = Number(blobBaseFeeScalar);
        } catch {}
      }

      // 2. Arbitrum ArbGasInfo
      if (providerArb) {
        try {
          const arbAbi = ['function getL1BaseFeeEstimate() view returns (uint256)'];
          const ethersModule = await import('ethers');
          const arbContract = new ethersModule.Contract('0x000000000000000000000000000000000000006C', arbAbi, providerArb);
          const arbL1Fee = await arbContract.getL1BaseFeeEstimate().catch(() => null);
          if (arbL1Fee != null) this.liveL1BaseFeeArb = BigInt(arbL1Fee);
        } catch {}
      }

      this.lastL1UpdateTimestamp = Date.now();
    } catch {} finally {
      this.isUpdatingL1Fees = false;
    }
  }

  /**
   * Cálculo de Gas Real en L2: Suma de L2 Execution Fee + L1 Calldata/Blob Fee (OP Stack / Arbitrum Nitro)
   * Integra la fórmula EIP-4844 Fjord de Base y ArbGasInfo en Arbitrum.
   */
  public static calculateTotalGasCostUSD(
    chainId: number,
    gasUsedL2: bigint = 150_000n,
    l2GasPriceGwei: number = 0.05,
    ethPriceUSD: number = 2500,
    calldataSizeBytes: number = 384,
    l1BaseFeeGweiOverride?: number
  ): { totalGasUSD: number; l2GasUSD: number; l1DataFeeUSD: number } {
    // 1. Costo de ejecución L2
    const l2GasEth = (Number(gasUsedL2) * l2GasPriceGwei) / 1e9;
    const l2GasUSD = l2GasEth * ethPriceUSD;

    // 2. Costo L1 Data Fee Dinámico (EIP-4844 Blobs + Calldata)
    let l1DataFeeUSD = 0;

    if (chainId === 8453) {
      // Base (OP Stack Fjord / Ecotone scalar con Blobs)
      // Fórmula oficial: l1Fee = (16 * calldataSize * l1BaseFee * baseFeeScalar + calldataSize * blobBaseFee * blobBaseFeeScalar) / (1e6 * 1e9 * 1e9)
      const calldataBig = BigInt(calldataSizeBytes);
      const l1BaseFee = l1BaseFeeGweiOverride != null ? BigInt(Math.round(l1BaseFeeGweiOverride * 1e9)) : this.liveL1BaseFeeBase;
      const blobBaseFee = this.liveBlobBaseFeeBase;

      const basePortion = 16n * calldataBig * l1BaseFee * BigInt(this.liveBaseFeeScalarBase);
      const blobPortion = calldataBig * blobBaseFee * BigInt(this.liveBlobBaseFeeScalarBase);
      const totalL1Wei = (basePortion + blobPortion) / 1000000n; // scalar divisor es 1e6

      const l1FeeEth = Number(totalL1Wei) / 1e18;
      l1DataFeeUSD = Math.max(l1FeeEth * ethPriceUSD, 0.0005);
    } else if (chainId === 42161) {
      // Arbitrum One Nitro L1 calldata poster fee
      const l1BaseFeeWei = l1BaseFeeGweiOverride != null ? BigInt(Math.round(l1BaseFeeGweiOverride * 1e9)) : this.liveL1BaseFeeArb;
      const arbL1FeeWei = BigInt(calldataSizeBytes) * 16n * l1BaseFeeWei;
      const l1FeeEth = Number(arbL1FeeWei) / 1e18;
      l1DataFeeUSD = Math.max(l1FeeEth * ethPriceUSD, 0.0005);
    }

    const totalGasUSD = parseFloat((l2GasUSD + l1DataFeeUSD).toFixed(5));
    return { totalGasUSD, l2GasUSD, l1DataFeeUSD };
  }

  /**
   * Fórmula Analítica Cerrada para Pools Constant Product (x * y = k)
   * Resuelve d(Beneficio)/dL = 0
   */
  static calculateAnalyticalOptimalLoan(
    x1: number,
    y1: number,
    gamma1: number,
    x2: number,
    y2: number,
    gamma2: number
  ): number {
    const numerator = Math.sqrt(x1 * x2 * y1 * y2 * gamma1 * gamma2) - (x1 * y2);
    const denominator = (gamma1 * y2) + (x2 * gamma1 * gamma2);
    if (denominator <= 0 || numerator <= 0) return 0;
    return numerator / denominator;
  }

  /**
   * Calcula el monto óptimo de Flash Loan usando búsqueda ternaria/convexa en memoria RAM (< 0.1ms).
   * Integra el costo real de L1 Data Fee para que nunca apruebe operaciones con margen negativo.
   */
  public static calculateOptimalLoan(
    baseAmountUSD: number,
    spread: number,
    liquidityScore: number = 1.0,
    gasCostUSD: number = 0.05,
    tokenPriceUSD: number = 2500,
    flashLoanFeeRate: number = 0.0, // 0.0 para Balancer/Morpho, 0.0005 para Aave
    minProfitThreshold: number = 0.005,
    chainId: number = 8453
  ): SweetSpotResult {
    // Si no hay spread positivo suficiente para cubrir el gas, no es viable
    if (spread <= 0.0002) {
      return {
        optimalLoanAmount: (baseAmountUSD / tokenPriceUSD).toFixed(6),
        optimalLoanUSD: baseAmountUSD,
        expectedGrossProfitUSD: 0,
        expectedNetProfitUSD: -gasCostUSD,
        priceImpactPercent: 0,
        sweetSpotRatio: 1.0,
        isViable: false
      };
    }

    // Coeficiente de impacto de precio calibrado según liquidez real en USD
    const poolLiquidityUSD = Math.max(liquidityScore * tokenPriceUSD, 50000);
    const k = 0.5 / poolLiquidityUSD;

    // Función de Beneficio Neto: P(x) = x * (spread - k * x - flashLoanFeeRate) - gasCostUSD
    const effectiveSpread = spread - flashLoanFeeRate;
    let optimalLoanUSD = baseAmountUSD;

    if (effectiveSpread > 0 && k > 0) {
      const theoreticalOptimalUSD = effectiveSpread / (2 * k);
      const maxSafeLoan = Math.min(poolLiquidityUSD * 0.10, 100000);
      optimalLoanUSD = Math.max(200, Math.min(theoreticalOptimalUSD, maxSafeLoan));
    }

    // Búsqueda de refinamiento local (Ternary Search)
    let low = optimalLoanUSD * 0.5;
    let high = optimalLoanUSD * 1.5;
    let bestLoanUSD = optimalLoanUSD;
    let maxNetProfit = -Infinity;

    for (let iter = 0; iter < 10; iter++) {
      const mid1 = low + (high - low) / 3;
      const mid2 = high - (high - low) / 3;

      const pnl1 = this.evaluatePnL(mid1, spread, k, flashLoanFeeRate, gasCostUSD);
      const pnl2 = this.evaluatePnL(mid2, spread, k, flashLoanFeeRate, gasCostUSD);

      if (pnl1 < pnl2) {
        low = mid1;
        bestLoanUSD = mid2;
        maxNetProfit = pnl2;
      } else {
        high = mid2;
        bestLoanUSD = mid1;
        maxNetProfit = pnl1;
      }
    }

    const priceImpact = (k * bestLoanUSD) * 100;
    const grossProfit = bestLoanUSD * Math.max(0, spread - (k * bestLoanUSD) - flashLoanFeeRate);
    const netProfit = grossProfit - gasCostUSD;
    const optimalAmountToken = (bestLoanUSD / Math.max(tokenPriceUSD, 0.000001)).toFixed(6);
    const sweetSpotRatio = bestLoanUSD / Math.max(baseAmountUSD, 1);

    return {
      optimalLoanAmount: optimalAmountToken,
      optimalLoanUSD: Math.round(bestLoanUSD),
      expectedGrossProfitUSD: Number(grossProfit.toFixed(2)),
      expectedNetProfitUSD: Number(netProfit.toFixed(2)),
      priceImpactPercent: Number(priceImpact.toFixed(4)),
      sweetSpotRatio: Number(sweetSpotRatio.toFixed(2)),
      isViable: netProfit >= minProfitThreshold && priceImpact < 1.5
    };
  }

  private static evaluatePnL(
    loanUSD: number,
    spread: number,
    k: number,
    feeRate: number,
    gasCostUSD: number
  ): number {
    const netMargin = spread - (k * loanUSD) - feeRate;
    if (netMargin <= 0) return -gasCostUSD;
    return (loanUSD * netMargin) - gasCostUSD;
  }

  /**
   * Búsqueda por Sección Áurea (Golden Section Search) para funciones evaluadoras asíncronas
   */
  static async findOptimalLoan(
    pair: ArbitragePair,
    evaluateFn: (amountStr: string) => Promise<ArbitrageOpportunity | null>
  ): Promise<ArbitrageOpportunity | null> {
    const baseAmount = parseFloat(pair.defaultLoanAmount);
    if (baseAmount <= 0) return null;

    const probeMultipliers = [0.5, 1.0, 2.5, 5.0];
    const probePromises = probeMultipliers.map(async (m) => {
      const amt = (baseAmount * m).toFixed(6);
      const opp = await evaluateFn(amt).catch(() => null);
      return { multiplier: m, amountStr: amt, opp };
    });

    const probeResults = await Promise.all(probePromises);
    const validProbes = probeResults.filter((p): p is { multiplier: number; amountStr: string; opp: ArbitrageOpportunity } => p.opp !== null);

    if (validProbes.length === 0) return null;

    validProbes.sort((a, b) => b.opp.netProfitUSD - a.opp.netProfitUSD);
    const bestInitial = validProbes[0];

    if (bestInitial.opp.netProfitUSD <= 0) {
      return bestInitial.opp;
    }

    let a = Math.max(0.1, bestInitial.multiplier * 0.6);
    let b = bestInitial.multiplier * 1.5;
    const tolerance = 0.05;

    let c = b - (b - a) * this.RES_PHI;
    let d = a + (b - a) * this.RES_PHI;

    let oppC = await evaluateFn((baseAmount * c).toFixed(6)).catch(() => null);
    let oppD = await evaluateFn((baseAmount * d).toFixed(6)).catch(() => null);

    let profitC = oppC ? oppC.netProfitUSD : -Infinity;
    let profitD = oppD ? oppD.netProfitUSD : -Infinity;

    for (let i = 0; i < 4; i++) {
      if (Math.abs(b - a) < tolerance) break;

      if (profitC > profitD) {
        b = d;
        d = c;
        profitD = profitC;
        oppD = oppC;
        c = b - (b - a) * this.RES_PHI;
        oppC = await evaluateFn((baseAmount * c).toFixed(6)).catch(() => null);
        profitC = oppC ? oppC.netProfitUSD : -Infinity;
      } else {
        a = c;
        c = d;
        profitC = profitD;
        oppC = oppD;
        d = a + (b - a) * this.RES_PHI;
        oppD = await evaluateFn((baseAmount * d).toFixed(6)).catch(() => null);
        profitD = oppD ? oppD.netProfitUSD : -Infinity;
      }
    }

    const finalMultiplier = (a + b) / 2;
    const finalAmountStr = (baseAmount * finalMultiplier).toFixed(6);
    const finalOpp = await evaluateFn(finalAmountStr).catch(() => null);

    if (finalOpp && finalOpp.netProfitUSD > bestInitial.opp.netProfitUSD) {
      finalOpp.sweetSpotRatio = finalMultiplier;
      return finalOpp;
    }

    bestInitial.opp.sweetSpotRatio = bestInitial.multiplier;
    return bestInitial.opp;
  }
}
