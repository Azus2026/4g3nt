import * as api from '@protocolink/api';
import { MULTI_CHAIN_ARBITRAGE_PAIRS } from '../src/config/registry';

async function test() {
  const ethPair = MULTI_CHAIN_ARBITRAGE_PAIRS.find(p => p.id === 'ETH-WETH-USDC')!;
  const arbPair = MULTI_CHAIN_ARBITRAGE_PAIRS.find(p => p.id === 'ARB-WETH-USDC')!;

  console.log("Probando cotización Protocolink en Ethereum Mainnet (Chain 1)...");
  try {
    const quoteMainnet = await api.protocols.paraswapv5.getSwapTokenQuotation(1, {
      input: { token: ethPair.tokenA, amount: ethPair.defaultLoanAmount },
      tokenOut: ethPair.tokenB,
    });
    console.log("✅ Cotización Mainnet ParaSwap V5 WETH -> USDC:", quoteMainnet.output.amount);
  } catch (err: any) {
    console.error("❌ ERROR en Mainnet ParaSwap V5:", err.message || err);
  }

  try {
    const quoteUniswap = await api.protocols.uniswapv3.getSwapTokenQuotation(1, {
      input: { token: ethPair.tokenA, amount: ethPair.defaultLoanAmount },
      tokenOut: ethPair.tokenB,
    });
    console.log("✅ Cotización Mainnet Uniswap V3 WETH -> USDC:", quoteUniswap.output.amount);
  } catch (err: any) {
    console.error("❌ ERROR en Mainnet Uniswap V3:", err.message || err);
  }

  console.log("\nProbando cotización Protocolink en Arbitrum (Chain 42161)...");
  try {
    const quoteArb = await api.protocols.paraswapv5.getSwapTokenQuotation(42161, {
      input: { token: arbPair.tokenA, amount: arbPair.defaultLoanAmount },
      tokenOut: arbPair.tokenB,
    });
    console.log("✅ Cotización Arbitrum ParaSwap V5 WETH -> USDC:", quoteArb.output.amount);
  } catch (err: any) {
    console.error("❌ ERROR en Arbitrum ParaSwap V5:", err.message || err);
  }
}

test();
