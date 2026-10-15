import { sharedPoolStateEngine } from './sharedPoolStateEngine';
import { ArbitragePair } from '../config/registry';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

export interface TriangularRoute {
  id: string;
  name: string;
  chainId: number;
  tokenA: string;
  tokenB: string;
  tokenC: string;
  feeAB: number;
  feeBC: number;
  feeCA: number;
  protocol: string;
  defaultLoanUSD: number;
}

export interface TriangularOpportunity {
  isViable: boolean;
  routeId: string;
  name: string;
  chainId: number;
  tokenBorrow: string;
  inputAmount: string;
  estimatedOutput: string;
  grossProfitUSD: number;
  netProfitUSD: number;
  spreadPercent: number;
  netSpreadPercent: number;
  estimatedGasUSD: number;
  timestamp: number;
}

export class TriangularArbitrageEngine {
  private routes: TriangularRoute[] = [
    // === ARBITRUM (42161) ===
    {
      id: 'ARB-TRI-WETH-ARB-USDC',
      name: 'Triangular: WETH -> ARB -> USDC -> WETH (Arbitrum)',
      chainId: 42161,
      tokenA: 'WETH',
      tokenB: 'ARB',
      tokenC: 'USDC',
      feeAB: 500, // 0.05%
      feeBC: 500, // 0.05%
      feeCA: 500, // 0.05%
      protocol: 'uniswap-v3',
      defaultLoanUSD: 10000
    },
    {
      id: 'ARB-TRI-WETH-USDC-ARB',
      name: 'Triangular: WETH -> USDC -> ARB -> WETH (Arbitrum)',
      chainId: 42161,
      tokenA: 'WETH',
      tokenB: 'USDC',
      tokenC: 'ARB',
      feeAB: 500,
      feeBC: 500,
      feeCA: 500,
      protocol: 'uniswap-v3',
      defaultLoanUSD: 10000
    },
    {
      id: 'ARB-TRI-WETH-LINK-USDC',
      name: 'Triangular: WETH -> LINK -> USDC -> WETH (Arbitrum)',
      chainId: 42161,
      tokenA: 'WETH',
      tokenB: 'LINK',
      tokenC: 'USDC',
      feeAB: 3000,
      feeBC: 500,
      feeCA: 500,
      protocol: 'uniswap-v3',
      defaultLoanUSD: 10000
    },

    // === BASE (8453) ===
    {
      id: 'BASE-TRI-WETH-AERO-USDC',
      name: 'Triangular: WETH -> AERO -> USDC -> WETH (Base)',
      chainId: 8453,
      tokenA: 'WETH',
      tokenB: 'AERO',
      tokenC: 'USDC',
      feeAB: 500,
      feeBC: 500,
      feeCA: 500,
      protocol: 'uniswap-v3',
      defaultLoanUSD: 8000
    },
    {
      id: 'BASE-TRI-WETH-USDC-AERO',
      name: 'Triangular: WETH -> USDC -> AERO -> WETH (Base)',
      chainId: 8453,
      tokenA: 'WETH',
      tokenB: 'USDC',
      tokenC: 'AERO',
      feeAB: 500,
      feeBC: 500,
      feeCA: 500,
      protocol: 'uniswap-v3',
      defaultLoanUSD: 8000
    },
    {
      id: 'BASE-TRI-WETH-DEGEN-USDC',
      name: 'Triangular: WETH -> DEGEN -> USDC -> WETH (Base)',
      chainId: 8453,
      tokenA: 'WETH',
      tokenB: 'DEGEN',
      tokenC: 'USDC',
      feeAB: 3000,
      feeBC: 3000,
      feeCA: 500,
      protocol: 'uniswap-v3',
      defaultLoanUSD: 5000
    }
  ];

  /**
   * Evalúa una ruta triangular completa calculando el producto cruzado de tasas
   */
  evaluateTriangularRoute(route: TriangularRoute): TriangularOpportunity | null {
    try {
      const pAB = sharedPoolStateEngine.getPoolState(route.chainId, route.protocol, route.tokenA, route.tokenB);
      const pBC = sharedPoolStateEngine.getPoolState(route.chainId, route.protocol, route.tokenB, route.tokenC);
      const pCA = sharedPoolStateEngine.getPoolState(route.chainId, route.protocol, route.tokenC, route.tokenA);

      if (!pAB || !pBC || !pCA || pAB.price0In1 <= 0 || pBC.price0In1 <= 0 || pCA.price0In1 <= 0) {
        return null;
      }

      // Descuento de comisiones por cada salto (ej: 0.05% = 0.0005)
      const feeFactorAB = 1 - (route.feeAB / 1000000);
      const feeFactorBC = 1 - (route.feeBC / 1000000);
      const feeFactorCA = 1 - (route.feeCA / 1000000);

      // Multiplicador de retorno cíclico neto
      const grossMultiplier = pAB.price0In1 * pBC.price0In1 * pCA.price0In1;
      const netMultiplier = grossMultiplier * feeFactorAB * feeFactorBC * feeFactorCA;

      const spreadPercent = (grossMultiplier - 1) * 100;
      const netSpreadPercent = (netMultiplier - 1) * 100;

      const gasCostUSD = route.chainId === 8453 ? 0.0004 : 0.0009;
      const loanUSD = route.defaultLoanUSD;
      const grossProfitUSD = loanUSD * (grossMultiplier - 1);
      const netProfitUSD = (loanUSD * (netMultiplier - 1)) - gasCostUSD;

      const isViable = netProfitUSD >= ENV.minProfitUSD && netSpreadPercent > 0.03;

      return {
        isViable,
        routeId: route.id,
        name: route.name,
        chainId: route.chainId,
        tokenBorrow: route.tokenA,
        inputAmount: (loanUSD / 2500).toFixed(6),
        estimatedOutput: ((loanUSD * netMultiplier) / 2500).toFixed(6),
        grossProfitUSD: Number(grossProfitUSD.toFixed(4)),
        netProfitUSD: Number(netProfitUSD.toFixed(4)),
        spreadPercent: Number(spreadPercent.toFixed(4)),
        netSpreadPercent: Number(netSpreadPercent.toFixed(4)),
        estimatedGasUSD: gasCostUSD,
        timestamp: Date.now()
      };
    } catch {
      return null;
    }
  }

  /**
   * Evalúa la mejor ruta triangular para un par dado
   */
  evaluatePairTriangular(pair: ArbitragePair): TriangularOpportunity | null {
    const matchingRoutes = this.routes.filter(r => r.chainId === pair.chainId && (r.tokenA === pair.tokenA.symbol || r.tokenB === pair.tokenA.symbol));
    for (const route of matchingRoutes) {
      const opp = this.evaluateTriangularRoute(route);
      if (opp && opp.isViable) return opp;
    }
    return null;
  }

  getAllRoutes(): TriangularRoute[] {
    return this.routes;
  }
}

export const triangularArbitrageEngine = new TriangularArbitrageEngine();
