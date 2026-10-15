const WebSocket = require('ws');
import { cexLagPredictor } from './cexLagPredictor';
import { logger } from '../utils/logger';

export class UniversalCEXWebSocketFeed {
  private wsCoinbase: any = null;
  private wsBinance: any = null;
  private isRunning: boolean = false;
  private reconnectAttempts: number = 0;
  private lastMessageTime: number = 0;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.connectCoinbase();
    this.connectBinance();
  }

  private connectCoinbase(): void {
    try {
      const url = 'wss://ws-feed.exchange.coinbase.com';
      this.wsCoinbase = new WebSocket(url);

      this.wsCoinbase.on('open', () => {
        logger.info('📡 [COINBASE HFT WEBSOCKET] Conectado al Feed Institucional Global (<10ms)');
        const subscribeMsg = JSON.stringify({
          type: 'subscribe',
          product_ids: ['ETH-USD', 'BTC-USD', 'SOL-USD', 'ARB-USD', 'OP-USD', 'LINK-USD', 'UNI-USD', 'AVAX-USD'],
          channels: ['ticker']
        });
        this.wsCoinbase.send(subscribeMsg);
      });

      this.wsCoinbase.on('message', (data: any) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ticker' && msg.product_id && msg.price) {
            this.lastMessageTime = Date.now();
            const price = parseFloat(msg.price);
            const pid = msg.product_id;

            if (pid === 'ETH-USD') cexLagPredictor.updateCEXPrice('ETH', price);
            else if (pid === 'BTC-USD') cexLagPredictor.updateCEXPrice('BTC', price);
            else if (pid === 'SOL-USD') cexLagPredictor.updateCEXPrice('SOL', price);
            else if (pid === 'ARB-USD') cexLagPredictor.updateCEXPrice('ARB', price);
            else if (pid === 'OP-USD') cexLagPredictor.updateCEXPrice('OP', price);
            else if (pid === 'LINK-USD') cexLagPredictor.updateCEXPrice('LINK', price);
            else if (pid === 'UNI-USD') cexLagPredictor.updateCEXPrice('UNI', price);
            else if (pid === 'AVAX-USD') cexLagPredictor.updateCEXPrice('AVAX', price);
          }
        } catch {}
      });

      this.wsCoinbase.on('error', (err: any) => {
        logger.warn(`Coinbase WS Error: ${err.message}`);
      });

      this.wsCoinbase.on('close', () => {
        if (this.isRunning) {
          setTimeout(() => this.connectCoinbase(), 3000);
        }
      });
    } catch (err: any) {
      logger.warn(`Error iniciando Coinbase WS: ${err.message}`);
    }
  }

  private connectBinance(): void {
    try {
      const streams = [
        'ethusdt@miniTicker',
        'btcusdt@miniTicker',
        'solusdt@miniTicker',
        'arbusdt@miniTicker',
        'opusdt@miniTicker'
      ].join('/');

      const url = `wss://stream.binance.com:9443/ws/${streams}`;
      this.wsBinance = new WebSocket(url);

      this.wsBinance.on('open', () => {
        this.reconnectAttempts = 0;
      });

      this.wsBinance.on('message', (data: any) => {
        try {
          const ticker = JSON.parse(data.toString());
          this.lastMessageTime = Date.now();

          if (ticker && ticker.s && ticker.c) {
            const symbol = ticker.s;
            const price = parseFloat(ticker.c);

            if (symbol === 'ETHUSDT') cexLagPredictor.updateCEXPrice('ETH', price);
            else if (symbol === 'BTCUSDT') cexLagPredictor.updateCEXPrice('BTC', price);
            else if (symbol === 'SOLUSDT') cexLagPredictor.updateCEXPrice('SOL', price);
            else if (symbol === 'ARBUSDT') cexLagPredictor.updateCEXPrice('ARB', price);
            else if (symbol === 'OPUSDT') cexLagPredictor.updateCEXPrice('OP', price);
          }
        } catch {}
      });

      this.wsBinance.on('error', () => {
        // Silencioso si Binance bloquea por geo-IP (Coinbase maneja el feed principal)
      });

      this.wsBinance.on('close', () => {
        if (this.isRunning) {
          setTimeout(() => this.connectBinance(), 15000);
        }
      });
    } catch {}
  }

  stop(): void {
    this.isRunning = false;
    if (this.wsCoinbase) {
      this.wsCoinbase.close();
      this.wsCoinbase = null;
    }
    if (this.wsBinance) {
      this.wsBinance.close();
      this.wsBinance = null;
    }
  }

  getStatus(): { isConnected: boolean; lastPingAgoMs: number } {
    return {
      isConnected: (this.wsCoinbase && this.wsCoinbase.readyState === WebSocket.OPEN) || (this.wsBinance && this.wsBinance.readyState === WebSocket.OPEN),
      lastPingAgoMs: Date.now() - this.lastMessageTime
    };
  }
}

export const binanceWebSocketFeed = new UniversalCEXWebSocketFeed();
