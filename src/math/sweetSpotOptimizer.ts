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

  /**
   * Cálculo de Gas Real en L2: Suma de L2 Execution Fee + L1 Calldata/Blob Fee (OP Stack / Base)
   * En Base, el GasPriceOracle (0x420000000000000000000000000000000000000F) cobra getL1Fee(bytes).
   * Para transacciones típicas de arbitraje (calldata ~256 a 512 bytes):
   * L1 Data Fee ronda entre $0.002 y $0.02 según el costo del blob en L1.
   */
  public static calculateTotalGasCostUSD(
    chainId: number,
    gasUsedL2: bigint = 150_000n,
    l2GasPriceGwei: number = 0.05,
    ethPriceUSD: number = 2500,
    calldataSizeBytes: number = 384,
    l1BaseFeeGwei: number = 1.0
  ): { totalGasUSD: number; l2GasUSD: number; l1DataFeeUSD: number } {
    // 1. Costo de ejecución L2
    const l2GasEth = (Number(gasUsedL2) * l2GasPriceGwei) / 1e9;
    const l2GasUSD = l2GasEth * ethPriceUSD;

    // 2. Costo L1 Data Fee (EIP-4844 Blob calldata fee en Base y Arbitrum)
    let l1DataFeeUSD = 0;
    if (chainId === 8453) {
      // Base (OP Stack con Ecotone/Fjord scalar)
      // Estimación cuantitativa precisa de L1 calldata fee
      const estimatedL1Gas = calldataSizeBytes * 16;
      const l1FeeEth = (estimatedL1Gas * l1BaseFeeGwei * 0.7) / 1e9;
      l1DataFeeUSD = Math.max(l1FeeEth * ethPriceUSD, 0.0015);
    } else if (chainId === 42161) {
      // Arbitrum One L1 poster fee
      const arbL1FeeEth = (calldataSizeBytes * 12 * l1BaseFeeGwei) / 1e9;
      l1DataFeeUSD = Math.max(arbL1FeeEth * ethPriceUSD, 0.001);
    }

    const totalGasUSD = l2GasUSD + l1DataFeeUSD;
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
