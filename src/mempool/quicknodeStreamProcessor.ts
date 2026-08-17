import { logger } from '../utils/logger';
import { SwarmManager } from '../cluster/swarmManager';
import { MULTI_CHAIN_ARBITRAGE_PAIRS } from '../config/registry';

export interface StreamPayload {
  streamId?: string;
  eventType?: 'SWAP' | 'DEPEG' | 'BURN' | 'MINT' | string;
  chainId?: number;
  pairId?: string;
  pairName?: string;
  txHash?: string;
  tokenInSymbol?: string;
  tokenOutSymbol?: string;
  amountUSD?: number;
  depegPercent?: number;
  timestamp?: number;
  block?: any;
  receipts?: any[];
  logs?: any[];
}

export class QuickNodeStreamProcessor {
  private swarmManager: SwarmManager | null = null;
  // Topic0 para eventos Swap de Uniswap V3: Swap(address,address,int256,int256,uint160,uint128,int24)
  private readonly UNISWAP_V3_SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f9d5fb2ce0023437c80ac7380cf169395e';
  // Topic0 para eventos Swap de Uniswap V2 / Sushiswap / Aerodrome: Swap(address,uint256,uint256,uint256,uint256,address)
  private readonly UNISWAP_V2_SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';

  setSwarmManager(manager: SwarmManager) {
    this.swarmManager = manager;
  }

  /**
   * Procesar eventos recibidos desde el Webhook de QuickNode Streams (< 2ms)
   */
  processStreamEvent(payload: any): void {
    if (!payload) return;

    // 1. Si es un payload directo estructurado
    if (payload.eventType && payload.pairId) {
      const { eventType, chainId, pairName, amountUSD, depegPercent, txHash } = payload;
      if (eventType === 'SWAP' && (amountUSD || 0) >= 10000) {
        logger.info(`⚡ [QUICKNODE STREAM] 🐋 Swap de Ballena ($${amountUSD?.toLocaleString()} USD) en ${pairName || 'DEX'} (Chain ${chainId})! Tx: ${(txHash || '').slice(0, 14)}...`);
      }
      if (this.swarmManager) {
        this.swarmManager.triggerPriorityScan(payload.pairId);
      }
      return;
    }

    // 2. Si es un stream de logs / transacciones sin procesar de QuickNode
    const logs = Array.isArray(payload) ? payload : (payload.logs || payload.receipts || []);
    if (Array.isArray(logs) && logs.length > 0) {
      for (const log of logs) {
        const topics = log.topics || [];
        const address = (log.address || '').toLowerCase();

        if (topics.includes(this.UNISWAP_V3_SWAP_TOPIC) || topics.includes(this.UNISWAP_V2_SWAP_TOPIC)) {
          // Buscar si el contrato coincide con algún token o par registrado
          const matchedPair = MULTI_CHAIN_ARBITRAGE_PAIRS.find(p =>
            p.tokenA.address.toLowerCase() === address ||
            p.tokenB.address.toLowerCase() === address
          );

          if (matchedPair && this.swarmManager) {
            logger.info(`⚡ [QUICKNODE STREAM] Swap en bloque detectado para par: ${matchedPair.name} -> Disparando Arbitraje Atómico`);
            this.swarmManager.triggerPriorityScan(matchedPair.id);
            break;
          }
        }
      }
    }
  }
}

export const streamProcessor = new QuickNodeStreamProcessor();
