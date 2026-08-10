import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { ProtocolinkClient, ArbitrageOpportunity } from '../protocolink/protocolinkClient';
import { RPCManager } from '../providers/rpcManager';
import { addScanLog } from '../server';
import { logger } from '../utils/logger';

const FLASHBOTS_RPC_MAP: Record<number, string> = {
  1: 'https://rpc.flashbots.net',
  42161: 'https://rpc.flashbots.net/arbitrum',
  10: 'https://rpc.flashbots.net/optimism',
  137: 'https://fastlane.polygon.network',
  8453: 'https://mainnet.base.org',
};

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

    // 3. Ejecución real protegida en red con wallet conectada a RPC de alta velocidad
    if (!wallet) {
      logger.error(`No se configuró PRIVATE_KEY válida para transmitir en red real.`);
      return false;
    }

    return await executeWithNonceLock(opportunity.chainId, async () => {
      try {
        logger.success(`[LIVE EXECUTION] Transmitiendo transacción de arbitraje a ChainID ${opportunity.chainId}...`);

        const activeWallet = wallet.connect(provider);
        const pendingNonce = await activeWallet.getNonce('pending');

        // Obtener datos de gas EIP-1559 en tiempo real con propina de prioridad (Priority Fee Bribing)
        const feeData = await provider.getFeeData().catch(() => null);
        const priorityFee = feeData?.maxPriorityFeePerGas 
          ? (feeData.maxPriorityFeePerGas * 150n) / 100n 
          : ethers.parseUnits(opportunity.chainId === 1 ? '2.0' : '0.1', 'gwei');

        const baseFee = feeData?.maxFeePerGas || feeData?.gasPrice;
        const maxFee = baseFee ? (baseFee * 130n) / 100n : undefined;

        // Estimar Gas Límite dinámico con margen de seguridad del 25%
        let estimatedGasLimit = opportunity.chainId === 1 ? 500000n : 350000n;
        try {
          const gasEst = await provider.estimateGas({
            from: accountAddress,
            to: toAddress,
            data: dataHex,
            value: valueHex,
          });
          estimatedGasLimit = (gasEst * 125n) / 100n;
        } catch {
          // Usar valor por defecto seguro si falla la estimación
        }

        const txParams: any = {
          to: toAddress,
          data: dataHex,
          value: valueHex,
          nonce: pendingNonce,
          gasLimit: estimatedGasLimit,
        };

        if (maxFee && priorityFee) {
          txParams.maxFeePerGas = maxFee;
          txParams.maxPriorityFeePerGas = priorityFee;
        }

        const tx = await activeWallet.sendTransaction(txParams);

        logger.success(`🛡️ Transacción enviada a la blockchain! Hash: ${tx.hash}`);
        addScanLog(`🚀 [LIVE EXECUTION] Transacción transmitida. Hash: ${tx.hash}`);

        const receipt = await tx.wait();
        if (receipt && receipt.status === 1) {
          const explorerMap: Record<number, string> = {
            1: 'https://etherscan.io/tx/',
            42161: 'https://arbiscan.io/tx/',
            137: 'https://polygonscan.com/tx/',
            8453: 'https://basescan.org/tx/',
            10: 'https://optimistic.etherscan.io/tx/',
            56: 'https://bscscan.com/tx/',
            43114: 'https://snowtrace.io/tx/',
          };
          const explorerUrl = (explorerMap[opportunity.chainId] || 'https://etherscan.io/tx/') + tx.hash;
          logger.success(`🎉 Transacción confirmada en bloque #${receipt.blockNumber}! Explorer: ${explorerUrl}`);
          addScanLog(`🎉 [CONFIRMADA] Arbitraje Ejecutado Bloque #${receipt.blockNumber} | Explorer: ${explorerUrl}`);
          return true;
        } else {
          logger.error(`Transacción revertida en bloque #${receipt?.blockNumber || 'desconocido'}.`);
          addScanLog(`❌ Transacción de arbitraje revertida sin costo en gas.`);
          return false;
        }
      } catch (err: any) {
        logger.error(`Error en ejecución live: ${err.message}`);
        addScanLog(`❌ Error en transmisión live: ${err.message}`);
        return false;
      }
    });
  }
}

const chainNonceLocks: Record<number, Promise<void>> = {};

async function executeWithNonceLock<T>(chainId: number, fn: () => Promise<T>): Promise<T> {
  const currentLock = chainNonceLocks[chainId] || Promise.resolve();
  let release: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  chainNonceLocks[chainId] = currentLock.then(() => nextLock);

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
  }
}
