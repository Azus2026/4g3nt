import * as api from '@protocolink/api';
import axios from 'axios';
import { MULTI_CHAIN_ARBITRAGE_PAIRS } from '../src/config/registry';

// Set standard headers on axios
axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test() {
  const ethPair = MULTI_CHAIN_ARBITRAGE_PAIRS.find(p => p.id === 'ETH-WETH-USDC')!;

  console.log("Probando con User-Agent en Ethereum Mainnet...");
  try {
    const quote = await api.protocols.uniswapv3.getSwapTokenQuotation(1, {
      input: { token: ethPair.tokenA, amount: ethPair.defaultLoanAmount },
      tokenOut: ethPair.tokenB,
    });
    console.log("✅ ÉXITO Cotización Mainnet Uniswap V3:", quote.output.amount);
  } catch (err: any) {
    console.error("❌ ERROR en Mainnet:", err.message || err);
  }
}

test();
