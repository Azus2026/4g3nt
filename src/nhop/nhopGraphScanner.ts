import { TokenConfig } from '../config/registry';
import { sharedPoolStateEngine } from '../scanners/sharedPoolStateEngine';
import { logger } from '../utils/logger';

export interface NHopCyclePath {
  id: string;
  chainId: number;
  tokens: TokenConfig[];
  protocols: string[];
  approxLoanUSD: number;
  expectedGrossMargin: number;
}

export interface NHopOpportunity {
  id: string;
  cycleId: string;
  chainId: number;
  startToken: TokenConfig;
  pathTokens: TokenConfig[];
  protocols: string[];
  flashLoanAmount: string;
  netProfitUSD: number;
  grossProfitUSD: number;
  spreadPercent: number;
  estimatedGasUSD: number;
  isProfitable: boolean;
  hopCount: number;
}

/**
 * N-Hop Polygonal Graph Scanner
 * Motor de Detección de Ciclos Complejos de 4 a 6 Saltos (4-Hop, 5-Hop, 6-Hop).
 * Utiliza recorrido de grafos en memoria RAM para descubrir rutas poligonales de alto rendimiento.
 */
export class NHopGraphScanner {
  /**
   * Evalúa un ciclo poligonal N-Hop directamente en memoria RAM en sub-milisegundos
   */
  public evaluateNHopPath(path: NHopCyclePath): NHopOpportunity | null {
    if (!path.tokens || path.tokens.length < 4) return null;

    let currentAmountRatio = 1.0;
    const gasCostUSD = path.chainId === 1 ? 6.5 : 0.08;

    for (let i = 0; i < path.tokens.length; i++) {
      const tIn = path.tokens[i];
      const tOut = path.tokens[(i + 1) % path.tokens.length];
      const proto = path.protocols[i % path.protocols.length] || 'uniswap-v3';

      const poolState = sharedPoolStateEngine.getPoolState(path.chainId, proto, tIn.symbol, tOut.symbol);
      const price = poolState && poolState.price0In1 > 0 ? poolState.price0In1 : 1.0;
      
      // Aplicar comisión de DEX (0.05% a 0.3%)
      currentAmountRatio *= (price * 0.9975);
    }

    const netSpread = currentAmountRatio - 1.0;
    const grossProfitUSD = netSpread * path.approxLoanUSD;
    const netProfitUSD = grossProfitUSD - gasCostUSD;
    const isProfitable = netProfitUSD > 0.25 && netSpread > 0.0015;

    if (isProfitable) {
      return {
        id: `NHOP-${Date.now()}-${path.id}`,
        cycleId: path.id,
        chainId: path.chainId,
        startToken: path.tokens[0],
        pathTokens: path.tokens,
        protocols: path.protocols,
        flashLoanAmount: (path.approxLoanUSD / 2500).toFixed(6),
        netProfitUSD: Number(netProfitUSD.toFixed(2)),
        grossProfitUSD: Number(grossProfitUSD.toFixed(2)),
        spreadPercent: Number((netSpread * 100).toFixed(3)),
        estimatedGasUSD: gasCostUSD,
        isProfitable: true,
        hopCount: path.tokens.length
      };
    }

    return null;
  }
}

export const nhopGraphScanner = new NHopGraphScanner();
