import { ENV } from './config/env';
import { MULTI_CHAIN_ARBITRAGE_PAIRS, SWARM_AGENTS } from './config/registry';
import { SUPPORTED_CHAINS } from './config/chains';
import { RPCManager } from './providers/rpcManager';
import { SwarmManager } from './cluster/swarmManager';
import { startServer, setSwarmManager } from './server';
import { logger } from './utils/logger';

async function main() {
  logger.divider();
  logger.info('🚀 INICIANDO CLUSTER DE 10 AGENTES SWARM DE ARBITRAJE FLASH LOAN V2');
  logger.info(`   Agentes Concurrentes: ${SWARM_AGENTS.length} Agentes Especializados`);
  logger.info(`   Pares de Liquidez Totales: ${MULTI_CHAIN_ARBITRAGE_PAIRS.length} Pares Multi-Cadena`);
  logger.info(`   Modo DRY_RUN: ${ENV.dryRun ? 'ACTIVADO (Simulación sin riesgo)' : 'DESACTIVADO (MODO LIVE MAINNET REAL)'}`);
  logger.info(`   Ganancia Mínima Objetivo: $${ENV.minProfitUSD.toFixed(2)} USD`);
  logger.divider();

  // 1. Inicializar Gestor de RPCs y cargar Chainlist.org
  const rpcManager = new RPCManager();
  await rpcManager.loadChainlistRPCs();

  // Benchmark preliminar para TODAS las cadenas (Ethereum, Arbitrum, Optimism, Polygon, Base, BSC, Avalanche)
  logger.info('Iniciando benchmark de latencia RPC para todas las cadenas soportadas...');
  for (const chainIdStr of Object.keys(SUPPORTED_CHAINS)) {
    const chainId = parseInt(chainIdStr, 10);
    await rpcManager.benchmarkAndSelectBestRPC(chainId).catch(() => {});
  }

  // 2. Inicializar Swarm Cluster de 10 Agentes
  const swarmManager = new SwarmManager(rpcManager);
  setSwarmManager(swarmManager);

  // 3. Iniciar Servidor de API HTTP
  startServer();

  // 4. Arrancar ciclo del Cluster
  await swarmManager.startSwarmLoop();
}

main().catch((err) => {
  logger.error(`Fallo crítico al iniciar el cluster de agentes: ${err.message}`);
  process.exit(1);
});
