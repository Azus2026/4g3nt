import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  privateKey: process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
  dryRun: process.env.DRY_RUN === 'true',
  minProfitUSD: parseFloat(process.env.MIN_PROFIT_USD || '0.001'),
  scanIntervalMs: parseInt(process.env.SCAN_INTERVAL_MS || '1000', 10),
  flashLoanProvider: process.env.FLASH_LOAN_PROVIDER || 'balancer',
  flashbotsRpcUrl: process.env.FLASHBOTS_RPC_URL || 'https://rpc.flashbots.net',
  fastlaneRpcUrl: process.env.FASTLANE_RPC_URL || 'https://polygon.fastlane.xyz',
  rpcUrl: process.env.BASE_RPC_URL || process.env.RPC_URL || 'https://developer-access-mainnet.base.org',
  arbitrumRpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  port: parseInt(process.env.PORT || '3000', 10),
  arbitrageContractBase: process.env.ARBITRAGE_CONTRACT_BASE || '0xdA593D75439364a864a92416430FFA1268724059',
  arbitrageContractArbitrum: process.env.ARBITRAGE_CONTRACT_ARBITRUM || '0xfD164F1b738FE3594C33A569Aa4F21D1855A47E2',
};
