import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  privateKey: process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
  // Seguro por defecto: solo se desactiva la simulación si se pide explícitamente DRY_RUN=false
  dryRun: process.env.DRY_RUN !== 'false',
  minProfitUSD: parseFloat(process.env.MIN_PROFIT_USD || '1.00'),
  slippageBps: parseInt(process.env.SLIPPAGE_BPS || '50', 10),
  scanIntervalMs: parseInt(process.env.SCAN_INTERVAL_MS || '5000', 10),
  flashLoanProvider: process.env.FLASH_LOAN_PROVIDER || 'aavev3',
  flashbotsRpcUrl: process.env.FLASHBOTS_RPC_URL || 'https://rpc.flashbots.net',
  fastlaneRpcUrl: process.env.FASTLANE_RPC_URL || 'https://polygon.fastlane.xyz',
  port: parseInt(process.env.PORT || '3000', 10),
};
