import { logger } from '../utils/logger';

export interface PerpMarketFeed {
  symbol: string;
  protocol: 'HYPERLIQUID' | 'VERTEX' | 'GMX_V2' | 'AEVO';
  chainId: number;
  markPriceUSD: number;
  indexPriceUSD: number;
  spotDexPriceUSD: number;
  fundingRateHourly: number;
}

export interface PerpBasisOpportunity {
  id: string;
  symbol: string;
  protocol: string;
  chainId: number;
  spreadPercent: number;
  basisUSD: number;
  flashLoanRequiredUSD: number;
  estimatedGasUSD: number;
  netProfitUSD: number;
  isExecutable: boolean;
}

/**
 * Perp-DEX vs Spot-DEX Basis Arbitrage Scanner
 * Monitorea discrepancias entre el Mark/Index Price de Perpetuos (GMX V2, Vertex, Hyperliquid)
 * y el precio Spot de Uniswap/Camelot/Aerodrome para capturar spreads de base inmediatos.
 */
export class PerpBasisScanner {
  public evaluateBasisSpread(feed: PerpMarketFeed): PerpBasisOpportunity | null {
    const basisSpread = Math.abs(feed.markPriceUSD - feed.spotDexPriceUSD) / feed.spotDexPriceUSD;
    if (basisSpread <= 0.003) return null; // Requiere > 0.30% de discrepancia de base

    const tradeSizeUSD = 10000;
    const grossProfitUSD = tradeSizeUSD * basisSpread;
    const gasCostUSD = feed.chainId === 1 ? 6.0 : 0.09;
    const netProfitUSD = grossProfitUSD - gasCostUSD;

    if (netProfitUSD > 1.0) {
      return {
        id: `PERP-${Date.now()}-${feed.protocol}-${feed.symbol}`,
        symbol: feed.symbol,
        protocol: feed.protocol,
        chainId: feed.chainId,
        spreadPercent: Number((basisSpread * 100).toFixed(3)),
        basisUSD: Number(grossProfitUSD.toFixed(2)),
        flashLoanRequiredUSD: tradeSizeUSD,
        estimatedGasUSD: gasCostUSD,
        netProfitUSD: Number(netProfitUSD.toFixed(2)),
        isExecutable: true
      };
    }
    return null;
  }
}

export const perpBasisScanner = new PerpBasisScanner();
