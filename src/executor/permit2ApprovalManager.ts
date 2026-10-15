import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { RPCManager } from '../providers/rpcManager';
import { logger } from '../utils/logger';

const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
const ROUTER_ADDRESS = '0xDec80E988F4baF43be69c13711453013c212feA8';

const PERMIT2_ABI = [
  'function allowance(address owner, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)',
  'function approve(address token, address spender, uint160 amount, uint48 expiration) external'
];

const MAX_UINT160 = (1n << 160n) - 1n;
const MAX_UINT48 = (1n << 48n) - 1n;

const TARGET_TOKENS_BY_CHAIN: Record<number, Array<{ symbol: string; address: string }>> = {
  42161: [
    { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
    { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
    { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
    { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' }
  ],
  8453: [
    { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006' },
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    { symbol: 'AERO', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631' }
  ],
  10: [
    { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006' },
    { symbol: 'USDC', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
    { symbol: 'OP', address: '0x4200000000000000000000000000000000000042' }
  ]
};

export class Permit2ApprovalManager {
  private rpcManager: RPCManager;

  constructor(rpcManager: RPCManager) {
    this.rpcManager = rpcManager;
  }

  async ensureAllPermit2Approvals(): Promise<void> {
    if (!ENV.privateKey || ENV.privateKey === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      logger.info('Permit2 approval bypass: no private key configured.');
      return;
    }

    logger.info('🔐 Verificando y configurando permisos internos de Uniswap Permit2...');

    for (const [chainIdStr, tokens] of Object.entries(TARGET_TOKENS_BY_CHAIN)) {
      const chainId = parseInt(chainIdStr, 10);
      const provider = this.rpcManager.getExecutionProvider(chainId);
      const formattedKey = ENV.privateKey.startsWith('0x') ? ENV.privateKey : `0x${ENV.privateKey}`;
      const wallet = new ethers.Wallet(formattedKey, provider);
      const permit2Contract = new ethers.Contract(PERMIT2_ADDRESS, PERMIT2_ABI, wallet);

      for (const token of tokens) {
        try {
          const allowanceData = await permit2Contract.allowance(wallet.address, token.address, ROUTER_ADDRESS);
          const expiration = Number(allowanceData[1]);
          const nowSeconds = Math.floor(Date.now() / 1000);

          if (expiration <= nowSeconds + 86400) {
            logger.info(`📝 [PERMIT2 APPROVE] Aprobando ${token.symbol} en ChainID ${chainId} para Protocolink Router...`);
            const feeData = await provider.getFeeData();
            const tx = await permit2Contract.approve(
              token.address,
              ROUTER_ADDRESS,
              MAX_UINT160,
              MAX_UINT48,
              {
                maxFeePerGas: feeData.maxFeePerGas ? (BigInt(feeData.maxFeePerGas) * 15n) / 10n : undefined,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
              }
            );
            logger.info(`   Tx enviada -> Hash: ${tx.hash}. Esperando confirmación...`);
            await tx.wait(1);
            logger.success(`✅ [PERMIT2 ACTIVADO] ${token.symbol} en ChainID ${chainId} autorizado permanentemente.`);
          } else {
            logger.success(`✅ [PERMIT2 VIGENTE] ${token.symbol} (ChainID ${chainId}) ya cuenta con autorización activa.`);
          }
        } catch (err: any) {
          logger.warn(`⚠️ No se pudo verificar Permit2 para ${token.symbol} en ChainID ${chainId}: ${err.message}`);
        }
      }
    }
  }
}
