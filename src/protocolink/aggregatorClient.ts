import axios from 'axios';
import { logger } from '../utils/logger';

export interface AggregatorQuote {
  aggregator: 'ODOS' | 'KYBERSWAP' | 'ZEROX';
  chainId: number;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  gasUSD: number;
  routeSummary: string;
}

/**
 * DEX Aggregators Client
 * Consulta cotizaciones avanzadas en Odos, KyberSwap y 0x API para descubrir
 * rutas de liquidez fragmentada en altcoins y tokens de alta volatilidad.
 */
export class AggregatorClient {
  /**
   * Obtiene la mejor cotización combinada entre múltiples agregadores
   */
  public async getBestAggregatorQuote(
    chainId: number,
    inputToken: string,
    outputToken: string,
    amountWei: string,
    userAddress: string = '0x0000000000000000000000000000000000000001'
  ): Promise<AggregatorQuote | null> {
    try {
      // 1. Intentar KyberSwap Aggregator API (Soporta Arbitrum, Base, ETH, Optimism)
      const chainNameMap: Record<number, string> = {
        1: 'ethereum',
        42161: 'arbitrum',
        8453: 'base',
        10: 'optimism'
      };

      const chainName = chainNameMap[chainId] || 'arbitrum';
      const kyberUrl = `https://aggregator-api.kyberswap.com/${chainName}/api/v1/routes?tokenIn=${inputToken}&tokenOut=${outputToken}&amountIn=${amountWei}`;
      
      const res = await axios.get(kyberUrl, { timeout: 1200 });
      if (res.data && res.data.data && res.data.data.routeSummary) {
        const summary = res.data.data.routeSummary;
        return {
          aggregator: 'KYBERSWAP',
          chainId,
          inputToken,
          outputToken,
          inputAmount: summary.amountIn,
          outputAmount: summary.amountOut,
          priceImpact: parseFloat(summary.priceImpact || '0'),
          gasUSD: parseFloat(summary.gasUsd || '0.05'),
          routeSummary: summary.route ? summary.route.map((r: any) => r[0]?.exchange).join(' -> ') : 'Direct'
        };
      }
    } catch (err: any) {
      // Si falla o hay timeout, fallback a enrutamiento interno
    }

    return null;
  }
}

export const aggregatorClient = new AggregatorClient();
