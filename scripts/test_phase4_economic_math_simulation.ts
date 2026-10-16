import { ethers } from 'ethers';
import { EconomicMath } from '../src/math/economicMath';
import { SweetSpotOptimizer } from '../src/math/sweetSpotOptimizer';
import { flashLoanProviderService } from '../src/services/flashLoanProviderService';
import { ENV } from '../src/config/env';

/**
 * Suite de Verificación Automatizada - FASE 4: Cálculo Económico Riguroso y Simulación Previa
 */
async function runPhase4Tests() {
  console.log('\n================================================================');
  console.log('🧪 FASE 4: Batería de Pruebas de Cálculo Económico y Simulación');
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
  // PRUEBA 1: Escala Estricta de Decimales (USDC: 6, cbBTC: 8, WETH: 18)
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. Verificación de Escala y Decimales Estrictos ---');
  const usdcAddr = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const cbBtcAddr = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
  const wethAddr = '0x4200000000000000000000000000000000000006';

  const usdcDec = flashLoanProviderService.getStrictDecimals(usdcAddr, 18);
  const cbBtcDec = flashLoanProviderService.getStrictDecimals(cbBtcAddr, 18);
  const wethDec = flashLoanProviderService.getStrictDecimals(wethAddr, 18);

  const evalUSDC = EconomicMath.evaluateOpportunity({
    chainId: 8453,
    loanTokenAddress: usdcAddr,
    loanAmount: ethers.parseUnits('5000', 6), // 5,000 USDC
    simulatedGrossProfitUnits: ethers.parseUnits('2.5', 6), // +2.5 USDC bruto ($2.50)
    tokenPriceUSD: 1.0,
    ethPriceUSD: 2500,
    gasEstimatedL2: 180_000n,
    l2GasPriceGwei: 0.05,
    calldataSizeBytes: 384,
    slippageBufferBps: 15,
  });

  assert(
    usdcDec === 6 && cbBtcDec === 8 && wethDec === 18 &&
    evalUSDC.loanAmountUSD === 5000 &&
    evalUSDC.grossProfitUSD === 2.5,
    'Mapeo exacto de decimales sin asumir 18 decimales en USDC o cbBTC',
    `USDC: ${usdcDec} dec | cbBTC: ${cbBtcDec} dec | WETH: ${wethDec} dec | Gross USD: $${evalUSDC.grossProfitUSD}`
  );

  // ─────────────────────────────────────────────────────────────
  // PRUEBA 2: Deducción Obligatoria de L2 Gas + L1 Data Fee
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Inclusión Obligatoria de L1 Data Fee en L2 ---');
  // Simular ganancia bruta microscópica de $0.005 USD (que antes se aprobaba erróneamente)
  const evalMicro = EconomicMath.evaluateOpportunity({
    chainId: 8453,
    loanTokenAddress: wethAddr,
    loanAmount: ethers.parseEther('1.0'),
    simulatedGrossProfitUnits: 2_000_000_000_000n, // 0.000002 ETH = $0.005 USD
    tokenPriceUSD: 2500,
    ethPriceUSD: 2500,
    gasEstimatedL2: 220_000n,
    l2GasPriceGwei: 0.05,
    calldataSizeBytes: 384,
  });

  assert(
    evalMicro.totalGasCostUSD > 0.02 &&
    !evalMicro.isProfitable &&
    !!evalMicro.rejectionReason?.includes('does not cover total gas'),
    'Micro-ganancia sub-centavo rechazada por no cubrir L1 Data Fee + L2 Gas',
    `Gross: $${evalMicro.grossProfitUSD} | Gas Total: $${evalMicro.totalGasCostUSD} (L1: $${evalMicro.l1DataFeeUSD}, L2: $${evalMicro.l2GasUSD}) -> Rechazado correctamente`
  );

  // ─────────────────────────────────────────────────────────────
  // PRUEBA 3: Margen de Seguridad por Slippage (Buffer 15 bps)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Margen de Seguridad (Slippage Buffer 15 bps) ---');
  // Oportunidad con ganancia bruta de $0.35, gas de $0.08: neto pre-buffer $0.27, post-buffer < $0.25
  const evalBorderline = EconomicMath.evaluateOpportunity({
    chainId: 8453,
    loanTokenAddress: usdcAddr,
    loanAmount: ethers.parseUnits('10000', 6), // 10,000 USDC
    simulatedGrossProfitUnits: ethers.parseUnits('0.29', 6), // $0.29 USD bruto (Pre-buffer: $0.2645, Post-buffer: $0.2355)
    tokenPriceUSD: 1.0,
    ethPriceUSD: 2500,
    gasEstimatedL2: 200_000n,
    l2GasPriceGwei: 0.05,
    calldataSizeBytes: 384,
    slippageBufferBps: 15,
  });

  assert(
    evalBorderline.slippageBufferUSD > 0 &&
    !evalBorderline.isProfitable &&
    !!evalBorderline.rejectionReason?.includes('below minimum threshold'),
    'Buffer de slippage filtra oportunidades al límite para evitar reversión on-chain',
    `Gross: $${evalBorderline.grossProfitUSD} | Gas: $${evalBorderline.totalGasCostUSD} | Slippage Buffer: $${evalBorderline.slippageBufferUSD} | Net: $${evalBorderline.netProfitUSD} (< $${evalBorderline.minRequiredProfitUSD})`
  );

  // ─────────────────────────────────────────────────────────────
  // PRUEBA 4: Generación Dinámica de minProfit para el Smart Contract
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Traslado de minProfit Dinámico al Smart Contract ---');
  const minEthUnits = EconomicMath.calculateContractMinProfit(0.25, 2500, 18);
  const minUsdcUnits = EconomicMath.calculateContractMinProfit(0.25, 1.0, 6);
  const minBtcUnits = EconomicMath.calculateContractMinProfit(0.25, 68000, 8);

  const minEthHuman = ethers.formatEther(minEthUnits);
  const minUsdcHuman = ethers.formatUnits(minUsdcUnits, 6);
  const minBtcHuman = ethers.formatUnits(minBtcUnits, 8);

  assert(
    minEthUnits >= 100_000_000_000_000n && // ~0.0001 ETH ($0.25)
    minUsdcUnits >= 250_000n && // 0.25 USDC
    minBtcUnits >= 300n, // ~0.0000036 BTC ($0.25)
    'minProfit para el contrato escala con el precio y los decimales (No 40 gwei estáticos)',
    `WETH: ${minEthHuman} WETH | USDC: ${minUsdcHuman} USDC | cbBTC: ${minBtcHuman} BTC`
  );

  // ─────────────────────────────────────────────────────────────
  // PRUEBA 5: Simulación Completa con Oportunidad Altamente Rentable
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. Aprobación Estricta de Operación Altamente Rentable ---');
  const evalProfitable = EconomicMath.evaluateOpportunity({
    chainId: 8453,
    loanTokenAddress: wethAddr,
    loanAmount: ethers.parseEther('5.0'),
    simulatedGrossProfitUnits: ethers.parseEther('0.004'), // 0.004 ETH = $10.00 USD
    tokenPriceUSD: 2500,
    ethPriceUSD: 2500,
    gasEstimatedL2: 240_000n,
    l2GasPriceGwei: 0.05,
    calldataSizeBytes: 384,
    slippageBufferBps: 15,
  });

  assert(
    evalProfitable.isProfitable &&
    evalProfitable.netProfitUSD > 8.0 &&
    evalProfitable.totalGasCostUSD < 0.20,
    'Operación rentable aprobada con todos los costos y buffers cubiertos holgadamente',
    `Gross: $${evalProfitable.grossProfitUSD} | Gas Total: $${evalProfitable.totalGasCostUSD} | Buffer: $${evalProfitable.slippageBufferUSD} | Net Profit: +$${evalProfitable.netProfitUSD} USD`
  );

  console.log('\n================================================================');
  console.log(`📊 RESULTADO FASE 4: ${passed} / ${total} Pruebas Exitosas (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error('Fatal error in Phase 4 tests:', err);
  process.exit(1);
});
