import { PoolCallItem } from '../scanners/multicallBatchScanner';
import { TOKENS, MULTI_CHAIN_ARBITRAGE_PAIRS } from './registry';
import { KNOWN_ONCHAIN_POOLS, getKnownPoolAddress } from './knownPools';

export interface PoolMetadata {
  id: string;
  name: string;
  chainId: number;
  protocol: string;
  poolAddress: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  decimals0: number;
  decimals1: number;
  fee: number;
  category: 'MAJORS' | 'DEFI_BLUECHIP' | 'MEME_AI' | 'LST_LRT' | 'STABLECOIN' | 'TOP_5000_ALTCOIN';
}

/**
 * Generador y Gestor del Catálogo de Pools On-Chain Verificadas
 */
export class PoolRegistry1000 {
  private pools: PoolMetadata[] = [];

  constructor() {
    this.initializeRegistry();
  }

  private initializeRegistry() {
    const generated: PoolMetadata[] = [];
    const seenPools = new Set<string>();

    // 1. Integrar todas las pools reales de KNOWN_ONCHAIN_POOLS
    for (const [key, entries] of Object.entries(KNOWN_ONCHAIN_POOLS)) {
      const parts = key.split('-');
      const chainId = parseInt(parts[0], 10);
      const symbolA = parts[1];
      const symbolB = parts[2];

      const tokenA = Object.values(TOKENS).find(t => t.chainId === chainId && t.symbol.toUpperCase() === symbolA.toUpperCase());
      const tokenB = Object.values(TOKENS).find(t => t.chainId === chainId && t.symbol.toUpperCase() === symbolB.toUpperCase());

      if (!tokenA || !tokenB) continue;

      // Ordenamiento lexicográfico estricto de Uniswap V3 (addressA < addressB)
      const isReversed = tokenA.address.toLowerCase() > tokenB.address.toLowerCase();
      const [t0, t1] = isReversed ? [tokenB, tokenA] : [tokenA, tokenB];

      for (const entry of entries) {
        const poolKey = `${chainId}-${entry.address.toLowerCase()}-${entry.protocol}`;
        if (seenPools.has(poolKey)) continue;
        seenPools.add(poolKey);

        generated.push({
          id: `POOL-${chainId}-${entry.protocol}-${t0.symbol}-${t1.symbol}-${entry.fee}`,
          name: `${t0.symbol}/${t1.symbol} (${entry.protocol.toUpperCase()} ${(entry.fee / 10000).toFixed(2)}%)`,
          chainId,
          protocol: entry.protocol,
          poolAddress: entry.address,
          token0: t0.address,
          token1: t1.address,
          token0Symbol: t0.symbol,
          token1Symbol: t1.symbol,
          decimals0: t0.decimals,
          decimals1: t1.decimals,
          fee: entry.fee,
          category: 'MAJORS'
        });
      }
    }

    // 2. Integrar pares de MULTI_CHAIN_ARBITRAGE_PAIRS verificando direcciones
    for (const pair of MULTI_CHAIN_ARBITRAGE_PAIRS) {
      const feeTiers = [500, 3000, 100];
      const isReversed = pair.tokenA.address.toLowerCase() > pair.tokenB.address.toLowerCase();
      const [t0, t1] = isReversed ? [pair.tokenB, pair.tokenA] : [pair.tokenA, pair.tokenB];

      for (const fee of feeTiers) {
        const realPoolAddress = getKnownPoolAddress(pair.chainId, pair.tokenA.symbol, pair.tokenB.symbol, fee);
        if (realPoolAddress && realPoolAddress.startsWith('0x')) {
          const proto = fee === 3000 ? 'uniswap-v3-3000' : (fee === 100 ? 'uniswap-v3-100' : 'uniswap-v3');
          const poolKey = `${pair.chainId}-${realPoolAddress.toLowerCase()}-${proto}`;
          if (!seenPools.has(poolKey)) {
            seenPools.add(poolKey);
            generated.push({
              id: `POOL-${pair.chainId}-${proto}-${t0.symbol}-${t1.symbol}-${fee}`,
              name: `${t0.symbol}/${t1.symbol} (${proto.toUpperCase()})`,
              chainId: pair.chainId,
              protocol: proto,
              poolAddress: realPoolAddress,
              token0: t0.address,
              token1: t1.address,
              token0Symbol: t0.symbol,
              token1Symbol: t1.symbol,
              decimals0: t0.decimals,
              decimals1: t1.decimals,
              fee,
              category: pair.id.includes('STABLE') ? 'STABLECOIN' 
                      : pair.id.includes('MEME') || pair.id.includes('AI') ? 'MEME_AI'
                      : pair.id.includes('LST') || pair.id.includes('RESTAKING') ? 'LST_LRT'
                      : 'MAJORS'
            });
          }
        }
      }
    }

    this.pools = generated;
  }

  getTotalCount(): number {
    return this.pools.length;
  }

  getTotalPoolsCount(): number {
    return this.pools.length;
  }

  getAllPools(): PoolMetadata[] {
    return this.pools;
  }

  getPoolsByChain(chainId: number): PoolMetadata[] {
    return this.pools.filter(p => p.chainId === chainId);
  }

  getPoolCallItems(chainId: number): PoolCallItem[] {
    const validPools = this.getPoolsByChain(chainId).filter(p => 
      p.poolAddress &&
      p.poolAddress.startsWith('0x') &&
      p.poolAddress.toLowerCase() !== p.token0.toLowerCase() && 
      p.poolAddress.toLowerCase() !== p.token1.toLowerCase()
    );

    return validPools.map(p => ({
      poolAddress: p.poolAddress,
      chainId: p.chainId,
      protocol: p.protocol,
      token0Symbol: p.token0Symbol,
      token1Symbol: p.token1Symbol,
      decimals0: p.decimals0,
      decimals1: p.decimals1,
      fee: p.fee
    }));
  }

  toMulticallCalls(chainId: number): PoolCallItem[] {
    return this.getPoolCallItems(chainId);
  }
}

export const poolRegistry1000 = new PoolRegistry1000();
