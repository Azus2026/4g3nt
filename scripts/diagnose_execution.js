const { ethers } = require('ethers');
require('dotenv').config();

const ARBITRAGE_CONTRACT_BASE = process.env.ARBITRAGE_CONTRACT_BASE || '0xAD04bf95c85FF99aF80d885132B52A619C5F52BD';
const RPC_URL = 'https://developer-access-mainnet.base.org';

const ARBITRAGE_ABI = [
  'function executeSpotTriangular((address tokenA, address tokenB, address tokenC, uint8 dex1, uint8 dex2, uint8 dex3, uint24 feeOrSpacing1, uint24 feeOrSpacing2, uint24 feeOrSpacing3, uint256 minProfit) route, uint256 amountIn) external',
  'function executeFlashLoanTriangular((address tokenA, address tokenB, address tokenC, uint8 dex1, uint8 dex2, uint8 dex3, uint24 feeOrSpacing1, uint24 feeOrSpacing2, uint24 feeOrSpacing3, uint256 minProfit) route, uint256 loanAmount) external',
  'function owner() external view returns (address)'
];

const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const AERO = '0x940181a94A35A4569E4529A3CDfB74e38FD98631';
const CBBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
const DEGEN = '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed';
const VIRTUAL = '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b';

const UNISWAP_V3_QUOTER_BASE = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

async function runDiagnosis() {
  console.log('=== DIAGNÓSTICO EN TIEMPO REAL: POR QUÉ NO SE EJECUTAN ÓRDENES ===\n');
  const provider = new ethers.JsonRpcProvider(RPC_URL, 8453);
  const formattedKey = process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : ('0x' + process.env.PRIVATE_KEY);
  const wallet = new ethers.Wallet(formattedKey, provider);

  console.log('👤 Wallet:', wallet.address);
  console.log('📍 Contrato Desplegado:', ARBITRAGE_CONTRACT_BASE);

  const contract = new ethers.Contract(ARBITRAGE_CONTRACT_BASE, ARBITRAGE_ABI, wallet);
  const owner = await contract.owner();
  console.log('👑 Owner del Contrato:', owner);

  // 1. Probar simulación estática detallada de Spot $35 (0.014 WETH)
  const tradeAmountIn = ethers.parseEther('0.014');
  console.log('\n--- 1. PROBANDO SIMULACIÓN SPOT ($35 WETH) ---');
  
  const testRoutes = [
    { name: 'WETH ➔ AERO ➔ USDC ➔ WETH', tokenB: AERO, tokenC: USDC, dex1: 0, dex2: 1, dex3: 0, fee1: 500, fee2: 200, fee3: 500 },
    { name: 'WETH ➔ USDC ➔ AERO ➔ WETH', tokenB: USDC, tokenC: AERO, dex1: 0, dex2: 1, dex3: 0, fee1: 500, fee2: 200, fee3: 500 },
    { name: 'WETH ➔ cbBTC ➔ USDC ➔ WETH', tokenB: CBBTC, tokenC: USDC, dex1: 0, dex2: 0, dex3: 0, fee1: 100, fee2: 500, fee3: 500 },
    { name: 'WETH ➔ DEGEN ➔ USDC ➔ WETH', tokenB: DEGEN, tokenC: USDC, dex1: 0, dex2: 1, dex3: 0, fee1: 3000, fee2: 200, fee3: 500 },
    { name: 'WETH ➔ VIRTUAL ➔ USDC ➔ WETH', tokenB: VIRTUAL, tokenC: USDC, dex1: 0, dex2: 1, dex3: 0, fee1: 3000, fee2: 200, fee3: 500 }
  ];

  for (const r of testRoutes) {
    const routeStruct = {
      tokenA: WETH,
      tokenB: r.tokenB,
      tokenC: r.tokenC,
      dex1: r.dex1,
      dex2: r.dex2,
      dex3: r.dex3,
      feeOrSpacing1: r.fee1,
      feeOrSpacing2: r.fee2,
      feeOrSpacing3: r.fee3,
      minProfit: 40_000_000_000n // ~$0.0001 USD
    };

    try {
      await contract.executeSpotTriangular.staticCall(routeStruct, tradeAmountIn);
      console.log(`✅ [SPOT RENTABLE] ${r.name}: ¡Simulación exitosa! Debería ejecutar on-chain.`);
    } catch (err) {
      console.log(`❌ [SPOT REVERTIDO] ${r.name}: ${err.reason || err.shortMessage || err.message}`);
    }
  }

  // 2. Probar simulación estática de Flash Loan ($5,000 USD / 2.0 WETH en Aave V3)
  console.log('\n--- 2. PROBANDO SIMULACIÓN FLASH LOAN (2.0 WETH / $5,000 USD AAVE V3) ---');
  const flashAmount = ethers.parseEther('2.0');
  for (const r of testRoutes) {
    const routeStruct = {
      tokenA: WETH,
      tokenB: r.tokenB,
      tokenC: r.tokenC,
      dex1: r.dex1,
      dex2: r.dex2,
      dex3: r.dex3,
      feeOrSpacing1: r.fee1,
      feeOrSpacing2: r.fee2,
      feeOrSpacing3: r.fee3,
      minProfit: 400_000_000_000n // ~$0.001 USD
    };

    try {
      await contract.executeFlashLoanTriangular.staticCall(routeStruct, flashAmount);
      console.log(`✅ [FLASH LOAN RENTABLE] ${r.name}: ¡Simulación exitosa!`);
    } catch (err) {
      console.log(`❌ [FLASH LOAN REVERTIDO] ${r.name}: ${err.reason || err.shortMessage || err.message}`);
    }
  }

  // 3. Consulta de Quotes Directos en Uniswap V3 Quoter para calcular el Spread Exacto Actual
  console.log('\n--- 3. COTIZACIÓN MATEMÁTICA EXACTA ON-CHAIN (Uniswap V3 Quoter) ---');
  const quoter = new ethers.Contract(UNISWAP_V3_QUOTER_BASE, QUOTER_ABI, provider);

  try {
    // Swap 1: 0.014 WETH -> USDC (fee 500 = 0.05%)
    const q1 = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: WETH,
      tokenOut: USDC,
      amountIn: tradeAmountIn,
      fee: 500,
      sqrtPriceLimitX96: 0
    });
    const usdcOut = q1[0];
    console.log(`Paso 1: 0.014 WETH ($35.00) ➔ ${ethers.formatUnits(usdcOut, 6)} USDC`);

    // Swap 2: USDC -> AERO (fee 500 = 0.05%)
    const q2 = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: USDC,
      tokenOut: AERO,
      amountIn: usdcOut,
      fee: 500,
      sqrtPriceLimitX96: 0
    });
    const aeroOut = q2[0];
    console.log(`Paso 2: ${ethers.formatUnits(usdcOut, 6)} USDC ➔ ${ethers.formatUnits(aeroOut, 18)} AERO`);

    // Swap 3: AERO -> WETH (fee 500 = 0.05%)
    const q3 = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: AERO,
      tokenOut: WETH,
      amountIn: aeroOut,
      fee: 500,
      sqrtPriceLimitX96: 0
    });
    const wethFinal = q3[0];
    console.log(`Paso 3: ${ethers.formatUnits(aeroOut, 18)} AERO ➔ ${ethers.formatEther(wethFinal)} WETH`);

    const netDiff = wethFinal - tradeAmountIn;
    const diffPct = (Number(netDiff) / Number(tradeAmountIn)) * 100;
    console.log(`\n📊 BALANCE DEL CICLO COMPLETO:`);
    console.log(`Entrada: ${ethers.formatEther(tradeAmountIn)} WETH ($35.00 USD)`);
    console.log(`Salida:  ${ethers.formatEther(wethFinal)} WETH ($${(parseFloat(ethers.formatEther(wethFinal)) * 2500).toFixed(4)} USD)`);
    console.log(`Diferencia Neta: ${ethers.formatEther(netDiff)} WETH (${diffPct.toFixed(3)}%)`);
    if (netDiff < 0n) {
      console.log(`⚠️ Pérdida por comisiones de pool: -$${(Math.abs(parseFloat(ethers.formatEther(netDiff))) * 2500).toFixed(4)} USD.`);
      console.log(`🛡️ Por eso el contrato REVIERTE y bloquea la transacción (protegiendo tus $35 intactos).`);
    }
  } catch (err) {
    console.log('Error al cotizar en Quoter:', err.message);
  }
}

runDiagnosis().catch(console.error);
