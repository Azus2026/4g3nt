import axios from 'axios';
import { logger } from '../utils/logger';

export interface CEXPriceTick {
  symbol: string;
  price: number;
  lastUpdate: number;
  priceChangePercent1m: number;
  prevPrice: number;
}

export interface CEXLagAlert {
  symbol: string;
  cexPrice: number;
  dexPrice: number;
  lagPercent: number;
  direction: 'BUY_DEX_SELL_CEX' | 'BUY_CEX_SELL_DEX';
  timestamp: number;
}

/**
 * CEX Lag Predictor
 * Monitor de ultra-baja latencia para precios de referencia CEX (Binance).
 * Detecta desequilibrios en el libro de órdenes centralizado antes de que los arbitrajistas sincronicen las pools on-chain.
 */
export class CEXLagPredictor {
  private prices: Map<string, CEXPriceTick> = new Map();
  private lastFetchTime: number = 0;
  private isRunning: boolean = false;

  private targetSymbols = [
    'ETHUSDT',
    'BTCUSDT',
    'SOLUSDT',
    'ARBUSDT',
    'OPUSDT',
    'LINKUSDT',
    'UNIUSDT',
    'AAVEUSDT'
  ];

  constructor() {
    this.initDefaultPrices();
  }

  private initDefaultPrices() {
    const defaults: Record<string, number> = {
      ETH: 2500,
      WETH: 2500,
      BTC: 64000,
      WBTC: 64000,
      cbBTC: 64000,
      SOL: 145,
      ARB: 0.55,
      OP: 1.45,
      LINK: 11.5,
      UNI: 6.8,
      AAVE: 135
    };

    for (const [sym, p] of Object.entries(defaults)) {
      this.prices.set(sym, {
        symbol: sym,
        price: p,
        lastUpdate: Date.now(),
        priceChangePercent1m: 0,
        prevPrice: p
      });
    }
  }

  public async startMonitoring(intervalMs: number = 2000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`⚡ [CEX LAG PREDICTOR] Monitor de precios Binance activado (Intervalo: ${intervalMs}ms)...`);

    await this.refreshCEXPrices();
    setInterval(async () => {
      await this.refreshCEXPrices().catch(() => {});
    }, intervalMs);
  }

  public async refreshCEXPrices(): Promise<void> {
    try {
      const url = `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(this.targetSymbols)}`;
      const res = await axios.get(url, { timeout: 1500 });
      const now = Date.now();

      if (Array.isArray(res.data)) {
        for (const item of res.data) {
          const base = item.symbol.replace('USDT', '');
          const currentPrice = parseFloat(item.price);
          const existing = this.prices.get(base);
          const prev = existing ? existing.price : currentPrice;
          const delta = ((currentPrice - prev) / Math.max(prev, 1)) * 100;

          const tick: CEXPriceTick = {
            symbol: base,
            price: currentPrice,
            lastUpdate: now,
            priceChangePercent1m: Number(delta.toFixed(3)),
            prevPrice: prev
          };

          this.prices.set(base, tick);
          if (base === 'ETH') {
            this.prices.set('WETH', tick);
          }
          if (base === 'BTC') {
            this.prices.set('WBTC', tick);
            this.prices.set('cbBTC', tick);
          }
        }
      }
      this.lastFetchTime = now;
    } catch (err: any) {
      // Fallback silencioso sin interrumpir el bot si hay rate-limit de red
    }
  }

  public updateCEXPrice(symbol: string, price: number): void {
    const cleanSym = symbol.toUpperCase().replace('USDC', '').replace('USDT', '');
    const existing = this.prices.get(cleanSym);
    const prev = existing ? existing.price : price;
    const delta = ((price - prev) / Math.max(prev, 1)) * 100;

    const tick: CEXPriceTick = {
      symbol: cleanSym,
      price,
      lastUpdate: Date.now(),
      priceChangePercent1m: Number(delta.toFixed(3)),
      prevPrice: prev
    };

    this.prices.set(cleanSym, tick);
    if (cleanSym === 'ETH') this.prices.set('WETH', tick);
    if (cleanSym === 'BTC') this.prices.set('WBTC', tick);
  }

  public getCEXPrice(symbol: string): number {
    const cleanSym = symbol.toUpperCase().replace('USDC', '').replace('USDT', '');
    const tick = this.prices.get(cleanSym) || this.prices.get(symbol.toUpperCase());
    return tick ? tick.price : 0;
  }

  /**
   * Evalúa si una pool de DEX tiene un desbalance de latencia frente a CEX
   */
  public evaluateDEXLag(tokenSymbol: string, dexPriceUSD: number): CEXLagAlert | null {
    const cexPrice = this.getCEXPrice(tokenSymbol);
    if (cexPrice <= 0 || dexPriceUSD <= 0) return null;

    const diff = (dexPriceUSD - cexPrice) / cexPrice;
    const lagPercent = Math.abs(diff) * 100;

    // Si el desbalance supera el 0.15%, se considera una oportunidad de anticipación CEX-DEX
    if (lagPercent >= 0.15) {
      return {
        symbol: tokenSymbol,
        cexPrice,
        dexPrice: dexPriceUSD,
        lagPercent: Number(lagPercent.toFixed(3)),
        direction: diff < 0 ? 'BUY_DEX_SELL_CEX' : 'BUY_CEX_SELL_DEX',
        timestamp: Date.now()
      };
    }

    return null;
  }
}

export const cexLagPredictor = new CEXLagPredictor();
