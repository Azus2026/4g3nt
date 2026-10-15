import express from 'express';
import path from 'path';
import { ENV } from './config/env';
import { MULTI_CHAIN_ARBITRAGE_PAIRS, DEX_PROTOCOLS, SWARM_AGENTS } from './config/registry';
import { SUPPORTED_CHAINS } from './config/chains';
import { SwarmManager } from './cluster/swarmManager';
import { streamProcessor, StreamPayload } from './mempool/quicknodeStreamProcessor';
import { loadPersistedStats, savePersistedStats } from './utils/statsStore';
import { historyStore } from './utils/historyStore';
import { poolRegistry1000 } from './config/poolRegistry1000';
import { cexLagPredictor } from './scanners/cexLagPredictor';
import { binanceWebSocketFeed } from './scanners/binanceWebSocketFeed';
import { TACTICAL_ARMADAS } from './config/armadas';
import { logger } from './utils/logger';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(process.cwd(), 'public')));

export let globalSwarmManager: SwarmManager | null = null;
export const LIVE_PAIR_RESULTS: Record<string, any> = {};

export const RECENT_SCAN_LOGS: string[] = [];
export const SPOT_BASE_LOGS: string[] = [];
export const FLASH_LOAN_LOGS: string[] = [];
export const LOW_FEE_LOGS: string[] = [];

export function addScanLog(msg: string, category?: string) {
  const timestamp = new Date().toLocaleTimeString();
  const formatted = `[${timestamp}] ${msg}`;
  
  RECENT_SCAN_LOGS.unshift(formatted);
  if (RECENT_SCAN_LOGS.length > 50) RECENT_SCAN_LOGS.pop();

  if (category === 'LOW_FEE' || msg.includes('LOW-FEE') || msg.includes('0.05%') || msg.includes('0.01%')) {
    LOW_FEE_LOGS.unshift(formatted);
    if (LOW_FEE_LOGS.length > 50) LOW_FEE_LOGS.pop();
  } else if (category === 'SPOT_BASE' || msg.includes('SPOT') || msg.includes('TRIANGULAR') || msg.includes('Base') || msg.includes('8453')) {
    SPOT_BASE_LOGS.unshift(formatted);
    if (SPOT_BASE_LOGS.length > 50) SPOT_BASE_LOGS.pop();
  } else {
    FLASH_LOAN_LOGS.unshift(formatted);
    if (FLASH_LOAN_LOGS.length > 50) FLASH_LOAN_LOGS.pop();
  }
}

export function setSwarmManager(manager: SwarmManager) {
  globalSwarmManager = manager;
  streamProcessor.setSwarmManager(manager);
}

// In-memory stats store
export const SERVER_STATS = {
  startedAt: new Date().toISOString(),
  scansCompleted: 0,
  opportunitiesFound: 0,
  detectedOpportunitiesCount: 0,
  detectedPnLUSD: 0,
  onChainExecutedCount: 0,
  onChainRealizedPnLUSD: 0,
  
  // Listas separadas permanentemente
  spotOpportunities: [] as any[],
  lowFeeOpportunities: [] as any[],
  flashOpportunities: [] as any[],
  lastOpportunities: [] as any[],

  activeChainsCount: Object.keys(SUPPORTED_CHAINS).length,
  activePairsCount: 1000000,
  activeAgentsCount: 1000000,
  activeArmadasCount: 4,
  activeLegionsCount: 1000,
  activeRegimentsCount: 10000,

  spotBase: {
    wallet: '0xf6Bb92Ac612D814F2A1e67Bf713F2f732419AC87',
    balanceWETH: '0.000000',
    balanceUSD: 25.00,
    nativeGasETH: '0.009901',
    minTargetUSD: 0.25,
    tokensTracked: 100,
    triangularCycles: 17100,
    scansCount: 0,
    executedCount: 0,
    realizedPnLUSD: 0
  },
  lowFee: {
    targetFeeTiers: '0.01% - 0.05% (Ultra-Bajo)',
    minSpreadHurdle: '0.12% (Rápida Ejecución)',
    scansCount: 0,
    executedCount: 0,
    realizedPnLUSD: 0,
    chains: ['Base', 'Arbitrum One']
  },
  flashLoans: {
    capitalRequiredUSD: 0.0,
    availableProviders: ['Balancer V2 (0% Fee)', 'Aave V3'],
    targetChains: ['Arbitrum', 'Optimism', 'Ethereum', 'Base', 'Polygon', 'BSC'],
    detectedOpportunitiesCount: 0,
    detectedPnLUSD: 0,
    onChainExecutedCount: 0
  }
};

export function addSpotOpportunity(opp: any) {
  opp.type = 'SPOT_BASE';
  opp.chainId = 8453;
  opp.timestamp = Date.now();

  const idx = SERVER_STATS.spotOpportunities.findIndex(o => o.pairName === opp.pairName);
  if (idx >= 0) {
    SERVER_STATS.spotOpportunities[idx] = opp;
  } else {
    SERVER_STATS.spotOpportunities.unshift(opp);
    if (SERVER_STATS.spotOpportunities.length > 25) SERVER_STATS.spotOpportunities.pop();
  }
  updateMergedOpportunities();
}

export function addLowFeeOpportunity(opp: any) {
  opp.type = 'LOW_FEE';
  opp.timestamp = Date.now();

  const idx = SERVER_STATS.lowFeeOpportunities.findIndex(o => o.pairName === opp.pairName && o.chainId === opp.chainId);
  if (idx >= 0) {
    SERVER_STATS.lowFeeOpportunities[idx] = opp;
  } else {
    SERVER_STATS.lowFeeOpportunities.unshift(opp);
    if (SERVER_STATS.lowFeeOpportunities.length > 25) SERVER_STATS.lowFeeOpportunities.pop();
  }
  updateMergedOpportunities();
}

export function addFlashOpportunity(opp: any) {
  opp.type = 'FLASH_LOAN';
  opp.timestamp = Date.now();

  const idx = SERVER_STATS.flashOpportunities.findIndex(o => o.pairName === opp.pairName && o.chainId === opp.chainId);
  if (idx >= 0) {
    SERVER_STATS.flashOpportunities[idx] = opp;
  } else {
    SERVER_STATS.flashOpportunities.unshift(opp);
    if (SERVER_STATS.flashOpportunities.length > 25) SERVER_STATS.flashOpportunities.pop();
  }
  updateMergedOpportunities();
}

function updateMergedOpportunities() {
  SERVER_STATS.lastOpportunities = [
    ...SERVER_STATS.lowFeeOpportunities,
    ...SERVER_STATS.spotOpportunities,
    ...SERVER_STATS.flashOpportunities
  ];
}

app.get('/api/armadas', (req, res) => {
  res.json(TACTICAL_ARMADAS);
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    version: '2.0.0',
    dryRun: ENV.dryRun,
    minProfitUSD: ENV.minProfitUSD,
    stats: SERVER_STATS,
    lowFeeLogs: LOW_FEE_LOGS.slice(0, 30),
    spotLogs: SPOT_BASE_LOGS.slice(0, 30),
    flashLogs: FLASH_LOAN_LOGS.slice(0, 30),
    recentLogs: RECENT_SCAN_LOGS.slice(0, 30)
  });
});

app.get('/api/history/weekly', (req, res) => {
  const summary = historyStore.getWeeklySummary(SERVER_STATS.scansCompleted);
  res.json(summary);
});

app.get('/api/pools/1000', (req, res) => {
  res.json({
    total: poolRegistry1000.getTotalPoolsCount(),
    pools: poolRegistry1000.getAllPools().slice(0, 100)
  });
});

app.all('/api/reset-stats', (req, res) => {
  SERVER_STATS.scansCompleted = 0;
  SERVER_STATS.opportunitiesFound = 0;
  SERVER_STATS.detectedOpportunitiesCount = 0;
  SERVER_STATS.detectedPnLUSD = 0;
  SERVER_STATS.onChainExecutedCount = 0;
  SERVER_STATS.onChainRealizedPnLUSD = 0;
  SERVER_STATS.spotOpportunities = [];
  SERVER_STATS.flashOpportunities = [];
  SERVER_STATS.lastOpportunities = [];
  SERVER_STATS.spotBase.scansCount = 0;
  SERVER_STATS.spotBase.executedCount = 0;
  SERVER_STATS.spotBase.realizedPnLUSD = 0;
  SERVER_STATS.flashLoans.detectedOpportunitiesCount = 0;
  SERVER_STATS.flashLoans.detectedPnLUSD = 0;
  SERVER_STATS.flashLoans.onChainExecutedCount = 0;
  historyStore.clearHistory();
  savePersistedStats();
  res.json({ success: true, message: 'Estadísticas e historial reiniciados a 0 exitosamente', stats: SERVER_STATS });
});

app.all('/api/test-trigger', async (req, res) => {
  addScanLog(`🧪 [TEST SPOT $35] Inyectando divergencia de prueba en Base (WETH ➔ AERO ➔ USDC)... (Ganancia: +$0.0042 USD)`, 'SPOT_BASE');
  
  const testOpp = {
    pairName: 'WETH ➔ AERO ➔ USDC ➔ WETH (Base Spot)',
    chainId: 8453,
    type: 'SPOT_BASE',
    tokenBorrow: '0x4200000000000000000000000000000000000006',
    tokenBorrowSymbol: 'WETH',
    borrowAmount: '0.014',
    loanAmount: '0.0145 WETH ($35 USD)',
    leg1: { dex: 'Aerodrome Slipstream (Tier 500)', protocolId: 'aerodrome-slipstream', tokenIn: 'WETH', tokenOut: 'AERO', price: 1.25 },
    leg2: { dex: 'Uniswap V3 (Tier 500)', protocolId: 'uniswap-v3', tokenIn: 'AERO', tokenOut: 'USDC', price: 1.28 },
    spreadPercent: 0.28,
    grossProfitUSD: 0.0065,
    gasCostUSD: 0.0003,
    netProfitUSD: 0.0042,
    timestamp: Date.now(),
    engine: 'BASE_SPOT_ATOMIC_VERIFIED'
  };

  SERVER_STATS.opportunitiesFound++;
  SERVER_STATS.detectedOpportunitiesCount++;
  SERVER_STATS.detectedPnLUSD += testOpp.netProfitUSD;
  SERVER_STATS.spotBase.scansCount++;
  addSpotOpportunity(testOpp);
  historyStore.addRecord(testOpp as any, false);
  savePersistedStats();

  return res.json({
    success: true,
    message: 'Prueba de alerta para Spot $35 inyectada con éxito.',
    detectedOpportunity: testOpp
  });
});

app.get('/api/mempool-stream', (req, res) => {
  res.json({
    status: 'ONLINE',
    endpoint: 'POST /api/mempool-stream',
    message: 'QuickNode Stream Webhook Listener Activo y Listo',
  });
});

app.post('/api/mempool-stream', (req, res) => {
  try {
    const payload: StreamPayload = req.body;
    if (payload && payload.eventType) {
      streamProcessor.processStreamEvent(payload);
      addScanLog(`⚡ [QUICKNODE STREAM] Evento ${payload.eventType} recibido para ${payload.pairName || 'Pool'}`, 'FLASH_LOAN');
      return res.status(200).json({ success: true, processed: true });
    }
    return res.status(200).json({ success: true, status: 'CONNECTED' });
  } catch (err: any) {
    logger.warn(`Error al procesar payload de QuickNode Stream: ${err.message}`);
    return res.status(200).json({ success: true, status: 'CONNECTED' });
  }
});

app.get('/api/agents', (req, res) => {
  const regiment = req.query.regiment ? parseInt(req.query.regiment as string, 10) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  if (globalSwarmManager) {
    res.json(globalSwarmManager.getClusterStatus(regiment, limit));
  } else {
    res.json([]);
  }
});

app.get('/api/pairs/live', (req, res) => {
  res.json(LIVE_PAIR_RESULTS);
});

app.get('/api/logs', (req, res) => {
  res.json({
    spotLogs: SPOT_BASE_LOGS,
    flashLogs: FLASH_LOAN_LOGS,
    recentLogs: RECENT_SCAN_LOGS
  });
});

app.get('/api/pairs', (req, res) => {
  res.json(MULTI_CHAIN_ARBITRAGE_PAIRS);
});

app.get('/api/dexs', (req, res) => {
  res.json(DEX_PROTOCOLS);
});

app.get('/api/cex-lag', (req, res) => {
  res.json({
    eth: cexLagPredictor.getCEXPrice('ETH'),
    btc: cexLagPredictor.getCEXPrice('BTC'),
    sol: cexLagPredictor.getCEXPrice('SOL'),
    arb: cexLagPredictor.getCEXPrice('ARB'),
    op: cexLagPredictor.getCEXPrice('OP')
  });
});

export function startServer(initialPort: number = ENV.port) {
  loadPersistedStats();
  cexLagPredictor.startMonitoring(2000).catch(() => {});
  binanceWebSocketFeed.start();
  const server = app.listen(initialPort, () => {
    logger.info(`🌐 Servidor de monitoreo V2 ejecutándose en http://localhost:${initialPort}`);
    logger.info(`   -> Dashboard Web: http://localhost:${initialPort}`);
    logger.info(`   -> Endpoint Webhook QuickNode Streams: http://localhost:${initialPort}/api/mempool-stream`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = initialPort + 1;
      logger.warn(`Puerto ${initialPort} ocupado. Intentando en http://localhost:${nextPort}...`);
      startServer(nextPort);
    } else {
      logger.error(`Error en servidor API: ${err.message}`);
    }
  });
}

if (require.main === module) {
  startServer();
}
