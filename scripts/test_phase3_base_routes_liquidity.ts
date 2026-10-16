import { ethers } from 'ethers';
import { ENV } from '../src/config/env';
import { flashLoanProviderService, KNOWN_TOKEN_DECIMALS } from '../src/services/flashLoanProviderService';
import { LOW_FEE_PAIRS_BASE } from '../src/executor/lowFeeExecutor';
import { SPATIAL_PAIRS_BASE, DEX_IDS } from '../src/executor/spotExecutor';
import { ProtocolinkClient } from '../src/protocolink/protocolinkClient';

async function runPhase3Tests() {
  console.log('====================================================================');
  console.log('🛡️  EJECUTANDO SUITE DE VERIFICACIÓN — FASE 3: RUTAS BASE, DECIMALES Y PROVEEDOR DINÁMICO');
  console.log('====================================================================\n');

  let passedTests = 0;
  const totalTests = 5;

  // -------------------------------------------------------------------------
  // TEST 1: Estricta Dimensionalidad de Decimales (6 vs 8 vs 18 decimales)
  // -------------------------------------------------------------------------
  console.log('▶️  [TEST 1] Verificando dimensionalidad estricta de decimales (6 vs 8 vs 18)...');
  try {
    const usdcDecimals = flashLoanProviderService.getStrictDecimals('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    const usdbcDecimals = flashLoanProviderService.getStrictDecimals('0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA');
    const cbbtcDecimals = flashLoanProviderService.getStrictDecimals('0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf');
    const wbtcDecimals = flashLoanProviderService.getStrictDecimals('0x0555E30da8f98308EdB960aa94C0Db47230d2B9c');
    const wethDecimals = flashLoanProviderService.getStrictDecimals('0x4200000000000000000000000000000000000006');

    if (usdcDecimals !== 6 || usdbcDecimals !== 6) {
      throw new Error(`USDC/USDbC deben ser 6 decimales, detectado: USDC=${usdcDecimals}, USDbC=${usdbcDecimals}`);
    }
    if (cbbtcDecimals !== 8 || wbtcDecimals !== 8) {
      throw new Error(`cbBTC/WBTC deben ser 8 decimales, detectado: cbBTC=${cbbtcDecimals}, WBTC=${wbtcDecimals}`);
    }
    if (wethDecimals !== 18) {
      throw new Error(`WETH debe ser 18 decimales, detectado: ${wethDecimals}`);
    }

    // Comprobar parsing y formateo sin pérdida de precisión ni asunción de 18 decimales
    const parsedUSDC = flashLoanProviderService.parseTokenUnits('5000.50', 6);
    if (parsedUSDC !== 5_000_500_000n) {
      throw new Error(`Error parseando 5000.50 USDC: esperado 5000500000n, obtenido ${parsedUSDC}`);
    }

    const parsedCbBTC = flashLoanProviderService.parseTokenUnits('0.12345678', 8);
    if (parsedCbBTC !== 12_345_678n) {
      throw new Error(`Error parseando 0.12345678 cbBTC: esperado 12345678n, obtenido ${parsedCbBTC}`);
    }

    const parsedWETH = flashLoanProviderService.parseTokenUnits('1.5', 18);
    if (parsedWETH !== 1_500_000_000_000_000_000n) {
      throw new Error(`Error parseando 1.5 WETH: esperado 1500000000000000000n, obtenido ${parsedWETH}`);
    }

    console.log(`   ✅ [PASS] 6, 8 y 18 decimales mapeados y formateados estrictamente sin distorsión.`);
    passedTests++;
  } catch (err: any) {
    console.error(`   ❌ [FAIL] Test 1 falló: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Enfoque Estricto en Base y Rutas Verificadas (Uniswap V3 ↔ Aerodrome)
  // -------------------------------------------------------------------------
  console.log('\n▶️  [TEST 2] Verificando aislamiento de Base y exclusión de DEXes secundarios...');
  try {
    if (ENV.enableArbitrum) {
      throw new Error('ENV.enableArbitrum debe ser false por defecto para concentrar ejecución en Base');
    }
    if (ENV.enableSecondaryDex) {
      throw new Error('ENV.enableSecondaryDex debe ser false por defecto para mantener Pancake y Sushi desactivados');
    }

    // Verificar que en LOW_FEE_PAIRS_BASE no haya rutas con Pancake (4) ni Sushi (5)
    for (const pair of LOW_FEE_PAIRS_BASE) {
      for (const route of pair.routes) {
        if (route.buyDex >= 4 || route.sellDex >= 4) {
          throw new Error(`Ruta ${pair.name} contiene DEX secundario ${route.buyDex}/${route.sellDex} no autorizado`);
        }
      }
    }

    // Verificar que en SPATIAL_PAIRS_BASE no haya rutas con Pancake (4) ni Sushi (5)
    for (const pair of SPATIAL_PAIRS_BASE) {
      for (const route of pair.routes) {
        if (route.buyDex >= 4 || route.sellDex >= 4) {
          throw new Error(`Ruta ${pair.name} contiene DEX secundario ${route.buyDex}/${route.sellDex} no autorizado`);
        }
      }
    }

    // Verificar que WETH/USDC entre Uniswap V3 y Aerodrome esté presente
    const wethUsdc = LOW_FEE_PAIRS_BASE.find(p => p.name.includes('WETH ➔ USDC'));
    if (!wethUsdc || wethUsdc.routes.length < 2) {
      throw new Error('Ruta verificada WETH/USDC (UniV3 ↔ Aero) no encontrada en LOW_FEE_PAIRS_BASE');
    }

    console.log(`   ✅ [PASS] Arbitrum y DEXes secundarios (Pancake/Sushi) desactivados de forma estricta.`);
    console.log(`            Rutas concentradas 100% en Base con Uniswap V3 y Aerodrome V2/Slipstream.`);
    passedTests++;
  } catch (err: any) {
    console.error(`   ❌ [FAIL] Test 2 falló: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Consulta On-Chain de Liquidez y Estado del Vault de Balancer V2 vs Aave
  // -------------------------------------------------------------------------
  console.log('\n▶️  [TEST 3] Consultando estado on-chain real de Balancer Vault y Aave Pool en Base...');
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org', 8453, { staticNetwork: true });

  try {
    const WETH = '0x4200000000000000000000000000000000000006';
    const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const CBBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';

    let balancerWeth = await flashLoanProviderService.getBalancerVaultLiquidity(8453, WETH, provider);
    if (balancerWeth.balance <= 0n) {
      await new Promise(r => setTimeout(r, 500));
      balancerWeth = await flashLoanProviderService.getBalancerVaultLiquidity(8453, WETH, provider);
    }
    await new Promise(r => setTimeout(r, 200));

    let aaveWeth = await flashLoanProviderService.getAaveV3Liquidity(8453, WETH, provider);
    if (aaveWeth <= 0n) {
      await new Promise(r => setTimeout(r, 500));
      aaveWeth = await flashLoanProviderService.getAaveV3Liquidity(8453, WETH, provider);
    }
    await new Promise(r => setTimeout(r, 200));

    const balancerUsdc = await flashLoanProviderService.getBalancerVaultLiquidity(8453, USDC, provider);
    await new Promise(r => setTimeout(r, 200));
    const aaveUsdc = await flashLoanProviderService.getAaveV3Liquidity(8453, USDC, provider);

    if (balancerWeth.paused) {
      throw new Error('El Vault de Balancer V2 en Base reportó estado pausado');
    }
    if (balancerWeth.balance <= 0n) {
      throw new Error('El saldo de WETH en Balancer Vault debe ser mayor a 0');
    }
    if (aaveWeth <= 0n) {
      throw new Error('La liquidez de WETH en Aave V3 debe ser mayor a 0');
    }

    console.log(`   📊 Liquidez Real On-Chain detectada:`);
    console.log(`      • WETH en Balancer Vault: ${ethers.formatEther(balancerWeth.balance)} WETH (Pausado: ${balancerWeth.paused})`);
    console.log(`      • WETH en Aave V3 Pool:   ${ethers.formatEther(aaveWeth)} WETH`);
    console.log(`      • USDC en Balancer Vault: ${ethers.formatUnits(balancerUsdc.balance, 6)} USDC`);
    console.log(`      • USDC en Aave V3 Pool:   ${ethers.formatUnits(aaveUsdc, 6)} USDC`);
    console.log(`   ✅ [PASS] Telemetría on-chain leída con éxito de ambas fuentes en Base.`);
    passedTests++;
  } catch (err: any) {
    console.error(`   ❌ [FAIL] Test 3 falló: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Selección Dinámica de Proveedor Flash Loan (Balancer 0% vs Aave 5 bps)
  // -------------------------------------------------------------------------
  console.log('\n▶️  [TEST 4] Verificando conmutación dinámica inteligente entre Balancer y Aave...');
  try {
    const WETH = '0x4200000000000000000000000000000000000006';
    const CBBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';

    // Caso A: Préstamo pequeño de 1.0 WETH (dentro de la capacidad de Balancer)
    const smallLoan = ethers.parseEther('1.0');
    const provSmall = await flashLoanProviderService.selectOptimalProvider(8453, WETH, smallLoan, provider);

    if (provSmall.provider !== 'balancer' || provSmall.feeBps !== 0 || provSmall.feeAmount !== 0n) {
      throw new Error(`Préstamo pequeño debió seleccionar Balancer V2 (0% fee), seleccionado: ${provSmall.provider}`);
    }
    console.log(`   • Préstamo de 1.0 WETH:  Selecciona ${provSmall.provider.toUpperCase()} (Comisión: ${provSmall.feeBps} bps / 0.00%) -> [CORRECTO]`);

    // Caso B: Préstamo masivo de 1000.0 WETH (excede la capacidad de Balancer Vault)
    const massiveLoan = ethers.parseEther('1000.0');
    const provMassive = await flashLoanProviderService.selectOptimalProvider(8453, WETH, massiveLoan, provider);

    if (provMassive.provider !== 'aave' || provMassive.feeBps !== 5) {
      throw new Error(`Préstamo masivo debió derivar a Aave V3 (5 bps fee), seleccionado: ${provMassive.provider}`);
    }
    const expectedAaveFee = (massiveLoan * 5n + 9999n) / 10000n; // 0.5 WETH
    if (provMassive.feeAmount !== expectedAaveFee) {
      throw new Error(`Comisión de Aave incorrecta: esperada ${expectedAaveFee}, calculada: ${provMassive.feeAmount}`);
    }
    console.log(`   • Préstamo de 1000 WETH: Conmuta dinámicamente a ${provMassive.provider.toUpperCase()} (Comisión: 5 bps / ${ethers.formatEther(provMassive.feeAmount)} WETH) -> [CORRECTO]`);

    // Caso C: Préstamo de 0.5 cbBTC (Balancer tiene ~0.02 cbBTC, debe derivar a Aave)
    const cbbtcLoan = ethers.parseUnits('0.5', 8);
    const provCbbtc = await flashLoanProviderService.selectOptimalProvider(8453, CBBTC, cbbtcLoan, provider);

    if (provCbbtc.provider !== 'aave') {
      throw new Error(`Préstamo de 0.5 cbBTC debió conmutar a Aave debido a saldo insuficiente en Balancer`);
    }
    console.log(`   • Préstamo de 0.5 cbBTC: Conmuta a ${provCbbtc.provider.toUpperCase()} por saldo insuficiente en Balancer -> [CORRECTO]`);

    console.log(`   ✅ [PASS] Conmutación dinámica inteligente verificada al 100%.`);
    passedTests++;
  } catch (err: any) {
    console.error(`   ❌ [FAIL] Test 4 falló: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Deducción Exacta del Coste del Préstamo Flash y Gas en el Beneficio Neto
  // -------------------------------------------------------------------------
  console.log('\n▶️  [TEST 5] Verificando cálculo exacto de beneficio neto tras deducción de comisiones...');
  try {
    const loanAmount = ethers.parseEther('10.0');
    const ethPrice = 2500;
    const gasCostUSD = 0.08;

    // Escenario 1: Balancer V2 (0% fee). Retorno bruto = 10.02 WETH
    const resBalancer = flashLoanProviderService.calculateNetProfit({
      grossReturn: ethers.parseEther('10.02'),
      loanAmount,
      provider: 'balancer',
      decimals: 18,
      tokenPriceUSD: ethPrice,
      gasCostUSD,
    });

    if (resBalancer.flashFee !== 0n) {
      throw new Error(`Comisión Balancer debe ser 0, calculada: ${resBalancer.flashFee}`);
    }
    if (resBalancer.grossProfitUSD !== 50.0) { // 0.02 * 2500 = $50
      throw new Error(`Ganancia bruta Balancer incorrecta: ${resBalancer.grossProfitUSD}`);
    }
    if (resBalancer.netProfitUSD !== 49.92) { // 50 - 0.08 = $49.92
      throw new Error(`Ganancia neta Balancer incorrecta: ${resBalancer.netProfitUSD}`);
    }
    if (!resBalancer.isProfitable) {
      throw new Error('Operación Balancer debió ser rentable');
    }
    console.log(`   • Balancer (0% Fee): Bruto: $${resBalancer.grossProfitUSD} | Gas: $${gasCostUSD} | Neto: +$${resBalancer.netProfitUSD} USD -> [CORRECTO]`);

    // Escenario 2: Aave V3 (5 bps fee = 0.005 WETH = $12.50 USD). Retorno bruto = 10.02 WETH
    const resAave = flashLoanProviderService.calculateNetProfit({
      grossReturn: ethers.parseEther('10.02'),
      loanAmount,
      provider: 'aave',
      decimals: 18,
      tokenPriceUSD: ethPrice,
      gasCostUSD,
    });

    const expectedAaveFee = ethers.parseEther('0.005');
    if (resAave.flashFee !== expectedAaveFee) {
      throw new Error(`Comisión Aave incorrecta: esperada ${expectedAaveFee}, calculada: ${resAave.flashFee}`);
    }
    // Ganancia en tokens = 10.02 - 10.005 = 0.015 WETH * 2500 = $37.50 USD
    if (resAave.grossProfitUSD !== 37.50) {
      throw new Error(`Ganancia bruta Aave incorrecta: esperada 37.5, obtenida ${resAave.grossProfitUSD}`);
    }
    // Neto = 37.50 - 0.08 = $37.42 USD
    if (resAave.netProfitUSD !== 37.42) {
      throw new Error(`Ganancia neta Aave incorrecta: esperada 37.42, obtenida ${resAave.netProfitUSD}`);
    }
    console.log(`   • Aave V3 (5 bps Fee): Fee Flash: 0.005 WETH ($12.50) | Bruto: $${resAave.grossProfitUSD} | Neto: +$${resAave.netProfitUSD} USD -> [CORRECTO]`);

    // Escenario 3: Retorno insuficiente (10.003 WETH en Aave no cubre los 10.005 WETH de deuda)
    const resUnprofitable = flashLoanProviderService.calculateNetProfit({
      grossReturn: ethers.parseEther('10.003'),
      loanAmount,
      provider: 'aave',
      decimals: 18,
      tokenPriceUSD: ethPrice,
      gasCostUSD,
    });

    if (resUnprofitable.isProfitable || resUnprofitable.netProfitUSD !== 0) {
      throw new Error('Operación con retorno menor a la deuda debió ser marcada como no rentable');
    }
    console.log(`   • Retorno insuficiente en Aave (10.003 < 10.005): Rechazada de inmediato (isProfitable: false) -> [CORRECTO]`);

    // Verificar ProtocolinkClient con mutación dinámica
    const wethAddress = '0x4200000000000000000000000000000000000006';
    const protocolink = new ProtocolinkClient();
    const pairLogic = await protocolink.getFlashLoanPair(
      { chainId: 8453, address: wethAddress, decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
      '1.0',
      8453
    );
    if (!pairLogic || pairLogic.length !== 2) {
      throw new Error('ProtocolinkClient.getFlashLoanPair no retornó el par de lógicas préstamo/repago');
    }
    const pId0 = (pairLogic[0] as any).protocolId || (pairLogic[0] as any).rid || 'balancer';
    const pId1 = (pairLogic[1] as any).protocolId || (pairLogic[1] as any).rid || 'balancer';
    console.log(`   • Protocolink Flash Loan Pair generado: [${pId0}, ${pId1}] -> [CORRECTO]`);

    console.log(`   ✅ [PASS] Deducción estricta de comisiones de préstamo flash y gas verificada.`);
    passedTests++;
  } catch (err: any) {
    console.error(`   ❌ [FAIL] Test 5 falló: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // RESUMEN FINAL
  // -------------------------------------------------------------------------
  console.log('\n====================================================================');
  if (passedTests === totalTests) {
    console.log(`🎉 FASE 3 VERIFICADA CON ÉXITO: ${passedTests}/${totalTests} TESTS SUPERADOS AL 100%`);
  } else {
    console.log(`⚠️ FASE 3 CON ADVERTENCIAS: ${passedTests}/${totalTests} tests pasados.`);
  }
  console.log('====================================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error('Error fatal ejecutando suite de Fase 3:', err);
  process.exit(1);
});
