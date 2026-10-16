import { RPCManager } from '../providers/rpcManager';
import { logger } from '../utils/logger';

/**
 * En la arquitectura Pure Flash Loan (0% Capital Propio), la billetera del usuario
 * jamás aporta WETH/USDC para swaps ni requiere autorizaciones Permit2.
 * Este gestor permanece como no-op de seguridad garantizando que ninguna tx approve()
 * sea enviada desde la billetera ejecutora.
 */
export class Permit2ApprovalManager {
  constructor(_rpcManager?: RPCManager) {}

  async ensureAllPermit2Approvals(): Promise<void> {
    logger.info('🛡️ [ZERO-PRINCIPAL SAFETY] Permit2 approvals deshabilitados: modo 100% Flash Loan Atómico (la cartera solo paga gas ETH).');
  }
}
