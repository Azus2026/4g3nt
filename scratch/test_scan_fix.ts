import { ethers } from 'ethers';
import { MULTI_CHAIN_ARBITRAGE_PAIRS, TokenConfig } from '../src/config/registry';

const UNISWAP_V3_QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
];
const UNISWAP_V3_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

async function getV3Quote(provider: ethers.JsonRpcProvider, tokenIn: TokenConfig, tokenOut: TokenConfig, amountInStr: string, feeTier: number) {
  try {
    const quoter = new ethers.Contract(UNISWAP_V3_QUOTER_ADDRESS, UNISWAP_V3_QUOTER_ABI, provider);
    const parsedIn = ethers.parseUnits(amountInStr, tokenIn.decimals);
    const amountOut = await quoter.quoteExactInputSingle.staticCall(tokenIn.address, tokenOut.address, feeTier, parsedIn, 0);
    return ethers.formatUnits(amountOut, tokenOut.decimals);
  } catch {
    return null;
  }
}

async function runTest() {
  const providerEth = new ethers.JsonRpcProvider('https://ethereum.publicnode.com', 1, { staticNetwork: true });
  const ethPair = MULTI_CHAIN_ARBITRAGE_PAIRS.find(p => p.id === 'ETH-WETH-USDC')!;

  console.log("--- PROBANDO ESCANEO LEG 1 Y LEG 2 EN ETHEREUM MAINNET ---");
  // Leg 1: 10 WETH -> USDC (tier 500 y tier 3000)
  const leg1_500 = await getV3Quote(providerEth, ethPair.tokenA, ethPair.tokenB, '10', 500);
  const leg1_3000 = await getV3Quote(providerEth, ethPair.tokenA, ethPair.tokenB, '10', 3000);
  console.log("Leg 1 (10 WETH -> USDC 0.05% fee):", leg1_500);
  console.log("Leg 1 (10 WETH -> USDC 0.3% fee):", leg1_3000);

  const bestLeg1Amount = leg1_500 || leg1_3000 || '0';

  // Leg 2: USDC -> WETH (tier 500 y tier 3000)
  const leg2_500 = await getV3Quote(providerEth, ethPair.tokenB, ethPair.tokenA, bestLeg1Amount, 500);
  const leg2_3000 = await getV3Quote(providerEth, ethPair.tokenB, ethPair.tokenA, bestLeg1Amount, 3000);
  console.log("Leg 2 (USDC -> WETH 0.05% fee):", leg2_500);
  console.log("Leg 2 (USDC -> WETH 0.3% fee):", leg2_3000);

  const returnWeth = parseFloat(leg2_500 || leg2_3000 || '0');
  const netProfitEth = returnWeth - 10;
  const netProfitUSD = netProfitEth * 3000 - 15.0; // Subtract $15 gas
  console.log(`\n🎉 RESULTADO FINAL ESCANEO MAINNET: Net Profit USD = $${netProfitUSD.toFixed(2)} USD`);
}

runTest();
