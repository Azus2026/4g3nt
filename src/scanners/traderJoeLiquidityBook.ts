import { logger } from '../utils/logger';

export interface LiquidityBookPool {
  poolAddress: string;
  chainId: number;
  pairName: string;
  activeBinId: number;
  binStep: number;
  binPriceUSD: number;
  uniswapPriceUSD: number;
}

export interface LiquidityBookOpportunity {
  id: string;
  pairName: string;
  chainId: number;
  binPriceUSD: number;
  uniswapPriceUSD: number;
  spreadPercent: number;
  netProfitUSD: number;
  isExecutable: boolean;
}

/**
 * Trader Joe V2.1 Liquidity Book (Bin-Step) Scanner
 * Analiza órdenes en bins discretos de cero slippage en Avalanche y Arbitrum
 * comparándolos contra AMMs tradicionales con curvatura de precio.
 */
export class TraderJoeLiquidityBookScanner {
  public evaluateBinSpread(pool: LiquidityBookPool): LiquidityBookOpportunity | null {
    const spread = Math.abs(pool.binPriceUSD - pool.uniswapPriceUSD) / pool.uniswapPriceUSD;
    if (spread <= 0.0025) return null;

    const tradeSizeUSD = 6000;
    const grossProfitUSD = tradeSizeUSD * spread;
    const gasCostUSD = pool.chainId === 43114 ? 0.04 : 0.07;
    const netProfitUSD = grossProfitUSD - gasCostUSD;

    if (netProfitUSD > 0.4) {
      return {
        id: `JOE-BIN-${Date.now()}-${pool.pairName}`,
        pairName: pool.pairName,
        chainId: pool.chainId,
        binPriceUSD: pool.binPriceUSD,
        uniswapPriceUSD: pool.uniswapPriceUSD,
        spreadPercent: Number((spread * 100).toFixed(3)),
        netProfitUSD: Number(netProfitUSD.toFixed(2)),
        isExecutable: true
      };
    }
    return null;
  }
}

export const traderJoeLiquidityBookScanner = new TraderJoeLiquidityBookScanner();
