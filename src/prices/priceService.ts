import axios from 'axios';
import { ethers } from 'ethers';
import { ArbitragePair } from '../config/registry';

const NATIVE_SYMBOL_BY_CHAIN: Record<number, string> = {
  1: 'ETHUSDT',
  42161: 'ETHUSDT',
  10: 'ETHUSDT',
  8453: 'ETHUSDT',
  137: 'POLUSDT',
  56: 'BNBUSDT',
  43114: 'AVAXUSDT',
};

const NATIVE_FALLBACK_USD: Record<number, number> = {
  1: 3000,
  42161: 3000,
  10: 3000,
  8453: 3000,
  137: 0.5,
  56: 600,
  43114: 30,
};

const RPC_FALLBACKS: Record<number, string> = {
  1: process.env.ETH_RPC_URL || 'https://ethereum.publicnode.com',
  42161: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  137: process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com',
  10: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
  8453: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  56: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
  43114: process.env.AVAX_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
};

interface CacheEntry {
  value: number;
  expiresAt: number;
}

/**
 * Servicio de precios en tiempo real con caché, para valoración USD y estimación de gas.
 */
export class PriceService {
  private priceCache: Map<string, CacheEntry> = new Map();
  private gasPriceCache: Map<number, CacheEntry> = new Map();
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();

  private getProvider(chainId: number): ethers.JsonRpcProvider | null {
    if (!this.providers.has(chainId)) {
      const url = RPC_FALLBACKS[chainId];
      if (!url) return null;
      this.providers.set(chainId, new ethers.JsonRpcProvider(url, chainId, { staticNetwork: true }));
    }
    return this.providers.get(chainId)!;
  }

  private async fetchBinanceUsd(symbol: string): Promise<number | null> {
    const cached = this.priceCache.get(symbol);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.value > 0 ? cached.value : null;
    }

    try {
      const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, { timeout: 3000 });
      const price = parseFloat(res.data?.price);
      if (price > 0) {
        this.priceCache.set(symbol, { value: price, expiresAt: now + 30_000 });
        return price;
      }
    } catch {
      // Continuar con el fallback de Coinbase
    }

    // Fallback: Coinbase (Binance puede estar geo-bloqueado o sin el par)
    try {
      const base = symbol.replace(/USDT$/, '');
      const res = await axios.get(`https://api.coinbase.com/v2/prices/${base}-USD/spot`, { timeout: 3000 });
      const price = parseFloat(res.data?.data?.amount);
      if (price > 0) {
        this.priceCache.set(symbol, { value: price, expiresAt: now + 30_000 });
        return price;
      }
    } catch {
      if (cached && cached.value > 0) return cached.value;
    }

    // Cachear el fallo para no repetir la consulta en cada escaneo
    this.priceCache.set(symbol, { value: 0, expiresAt: now + 30_000 });
    return null;
  }

  /**
   * Precio USD del token nativo de la cadena (para valorar el gas).
   */
  async getNativeUsd(chainId: number): Promise<number> {
    const symbol = NATIVE_SYMBOL_BY_CHAIN[chainId];
    if (symbol) {
      const live = await this.fetchBinanceUsd(symbol);
      if (live) return live;
    }
    return NATIVE_FALLBACK_USD[chainId] ?? 3000;
  }

  /**
   * Precio USD del tokenA del par, derivado de su propio símbolo (no del cexSymbol
   * de referencia, que puede corresponder al otro token del par).
   */
  async getTokenAUsd(pair: ArbitragePair): Promise<number> {
    const symbol = pair.tokenA.symbol.toUpperCase();
    if (['USDC', 'USDT', 'DAI', 'USDBC', 'FRAX', 'LUSD'].includes(symbol)) return 1;

    const baseMap: Record<string, string> = {
      WETH: 'ETH', STETH: 'ETH', WSTETH: 'ETH', EZETH: 'ETH', WEETH: 'ETH',
      WBTC: 'BTC', CBBTC: 'BTC', TBTC: 'BTC',
      WMATIC: 'POL', WPOL: 'POL', WBNB: 'BNB', WAVAX: 'AVAX',
    };
    const base = baseMap[symbol] || symbol;
    const live = await this.fetchBinanceUsd(`${base}USDT`);
    if (live) return live;
    return pair.approxPriceUSD;
  }

  /**
   * Coste estimado del gas en USD usando el gasPrice on-chain en tiempo real.
   * En L2s se aplica un margen para cubrir el data fee de publicación en L1.
   */
  async estimateGasUsd(chainId: number): Promise<number> {
    const gasUnits = chainId === 1 ? 350_000 : 250_000;
    const l1DataFeeBuffer = chainId === 1 ? 1.0 : 1.5;
    const nativeUsd = await this.getNativeUsd(chainId);

    let gasPriceWei = 0;
    const cached = this.gasPriceCache.get(chainId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      gasPriceWei = cached.value;
    } else {
      try {
        const provider = this.getProvider(chainId);
        if (provider) {
          const feeData = await Promise.race([
            provider.getFeeData(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
          ]);
          const gp = feeData.gasPrice ?? feeData.maxFeePerGas;
          if (gp) {
            gasPriceWei = Number(gp);
            this.gasPriceCache.set(chainId, { value: gasPriceWei, expiresAt: now + 15_000 });
          }
        }
      } catch {
        if (cached) gasPriceWei = cached.value;
      }
    }

    if (gasPriceWei <= 0) {
      // Fallback conservador si no hay dato on-chain
      gasPriceWei = (chainId === 1 ? 20 : 0.1) * 1e9;
    }

    const gasNative = (gasUnits * gasPriceWei) / 1e18;
    return gasNative * nativeUsd * l1DataFeeBuffer;
  }
}

export const priceService = new PriceService();
