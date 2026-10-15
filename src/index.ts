import { ENV } from './config/env';
import { MULTI_CHAIN_ARBITRAGE_PAIRS, SWARM_AGENTS } from './config/registry';
import { SUPPORTED_CHAINS } from './config/chains';
import { RPCManager } from './providers/rpcManager';
import { SwarmManager } from './cluster/swarmManager';
import { startServer, setSwarmManager } from './server';
import { logger } from './utils/logger';
import { telegramNotifier } from './notifications/telegramNotifier';
import { loadPersistedStats } from './utils/statsStore';
import { Permit2ApprovalManager } from './executor/permit2ApprovalManager';

async function main() {
  // Cargar estadísticas históricas desde disco
  loadPersistedStats();

  logger.divider();
  logger.info('🚀 INICIANDO CLUSTER DE 10 AGENTES SWARM DE ARBITRAJE FLASH LOAN V2 (OPTIMIZADO)');
  logger.info(`   Agentes Concurrentes: ${SWARM_AGENTS.length} Agentes Especializados`);
  logger.info(`   Pares de Liquidez Totales: ${MULTI_CHAIN_ARBITRAGE_PAIRS.length} Pares Multi-Cadena`);
  logger.info(`   Modo DRY_RUN: ${ENV.dryRun ? 'ACTIVADO (Simulación sin riesgo)' : 'DESACTIVADO (MODO LIVE MAINNET REAL)'}`);
  logger.info(`   Ganancia Mínima Objetivo: $${ENV.minProfitUSD.toFixed(2)} USD`);
  logger.info(`   Optimizaciones MEV: Sweet Spot Loan Search | Balancer 0% Fee | WSS Sub-Segundo | Flashbots Relays`);
  logger.divider();

  // 1. Inicializar Gestor de RPCs y cargar Chainlist.org
  const rpcManager = new RPCManager();
  await rpcManager.loadChainlistRPCs();

  // 2. Garantizar autorizaciones de Uniswap Permit2 y preparar Spot Executor en Base
  const permit2Manager = new Permit2ApprovalManager(rpcManager);
  await permit2Manager.ensureAllPermit2Approvals().catch((e) => {
    logger.warn(`Fallo no-bloqueante en Permit2 approvals: ${e.message}`);
  });

  const { spotExecutor } = require('./executor/spotExecutor');
  await spotExecutor.initialize().catch((e: any) => {
    logger.warn(`Fallo no-bloqueante en Spot Executor: ${e.message}`);
  });

  const { arbitrumExecutor } = require('./executor/arbitrumExecutor');
  await arbitrumExecutor.initialize().catch((e: any) => {
    logger.warn(`Fallo no-bloqueante en Arbitrum Executor: ${e.message}`);
  });

  const { lowFeeExecutor } = require('./executor/lowFeeExecutor');
  await lowFeeExecutor.initialize().catch((e: any) => {
    logger.warn(`Fallo no-bloqueante en Low-Fee Executor: ${e.message}`);
  });

  // Benchmark preliminar para TODAS las cadenas (Ethereum, Arbitrum, Optimism, Polygon, Base, BSC, Avalanche)
  logger.info('Iniciando benchmark de latencia RPC para todas las cadenas soportadas...');
  for (const chainIdStr of Object.keys(SUPPORTED_CHAINS)) {
    const chainId = parseInt(chainIdStr, 10);
    await rpcManager.benchmarkAndSelectBestRPC(chainId).catch(() => {});
    rpcManager.subscribeNewHeads(chainId, (blockNumber) => {
      // Disparo inmediato por WebSocket en milisegundo 0
    });
  }

  // 2. Inicializar Swarm Cluster de 10 Agentes
  const swarmManager = new SwarmManager(rpcManager);
  setSwarmManager(swarmManager);

  // 3. Iniciar Servidor de API HTTP
  startServer();

  // 4. Notificar a Telegram
  await telegramNotifier.notifyStartup(MULTI_CHAIN_ARBITRAGE_PAIRS.length, SWARM_AGENTS.length).catch(() => {});

  // 5. Arrancar ciclo del Cluster
  await swarmManager.startSwarmLoop();
}

main().catch((err) => {
  logger.error(`Fallo crítico al iniciar el cluster de agentes: ${err.message}`);
  process.exit(1);
});
