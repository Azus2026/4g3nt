import axios from 'axios';
import { logger } from '../utils/logger';

export interface CEXPrice {
  exchange: string;
  symbol: string;
  price: number;
  timestamp: number;
}

export class CEXFetcher {
  private cache: Map<string, CEXPrice> = new Map();

  /**
   * Obtiene el precio del par (ej: 'ETHUSDT') desde Binance
   */
  async fetchBinancePrice(symbol: string): Promise<number | null> {
    try {
      const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, { timeout: 3000 });
      if (res.data && res.data.price) {
        const price = parseFloat(res.data.price);
        this.cache.set(`binance_${symbol}`, { exchange: 'Binance', symbol, price, timestamp: Date.now() });
        return price;
      }
    } catch (err: any) {
      // Ignorar rate limits
    }
    return null;
  }

  /**
   * Obtiene el precio del par (ej: 'ETH-USD') desde Coinbase
   */
  async fetchCoinbasePrice(symbol: string): Promise<number | null> {
    try {
      const formatted = symbol.replace('USDT', '-USD').replace('USDC', '-USD');
      const res = await axios.get(`https://api.coinbase.com/v2/prices/${formatted}/spot`, { timeout: 3000 });
      if (res.data && res.data.data && res.data.data.amount) {
        const price = parseFloat(res.data.data.amount);
        this.cache.set(`coinbase_${symbol}`, { exchange: 'Coinbase', symbol, price, timestamp: Date.now() });
        return price;
      }
    } catch (err: any) {
      // Ignorar errores
    }
    return null;
  }

  /**
   * Obtiene el precio del par (ej: 'ETH-USDT') desde KuCoin
   */
  async fetchKuCoinPrice(symbol: string): Promise<number | null> {
    try {
      const formatted = symbol.replace('USDT', '-USDT').replace('USDC', '-USDC');
      const res = await axios.get(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${formatted}`, { timeout: 3000 });
      if (res.data && res.data.data && res.data.data.price) {
        const price = parseFloat(res.data.data.price);
        this.cache.set(`kucoin_${symbol}`, { exchange: 'KuCoin', symbol, price, timestamp: Date.now() });
        return price;
      }
    } catch (err: any) {
      // Ignorar errores
    }
    return null;
  }

  /**
   * Obtiene la cotización promedio entre múltiples CEXs
   */
  async getAggregatedCEXPrice(symbol: string): Promise<{ avgPrice: number; prices: CEXPrice[] }> {
    const promises = [
      this.fetchBinancePrice(symbol),
      this.fetchCoinbasePrice(symbol),
      this.fetchKuCoinPrice(symbol),
    ];

    await Promise.all(promises);

    const validPrices: CEXPrice[] = [];
    ['binance', 'coinbase', 'kucoin'].forEach(ex => {
      const item = this.cache.get(`${ex}_${symbol}`);
      if (item && Date.now() - item.timestamp < 10000) {
        validPrices.push(item);
      }
    });

    if (validPrices.length === 0) {
      return { avgPrice: 0, prices: [] };
    }

    const sum = validPrices.reduce((acc, p) => acc + p.price, 0);
    return {
      avgPrice: sum / validPrices.length,
      prices: validPrices,
    };
  }
}
