import { ENV } from './config/env';
import { MULTI_CHAIN_ARBITRAGE_PAIRS, SWARM_AGENTS } from './config/registry';
import { SUPPORTED_CHAINS } from './config/chains';
import { RPCManager } from './providers/rpcManager';
import { SwarmManager } from './cluster/swarmManager';
import { startServer, setSwarmManager } from './server';
import { logger } from './utils/logger';
import { telegramNotifier } from './notifications/telegramNotifier';
import { loadPersistedStats } from './utils/statsStore';
import { SweetSpotOptimizer } from './math/sweetSpotOptimizer';
import { ArbitrumSequencerFeedListener, BaseFlashblockFeedListener } from './mempool/mempoolListener';

async function main() {
  // Cargar estadísticas históricas desde disco
  loadPersistedStats();

  logger.divider();
  logger.info('🚀 INICIANDO MOTOR DE ARBITRAJE ATÓMICO V2 (100% PURE FLASH LOAN ON-CHAIN)');
  logger.info('   Motores Activos: LowFeeExecutor (8453/42161) | BaseFlashExecutor (8453) | ArbitrumExecutor (42161)');
  logger.info(`   Contratos Auditados: Base ${ENV.arbitrageContractBase} | Arbitrum ${ENV.arbitrageContractArbitrum}`);
  logger.info(`   Modo Operativo: ${ENV.dryRun ? 'DRY_RUN=true (Simulación Real con staticCall + estimateGas)' : 'LIVE MAINNET (Ejecución Real On-Chain)'}`);
  logger.info(`   Ganancia Mínima Objetivo: $${ENV.minProfitUSD.toFixed(2)} USD`);
  logger.info('   Optimizaciones MEV: 0% Capital Propio | Balancer 0% Fee / Aave V3 | Arbitrum Sequencer Feed | Base Flashblocks');
  logger.divider();

  // 1. Inicializar Gestor de RPCs y cargar Chainlist.org
  const rpcManager = new RPCManager();
  await rpcManager.loadChainlistRPCs();

  // 2. Monitoreo en Vivo de L1 Data Fee (EIP-4844 Blobs)
  const baseProvider = rpcManager.getProvider(8453);
  const arbProvider = rpcManager.getProvider(42161);
  await SweetSpotOptimizer.updateL1GasFees(baseProvider, arbProvider);
  logger.info(`⛽ [L1 DATA FEE MONITOR] Parámetros EIP-4844 actualizados (Base L1: ${SweetSpotOptimizer.liveL1BaseFeeBase} wei, Arb L1: ${SweetSpotOptimizer.liveL1BaseFeeArb} wei)`);

  setInterval(() => {
    SweetSpotOptimizer.updateL1GasFees(baseProvider, arbProvider).catch(() => {});
  }, 30000);

  // 3. Preparar Ejecutores 100% Flash Loan (Sin aprobaciones Permit2 ni gasto de tokens de cartera)

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

  // Benchmark preliminar para TODAS las cadenas
  logger.info('Iniciando benchmark de latencia RPC para todas las cadenas soportadas...');
  for (const chainIdStr of Object.keys(SUPPORTED_CHAINS)) {
    const chainId = parseInt(chainIdStr, 10);
    await rpcManager.benchmarkAndSelectBestRPC(chainId).catch(() => {});
    rpcManager.subscribeNewHeads(chainId, (blockNumber) => {
      // Disparo inmediato por WebSocket en milisegundo 0
    });
  }

  // 4. Inicializar Swarm Cluster de Agentes
  const swarmManager = new SwarmManager(rpcManager);
  setSwarmManager(swarmManager);

  // 5. Conexión de Infraestructura MEV de Alta Velocidad
  // Arbitrum Nitro Sequencer Feed (sub-10ms)
  const arbSequencerFeed = new ArbitrumSequencerFeedListener(
    ENV.arbitrumWssUrl || 'wss://arb1.arbitrum.io/feed',
    (batchCount) => {
      swarmManager.triggerChainScan(42161).catch(() => {});
    }
  );
  arbSequencerFeed.start();

  // Base Flashblocks / Bloques Rápidos
  const baseFlashblockFeed = new BaseFlashblockFeedListener(
    ENV.baseWssUrl || 'wss://base-rpc.publicnode.com',
    (blockNum) => {
      swarmManager.triggerChainScan(8453).catch(() => {});
    }
  );
  baseFlashblockFeed.start();

  // 6. Iniciar Servidor de API HTTP
  startServer();

  // 7. Notificar a Telegram
  await telegramNotifier.notifyStartup(MULTI_CHAIN_ARBITRAGE_PAIRS.length, SWARM_AGENTS.length).catch(() => {});

  // 8. Arquitectura MEV Reactiva por Eventos
  // Los escaneos son disparados en tiempo real por el Sequencer Feed de Arbitrum (<10ms)
  // y los Flashblocks de Base (200ms) sin sobrecargar RPCs ni generar telemetría falsa.
  // Para activar el bucle continuo tradicional del Swarm:
  // await swarmManager.startSwarmLoop();
  logger.success(`🔥 Motores de Arbitraje Activos: Escuchando eventos de Sequencer Feed y Flashblocks.`);
}

main().catch((err) => {
  logger.error(`Fallo crítico al iniciar el cluster de agentes: ${err.message}`);
  process.exit(1);
});
