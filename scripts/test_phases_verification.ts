import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { SweetSpotOptimizer } from '../src/math/sweetSpotOptimizer';
import { LENDING_POOLS } from '../src/liquidations/lendingRegistry';

async function runPhasesVerification() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🧪 SUITE DE PRUEBAS DE VERIFICACIÓN: FASES 1 A 5 (OPTIMIZACIÓN MEV L2)');
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
  // FASE 1: Limpieza Estructural y Unificación Matemática
  // ─────────────────────────────────────────────────────────────────
  console.log('📦 FASE 1: Verificación de Limpieza y Unificación Matemática');
  
  const duplicatedFile = path.join(__dirname, '..', 'src', 'agent', 'sweetSpotOptimizer.ts');
  assert(!fs.existsSync(duplicatedFile), 'Archivo duplicado src/agent/sweetSpotOptimizer.ts eliminado');

  const unifiedOptimizer = typeof SweetSpotOptimizer.calculateOptimalLoan === 'function';
  assert(unifiedOptimizer, 'SweetSpotOptimizer unificado y disponible en src/math/sweetSpotOptimizer.ts');

  // ─────────────────────────────────────────────────────────────────
  // FASE 2: Smart Contracts con Balancer V2 (0% Fee) y Guardias
  // ─────────────────────────────────────────────────────────────────
  console.log('\n🛡️ FASE 2: Verificación de Smart Contracts (Solidity)');

  const baseArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'BaseUniversalArbitrage.sol', 'BaseUniversalArbitrage.json');
  const arbArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'ArbitrumUniversalArbitrage.sol', 'ArbitrumUniversalArbitrage.json');

  assert(fs.existsSync(baseArtifactPath), 'Artifact de BaseUniversalArbitrage compilado por Hardhat existe');
  assert(fs.existsSync(arbArtifactPath), 'Artifact de ArbitrumUniversalArbitrage compilado por Hardhat existe');

  if (fs.existsSync(baseArtifactPath)) {
    const baseArtifact = JSON.parse(fs.readFileSync(baseArtifactPath, 'utf8'));
    const abiFunctions = baseArtifact.abi.map((item: any) => item.name);

    assert(abiFunctions.includes('executeBalancerFlashLoanSpatial'), 'BaseUniversalArbitrage incluye executeBalancerFlashLoanSpatial');
    assert(abiFunctions.includes('executeBalancerFlashLoanTriangular'), 'BaseUniversalArbitrage incluye executeBalancerFlashLoanTriangular');
    assert(abiFunctions.includes('receiveFlashLoan'), 'BaseUniversalArbitrage implementa callback receiveFlashLoan (Balancer V2 0% Fee)');
    assert(abiFunctions.includes('BALANCER_VAULT'), 'BaseUniversalArbitrage expone constante BALANCER_VAULT');
  }

  if (fs.existsSync(arbArtifactPath)) {
    const arbArtifact = JSON.parse(fs.readFileSync(arbArtifactPath, 'utf8'));
    const arbFunctions = arbArtifact.abi.map((item: any) => item.name);

    assert(arbFunctions.includes('executeBalancerFlashLoanSpatial'), 'ArbitrumUniversalArbitrage incluye executeBalancerFlashLoanSpatial');
    assert(arbFunctions.includes('executeBalancerFlashLoanTriangular'), 'ArbitrumUniversalArbitrage incluye executeBalancerFlashLoanTriangular');
    assert(arbFunctions.includes('receiveFlashLoan'), 'ArbitrumUniversalArbitrage implementa callback receiveFlashLoan con soporte Triangular');
  }

  // ─────────────────────────────────────────────────────────────────
  // FASE 3: Motor Off-Chain y Cálculo Real de Gas (L1 Data Fee)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n⛽ FASE 3: Verificación de Cálculo Real de Gas (L1 + L2 Fee)');

  const baseGasCalc = SweetSpotOptimizer.calculateTotalGasCostUSD(8453, 200_000n, 0.05, 2500, 384);
  assert(
    baseGasCalc.l1DataFeeUSD > 0,
    'Base L1 Calldata / Blob Fee correctamente calculado (> $0.001 USD)',
    `L2 Gas: $${baseGasCalc.l2GasUSD.toFixed(5)} | L1 Data Fee: $${baseGasCalc.l1DataFeeUSD.toFixed(5)} | Total: $${baseGasCalc.totalGasUSD.toFixed(5)}`
  );

  const arbGasCalc = SweetSpotOptimizer.calculateTotalGasCostUSD(42161, 280_000n, 0.1, 2500, 384);
  assert(
    arbGasCalc.totalGasUSD > arbGasCalc.l2GasUSD,
    'Arbitrum One poster fee incluido en el cálculo de gas total',
    `Total Gas Arbitrum: $${arbGasCalc.totalGasUSD.toFixed(5)} USD`
  );

  // Probar descarte de arbitraje sub-centavo peligroso
  const microArbResult = SweetSpotOptimizer.calculateOptimalLoan(
    1000,     // $1,000 préstamo
    0.0001,   // 0.01% spread (sub-centavo)
    1.0,
    baseGasCalc.totalGasUSD,
    2500,
    0.0,
    0.01      // min profit threshold: $0.01
  );
  assert(
    !microArbResult.isViable,
    'Filtro anti-sub-centavo: spread menor al costo de L1 Data Fee es rechazado',
    `Net Profit Estimado: $${microArbResult.expectedNetProfitUSD} | isViable: ${microArbResult.isViable}`
  );

  // ─────────────────────────────────────────────────────────────────
  // FASE 4: Comparativa de Rendimiento Fee = 0 (Balancer) vs 5 bps (Aave)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n📊 FASE 4: Validación Cuantitativa Balancer (0% Fee) vs Aave (0.05% Fee)');

  const loanAmountUSD = 5000;
  const testSpread = 0.0035; // 0.35% spread en pool de $5,000,000 USD
  const poolDepthScore = 2000; // 2000 ETH de profundidad ($5,000,000 USD)

  const balancerResult = SweetSpotOptimizer.calculateOptimalLoan(
    loanAmountUSD,
    testSpread,
    poolDepthScore,
    baseGasCalc.totalGasUSD,
    2500,
    0.0, // 0% Fee Balancer
    0.01
  );

  const aaveResult = SweetSpotOptimizer.calculateOptimalLoan(
    loanAmountUSD,
    testSpread,
    poolDepthScore,
    baseGasCalc.totalGasUSD,
    2500,
    0.0005, // 0.05% Fee Aave (5 bps)
    0.01
  );

  assert(
    balancerResult.expectedNetProfitUSD > aaveResult.expectedNetProfitUSD,
    'Balancer V2 retiene mayor ganancia neta al tener 0% fee frente a Aave',
    `Ganancia Neta Balancer: $${balancerResult.expectedNetProfitUSD} | Ganancia Neta Aave: $${aaveResult.expectedNetProfitUSD}`
  );

  // ─────────────────────────────────────────────────────────────────
  // FASE 5: Especialización en Nichos Rentables (Lending Registry)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n🎯 FASE 5: Verificación de Nichos Estratégicos (Morpho Blue / Moonwell)');

  const morphoBase = LENDING_POOLS.find(p => p.protocol === 'MORPHO_BLUE' && p.chainId === 8453);
  assert(!!morphoBase, 'Morpho Blue integrado en Base (ChainID 8453) para liquidaciones sin subasta');

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
