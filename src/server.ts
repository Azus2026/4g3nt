import express from 'express';
import path from 'path';
import { ENV } from './config/env';
import { MULTI_CHAIN_ARBITRAGE_PAIRS, DEX_PROTOCOLS, SWARM_AGENTS } from './config/registry';
import { SUPPORTED_CHAINS } from './config/chains';
import { SwarmManager } from './cluster/swarmManager';
import { logger } from './utils/logger';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

export let globalSwarmManager: SwarmManager | null = null;
export const LIVE_PAIR_RESULTS: Record<string, any> = {};

export function setSwarmManager(manager: SwarmManager) {
  globalSwarmManager = manager;
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
    logger.info(`   -> Endpoint Resultados en Vivo: http://localhost:${initialPort}/api/live-results`);
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
