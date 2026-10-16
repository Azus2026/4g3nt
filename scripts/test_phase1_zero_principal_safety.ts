import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { ethers } from 'ethers';
import { parseDryRun, normalizeFlashLoanProvider } from '../src/config/env';
import { ProtocolinkClient } from '../src/protocolink/protocolinkClient';
import { Permit2ApprovalManager } from '../src/executor/permit2ApprovalManager';
import { ExecutionLedger } from '../src/utils/executionLedger';

async function runPhase1Tests() {
  console.log('====================================================================');
  console.log('🛡️  EJECUTANDO SUITE DE VERIFICACIÓN — FASE 1: SEGURIDAD ZERO-PRINCIPAL');
  console.log('====================================================================\n');

  let passed = 0;
  const rootDir = path.resolve(__dirname, '..');

  // ---------------------------------------------------------------------------
  // TEST 1: Fail-Safe DRY_RUN Parser
  // ---------------------------------------------------------------------------
  console.log('▶️  [TEST 1] Verificando Fail-Safe de DRY_RUN (por defecto simulación)...');
  assert.strictEqual(parseDryRun(undefined), true, 'undefined debe activar DRY_RUN=true');
  assert.strictEqual(parseDryRun(''), true, 'cadena vacía debe activar DRY_RUN=true');
  assert.strictEqual(parseDryRun('true'), true, '"true" debe activar DRY_RUN=true');
  assert.strictEqual(parseDryRun('TRUE '), true, '"TRUE " debe activar DRY_RUN=true');
  assert.strictEqual(parseDryRun('1'), true, '"1" debe activar DRY_RUN=true');
  assert.strictEqual(parseDryRun('yes'), true, '"yes" debe activar DRY_RUN=true');
  assert.strictEqual(parseDryRun('false'), false, '"false" explícito debe permitir modo live');
  assert.strictEqual(parseDryRun(' FALSE '), false, '" FALSE " explícito debe permitir modo live');
  console.log('   ✅ [PASS] parseDryRun bloquea cualquier valor ambiguo y solo activa modo live con "false" explícito.\n');
  passed++;

  // ---------------------------------------------------------------------------
  // TEST 2: Normalización de Proveedor Flash Loan (balancer vs balancerv2)
  // ---------------------------------------------------------------------------
  console.log('▶️  [TEST 2] Verificando normalización de proveedor Flash Loan (Balancer V2 vs Aave V3)...');
  assert.strictEqual(normalizeFlashLoanProvider('balancer'), 'balancer');
  assert.strictEqual(normalizeFlashLoanProvider('balancerv2'), 'balancer');
  assert.strictEqual(normalizeFlashLoanProvider('BALANCER'), 'balancer');
  assert.strictEqual(normalizeFlashLoanProvider(undefined), 'balancer');
  assert.strictEqual(normalizeFlashLoanProvider('aave'), 'aave');
  assert.strictEqual(normalizeFlashLoanProvider('aavev3'), 'aave');

  const protoClientSrc = fs.readFileSync(path.join(rootDir, 'src', 'protocolink', 'protocolinkClient.ts'), 'utf-8');
  assert.ok(
    protoClientSrc.includes("providerPref === 'balancer' || providerPref === 'balancerv2'"),
    'protocolinkClient.ts debe aceptar tanto "balancer" como "balancerv2"'
  );
  console.log('   ✅ [PASS] Selección de Balancer V2 corregida en env.ts y protocolinkClient.ts.\n');
  passed++;

  // ---------------------------------------------------------------------------
  // TEST 3: Erradicación del Fallback P0 de Swap Simple (buildDirectUniswapV3Transaction)
  // ---------------------------------------------------------------------------
  console.log('▶️  [TEST 3] Verificando eliminación total del fallback de swap simple con capital propio...');
  const client = new ProtocolinkClient() as any;
  assert.strictEqual(
    typeof client.buildDirectUniswapV3Transaction,
    'undefined',
    'buildDirectUniswapV3Transaction NO debe existir en ProtocolinkClient'
  );
  assert.strictEqual(
    typeof client.buildDirectParaSwapTransaction,
    'undefined',
    'buildDirectParaSwapTransaction NO debe existir en ProtocolinkClient'
  );
  assert.ok(
    !protoClientSrc.includes('buildDirectUniswapV3Transaction'),
    'El código fuente de protocolinkClient.ts no debe contener buildDirectUniswapV3Transaction'
  );

  // Simular fallo de construcción de lógica en Protocolink y comprobar que aborta (routerData: null)
  client.getFlashLoanPair = async () => [null, null];
  client.getProtocolinkLogic = async () => null;

  const dummyTokenA = {
    chainId: 8453,
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
  };
  const dummyTokenB = {
    chainId: 8453,
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  };

  const fallbackRes = await client.buildArbitrageTransaction(
    '0xf6Bb92Ac612D814F2A1e67Bf713F2f732419AC87',
    8453,
    {
      protocolId: 'uniswap-v3',
      chainId: 8453,
      inputToken: dummyTokenA,
      outputToken: dummyTokenB,
      inputAmount: '0.5',
      outputAmount: '1250',
      logic: null,
    },
    {
      protocolId: 'aerodrome-slipstream',
      chainId: 8453,
      inputToken: dummyTokenB,
      outputToken: dummyTokenA,
      inputAmount: '1250',
      outputAmount: '0.502',
      logic: null,
    },
    dummyTokenA,
    '0.5'
  );

  assert.strictEqual(fallbackRes.routerData, null, 'Si falla el armado Flash Loan, routerData DEBE ser null (aborto seguro)');
  assert.strictEqual(fallbackRes.logics.length, 0, 'logics debe estar vacío al abortar');
  console.log('   ✅ [PASS] El ejecutor aborta de forma segura cuando falla el ciclo Flash Loan; jamás construye un swap de 1 sola pata.\n');
  passed++;

  // ---------------------------------------------------------------------------
  // TEST 4: Erradicación de Rutas Spot, Permit2 Approvals y Contrato Legacy
  // ---------------------------------------------------------------------------
  console.log('▶️  [TEST 4] Verificando erradicación de rutas Spot, Permit2 y contrato legacy vulnerable...');
  const legacyContractPath = path.join(rootDir, 'contracts', 'FlashLoanArbitrageReceiver.sol');
  assert.strictEqual(
    fs.existsSync(legacyContractPath),
    false,
    'contracts/FlashLoanArbitrageReceiver.sol debe haber sido eliminado'
  );

  const indexSrc = fs.readFileSync(path.join(rootDir, 'src', 'index.ts'), 'utf-8');
  assert.ok(!indexSrc.includes('Permit2ApprovalManager'), 'src/index.ts no debe invocar Permit2ApprovalManager');

  const p2Manager = new Permit2ApprovalManager();
  await p2Manager.ensureAllPermit2Approvals(); // Debe ser no-op instantáneo sin llamadas RPC

  const spotExecSrc = fs.readFileSync(path.join(rootDir, 'src', 'executor', 'spotExecutor.ts'), 'utf-8');
  const lowFeeExecSrc = fs.readFileSync(path.join(rootDir, 'src', 'executor', 'lowFeeExecutor.ts'), 'utf-8');
  const agentWorkerSrc = fs.readFileSync(path.join(rootDir, 'src', 'cluster', 'agentWorker.ts'), 'utf-8');

  assert.ok(!spotExecSrc.includes('executeSpotSpatial'), 'spotExecutor.ts no debe llamar a executeSpotSpatial');
  assert.ok(!spotExecSrc.includes('executeSpotTriangular'), 'spotExecutor.ts no debe llamar a executeSpotTriangular');
  assert.ok(!spotExecSrc.includes('SPOT_AMOUNT_TIERS'), 'spotExecutor.ts no debe tener SPOT_AMOUNT_TIERS');
  assert.ok(!lowFeeExecSrc.includes('executeSpotSpatial'), 'lowFeeExecutor.ts no debe llamar a executeSpotSpatial');
  assert.ok(!lowFeeExecSrc.includes('spotAmounts'), 'lowFeeExecutor.ts no debe tener spotAmounts');
  assert.ok(!agentWorkerSrc.includes('spotExecutor.executeSpot'), 'agentWorker.ts no debe invocar spotExecutor.executeSpot');
  console.log('   ✅ [PASS] 0% uso de tokens de la billetera: sin llamadas Spot, sin Permit2 approve() y sin contrato legacy.\n');
  passed++;

  // ---------------------------------------------------------------------------
  // TEST 5: Separación Contable Estricta (SIMULATED vs MINED_SUCCESS / MINED_REVERTED)
  // ---------------------------------------------------------------------------
  console.log('▶️  [TEST 5] Verificando separación contable en ExecutionLedger y ejecutores...');
  const testLedger = new ExecutionLedger(undefined, false); // In-memory, sin tocar disco

  // 5.1 Registrar 3 simulaciones en DRY_RUN
  testLedger.recordSimulation({
    chainId: 8453,
    pairName: 'WETH/USDC (UniV3 -> AeroCL)',
    provider: 'balancer',
    loanTokenSymbol: 'WETH',
    loanAmount: '0.5',
    simulatedGrossProfitUSD: 1.30,
    simulatedGasUSD: 0.05,
    simulatedNetProfitUSD: 1.25,
  });
  testLedger.recordSimulation({
    chainId: 8453,
    pairName: 'WETH/BRETT (AeroV2 -> UniV3)',
    provider: 'balancer',
    loanTokenSymbol: 'WETH',
    loanAmount: '1.5',
    simulatedGrossProfitUSD: 0.85,
    simulatedGasUSD: 0.05,
    simulatedNetProfitUSD: 0.80,
  });
  testLedger.recordSimulation({
    chainId: 42161,
    pairName: 'WETH/USDC (UniV3 -> CamelotV3)',
    provider: 'balancer',
    loanTokenSymbol: 'WETH',
    loanAmount: '2.5',
    simulatedGrossProfitUSD: 2.15,
    simulatedGasUSD: 0.05,
    simulatedNetProfitUSD: 2.10,
  });

  let summary = testLedger.getSummary();
  assert.strictEqual(summary.simulatedCount, 3, 'Debe registrar exactamente 3 simulaciones');
  assert.strictEqual(summary.simulatedPnLUSD, 4.15, 'El PnL simulado acumulado debe ser $4.15 USD');
  assert.strictEqual(summary.minedSuccessCount, 0, 'Las simulaciones JAMÁS deben incrementar minedSuccessCount');
  assert.strictEqual(summary.realizedPnLUSD, 0, 'Las simulaciones JAMÁS deben incrementar realizedPnLUSD');

  // 5.2 Registrar 1 transacción real minada exitosa con evento FlashLoanExecuted
  const eventIface = new ethers.Interface([
    'event FlashLoanExecuted(address indexed token, uint256 loanAmount, uint256 grossProfit, uint256 timestamp)'
  ]);
  const encodedLog = eventIface.encodeEventLog(
    eventIface.getEvent('FlashLoanExecuted')!,
    [
      '0x4200000000000000000000000000000000000006',
      ethers.parseEther('0.5'),
      ethers.parseEther('0.002'), // 0.002 WETH = $5.00 USD a $2500/ETH
      1792150000n
    ]
  );

  const minedEntry = testLedger.recordMinedTransaction({
    chainId: 8453,
    pairName: 'WETH/USDC (UniV3 -> AeroCL)',
    provider: 'balancer',
    loanTokenSymbol: 'WETH',
    loanTokenDecimals: 18,
    loanTokenPriceUSD: 2500,
    loanAmount: '0.5',
    ethPriceUSD: 2500,
    simulatedGrossProfitUSD: 4.80,
    simulatedGasUSD: 0.01,
    simulatedNetProfitUSD: 4.79,
    receipt: {
      hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      status: 1,
      blockNumber: 52685000,
      gasUsed: 250_000n,
      effectiveGasPrice: 10_000_000n, // 0.01 gwei -> 2.5e12 wei
      l1Fee: 500_000_000_000n,        // 0.5e12 wei -> total gas = 3e12 wei = 0.000003 ETH = $0.0075 USD
      logs: [encodedLog],
    },
  });

  assert.strictEqual(minedEntry.status, 'MINED_SUCCESS');
  assert.strictEqual(minedEntry.realizedGrossProfitUSD, 5.0, 'Ganancia bruta decodificada del log debe ser $5.00 USD');
  assert.strictEqual(minedEntry.actualGasCostUSD, 0.0075, 'Gas real del recibo debe ser $0.0075 USD');
  assert.strictEqual(minedEntry.realizedNetProfitUSD, 4.9925, 'Ganancia neta real reconciliada debe ser $4.9925 USD');

  // 5.3 Registrar 1 transacción revertida on-chain (status: 0) y verificar descuento de gas real
  const revertedEntry = testLedger.recordMinedTransaction({
    chainId: 8453,
    pairName: 'WETH/DEGEN (UniV3 -> AeroV2)',
    provider: 'balancer',
    loanTokenSymbol: 'WETH',
    loanTokenDecimals: 18,
    loanTokenPriceUSD: 2500,
    loanAmount: '0.5',
    ethPriceUSD: 2500,
    simulatedGrossProfitUSD: 0.50,
    simulatedGasUSD: 0.01,
    simulatedNetProfitUSD: 0.49,
    receipt: {
      hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
      status: 0,
      blockNumber: 52685005,
      gasUsed: 180_000n,
      effectiveGasPrice: 20_000_000n, // 3.6e12 wei
      l1Fee: 400_000_000_000n,        // 0.4e12 wei -> total gas = 4e12 wei = 0.000004 ETH = $0.01 USD
      logs: [],
    },
  });

  assert.strictEqual(revertedEntry.status, 'MINED_REVERTED');
  assert.strictEqual(revertedEntry.realizedNetProfitUSD, -0.01, 'Una tx revertida debe contabilizar la pérdida exacta de gas (-$0.01 USD)');

  summary = testLedger.getSummary();
  assert.strictEqual(summary.minedSuccessCount, 1);
  assert.strictEqual(summary.minedRevertedCount, 1);
  assert.strictEqual(summary.realizedPnLUSD, 4.9825, 'El PnL neto realizado total debe ser $4.9925 - $0.01 = $4.9825 USD');
  console.log('   ✅ [PASS] Contabilidad estrictamente separada: DRY_RUN va a SIMULATED y solo recibos reales alimentan realizedPnLUSD.\n');
  passed++;

  console.log('====================================================================');
  console.log(`🎉 FASE 1 VERIFICADA CON ÉXITO: ${passed}/5 TESTS SUPERADOS AL 100%`);
  console.log('====================================================================');
}

runPhase1Tests().catch((err) => {
  console.error('❌ FALLO EN LOS TESTS DE LA FASE 1:', err);
  process.exit(1);
});
