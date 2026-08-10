import { SWARM_AGENTS, MULTI_CHAIN_ARBITRAGE_PAIRS, AgentDefinition, ArbitragePair } from '../config/registry';
import { AgentWorker, AgentWorkerStatus } from './agentWorker';
import { RPCManager } from '../providers/rpcManager';
import { MultiChainExecutor } from '../executor/multiChainExecutor';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

export class SwarmManager {
  private workers: Map<number, AgentWorker> = new Map();
  private rpcManager: RPCManager;
  private executor: MultiChainExecutor;

  constructor(rpcManager: RPCManager) {
    this.rpcManager = rpcManager;
    this.executor = new MultiChainExecutor(rpcManager);
    this.initWorkers();
  }

  private initWorkers() {
    logger.info('🤖 Inicializando Swarm Cluster de 10 Agentes Inteligentes Especializados...');

    SWARM_AGENTS.forEach(def => {
      const assignedPairs = MULTI_CHAIN_ARBITRAGE_PAIRS.filter(p => p.assignedAgentId === def.id);
      const worker = new AgentWorker(def, assignedPairs, this.rpcManager, this.executor);
      this.workers.set(def.id, worker);
      logger.info(`   -> [${def.name}] Asignado a: ${def.role} (${assignedPairs.length} pares)`);
    });
  }

  /**
   * Dispara un escaneo de alta prioridad instantáneo impulsado por QuickNode Webhook Streams (< 5ms)
   */
  async triggerPriorityScan(pairId: string): Promise<void> {
    const targetPair = MULTI_CHAIN_ARBITRAGE_PAIRS.find(p => p.id === pairId);
    if (!targetPair) return;

    const worker = this.workers.get(targetPair.assignedAgentId);
    if (worker) {
      logger.rpc(`⚡ [STREAM PRIORITY TRIGGER] Disparando escaneo atómico prioritario para ${targetPair.name}...`);
      await worker.runScanCycle().catch(() => {});
    }
  }

  async startSwarmLoop() {
    logger.success('🔥 Cluster de 10 Agentes activado. Escaneo concurrente multi-hilo iniciado.');

    const runClusterCycle = async () => {
      const promises = Array.from(this.workers.values()).map(worker => worker.runScanCycle());
      await Promise.all(promises);
    };

    await runClusterCycle();
    setInterval(runClusterCycle, ENV.scanIntervalMs);
  }

  getClusterStatus(): AgentWorkerStatus[] {
    return Array.from(this.workers.values()).map(w => w.getStatus());
  }
}
