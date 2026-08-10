import express from 'express';
import path from 'path';
import { ENV } from './config/env';
import { MULTI_CHAIN_ARBITRAGE_PAIRS, DEX_PROTOCOLS, SWARM_AGENTS } from './config/registry';
import { SUPPORTED_CHAINS } from './config/chains';
import { SwarmManager } from './cluster/swarmManager';
import { streamProcessor, StreamPayload } from './mempool/quicknodeStreamProcessor';
import { logger } from './utils/logger';

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

export let globalSwarmManager: SwarmManager | null = null;
export const LIVE_PAIR_RESULTS: Record<string, any> = {};
export const RECENT_SCAN_LOGS: string[] = [];

export function addScanLog(msg: string) {
  const timestamp = new Date().toLocaleTimeString();
  RECENT_SCAN_LOGS.unshift(`[${timestamp}] ${msg}`);
  if (RECENT_SCAN_LOGS.length > 50) {
    RECENT_SCAN_LOGS.pop();
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
  lastOpportunities: [] as any[],
  activeChainsCount: Object.keys(SUPPORTED_CHAINS).length,
  activePairsCount: MULTI_CHAIN_ARBITRAGE_PAIRS.length,
  activeAgentsCount: SWARM_AGENTS.length,
};

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    version: '2.0.0',
    dryRun: ENV.dryRun,
    minProfitUSD: ENV.minProfitUSD,
    stats: SERVER_STATS,
  });
});

/**
 * Webhook Receptor en tiempo real para QuickNode Streams (< 5ms)
 * Soporta eventos Swap de Ballenas (> $50k USD), De-peg Streams y Burn Events
 * Garantiza respuesta HTTP 200 OK para pings y verificaciones de QuickNode
 */
app.post('/api/mempool-stream', (req, res) => {
  try {
    const payload: StreamPayload = req.body;
    if (payload && payload.eventType) {
      streamProcessor.processStreamEvent(payload);
      addScanLog(`⚡ [QUICKNODE STREAM] Evento ${payload.eventType} recibido para ${payload.pairName || 'Pool'}`);
      return res.status(200).json({ success: true, processed: true });
    }
    // Respuesta HTTP 200 garantizada para verificaciones iniciales de QuickNode
    return res.status(200).json({ success: true, status: 'CONNECTED' });
  } catch (err: any) {
    logger.warn(`Error al procesar payload de QuickNode Stream: ${err.message}`);
    return res.status(200).json({ success: true, status: 'CONNECTED' });
  }
});

app.get('/api/agents', (req, res) => {
  if (globalSwarmManager) {
    res.json(globalSwarmManager.getClusterStatus());
  } else {
    res.json(SWARM_AGENTS);
  }
});

app.get('/api/live-results', (req, res) => {
  res.json(LIVE_PAIR_RESULTS);
});

app.get('/api/logs', (req, res) => {
  res.json(RECENT_SCAN_LOGS);
});

app.get('/api/chains', (req, res) => {
  res.json(SUPPORTED_CHAINS);
});

app.get('/api/pairs', (req, res) => {
  res.json(MULTI_CHAIN_ARBITRAGE_PAIRS);
});

app.get('/api/dexs', (req, res) => {
  res.json(DEX_PROTOCOLS);
});

app.get('/api/opportunities', (req, res) => {
  res.json(SERVER_STATS.lastOpportunities);
});

export function startServer(initialPort: number = ENV.port) {
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
