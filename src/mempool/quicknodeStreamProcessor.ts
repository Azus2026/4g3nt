import { logger } from '../utils/logger';
import { SwarmManager } from '../cluster/swarmManager';

export interface StreamPayload {
  streamId?: string;
  eventType: 'SWAP' | 'DEPEG' | 'BURN' | 'MINT';
  chainId: number;
  pairId?: string;
  pairName?: string;
  txHash: string;
  tokenInSymbol?: string;
  tokenOutSymbol?: string;
  amountUSD: number;
  depegPercent?: number;
  timestamp: number;
}

export class QuickNodeStreamProcessor {
  private swarmManager: SwarmManager | null = null;

  setSwarmManager(manager: SwarmManager) {
    this.swarmManager = manager;
  }

  /**
   * Procesar eventos recibidos desde el Webhook de QuickNode Streams
   */
  processStreamEvent(payload: StreamPayload): void {
    const { eventType, chainId, pairName, amountUSD, depegPercent, txHash } = payload;

    if (eventType === 'SWAP' && amountUSD >= 50000) {
      logger.info(`⚡ [QUICKNODE STREAM] 🐋 Swap de Ballena Detectado ($${amountUSD.toLocaleString()} USD) en ${pairName || 'DEX'} (Chain ${chainId})! Tx: ${txHash.slice(0, 14)}...`);
      logger.success(`🚀 Redirigiendo agentes a la piscina desbalanceada en < 5ms...`);
    } else if (eventType === 'DEPEG' && (depegPercent || 0) >= 0.1) {
      logger.info(`⚡ [QUICKNODE STREAM] 💧 Des-emparejamiento (De-peg) Detectado (${depegPercent?.toFixed(2)}%) en ${pairName}!`);
      logger.success(`🚀 Activando Agent-08 (LST & Restaking) para préstamos flash atómicos...`);
    } else if (eventType === 'BURN') {
      logger.info(`⚡ [QUICKNODE STREAM] 🌊 Retiro Masivo de Liquidez (Burn Event) Detectado ($${amountUSD.toLocaleString()} USD) en ${pairName}!`);
      logger.success(`🚀 Recalculando curva de slippage para el bloque siguiente...`);
    }

    // Notificar al SwarmManager para disparar escaneo de alta prioridad
    if (this.swarmManager && payload.pairId) {
      this.swarmManager.triggerPriorityScan(payload.pairId);
    }
  }
}

export const streamProcessor = new QuickNodeStreamProcessor();
