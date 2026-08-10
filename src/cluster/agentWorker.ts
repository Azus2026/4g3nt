import { AgentDefinition, ArbitragePair } from '../config/registry';
import { ArbitrageScanner } from '../agent/arbitrageScanner';
import { AIStrategyAgent } from '../agent/aiStrategyAgent';
import { MultiChainExecutor } from '../executor/multiChainExecutor';
import { RPCManager } from '../providers/rpcManager';
import { SERVER_STATS, LIVE_PAIR_RESULTS } from '../server';
import { logger } from '../utils/logger';

export interface AgentWorkerStatus {
  id: number;
  name: string;
  role: string;
  color: string;
  status: 'IDLE' | 'SCANNING' | 'EXECUTING' | 'ERROR';
  scansCount: number;
  opportunitiesFound: number;
  assignedPairsCount: number;
  lastOpportunity?: any;
}

export class AgentWorker {
  public definition: AgentDefinition;
  public assignedPairs: ArbitragePair[];
  private scanner: ArbitrageScanner;
  private aiAgent: AIStrategyAgent;
  private executor: MultiChainExecutor;

  public scansCount: number = 0;
  public opportunitiesFound: number = 0;
  public status: 'IDLE' | 'SCANNING' | 'EXECUTING' | 'ERROR' = 'IDLE';
  public lastOpportunity: any = null;

  constructor(
    definition: AgentDefinition,
    assignedPairs: ArbitragePair[],
    rpcManager: RPCManager,
    executor: MultiChainExecutor
  ) {
    this.definition = definition;
    this.assignedPairs = assignedPairs;
    this.scanner = new ArbitrageScanner();
    this.aiAgent = new AIStrategyAgent();
    this.executor = executor;
  }

  async runScanCycle(): Promise<void> {
    if (this.assignedPairs.length === 0) return;
    this.status = 'SCANNING';

    try {
      this.scansCount++;

      for (const pair of this.assignedPairs) {
        const opp = await this.scanner.scanPair(pair);
        SERVER_STATS.scansCompleted++;

        if (opp) {
          this.lastOpportunity = opp;
          LIVE_PAIR_RESULTS[pair.id] = {
            timestamp: new Date().toISOString(),
            agentId: this.definition.id,
            agentName: this.definition.name,
            ...opp,
          };

          const evalResult = this.aiAgent.evaluate(opp);
          logger.ai(`[${this.definition.name}] Escaneo en ${opp.pairName} ($${opp.netProfitUSD.toFixed(2)} USD)`);

          if (evalResult.recommendation === 'EXECUTE' || evalResult.recommendation === 'SIMULATE_ONLY') {
            this.opportunitiesFound++;
            SERVER_STATS.opportunitiesFound++;
            SERVER_STATS.lastOpportunities.unshift(LIVE_PAIR_RESULTS[pair.id]);
            if (SERVER_STATS.lastOpportunities.length > 20) {
              SERVER_STATS.lastOpportunities.pop();
            }

            this.status = 'EXECUTING';
            await this.executor.execute(opp);
          }
        }
      }
    } catch (err: any) {
      this.status = 'ERROR';
    } finally {
      this.status = 'IDLE';
    }
  }

  getStatus(): AgentWorkerStatus {
    return {
      id: this.definition.id,
      name: this.definition.name,
      role: this.definition.role,
      color: this.definition.color,
      status: this.status,
      scansCount: this.scansCount,
      opportunitiesFound: this.opportunitiesFound,
      assignedPairsCount: this.assignedPairs.length,
      lastOpportunity: this.lastOpportunity,
    };
  }
}
