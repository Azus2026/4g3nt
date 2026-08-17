import { ArbitragePair } from '../config/registry';
import { ArbitrageOpportunity } from '../protocolink/protocolinkClient';

export interface SweetSpotResult {
  optimalLoanAmount: string;
  optimalMultiplier: number;
  expectedNetProfitUSD: number;
  marginalEfficiency: number; // Retorno marginal ($ beneficio por cada $ prestado adicional)
  priceImpactPercent: number;
}

export class SweetSpotOptimizer {
  private static PHI = (1 + Math.sqrt(5)) / 2; // Golden Ratio (~1.6180339887)
  private static RES_PHI = 2 - SweetSpotOptimizer.PHI; // (~0.3819660113)

  /**
   * Fórmula Analítica Cerrada para Pools Constant Product (x * y = k)
   * Resuelve d(Beneficio)/dL = 0
   * @param x1 Reserva Token In en DEX 1
   * @param y1 Reserva Token Out en DEX 1
   * @param gamma1 (1 - fee1), ej: 0.997 para 0.3%
   * @param x2 Reserva Token In en DEX 2
   * @param y2 Reserva Token Out en DEX 2
   * @param gamma2 (1 - fee2)
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
   * Búsqueda por Sección Áurea (Golden Section Search) & Gradiente Numérico
   * Encuentra el tamaño exacto del flash loan que maximiza el beneficio neto
   */
  static async findOptimalLoan(
    pair: ArbitragePair,
    evaluateFn: (amountStr: string) => Promise<ArbitrageOpportunity | null>
  ): Promise<ArbitrageOpportunity | null> {
    const baseAmount = parseFloat(pair.defaultLoanAmount);
    if (baseAmount <= 0) return null;

    // 1. Prospección inicial en puntos de rejilla logarítmicos
    const probeMultipliers = [0.25, 0.5, 1.0, 2.0, 3.5, 5.0];
    const probePromises = probeMultipliers.map(async (m) => {
      const amt = (baseAmount * m).toFixed(6);
      const opp = await evaluateFn(amt).catch(() => null);
      return { multiplier: m, amountStr: amt, opp };
    });

    const probeResults = await Promise.all(probePromises);
    const validProbes = probeResults.filter((p): p is { multiplier: number; amountStr: string; opp: ArbitrageOpportunity } => p.opp !== null);

    if (validProbes.length === 0) return null;

    // Ordenar por beneficio neto USD descendente
    validProbes.sort((a, b) => b.opp.netProfitUSD - a.opp.netProfitUSD);
    const bestInitial = validProbes[0];

    // Si la mejor oportunidad no es rentable, retornarla como referencia
    if (bestInitial.opp.netProfitUSD <= 0) {
      return bestInitial.opp;
    }

    // 2. Refinamiento fino mediante Sección Áurea alrededor del mejor multiplicador
    let a = Math.max(0.1, bestInitial.multiplier * 0.6);
    let b = bestInitial.multiplier * 1.5;
    const tolerance = 0.05; // 5% de precisión en el multiplicador

    let c = b - (b - a) * this.RES_PHI;
    let d = a + (b - a) * this.RES_PHI;

    let oppC = await evaluateFn((baseAmount * c).toFixed(6)).catch(() => null);
    let oppD = await evaluateFn((baseAmount * d).toFixed(6)).catch(() => null);

    let profitC = oppC ? oppC.netProfitUSD : -Infinity;
    let profitD = oppD ? oppD.netProfitUSD : -Infinity;

    // Iterar hasta convergencia áurea (máximo 4 iteraciones para baja latencia < 30ms)
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
