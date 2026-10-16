import dotenv from 'dotenv';

dotenv.config();

export function parseDryRun(rawValue?: string): boolean {
  if (rawValue === undefined || rawValue === null) return true;
  const normalized = rawValue.trim().toLowerCase();
  if (normalized === 'false') return false;
  return true;
}

export function normalizeFlashLoanProvider(rawValue?: string): 'balancer' | 'aave' {
  const val = (rawValue || 'balancer').trim().toLowerCase();
  if (val === 'aave' || val === 'aavev3') return 'aave';
  return 'balancer';
}

export const ENV = {
  privateKey: process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
  dryRun: parseDryRun(process.env.DRY_RUN),
  minProfitUSD: parseFloat(process.env.MIN_PROFIT_USD || '0.25'),
  minProfitUsd: parseFloat(process.env.MIN_PROFIT_USD || '0.25'),
  scanIntervalMs: parseInt(process.env.SCAN_INTERVAL_MS || '1000', 10),
  flashLoanProvider: normalizeFlashLoanProvider(process.env.FLASH_LOAN_PROVIDER),
  enableArbitrum: process.env.ENABLE_ARBITRUM === 'true',
  enableSecondaryDex: process.env.ENABLE_SECONDARY_DEX === 'true',
  maxDailyGasEth: parseFloat(process.env.MAX_DAILY_GAS_ETH || '0.0015'),
  flashbotsRpcUrl: process.env.FLASHBOTS_RPC_URL || 'https://rpc.flashbots.net',
  fastlaneRpcUrl: process.env.FASTLANE_RPC_URL || 'https://polygon.fastlane.xyz',
  rpcUrl: process.env.BASE_RPC_URL || process.env.RPC_URL || 'https://mainnet.base.org',
  arbitrumRpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  port: parseInt(process.env.PORT || '3000', 10),
  arbitrageContractBase: process.env.ARBITRAGE_CONTRACT_BASE || '0xD4A284DC95C17f981b7BaDD4b31Ae5Ae89854018',
  arbitrageContractArbitrum: process.env.ARBITRAGE_CONTRACT_ARBITRUM || '0xD4A284DC95C17f981b7BaDD4b31Ae5Ae89854018',
  arbitrumWssUrl: process.env.ARBITRUM_WSS_URL || 'wss://arb1-feed.arbitrum.io/feed',
  baseWssUrl: process.env.BASE_WSS_URL || 'wss://base-rpc.publicnode.com',
};
