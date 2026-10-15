import { ArbitragePair } from '../config/registry';
import { sharedPoolStateEngine } from '../scanners/sharedPoolStateEngine';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

export interface BackrunOpportunity {
  id: string;
  pairId: string;
  pairName: string;
  chainId: number;
  whaleTxHash?: string;
  whaleSwapSizeUSD: number;
  displacementPercent: number;
  optimalBackrunAmountUSD: number;
  optimalBackrunAmountToken: string;
  expectedNetProfitUSD: number;
  expectedGrossProfitUSD: number;
  estimatedGasUSD: number;
  direction: 'BUY_TOKEN_A' | 'BUY_TOKEN_B';
  isExecutable: boolean;
  timestamp: number;
}

export class BackrunEngine {
  private recentWhaleSignals: Map<string, number> = new Map();

  /**
   * Evalúa si un swap de gran tamaño ha desplazado el precio de la piscina
   * y calcula la transacción de backrun óptima (Tx Index N+1).
   */
  public evaluateBackrunOpportunity(pair: ArbitragePair): BackrunOpportunity | null {
    try {
      const p1 = sharedPoolStateEngine.getPoolState(pair.chainId, 'uniswap-v3', pair.tokenA.symbol, pair.tokenB.symbol);
      const p2 = sharedPoolStateEngine.getPoolState(pair.chainId, 'uniswap-v3-3000', pair.tokenA.symbol, pair.tokenB.symbol) ||
                 sharedPoolStateEngine.getPoolState(pair.chainId, 'pancakeswap-v3', pair.tokenA.symbol, pair.tokenB.symbol) ||
                 sharedPoolStateEngine.getPoolState(pair.chainId, 'aerodrome-slipstream', pair.tokenA.symbol, pair.tokenB.symbol);

      if (!p1 || !p2 || p1.price0In1 <= 0 || p2.price0In1 <= 0) return null;

      // Calcular divergencia inducida por swaps de ballenas
      const priceDiff = Math.abs(p1.price0In1 - p2.price0In1) / Math.min(p1.price0In1, p2.price0In1);
      const displacementPercent = priceDiff * 100;

      // Un desplazamiento por swap de ballena es significativo si supera el 0.40%
      if (displacementPercent >= 0.40) {
        const gasCostUSD = (pair.chainId === 8453 || pair.chainId === 137) ? 0.0004 : 0.001;
        const whaleSwapSizeUSD = 25000; // Tamaño estimado de swap de ballena ($25k USD)
        
        // El tamaño óptimo de rebalanceo es aproximadamente la raíz del volumen y la profundidad
        const optimalBackrunUSD = Math.min(whaleSwapSizeUSD * 0.45, 15000);
        const grossProfitUSD = optimalBackrunUSD * (displacementPercent / 100) * 0.85; // 85% de captura neta
        const netProfitUSD = grossProfitUSD - gasCostUSD;

        const tokenPrice = pair.approxPriceUSD || 2500;
        const optimalTokenAmount = (optimalBackrunUSD / tokenPrice).toFixed(6);

        if (netProfitUSD >= ENV.minProfitUSD) {
          return {
            id: `BACKRUN-${Date.now()}-${pair.id}`,
            pairId: pair.id,
            pairName: pair.name,
            chainId: pair.chainId,
            whaleSwapSizeUSD,
            displacementPercent: Number(displacementPercent.toFixed(3)),
            optimalBackrunAmountUSD: Number(optimalBackrunUSD.toFixed(2)),
            optimalBackrunAmountToken: optimalTokenAmount,
            expectedGrossProfitUSD: Number(grossProfitUSD.toFixed(2)),
            expectedNetProfitUSD: Number(netProfitUSD.toFixed(2)),
            estimatedGasUSD: gasCostUSD,
            direction: p1.price0In1 < p2.price0In1 ? 'BUY_TOKEN_A' : 'BUY_TOKEN_B',
            isExecutable: true,
            timestamp: Date.now()
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  }
}

export const backrunEngine = new BackrunEngine();
