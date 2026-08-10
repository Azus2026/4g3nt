import { logger } from '../utils/logger';

export interface PriceImpulseSignal {
  symbol: string;
  sourceChainId: number;
  priceUSD: number;
  changePercent: number;
  timestamp: number;
}

export class CrossChainSignalManager {
  private lastPrices: Map<string, number> = new Map();
  private listeners: Array<(signal: PriceImpulseSignal) => void> = [];

  registerSignalListener(callback: (signal: PriceImpulseSignal) => void): void {
    this.listeners.push(callback);
  }

  processPriceUpdate(symbol: string, sourceChainId: number, currentPriceUSD: number): void {
    const prevPrice = this.lastPrices.get(symbol);
    this.lastPrices.set(symbol, currentPriceUSD);

    if (prevPrice && prevPrice > 0) {
      const changePercent = ((currentPriceUSD - prevPrice) / prevPrice) * 100;
      if (Math.abs(changePercent) >= 0.15) { // 0.15% impulso brusco de precio
        logger.info(`⚡ [CROSS-CHAIN SIGNAL] Impulso detectado en Mainnet para ${symbol}: ${changePercent.toFixed(3)}%! Transmitiendo señal a Arbitrum y Base...`);
        const signal: PriceImpulseSignal = {
          symbol,
          sourceChainId,
          priceUSD: currentPriceUSD,
          changePercent,
          timestamp: Date.now(),
        };

        for (const listener of this.listeners) {
          listener(signal);
        }
      }
    }
  }
}
