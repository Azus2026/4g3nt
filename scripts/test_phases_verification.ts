import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { SweetSpotOptimizer } from '../src/math/sweetSpotOptimizer';
import { LENDING_POOLS } from '../src/liquidations/lendingRegistry';
import { BASE_100_TOKENS } from '../src/config/baseTokens100';
import { spotExecutor } from '../src/executor/spotExecutor';

async function runPhasesVerification() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🧪 SUITE DE PRUEBAS DE VERIFICACIÓN COMPLETA (FASES 1 A 5 AUDITADAS)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail: string = '') {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      if (detail) console.log(`     └─ ${detail}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`     └─ ERROR: ${detail}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // FASE 1: Smart Contracts Blindados con Retornos de Ganancia
  // ─────────────────────────────────────────────────────────────────
  console.log('🛡️ FASE 1: Verificación de Smart Contracts Blindados');

  const baseArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'BaseUniversalArbitrage.sol', 'BaseUniversalArbitrage.json');
  const arbArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'ArbitrumUniversalArbitrage.sol', 'ArbitrumUniversalArbitrage.json');

  assert(fs.existsSync(baseArtifactPath), 'Artifact de BaseUniversalArbitrage existe');
  assert(fs.existsSync(arbArtifactPath), 'Artifact de ArbitrumUniversalArbitrage existe');

  if (fs.existsSync(baseArtifactPath)) {
    const baseArtifact = JSON.parse(fs.readFileSync(baseArtifactPath, 'utf8'));
    const abi = baseArtifact.abi;
    const executeBalancerSpatial = abi.find((i: any) => i.name === 'executeBalancerFlashLoanSpatial');
    const hasOutputs = executeBalancerSpatial && executeBalancerSpatial.outputs && executeBalancerSpatial.outputs.length > 0;
    assert(hasOutputs, 'BaseUniversalArbitrage: executeBalancerFlashLoanSpatial tiene returns (uint256 profit)');

    const executeAaveSpatial = abi.find((i: any) => i.name === 'executeFlashLoanSpatial');
    const aaveHasOutputs = executeAaveSpatial && executeAaveSpatial.outputs && executeAaveSpatial.outputs.length > 0;
    assert(aaveHasOutputs, 'BaseUniversalArbitrage: executeFlashLoanSpatial tiene returns (uint256 profit)');
  }

  if (fs.existsSync(arbArtifactPath)) {
    const arbArtifact = JSON.parse(fs.readFileSync(arbArtifactPath, 'utf8'));
    const abi = arbArtifact.abi;
    const executeBalancerSpatialArb = abi.find((i: any) => i.name === 'executeBalancerFlashLoanSpatial');
    const hasOutputsArb = executeBalancerSpatialArb && executeBalancerSpatialArb.outputs && executeBalancerSpatialArb.outputs.length > 0;
    assert(hasOutputsArb, 'ArbitrumUniversalArbitrage: executeBalancerFlashLoanSpatial tiene returns (uint256 profit)');
  }

  // ─────────────────────────────────────────────────────────────────
  // FASE 2: Purga Absoluta de Fórmulas Ficticias en Ejecutores
  // ─────────────────────────────────────────────────────────────────
  console.log('\n🧹 FASE 2: Verificación de Eliminación de Humo en Ejecutores');

  const executorFiles = ['spotExecutor.ts', 'arbitrumExecutor.ts', 'lowFeeExecutor.ts'];
  for (const file of executorFiles) {
    const filePath = path.join(__dirname, '..', 'src', 'executor', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasMathSin = /Math\.(sin|cos)/.test(content);
      assert(!hasMathSin, `src/executor/${file} no contiene fórmulas sinusoidales (Math.sin/cos)`);
      const hasEstimateGas = content.includes('estimateGas');
      assert(hasEstimateGas, `src/executor/${file} implementa pre-flight check dinámico con estimateGas`);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // FASE 3: Saneamiento de Datos, Tokens y Métodos de Agente
  // ─────────────────────────────────────────────────────────────────
  console.log('\n💎 FASE 3: Verificación de Tokens Verificados y Puentes');

  let invalidAddressesCount = 0;
  for (const token of BASE_100_TOKENS) {
    if (!token.address.startsWith('0x') || token.address.length !== 42 || !/^0x[0-9a-fA-F]{40}$/.test(token.address)) {
      invalidAddressesCount++;
    }
  }
  assert(invalidAddressesCount === 0, `Todos los tokens en baseTokens100.ts son direcciones hex válidas (${BASE_100_TOKENS.length} tokens verificados)`);

  const hasExecuteSpotMethod = typeof (spotExecutor as any).executeSpot === 'function';
  assert(hasExecuteSpotMethod, 'SpotExecutor expone el método puente executeSpot(opp) para compatibilidad con agentWorker');

  // ─────────────────────────────────────────────────────────────────
  // FASE 4: Unificación Matemática y L1 Data Fee Real
  // ─────────────────────────────────────────────────────────────────
  console.log('\n⛽ FASE 4: Verificación de Gas Real (L1 Data Fee + L2 Execution)');

  const duplicatedFile = path.join(__dirname, '..', 'src', 'agent', 'sweetSpotOptimizer.ts');
  assert(!fs.existsSync(duplicatedFile), 'Archivo duplicado src/agent/sweetSpotOptimizer.ts eliminado');

  const baseGasCalc = SweetSpotOptimizer.calculateTotalGasCostUSD(8453, 200_000n, 0.05, 2500, 384);
  assert(baseGasCalc.l1DataFeeUSD > 0, 'Base L1 Calldata Fee correctamente calculado (> $0.001 USD)');

  const microArbResult = SweetSpotOptimizer.calculateOptimalLoan(1000, 0.0001, 1.0, baseGasCalc.totalGasUSD, 2500, 0.0, 0.01);
  assert(!microArbResult.isViable, 'Filtro anti-sub-centavo: spread menor al costo de L1 Data Fee es rechazado');

  // ─────────────────────────────────────────────────────────────────
  // FASE 5: Rendimiento Flash Loan 0% Balancer vs 5 bps Aave
  // ─────────────────────────────────────────────────────────────────
  console.log('\n📊 FASE 5: Comparativa de Rendimiento Balancer (0% Fee) vs Aave (0.05%)');

  const balancerResult = SweetSpotOptimizer.calculateOptimalLoan(5000, 0.0035, 2000, baseGasCalc.totalGasUSD, 2500, 0.0, 0.01);
  const aaveResult = SweetSpotOptimizer.calculateOptimalLoan(5000, 0.0035, 2000, baseGasCalc.totalGasUSD, 2500, 0.0005, 0.01);

  assert(
    balancerResult.expectedNetProfitUSD > aaveResult.expectedNetProfitUSD,
    'Balancer V2 retiene mayor ganancia neta al tener 0% fee frente a Aave (0.05%)',
    `Balancer: $${balancerResult.expectedNetProfitUSD} | Aave: $${aaveResult.expectedNetProfitUSD}`
  );

  // ─────────────────────────────────────────────────────────────────
  // RESUMEN FINAL
  // ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`🏁 RESULTADO: ${passedTests} / ${totalTests} Pruebas Exitosas (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhasesVerification().catch((e) => {
  console.error('Fallo en la suite de pruebas:', e);
  process.exit(1);
});
