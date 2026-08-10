import { ArbitrageScanner } from '../src/agent/arbitrageScanner';
import { MULTI_CHAIN_ARBITRAGE_PAIRS } from '../src/config/registry';

async function testScan() {
  const scanner = new ArbitrageScanner();
  const ethPair = MULTI_CHAIN_ARBITRAGE_PAIRS.find(p => p.id === 'ETH-WETH-USDC')!;
  const arbPair = MULTI_CHAIN_ARBITRAGE_PAIRS.find(p => p.id === 'ARB-WETH-USDC')!;

  console.log("Escaneando ETH-WETH-USDC...");
  const resEth = await scanner.scanPair(ethPair);
  console.log("Resultado ETH:", resEth);

  console.log("\nEscaneando ARB-WETH-USDC...");
  const resArb = await scanner.scanPair(arbPair);
  console.log("Resultado ARB:", resArb);
}

testScan();
