/**
 * Sweet Spot Optimizer
 * Algoritmo Cuantitativo de Búsqueda Binaria para Dimensionamiento Óptimo de Préstamos Flash Loan.
 * Maximiza el PnL neto considerando el deslizamiento cuadrático (Price Impact) en pools V3/V2.
 */

export interface SweetSpotResult {
  optimalLoanAmount: string;
  optimalLoanUSD: number;
  expectedGrossProfitUSD: number;
  expectedNetProfitUSD: number;
  priceImpactPercent: number;
  sweetSpotRatio: number;
  isViable: boolean;
}

export class SweetSpotOptimizer {
  /**
   * Calcula el monto óptimo de Flash Loan usando búsqueda ternaria/binaria en la curva de rendimiento convexo.
   * 
   * @param baseAmountUSD Monto de referencia inicial en USD
   * @param spread Fracción de desbalance de precio (ej. 0.0035 = 0.35%)
   * @param liquidityScore Puntuación de liquidez o unidades de liquidez activa
   * @param gasCostUSD Coste estimado de gas en USD
    * @param tokenPriceUSD Precio del token en USD
    * @param flashLoanFeeRate Tasa del flash loan (0 para Balancer, 0.0005 para Aave)
    * @param minProfitThreshold Umbral de ganancia neta mínima en USD
    */
  public static calculateOptimalLoan(
    baseAmountUSD: number,
    spread: number,
    liquidityScore: number = 1.0,
    gasCostUSD: number = 0.05,
    tokenPriceUSD: number = 2500,
    flashLoanFeeRate: number = 0.0,
    minProfitThreshold: number = 0.005
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

    // Coeficiente de impacto de precio calibrado según liquidez real en USD:
    // Para una pool de $500,000 USD de profundidad, k = 1 / 500,000 = 2e-6
    const poolLiquidityUSD = Math.max(liquidityScore * tokenPriceUSD, 50000);
    const k = 0.5 / poolLiquidityUSD;

    // Función de Beneficio Neto: P(x) = x * (spread - k * x - flashLoanFeeRate) - gasCostUSD
    // Derivada dP/dx = spread - 2*k*x - flashLoanFeeRate = 0  =>  x* = (spread - flashLoanFeeRate) / (2 * k)
    const effectiveSpread = spread - flashLoanFeeRate;
    let optimalLoanUSD = baseAmountUSD;

    if (effectiveSpread > 0 && k > 0) {
      const theoreticalOptimalUSD = effectiveSpread / (2 * k);
      
      // Límites de seguridad: mínimo $500 USD, máximo 10% de la liquidez de la pool (máx $100,000 USD)
      const maxSafeLoan = Math.min(poolLiquidityUSD * 0.10, 100000);
      optimalLoanUSD = Math.max(200, Math.min(theoreticalOptimalUSD, maxSafeLoan));
    }

    // Búsqueda de refinamiento local (Golden Section / Binary Search)
    let low = optimalLoanUSD * 0.5;
    let high = optimalLoanUSD * 1.5;
    let bestLoanUSD = optimalLoanUSD;
    let maxNetProfit = -Infinity;

    for (let iter = 0; iter < 12; iter++) {
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
}
