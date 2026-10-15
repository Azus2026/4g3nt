const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outPath1 = path.join(rootDir, 'codigocompleto.txt');
const outPath2 = path.resolve('C:/Users/Jose/Downloads/arb v3/codigocompleto.txt');

const filesToInclude = [
  // 1. Smart Contracts Blindados
  'contracts/BaseUniversalArbitrage.sol',
  'contracts/ArbitrumUniversalArbitrage.sol',
  'contracts/FlashLoanArbitrageReceiver.sol',

  // 2. Configuración, Parámetros y Tokens
  'package.json',
  'hardhat.config.ts',
  'src/config/env.ts',
  'src/config/chains.ts',
  'src/config/registry.ts',
  'src/config/baseTokens100.ts',
  'src/config/knownPools.ts',
  'src/config/squadrons.ts',
  'src/config/armadas.ts',

  // 3. Motores de Optimización Matemática y L1 Data Fee
  'src/math/sweetSpotOptimizer.ts',

  // 4. Ejecutores de Arbitraje
  'src/executor/spotExecutor.ts',
  'src/executor/arbitrumExecutor.ts',
  'src/executor/lowFeeExecutor.ts',
  'src/executor/multiChainExecutor.ts',
  'src/executor/permit2ApprovalManager.ts',
  'src/executor/flashBundleAccumulator.ts',

  // 5. Infraestructura MEV, Mempool y Sequencer Feeds
  'src/mempool/mempoolListener.ts',
  'src/mempool/backrunEngine.ts',
  'src/mempool/quicknodeStreamProcessor.ts',
  'src/providers/rpcManager.ts',
  'src/scanners/sharedPoolStateEngine.ts',
  'src/scanners/cexLagPredictor.ts',
  'src/scanners/binanceWebSocketFeed.ts',
  'src/scanners/triangularArbitrageEngine.ts',
  'src/scanners/intraDexFeeTierEngine.ts',
  'src/scanners/stableDepegEngine.ts',
  'src/scanners/subCentMicroArbEngine.ts',
  'src/scanners/yulStorageLensEngine.ts',

  // 6. Cluster y Swarm de Agentes
  'src/cluster/swarmManager.ts',
  'src/cluster/agentWorker.ts',

  // 7. Servidor, Notificaciones y Entrypoints
  'src/index.ts',
  'src/server.ts',
  'src/notifications/telegramNotifier.ts',
  'src/utils/logger.ts',
  'src/utils/statsStore.ts',
  'src/utils/historyStore.ts',

  // 8. Scripts de Despliegue y Suites de Pruebas
  'scripts/test_phases_verification.ts',
  'scripts/test_fork_simulation.ts',
  'scripts/deployBase.ts',
  'scripts/deployArbitrum.ts'
];

let fullText = '===============================================================================\n';
fullText += '  SISTEMA COMPLETO DE ARBITRAJE MEV CON FLASH LOANS (ARBITRUM & BASE)\n';
fullText += '  CÓDIGO FUENTE AUDITADO, ESTRUCTURADO Y CORREGIDO (FASES 1 A 5 COMPLETADAS)\n';
fullText += '  Fecha de Generación: ' + new Date().toISOString() + '\n';
fullText += '===============================================================================\n\n';

fullText += 'ÍNDICE GENERAL DE ARCHIVOS INCLUIDOS:\n';
filesToInclude.forEach((f, idx) => {
  fullText += `  [${(idx + 1).toString().padStart(2, '0')}] ${f}\n`;
});
fullText += '\n' + '='.repeat(79) + '\n\n';

for (const relPath of filesToInclude) {
  const absPath = path.join(rootDir, relPath);
  if (fs.existsSync(absPath)) {
    const content = fs.readFileSync(absPath, 'utf8');
    fullText += '\n' + '█'.repeat(79) + '\n';
    fullText += `██ ARCHIVO: ${relPath}\n`;
    fullText += `██ RUTA ABSOLUTA: ${absPath}\n`;
    fullText += '█'.repeat(79) + '\n\n';
    fullText += content + '\n\n';
  } else {
    fullText += `\n[ARCHIVO NO ENCONTRADO]: ${relPath}\n\n`;
  }
}

fs.writeFileSync(outPath1, fullText, 'utf8');
console.log(`✅ codigocompleto.txt generado exitosamente en: ${outPath1} (${(fullText.length / 1024).toFixed(1)} KB)`);

try {
  const dir2 = path.dirname(outPath2);
  if (!fs.existsSync(dir2)) fs.mkdirSync(dir2, { recursive: true });
  fs.writeFileSync(outPath2, fullText, 'utf8');
  console.log(`✅ codigocompleto.txt copiado exitosamente en: ${outPath2}`);
} catch (e) {
  console.log(`Nota sobre destino secundario: ${e.message}`);
}
