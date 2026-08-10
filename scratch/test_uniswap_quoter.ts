import { ethers } from 'ethers';
import { MULTI_CHAIN_ARBITRAGE_PAIRS } from '../src/config/registry';

const UNISWAP_V3_QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
];

const UNISWAP_V3_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

async function testOnChainQuoter() {
  console.log("Probando Uniswap V3 Quoter On-Chain en Ethereum Mainnet...");
  const providerMainnet = new ethers.JsonRpcProvider('https://ethereum.publicnode.com', 1, { staticNetwork: true });
  const quoterMainnet = new ethers.Contract(UNISWAP_V3_QUOTER_ADDRESS, UNISWAP_V3_QUOTER_ABI, providerMainnet);

  const ethPair = MULTI_CHAIN_ARBITRAGE_PAIRS.find(p => p.id === 'ETH-WETH-USDC')!;
  const amountInMainnet = ethers.parseUnits(ethPair.defaultLoanAmount, ethPair.tokenA.decimals);

  try {
    const amountOut = await quoterMainnet.quoteExactInputSingle.staticCall(
      ethPair.tokenA.address,
      ethPair.tokenB.address,
      3000, // 0.3% fee tier
      amountInMainnet,
      0
    );
    const formattedOut = ethers.formatUnits(amountOut, ethPair.tokenB.decimals);
    console.log(`✅ ÉXITO ON-CHAIN MAINNET: 10 WETH -> ${formattedOut} USDC!`);
  } catch (err: any) {
    console.error("❌ ERROR On-Chain Mainnet:", err.message || err);
  }

  console.log("\nProbando Uniswap V3 Quoter On-Chain en Arbitrum...");
  const providerArb = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc', 42161, { staticNetwork: true });
  const quoterArb = new ethers.Contract(UNISWAP_V3_QUOTER_ADDRESS, UNISWAP_V3_QUOTER_ABI, providerArb);

  const arbPair = MULTI_CHAIN_ARBITRAGE_PAIRS.find(p => p.id === 'ARB-WETH-USDC')!;
  const amountInArb = ethers.parseUnits(arbPair.defaultLoanAmount, arbPair.tokenA.decimals);

  try {
    const amountOut = await quoterArb.quoteExactInputSingle.staticCall(
      arbPair.tokenA.address,
      arbPair.tokenB.address,
      500, // 0.05% fee tier
      amountInArb,
      0
    );
    const formattedOut = ethers.formatUnits(amountOut, arbPair.tokenB.decimals);
    console.log(`✅ ÉXITO ON-CHAIN ARBITRUM: 5 WETH -> ${formattedOut} USDC!`);
  } catch (err: any) {
    console.error("❌ ERROR On-Chain Arbitrum:", err.message || err);
  }
}

testOnChainQuoter();
