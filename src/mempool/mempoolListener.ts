import WebSocket from 'ws';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { ENV } from '../config/env';

export interface PendingSwapSignal {
  chainId: number;
  hash: string;
  from?: string;
  to?: string;
  valueEth?: string;
  timestamp: number;
  source: 'ARBITRUM_SEQUENCER_FEED' | 'BASE_FLASHBLOCKS' | 'GENERIC_WSS';
}

/**
 * Arbitrum Sequencer Feed Listener
 * Se conecta directamente al socket de Nitro: wss://arb1.arbitrum.io/feed
 * Recibe lotes de transacciones procesadas por el secuenciador en tiempo real (< 10ms)
 * antes de que se creen los bloques tradicionales.
 */
export class ArbitrumSequencerFeedListener {
  private ws: WebSocket | null = null;
  private isRunning: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private endpoint: string;
  private onBatchCallback?: (count: number) => void;

  constructor(endpoint: string = ENV.arbitrumWssUrl || 'wss://arb1-feed.arbitrum.io/feed', onBatch?: (count: number) => void) {
    this.endpoint = endpoint;
    this.onBatchCallback = onBatch;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.connect();
  }

  private connect(): void {
    if (!this.isRunning) return;
    try {
      logger.info(`[ARBITRUM SEQUENCER FEED] Conectando a ${this.endpoint}...`);
      this.ws = new WebSocket(this.endpoint);

      this.ws.on('open', () => {
        logger.success(`[ARBITRUM SEQUENCER FEED] ⚡ Conectado con éxito al Sequencer Feed de Arbitrum One (Nitro Socket)`);
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed && parsed.messages && Array.isArray(parsed.messages)) {
            const count = parsed.messages.length;
            if (this.onBatchCallback) {
              this.onBatchCallback(count);
            }
          }
        } catch {
          // Mensaje no JSON o fragmento de streaming binario
        }
      });

      this.ws.on('error', (err: Error) => {
        logger.warn(`[ARBITRUM SEQUENCER FEED] Error en socket: ${err.message}`);
      });

      this.ws.on('close', () => {
        if (this.isRunning) {
          logger.warn(`[ARBITRUM SEQUENCER FEED] Desconectado. Reintentando en 3000ms...`);
          this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
        }
      });
    } catch (err: any) {
      logger.warn(`[ARBITRUM SEQUENCER FEED] Fallo al iniciar conexión: ${err.message}`);
      if (this.isRunning) {
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
      }
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Base Flashblocks / NewHeads Listener
 * Escucha los bloques parciales y cabeceras de bloques cada ~200-1000ms en Base
 */
export class BaseFlashblockFeedListener {
  private ws: WebSocket | null = null;
  private isRunning: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private endpoint: string;
  private onBlockCallback?: (blockNumber: number) => void;

  constructor(endpoint: string = ENV.baseWssUrl || 'wss://base-rpc.publicnode.com', onBlock?: (blockNumber: number) => void) {
    this.endpoint = endpoint;
    this.onBlockCallback = onBlock;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.connect();
  }

  private connect(): void {
    if (!this.isRunning) return;
    try {
      this.ws = new WebSocket(this.endpoint);

      this.ws.on('open', () => {
        logger.success(`[BASE FEED] ⚡ Conectado al WebSocket de Base (${this.endpoint})`);
        this.ws?.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_subscribe',
          params: ['newHeads']
        }));
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed && parsed.params && parsed.params.result) {
            const blockNumHex = parsed.params.result.number;
            const blockNum = blockNumHex ? parseInt(blockNumHex, 16) : 0;
            if (this.onBlockCallback && blockNum > 0) {
              this.onBlockCallback(blockNum);
            }
          }
        } catch {}
      });

      this.ws.on('error', (err: Error) => {
        logger.warn(`[BASE FEED] Error en socket: ${err.message}`);
      });

      this.ws.on('close', () => {
        if (this.isRunning) {
          this.reconnectTimeout = setTimeout(() => this.connect(), 4000);
        }
      });
    } catch (err: any) {
      if (this.isRunning) {
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
      }
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Adaptador de compatibilidad MempoolListener
 */
export class MempoolListener {
  private arbFeed: ArbitrumSequencerFeedListener | null = null;
  private baseFeed: BaseFlashblockFeedListener | null = null;

  constructor(wssUrl: string, chainId: number, onSignal: (signal: PendingSwapSignal) => void) {
    if (chainId === 42161) {
      this.arbFeed = new ArbitrumSequencerFeedListener(wssUrl || ENV.arbitrumWssUrl || 'wss://arb1-feed.arbitrum.io/feed', (count) => {
        onSignal({
          chainId: 42161,
          hash: `seq-${Date.now()}-${count}`,
          timestamp: Date.now(),
          source: 'ARBITRUM_SEQUENCER_FEED'
        });
      });
      this.arbFeed.start();
    } else if (chainId === 8453) {
      this.baseFeed = new BaseFlashblockFeedListener(wssUrl || 'wss://base-rpc.publicnode.com', (blockNum) => {
        onSignal({
          chainId: 8453,
          hash: `block-${blockNum}`,
          timestamp: Date.now(),
          source: 'BASE_FLASHBLOCKS'
        });
      });
      this.baseFeed.start();
    } else {
      logger.info(`[MEMPOOL LISTENER - Chain ${chainId}] Canal WSS genérico configurado.`);
    }
  }

  public destroy(): void {
    if (this.arbFeed) this.arbFeed.stop();
    if (this.baseFeed) this.baseFeed.stop();
  }
}
