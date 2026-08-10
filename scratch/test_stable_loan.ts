import { ethers } from 'ethers';
import { TOKENS } from '../src/config/registry';

const UNISWAP_V3_QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
];
const UNISWAP_V3_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

async function testStableLoan() {
  const providerArb = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc', 42161, { staticNetwork: true });
  const quoter = new ethers.Contract(UNISWAP_V3_QUOTER_ADDRESS, UNISWAP_V3_QUOTER_ABI, providerArb);

  console.log("--- PROBANDO SLIPPAGE EN ARBITRUM USDC/USDT ---");

  // Prueba con 20,000 USDC
  try {
    const in20k = ethers.parseUnits('20000', 6);
    const outUsdt = await quoter.quoteExactInputSingle.staticCall(TOKENS.USDC_ARB.address, TOKENS.USDT_ARB.address, 500, in20k, 0);
    const backUsdc = await quoter.quoteExactInputSingle.staticCall(TOKENS.USDT_ARB.address, TOKENS.USDC_ARB.address, 500, outUsdt, 0);
    const returnUsdc = parseFloat(ethers.formatUnits(backUsdc, 6));
    console.log(`Préstamo 20,000 USDC -> Retorna: ${returnUsdc.toFixed(2)} USDC | Pérdida por Slippage: $${(returnUsdc - 20000).toFixed(2)} USD`);
  } catch (e: any) {
    console.error("20k error:", e.message);
  }

  // Prueba con 1,000 USDC
  try {
    const in1k = ethers.parseUnits('1000', 6);
    const outUsdt = await quoter.quoteExactInputSingle.staticCall(TOKENS.USDC_ARB.address, TOKENS.USDT_ARB.address, 500, in1k, 0);
    const backUsdc = await quoter.quoteExactInputSingle.staticCall(TOKENS.USDT_ARB.address, TOKENS.USDC_ARB.address, 500, outUsdt, 0);
    const returnUsdc = parseFloat(ethers.formatUnits(backUsdc, 6));
    console.log(`Préstamo 1,000 USDC -> Retorna: ${returnUsdc.toFixed(2)} USDC | Pérdida por Slippage: $${(returnUsdc - 1000).toFixed(2)} USD`);
  } catch (e: any) {
    console.error("1k error:", e.message);
  }
}

testStableLoan();
