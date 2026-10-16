import { multicallBatchScanner, PoolCallItem, PoolStateResult } from './multicallBatchScanner';
import { poolRegistry1000 } from '../config/poolRegistry1000';
import { SUPPORTED_CHAINS } from '../config/chains';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

export interface FastQuoteData {
  pairId: string;
  chainId: number;
  leg1Proto: string;
  leg2Proto: string;
  priceLeg1: number;
  priceLeg2: number;
  spreadPercent: number;
  grossProfitUSD: number;
  netProfitUSD: number;
  isProfitable: boolean;
  timestamp: number;
}

export class SharedPoolStateEngine {
  private poolStateCache: Map<string, PoolStateResult> = new Map();
  private fastQuotesCache: Map<string, FastQuoteData> = new Map();
  private isRefreshing: boolean = false;
  private lastRefreshTime: number = 0;

  /**
   * Refresca en paralelo pools de las cadenas principales mediante Multicall3
   * Incorpora un cooldown de 10 segundos para evitar agotar créditos de RPC
   */
  async refreshAllChains(force: boolean = false): Promise<void> {
    const now = Date.now();
    if (!force && (now - this.lastRefreshTime < 10000)) {
      return; // Servir desde memoria RAM
    }
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      const chainIds = ENV.enableArbitrum ? [8453, 42161] : [8453];

      const chainPromises = chainIds.map(async (chainId) => {
        try {
          const poolItems = poolRegistry1000.getPoolCallItems(chainId);
          if (poolItems.length === 0) return [];

          const batchSize = 4;
          const batchPromises: Promise<PoolStateResult[]>[] = [];

          for (let i = 0; i < poolItems.length; i += batchSize) {
            const batch = poolItems.slice(i, i + batchSize);
            batchPromises.push(
              Promise.race([
                multicallBatchScanner.scanPoolBatch(chainId, batch),
                new Promise<PoolStateResult[]>((resolve) => setTimeout(() => resolve([]), 1500))
              ])
            );
          }

          const resultsArrays = await Promise.all(batchPromises);
          return resultsArrays.flat();
        } catch {
          return [];
        }
      });

      const allResults = await Promise.all(chainPromises);
      const flattened = allResults.flat();

      for (const res of flattened) {
        if (res && res.price0In1 > 0) {
          const key1 = `${res.chainId}-${res.protocol}-${res.token0Symbol}-${res.token1Symbol}`;
          this.poolStateCache.set(key1, res);

          const invRes: PoolStateResult = {
            ...res,
            token0Symbol: res.token1Symbol,
            token1Symbol: res.token0Symbol,
            price0In1: res.price1In0,
            price1In0: res.price0In1,
          };
          const key2 = `${res.chainId}-${res.protocol}-${res.token1Symbol}-${res.token0Symbol}`;
          this.poolStateCache.set(key2, invRes);
        }
      }

      this.lastRefreshTime = Date.now();
    } catch (err: any) {
      logger.warn(`[SHARED POOL ENGINE] Error durante el refresco Multicall3: ${err.message}`);
    } finally {
      this.isRefreshing = false;
    }
  }

  getPoolState(chainId: number, protocol: string, token0: string, token1: string): PoolStateResult | undefined {
    const key = `${chainId}-${protocol}-${token0}-${token1}`;
    return this.poolStateCache.get(key);
  }

  getLastRefreshTime(): number {
    return this.lastRefreshTime;
  }

  getTotalCachedPools(): number {
    return this.poolStateCache.size;
  }
}

export const sharedPoolStateEngine = new SharedPoolStateEngine();
