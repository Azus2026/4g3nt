import { ethers } from 'ethers';
import { transactionDispatcher } from '../src/services/transactionDispatcher';
import { executionLedger } from '../src/utils/executionLedger';
import { ENV } from '../src/config/env';

/**
 * Suite de Verificación Automatizada - FASE 5: Centralización de Envíos, Nonces y Límite Diario de Gas ETH
 */
async function runPhase5Tests() {
  console.log('\n================================================================');
  console.log('🛡️ FASE 5: Batería de Pruebas de Despacho, Nonces y Guardia de Gas');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] Prueba ${total}: ${testName}`);
      if (detail) console.log(`     └─ ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] Prueba ${total}: ${testName}`);
      if (detail) console.error(`     └─ Detalle: ${detail}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PRUEBA 1: Mutex Lock por Cadena (1 Sola Transacción Concurrente)
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. Verificación de Exclusión Mutua (Mutex de Cadena) ---');
  const executionOrder: number[] = [];
  let concurrentExecutions = 0;
  let maxConcurrentDetected = 0;

  async function mockTask(id: number, delayMs: number) {
    return transactionDispatcher.executeWithChainLock(8453, async () => {
      concurrentExecutions++;
      if (concurrentExecutions > maxConcurrentDetected) {
        maxConcurrentDetected = concurrentExecutions;
      }
      await new Promise(r => setTimeout(r, delayMs));
      executionOrder.push(id);
      concurrentExecutions--;
      return id;
    });
  }

  // Disparar 3 tareas concurrentes en la misma cadena
  await Promise.all([
    mockTask(1, 60),
    mockTask(2, 40),
    mockTask(3, 20),
  ]);

  assert(
    maxConcurrentDetected === 1 && executionOrder.length === 3,
    'Mutex de cadena garantiza ejecución secuencial estricta (máx concurrencia = 1)',
    `Máx concurrencia observada: ${maxConcurrentDetected} | Orden de ejecución completado: [${executionOrder.join(', ')}]`
  );

  // ─────────────────────────────────────────────────────────────
  // PRUEBA 2: Continuidad y Reseteo de Nonces
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Continuidad y Reseteo Seguro de Nonces ---');
  let mockPendingNonce = 42;
  const mockWallet = {
    getNonce: async (blockTag: string) => mockPendingNonce,
  } as unknown as ethers.Wallet;

  transactionDispatcher.resetNonce(8453);
  const nonce1 = await transactionDispatcher.getNextNonce(mockWallet, 8453);
  const nonce2 = await transactionDispatcher.getNextNonce(mockWallet, 8453);
  const nonce3 = await transactionDispatcher.getNextNonce(mockWallet, 8453);

  // Simular error y reseteo
  transactionDispatcher.resetNonce(8453);
  mockPendingNonce = 45; // El nodo avanzó o se sincronizó
  const nonceAfterReset = await transactionDispatcher.getNextNonce(mockWallet, 8453);

  assert(
    nonce1 === 42 && nonce2 === 43 && nonce3 === 44 && nonceAfterReset === 45,
    'Gestor de nonces sincroniza de forma estrictamente monótona e inmune a colisiones',
    `Nonces asignados: ${nonce1} -> ${nonce2} -> ${nonce3} | Tras reset: ${nonceAfterReset}`
  );

  // ─────────────────────────────────────────────────────────────
  // PRUEBA 3: Guardia de Límite Diario de Gas (maxDailyGasEth)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Guardia de Límite Diario de Gas ETH ---');
  const tempLedger = new (executionLedger.constructor as any)(undefined, false);

  // Registrar consumos de gas controlados
  tempLedger.recordMinedTransaction({
    chainId: 8453,
    pairName: 'Test Gas 1',
    provider: 'balancer',
    loanTokenSymbol: 'WETH',
    loanTokenDecimals: 18,
    loanTokenPriceUSD: 2500,
    loanAmount: '1.0',
    ethPriceUSD: 2500,
    simulatedGrossProfitUSD: 1.0,
    simulatedGasUSD: 0.10,
    simulatedNetProfitUSD: 0.90,
    receipt: {
      gasUsed: 300_000n,
      gasPrice: 2_000_000_000n, // 2 gwei = 0.0006 ETH
      status: 1,
      logs: [],
    },
  });

  const check1 = tempLedger.canSpendGas(0.0005, 0.0015, 8453); // 0.0006 + 0.0005 = 0.0011 <= 0.0015
  const check2 = tempLedger.canSpendGas(0.0010, 0.0015, 8453); // 0.0006 + 0.0010 = 0.0016 > 0.0015 -> BLOQUEO

  assert(
    check1.allowed === true && check2.allowed === false && check1.spentSoFar === 0.0006,
    'Guardia de gas bloquea transacciones cuando se supera el presupuesto diario de 0.0015 ETH',
    `Gastado hoy: ${check1.spentSoFar} ETH | Intento 0.0005 ETH: ${check1.allowed ? 'PERMITIDO' : 'DENEGADO'} | Intento 0.0010 ETH: ${check2.allowed ? 'PERMITIDO' : 'BLOQUEADO'}`
  );

  // ─────────────────────────────────────────────────────────────
  // PRUEBA 4: Aislamiento Estricto DRY_RUN (0 Gas y Cero Tx Reales)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Aislamiento Estricto de DRY_RUN vs LIVE ---');
  const simEntry = tempLedger.recordSimulation({
    chainId: 8453,
    pairName: 'WETH ➔ USDC ➔ WETH (DRY RUN)',
    provider: 'balancer',
    loanTokenSymbol: 'WETH',
    loanAmount: '2.5',
    simulatedGrossProfitUSD: 3.50,
    simulatedGasUSD: 0.06,
    simulatedNetProfitUSD: 3.44,
  });

  const summary = tempLedger.getSummary();
  assert(
    simEntry.status === 'SIMULATED' &&
    summary.simulatedCount === 1 &&
    summary.totalGasSpentETH === 0.0006 && // Solo el mock de la prueba 3, la simulación gastó 0 ETH
    summary.minedSuccessCount === 1,
    'Las simulaciones DRY_RUN quedan aisladas sin gastar gas ni sumar PnL realizado falso',
    `Simuladas: ${summary.simulatedCount} (+$${summary.simulatedPnLUSD} USD) | Minadas: ${summary.minedSuccessCount} | Gas Real Gastado: ${summary.totalGasSpentETH} ETH`
  );

  // ─────────────────────────────────────────────────────────────
  // PRUEBA 5: Extracción Real de Ganancias desde Eventos del Recibo
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. Extracción Real de Ganancias desde Evento FlashLoanExecuted ---');
  const flashIface = new ethers.Interface([
    'event FlashLoanExecuted(address indexed token, uint256 loanAmount, uint256 grossProfit, uint256 timestamp)'
  ]);

  const mockLog = flashIface.encodeEventLog(
    flashIface.getEvent('FlashLoanExecuted')!,
    [
      '0x4200000000000000000000000000000000000006', // WETH
      ethers.parseEther('5.0'),
      ethers.parseEther('0.002'), // 0.002 ETH ganancia bruta real = $5.00 USD
      BigInt(Math.floor(Date.now() / 1000)) // timestamp
    ]
  );

  const realTxEntry = tempLedger.recordMinedTransaction({
    chainId: 8453,
    pairName: 'WETH ➔ AERO ➔ WETH',
    provider: 'balancer',
    loanTokenSymbol: 'WETH',
    loanTokenDecimals: 18,
    loanTokenPriceUSD: 2500,
    loanAmount: '5.0',
    ethPriceUSD: 2500,
    simulatedGrossProfitUSD: 5.0,
    simulatedGasUSD: 0.10,
    simulatedNetProfitUSD: 4.90,
    receipt: {
      gasUsed: 210_000n,
      gasPrice: 100_000_000n, // 0.1 gwei = 0.000021 ETH = ~$0.0525 USD
      status: 1,
      logs: [{
        topics: mockLog.topics,
        data: mockLog.data,
      }],
    },
  });

  assert(
    realTxEntry.status === 'MINED_SUCCESS' &&
    realTxEntry.realizedGrossProfitUSD === 5.0 &&
    realTxEntry.realizedNetProfitUSD !== null &&
    realTxEntry.realizedNetProfitUSD > 4.90,
    'Ganancia neta real calculada a partir del log on-chain descontando el gas efectivo',
    `Gross Realizado: $${realTxEntry.realizedGrossProfitUSD} USD | Gas Cobrado: $${realTxEntry.actualGasCostUSD} USD | Neto Realizado: +$${realTxEntry.realizedNetProfitUSD} USD`
  );

  console.log('\n================================================================');
  console.log(`📊 RESULTADO FASE 5: ${passed} / ${total} Pruebas Exitosas (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error('Fatal error in Phase 5 tests:', err);
  process.exit(1);
});
