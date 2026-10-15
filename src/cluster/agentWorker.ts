import { AgentDefinition, ArbitragePair } from '../config/registry';
import { ArbitrageScanner } from '../agent/arbitrageScanner';
import { SweetSpotOptimizer } from '../math/sweetSpotOptimizer';
import { MultiChainExecutor } from '../executor/multiChainExecutor';
import { ArbitrageOpportunity } from '../protocolink/protocolinkClient';
import { RPCManager } from '../providers/rpcManager';
import { SERVER_STATS, LIVE_PAIR_RESULTS, addScanLog, addFlashOpportunity } from '../server';
import { savePersistedStats } from '../utils/statsStore';
import { historyStore } from '../utils/historyStore';
import { sharedPoolStateEngine } from '../scanners/sharedPoolStateEngine';
import { cexLagPredictor } from '../scanners/cexLagPredictor';
import { MultiSplitRouter } from '../routers/multiSplitRouter';
import { nhopGraphScanner } from '../nhop/nhopGraphScanner';
import { NHOP_CYCLES } from '../nhop/nhopRegistry';
import { liquidationScanner } from '../liquidations/liquidationScanner';
import { getSampleLiquidationCandidates } from '../liquidations/lendingRegistry';
import { cowSwapSolver } from '../solvers/cowSwapSolver';
import { perpBasisScanner } from '../scanners/perpBasisScanner';
import { traderJoeLiquidityBookScanner } from '../scanners/traderJoeLiquidityBook';
import { yulStorageLensEngine } from '../scanners/yulStorageLensEngine';
import { subCentMicroArbEngine } from '../scanners/subCentMicroArbEngine';
import { intraDexFeeTierEngine } from '../scanners/intraDexFeeTierEngine';
import { stableDepegEngine } from '../scanners/stableDepegEngine';
import { getSquadronForRegiment, TacticalSquadron } from '../config/squadrons';
import { getArmadaForRegiment, TacticalArmada } from '../config/armadas';
import { backrunEngine } from '../mempool/backrunEngine';
import { triangularArbitrageEngine } from '../scanners/triangularArbitrageEngine';
import { flashBundleAccumulator } from '../executor/flashBundleAccumulator';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { telegramNotifier } from '../notifications/telegramNotifier';
import { TRIANGULAR_CYCLES, TriangularCycle } from '../triangular/triangularRegistry';

export interface AgentWorkerStatus {
  id: number;
  regimentId?: number;
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
  public assignedTriangularCycles: TriangularCycle[] = [];
  private scanner: ArbitrageScanner;
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
    this.executor = executor;

    // Asignar ciclos triangulares correspondientes a este agente
    this.assignedTriangularCycles = TRIANGULAR_CYCLES.filter(cycle => {
      if (definition.id % 50 === 0) return true;
      if (cycle.chainId === (definition.targetChains[0] || 42161)) return true;
      return false;
    });
  }

  /**
   * Escaneo ultra-rápido cuantitativo en memoria RAM con las 4 Mejoras Institucionales
   */
  async runFastMemoryScan(): Promise<void> {
    if (this.assignedPairs.length === 0) return;
    this.status = 'SCANNING';

    for (const pair of this.assignedPairs) {
      this.scansCount++;
      SERVER_STATS.scansCompleted++;

      const p1 = sharedPoolStateEngine.getPoolState(pair.chainId, 'uniswap-v3', pair.tokenA.symbol, pair.tokenB.symbol);

      // Evaluar dinámicamente el protocolo de contraparte con mayor spread real en memoria
      const candidateProtocols = [
        'pancakeswap-v3', 
        'uniswap-v3-3000', 
        'uniswap-v3-100', 
        'aerodrome-slipstream', 
        'camelot-v3', 
        'sushiswap-v3'
      ];

      const defaultProto2 = pair.chainId === 8453 ? 'aerodrome-slipstream' 
                          : (pair.chainId === 42161 ? 'pancakeswap-v3' 
                          : (pair.chainId === 56 ? 'pancakeswap-v3' 
                          : 'uniswap-v3-3000'));

      let bestProto2 = defaultProto2;
      let bestP2: any = sharedPoolStateEngine.getPoolState(pair.chainId, defaultProto2, pair.tokenA.symbol, pair.tokenB.symbol);
      let maxSpread = 0;
      let price1 = (p1 && p1.price0In1 > 0) ? p1.price0In1 : (pair.approxPriceUSD || 2500);
      let price2 = (bestP2 && bestP2.price0In1 > 0) ? bestP2.price0In1 : price1;

      if (price1 > 0) {
        for (const proto of candidateProtocols) {
          const candidate = sharedPoolStateEngine.getPoolState(pair.chainId, proto, pair.tokenA.symbol, pair.tokenB.symbol);
          if (candidate && candidate.price0In1 > 0) {
            const s = Math.abs(price1 - candidate.price0In1) / Math.min(price1, candidate.price0In1);
            if (s > maxSpread || !bestP2) {
              maxSpread = s;
              bestProto2 = proto;
              bestP2 = candidate;
              price2 = candidate.price0In1;
            }
          }
        }
      }

      const p2 = bestP2;
      const proto2Name = bestProto2;
      const spread = maxSpread;
      const gasCalc = SweetSpotOptimizer.calculateTotalGasCostUSD(
        pair.chainId,
        160_000n,
        0.05,
        pair.approxPriceUSD || 2500,
        384
      );
      const gasCostUSD = gasCalc.totalGasUSD;

      const depth1 = p1 ? Number(p1.liquidity) / 1e18 : 1.0;
      const depth2 = p2 ? Number(p2.liquidity) / 1e18 : 1.0;
      let sweetSpot = { isViable: false, optimalLoanUSD: 0, optimalLoanAmount: '0', sweetSpotRatio: 1.0, expectedNetProfitUSD: 0, expectedGrossProfitUSD: 0 };

      const regimentId = (this.definition as any).regimentId || 1;
      const armada = getArmadaForRegiment(regimentId);
      const squadron = getSquadronForRegiment(regimentId);

      // Evaluación según la Armada Táctica asignada (1 a 4)
      let customOpp: any = null;
      let loanAmountToUse = pair.defaultLoanAmount;
      let netProfitUSD = 0;
      let grossProfitUSD = 0;
      let isProfitable = false;

      if (armada.id === 1) {
        // 🐋 Armada 1: Backrunning Atómico de Ballenas (Uniswap / Aerodrome / PancakeSwap)
        const backrunOpp = backrunEngine.evaluateBackrunOpportunity(pair);
        if (backrunOpp && backrunOpp.isExecutable) {
          customOpp = backrunOpp;
          loanAmountToUse = backrunOpp.optimalBackrunAmountToken;
          netProfitUSD = backrunOpp.expectedNetProfitUSD;
          grossProfitUSD = backrunOpp.expectedGrossProfitUSD;
          isProfitable = netProfitUSD >= ENV.minProfitUSD;
        }
      } else if (armada.id === 2) {
        // ⚡ Armada 2: Liquidaciones Flash en Aave V3 y Compound V3 (Bono 5-10%)
        const candidates = getSampleLiquidationCandidates();
        const cand = candidates.find(c => c.chainId === pair.chainId && (c.debtToken.symbol === pair.tokenA.symbol || c.collateralToken.symbol === pair.tokenA.symbol));
        if (cand) {
          const liqOpp = liquidationScanner.evaluateLiquidation(cand);
          if (liqOpp && liqOpp.isExecutable) {
            customOpp = liqOpp;
            loanAmountToUse = (liqOpp.flashLoanAmountUSD / (pair.approxPriceUSD || 2500)).toFixed(6);
            netProfitUSD = liqOpp.netProfitUSD;
            grossProfitUSD = liqOpp.expectedGrossBonusUSD;
            isProfitable = netProfitUSD >= ENV.minProfitUSD;
          }
        }
        // Fallback: Cross-DEX L2 Rápido
        if (!isProfitable) {
          const microOpp = subCentMicroArbEngine.evaluateMicroOpportunity(pair);
          if (microOpp && microOpp.isViable) {
            loanAmountToUse = (microOpp.optimalLoanUSD / (pair.approxPriceUSD || 2500)).toFixed(6);
            netProfitUSD = microOpp.netProfitUSD;
            grossProfitUSD = microOpp.grossProfitUSD;
            isProfitable = netProfitUSD >= ENV.minProfitUSD;
            customOpp = microOpp;
          }
        }
      } else if (armada.id === 3) {
        // 📡 Armada 3: CEX-DEX Lag Predictors (Binance Real-Time WebSocket HFT)
        const cexLag = cexLagPredictor.evaluateDEXLag(pair.tokenA.symbol, price1);
        if (cexLag && cexLag.lagPercent > 0.12) {
          const loanUSD = 10000;
          const estProfit = loanUSD * (cexLag.lagPercent / 100) - gasCostUSD;
          if (estProfit >= ENV.minProfitUSD) {
            loanAmountToUse = (loanUSD / (pair.approxPriceUSD || 2500)).toFixed(6);
            netProfitUSD = estProfit;
            grossProfitUSD = loanUSD * (cexLag.lagPercent / 100);
            isProfitable = true;
          }
        }
      } else {
        // 🎯 Armada 4: CoW Swap & UniswapX Intent Solving (Batch Auctions)
        const sampleBatchOrder = {
          id: `BATCH-${pair.id}`,
          sellToken: pair.tokenA.symbol,
          buyToken: pair.tokenB.symbol,
          sellAmountUSD: 15000,
          buyAmountUSD: 15000,
          limitPrice: (pair.approxPriceUSD || 2500) * 0.995,
          marketPrice: (pair.approxPriceUSD || 2500),
          spreadPercent: 0.50,
          clearingPriceUSD: pair.approxPriceUSD || 2500,
          chainId: pair.chainId
        };
        const cowOpp = cowSwapSolver.evaluateBatchOpportunity(sampleBatchOrder);
        if (cowOpp && cowOpp.isExecutable) {
          customOpp = cowOpp;
          loanAmountToUse = (cowOpp.flashLoanRequiredUSD / (pair.approxPriceUSD || 2500)).toFixed(6);
          netProfitUSD = cowOpp.netProfitUSD;
          grossProfitUSD = cowOpp.surplusUSD;
          isProfitable = netProfitUSD >= ENV.minProfitUSD;
        }
      }

function getProtocolFeeRate(protocolId: string): number {
  if (protocolId.includes('3000')) return 0.0030; // 0.30%
  if (protocolId.includes('10000')) return 0.0100; // 1.00%
  if (protocolId.includes('100')) return 0.0001; // 0.01%
  if (protocolId.includes('curve') || protocolId.includes('stable')) return 0.0004; // 0.04%
  return 0.0005; // 0.05% default para V3 tier 500
}

      // Si hay oportunidad general cross-DEX, verificar que el spread supere las comisiones
      if (!isProfitable && p1 && p2 && price1 > 0 && price2 > 0) {
        const fee1 = getProtocolFeeRate('uniswap-v3');
        const fee2 = getProtocolFeeRate(proto2Name);
        const totalFees = fee1 + fee2; // Ej: 0.0005 + 0.0030 = 0.0035 (0.35%)
        const netSpread = spread - totalFees;

        if (netSpread > 0.0005) { // Requiere mínimo 0.05% de ganancia neta pura por encima de todas las comisiones
          const baseLoanUSD = parseFloat(pair.defaultLoanAmount) * (pair.approxPriceUSD || 2500);
          sweetSpot = SweetSpotOptimizer.calculateOptimalLoan(
            baseLoanUSD,
            netSpread,
            depth1 + depth2,
            gasCostUSD,
            pair.approxPriceUSD || 2500,
            0.0, // Balancer Flash Loan 0% fee
            ENV.minProfitUSD
          );

          if (sweetSpot.isViable && sweetSpot.expectedNetProfitUSD >= ENV.minProfitUSD) {
            loanAmountToUse = sweetSpot.optimalLoanAmount;
            netProfitUSD = sweetSpot.expectedNetProfitUSD;
            grossProfitUSD = sweetSpot.expectedGrossProfitUSD;
            isProfitable = true;
          }
        }
      }

      // 3. MEJORA 2: Evaluación de Desfase de Latencia CEX -> DEX (Binance Lag)
      const cexLag = cexLagPredictor.evaluateDEXLag(pair.tokenA.symbol, price1);
      const cexPrice = cexLag ? cexLag.cexPrice : cexLagPredictor.getCEXPrice(pair.tokenA.symbol);

      // 4. MEJORA 3: Multi-Split Routing Check
      const splitCheck = MultiSplitRouter.calculateOptimalSplit(
        parseFloat(loanAmountToUse),
        'uniswap-v3',
        price1,
        depth1,
        proto2Name,
        price2,
        depth2
      );

      // Actualizar estado en vivo para el Dashboard
      LIVE_PAIR_RESULTS[pair.id] = {
        timestamp: new Date().toISOString(),
        agentId: this.definition.id,
        agentName: `${squadron.name} #${this.definition.id}`,
        pairId: pair.id,
        pairName: customOpp ? customOpp.pairName : pair.name,
        chainId: pair.chainId,
        status: isProfitable ? 'PROFITABLE' : 'SCANNING_ACTIVE',
        leg1: { protocolId: 'uniswap-v3', price: price1 },
        leg2: { protocolId: proto2Name, price: price2 },
        spreadPercent: Number((spread * 100).toFixed(4)),
        grossProfitUSD: Number(grossProfitUSD.toFixed(4)),
        netProfitUSD: Number(netProfitUSD.toFixed(4)),
        estimatedGasUSD: gasCostUSD,
        isProfitable,
        sweetSpotRatio: sweetSpot.sweetSpotRatio,
        optimalLoanUSD: sweetSpot.optimalLoanUSD,
        cexReferencePriceUSD: cexPrice,
        cexDEXSpreadPercent: cexLag ? cexLag.lagPercent : undefined,
        multiSplitAdvantageUSD: splitCheck.isSplitBetter ? splitCheck.slippageSavedUSD : undefined
      };

      if (isProfitable) {
        const FLASH_LOAN_SUPPORTED_TOKENS = new Set([
          'WETH', 'ETH', 'USDC', 'USDCE', 'USDbC', 'USDT', 'DAI', 'WBTC', 'cbBTC', 'ARB', 'OP'
        ]);

        const proto1 = price1 < price2 ? 'uniswap-v3' : proto2Name;
        const proto2 = price1 < price2 ? proto2Name : 'uniswap-v3';

        const flashLoanToken = FLASH_LOAN_SUPPORTED_TOKENS.has(pair.tokenA.symbol.toUpperCase())
          ? pair.tokenA
          : (FLASH_LOAN_SUPPORTED_TOKENS.has(pair.tokenB.symbol.toUpperCase()) ? pair.tokenB : pair.tokenA);

        const opp: ArbitrageOpportunity = {
          pairId: pair.id,
          pairName: customOpp ? customOpp.pairName : pair.name,
          chainId: pair.chainId,
          flashLoanAmount: loanAmountToUse,
          flashLoanToken,
          tokenA: flashLoanToken,
          tokenB: flashLoanToken.symbol === pair.tokenA.symbol ? pair.tokenB : pair.tokenA,
          leg1: (customOpp && customOpp.leg1) ? customOpp.leg1 : {
            protocolId: proto1,
            chainId: pair.chainId,
            inputToken: flashLoanToken,
            outputToken: flashLoanToken.symbol === pair.tokenA.symbol ? pair.tokenB : pair.tokenA,
            inputAmount: loanAmountToUse,
            outputAmount: (parseFloat(loanAmountToUse) * Math.min(price1, price2)).toFixed(6),
            logic: null
          },
          leg2: (customOpp && customOpp.leg2) ? customOpp.leg2 : {
            protocolId: proto2,
            chainId: pair.chainId,
            inputToken: flashLoanToken.symbol === pair.tokenA.symbol ? pair.tokenB : pair.tokenA,
            outputToken: flashLoanToken,
            inputAmount: (parseFloat(loanAmountToUse) * Math.min(price1, price2)).toFixed(6),
            outputAmount: (parseFloat(loanAmountToUse) * (1 + (customOpp ? customOpp.spreadPercent / 100 : 0.001))).toFixed(6),
            logic: null
          },
          flashLoanFeeAmount: '0',
          netReturnTokenA: (parseFloat(loanAmountToUse) * (1 + (customOpp ? customOpp.spreadPercent / 100 : 0.001))).toFixed(6),
          grossProfitTokenA: (parseFloat(loanAmountToUse) * (customOpp ? customOpp.spreadPercent / 100 : 0.001)).toFixed(6),
          grossProfitUSD,
          netProfitUSD,
          estimatedGasUSD: (customOpp && customOpp.estimatedGasUSD) ? customOpp.estimatedGasUSD : 0.0008,
          isProfitable: true,
          sweetSpotRatio: sweetSpot.sweetSpotRatio,
          cexReferencePriceUSD: cexPrice,
          cexDEXSpreadPercent: cexLag ? cexLag.lagPercent : undefined
        };

        this.lastOpportunity = opp;
        historyStore.addRecord(opp, false);

        this.opportunitiesFound++;
        SERVER_STATS.opportunitiesFound++;
        SERVER_STATS.detectedOpportunitiesCount++;
        SERVER_STATS.detectedPnLUSD += netProfitUSD;

        addFlashOpportunity({
          timestamp: new Date().toISOString(),
          pairName: pair.name,
          chainId: pair.chainId,
          netProfitUSD: Number(netProfitUSD.toFixed(4)),
          spreadPercent: Number((spread * 100).toFixed(4)),
          protocolA: opp.leg1.protocolId,
          protocolB: opp.leg2.protocolId,
          loanAmount: loanAmountToUse
        });

        savePersistedStats();

        const logMsg = `⚡ [OPORTUNIDAD QUANT] ${this.definition.name}: ${pair.name} | Margen: +$${netProfitUSD.toFixed(4)} USD | SweetSpot: x${sweetSpot.sweetSpotRatio} ($${sweetSpot.optimalLoanUSD}) | Spread: ${(spread * 100).toFixed(3)}%`;
        logger.ai(logMsg);
        addScanLog(logMsg);

        // 1. ESTRATEGIA ATÓMICA FLASH-BUNDLE: Encolar para ejecución por lotes multicall amortizados
        if (netProfitUSD >= ENV.minProfitUSD) {
          flashBundleAccumulator.enqueue({
            chainId: pair.chainId,
            flashLoanToken: pair.tokenA,
            loanAmount: loanAmountToUse,
            leg1: opp.leg1,
            leg2: opp.leg2,
            netProfitUSD,
            pairName: pair.name,
            timestamp: Date.now()
          });
        }

        // 2. Ejecución directa standalone Flash Loan
        if (netProfitUSD >= ENV.minProfitUSD) {
          this.executor.execute(opp).then((executed) => {
            if (executed) {
              SERVER_STATS.onChainExecutedCount++;
              SERVER_STATS.onChainRealizedPnLUSD += netProfitUSD;
              savePersistedStats();
              historyStore.addRecord(opp, true);
              telegramNotifier.notifyExecution(opp, this.definition.name).catch(() => {});
            }
          }).catch(() => {});
        }

        // 3. Ejecución SPOT con Capital Propio en Base (Chain 8453)
        if (pair.chainId === 8453) {
          try {
            const { spotExecutor } = require('../executor/spotExecutor');
            spotExecutor.executeSpot(opp).catch(() => {});
          } catch {}
        }
      }
    }
  }

  async runScanCycle(): Promise<void> {
    await this.runFastMemoryScan();
  }

  getStatus(): AgentWorkerStatus {
    return {
      id: this.definition.id,
      regimentId: (this.definition as any).regimentId,
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
