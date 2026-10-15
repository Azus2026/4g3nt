import { DEXQuote } from '../protocolink/protocolinkClient';
import { TokenConfig } from '../config/registry';
import { MultiChainExecutor } from './multiChainExecutor';
import { rpcManager, RPCManager } from '../providers/rpcManager';
import { logger } from '../utils/logger';
import { SERVER_STATS, addScanLog } from '../server';
import { savePersistedStats } from '../utils/statsStore';

export interface PendingMicroArbitrage {
  chainId: number;
  flashLoanToken: TokenConfig;
  loanAmount: string;
  leg1: DEXQuote;
  leg2: DEXQuote;
  netProfitUSD: number;
  pairName: string;
  timestamp: number;
}

export class FlashBundleAccumulator {
  private static instance: FlashBundleAccumulator;
  private queues: Map<string, PendingMicroArbitrage[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private executor: MultiChainExecutor;
  private readonly BUNDLE_SIZE = 2;
  private readonly BUNDLE_TIMEOUT_MS = 600;

  private constructor(customRpcManager?: RPCManager) {
    this.executor = new MultiChainExecutor(customRpcManager || rpcManager);
  }

  public static getInstance(customRpcManager?: RPCManager): FlashBundleAccumulator {
    if (!FlashBundleAccumulator.instance) {
      FlashBundleAccumulator.instance = new FlashBundleAccumulator(customRpcManager);
    }
    return FlashBundleAccumulator.instance;
  }

  /**
   * Encola un micro-arbitraje en el acumulador de Flash Bundles
   */
  public enqueue(micro: PendingMicroArbitrage): void {
    const queueKey = `${micro.chainId}_${micro.flashLoanToken.address.toLowerCase()}`;
    
    if (!this.queues.has(queueKey)) {
      this.queues.set(queueKey, []);
    }

    const queue = this.queues.get(queueKey)!;
    queue.push(micro);

    // Si alcanzamos el tamaño óptimo del lote (5 micro-swaps), despachar inmediatamente
    if (queue.length >= this.BUNDLE_SIZE) {
      this.flushQueue(queueKey);
      return;
    }

    // O si pasa el tiempo máximo de espera, despachar lo que haya acumulado
    if (!this.timers.has(queueKey)) {
      const timer = setTimeout(() => {
        this.flushQueue(queueKey);
      }, this.BUNDLE_TIMEOUT_MS);
      this.timers.set(queueKey, timer);
    }
  }

  /**
   * Despacha y ejecuta el lote acumulado atómicamente en la blockchain
   */
  private async flushQueue(queueKey: string): Promise<void> {
    const timer = this.timers.get(queueKey);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(queueKey);
    }

    const queue = this.queues.get(queueKey);
    if (!queue || queue.length === 0) return;

    const batch = queue.splice(0, this.BUNDLE_SIZE);
    if (batch.length === 0) return;

    const first = batch[0];
    const chainId = first.chainId;
    const flashLoanToken = first.flashLoanToken;

    let totalLoanAmountNum = 0;
    let totalEstimatedProfitUSD = 0;
    const microPairs: Array<{ leg1: DEXQuote; leg2: DEXQuote }> = [];

    for (const item of batch) {
      totalLoanAmountNum += parseFloat(item.loanAmount);
      totalEstimatedProfitUSD += item.netProfitUSD;
      microPairs.push({ leg1: item.leg1, leg2: item.leg2 });
    }

    const totalFlashLoanAmount = totalLoanAmountNum.toFixed(6);

    logger.info(`📦 [FLASH-BUNDLE] Empaquetando ${batch.length} micro-arbitrajes en Chain ${chainId} (Est. PnL: +$${totalEstimatedProfitUSD.toFixed(4)} USD)...`);
    addScanLog(`📦 [FLASH-BUNDLE] Empaquetando ${batch.length} micro-arbitrajes en Chain ${chainId} (Est. PnL: +$${totalEstimatedProfitUSD.toFixed(4)} USD)`);

    try {
      const success = await this.executor.executeFlashBundle(
        chainId,
        flashLoanToken,
        totalFlashLoanAmount,
        microPairs,
        totalEstimatedProfitUSD
      );

      if (success) {
        SERVER_STATS.onChainExecutedCount += batch.length;
        SERVER_STATS.onChainRealizedPnLUSD += totalEstimatedProfitUSD;
        savePersistedStats();
        logger.success(`🎉 [FLASH-BUNDLE CONFIRMADO] ${batch.length} micro-arbitrajes liquidados con éxito on-chain! Ganancia: +$${totalEstimatedProfitUSD.toFixed(4)} USD`);
        addScanLog(`🎉 [FLASH-BUNDLE EXITOSO] ${batch.length} micro-arbitrajes liquidados on-chain | +$${totalEstimatedProfitUSD.toFixed(4)} USD`);
      }
    } catch (err: any) {
      logger.error(`Error despachando Flash Bundle en Chain ${chainId}: ${err.message}`);
    }
  }
}

export const flashBundleAccumulator = FlashBundleAccumulator.getInstance();
