import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { ProtocolinkClient, ArbitrageOpportunity } from '../protocolink/protocolinkClient';
import { RPCManager } from '../providers/rpcManager';
import { logger } from '../utils/logger';

export class MultiChainExecutor {
  private rpcManager: RPCManager;
  private protocolinkClient: ProtocolinkClient;

  constructor(rpcManager: RPCManager) {
    this.rpcManager = rpcManager;
    this.protocolinkClient = new ProtocolinkClient();
  }

  /**
   * Ejecuta o simula la transacción de arbitraje en la cadena objetivo
   */
  async execute(opportunity: ArbitrageOpportunity): Promise<boolean> {
    const provider = this.rpcManager.getProvider(opportunity.chainId);
    let wallet: ethers.Wallet | null = null;

    if (ENV.privateKey && ENV.privateKey !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      try {
        const formattedKey = ENV.privateKey.startsWith('0x') ? ENV.privateKey : `0x${ENV.privateKey}`;
        wallet = new ethers.Wallet(formattedKey, provider);
      } catch (err: any) {
        logger.warn(`Private key no configurada o inválida: ${err.message}. Modo lectura/simulación.`);
      }
    }

    const accountAddress = wallet ? wallet.address : '0x0000000000000000000000000000000000000001';

    logger.info(`Preparando transacción de arbitraje para ${opportunity.pairName} (ChainID: ${opportunity.chainId})...`);

    // 1. Construir la transacción con Protocolink SDK
    const { routerData } = await this.protocolinkClient.buildArbitrageTransaction(
      accountAddress,
      opportunity.chainId,
      opportunity.leg1,
      opportunity.leg2,
      opportunity.tokenA,
      opportunity.flashLoanAmount
    );

    if (!routerData) {
      logger.error(`Falló la construcción de datos del Router de Protocolink.`);
      return false;
    }

    const toAddress = String(routerData.to);
    const dataHex = String(routerData.data);
    const valueHex = String(routerData.value || '0x0');

    logger.info(`Router Payload generado -> To: ${toAddress} | Data length: ${dataHex.length} bytes | Value: ${valueHex}`);

    // 2. Simulación en modo DRY_RUN (eth_call atómico)
    if (ENV.dryRun) {
      logger.warn(`[DRY-RUN SIMULACIÓN] Ejecutando prueba eth_call en ChainID ${opportunity.chainId}...`);
      try {
        const txRequest = {
          to: toAddress,
          data: dataHex,
          value: valueHex,
          from: accountAddress,
        };

        const result = await provider.call(txRequest);
        logger.success(`[DRY-RUN] Simulación exitosa en ChainID ${opportunity.chainId}! Return call: ${result.slice(0, 18)}...`);
        return true;
      } catch (err: any) {
        logger.warn(`[DRY-RUN] Simulación eth_call devuelta con revert (posible falta de liquidez en bloque): ${err.message}`);
        return false;
      }
    }

    // 3. Ejecución real protegida contra MEV
    if (!wallet) {
      logger.error(`No se configuró PRIVATE_KEY válida para transmitir en red real.`);
      return false;
    }

    try {
      logger.success(`[LIVE EXECUTION] Transmitiendo transacción protegida a través de Flashbots/Relay RPC...`);
      const targetRpcUrl = opportunity.chainId === 1 ? ENV.flashbotsRpcUrl : ENV.fastlaneRpcUrl;
      const relayProvider = new ethers.JsonRpcProvider(targetRpcUrl);
      const relayWallet = wallet.connect(relayProvider);

      const tx = await relayWallet.sendTransaction({
        to: toAddress,
        data: dataHex,
        value: valueHex,
        gasLimit: opportunity.chainId === 1 ? 500000 : 300000,
      });

      logger.success(`🛡️ Transacción enviada. Hash: ${tx.hash}`);
      const receipt = await tx.wait();
      if (receipt && receipt.status === 1) {
        logger.success(`🎉 Transacción confirmada en bloque #${receipt.blockNumber}! Arbitraje ejecutado.`);
        return true;
      } else {
        logger.error(`Transacción revertida.`);
        return false;
      }
    } catch (err: any) {
      logger.error(`Error en ejecución live: ${err.message}`);
      return false;
    }
  }
}
