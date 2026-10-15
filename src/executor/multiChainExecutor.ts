import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { ProtocolinkClient, ArbitrageOpportunity, DEXQuote } from '../protocolink/protocolinkClient';
import { TokenConfig } from '../config/registry';
import { TriangularOpportunity } from '../triangular/triangularScanner';
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
  private executingChains: Set<number> = new Set();

  constructor(rpcManager: RPCManager) {
    this.rpcManager = rpcManager;
    this.protocolinkClient = new ProtocolinkClient();
  }

  /**
   * Ejecuta o simula la transacción de arbitraje en la cadena objetivo
   */
  async execute(opportunity: ArbitrageOpportunity): Promise<boolean> {
    if (this.executingChains.has(opportunity.chainId)) {
      return false; // Ya hay una ejecución en curso en esta cadena, evitar saturación
    }
    this.executingChains.add(opportunity.chainId);

    try {
      const provider = this.rpcManager.getExecutionProvider(opportunity.chainId);
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

      return await this.broadcastTransaction(opportunity.chainId, opportunity.pairName, wallet, provider, routerData);
    } finally {
      this.executingChains.delete(opportunity.chainId);
    }
  }

  /**
   * Ejecuta o simula la transacción de arbitraje triangular de 3 patas
   */
  async executeTriangular(opportunity: TriangularOpportunity): Promise<boolean> {
    const provider = this.rpcManager.getProvider(opportunity.chainId);
    let wallet: ethers.Wallet | null = null;

    if (ENV.privateKey && ENV.privateKey !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      try {
        const formattedKey = ENV.privateKey.startsWith('0x') ? ENV.privateKey : `0x${ENV.privateKey}`;
        wallet = new ethers.Wallet(formattedKey, provider);
      } catch (err: any) {
        logger.warn(`Private key no configurada o inválida: ${err.message}.`);
      }
    }

    const accountAddress = wallet ? wallet.address : '0x0000000000000000000000000000000000000001';
    logger.info(`[TRIANGULAR] Preparando transacción atómica para ${opportunity.cycleName} (ChainID: ${opportunity.chainId})...`);

    const { routerData } = await this.protocolinkClient.buildTriangularArbitrageTransaction(
      accountAddress,
      opportunity.chainId,
      opportunity
    );

    if (!routerData) {
      logger.error(`Falló la construcción de datos del Router Triangular de Protocolink.`);
      return false;
    }

    return this.broadcastTransaction(opportunity.chainId, opportunity.cycleName, wallet, provider, routerData);
  }

  private async broadcastTransaction(
    chainId: number,
    tradeName: string,
    wallet: ethers.Wallet | null,
    provider: any,
    routerData: any
  ): Promise<boolean> {
    const toAddress = String(routerData.to);
    const dataHex = String(routerData.data);
    const valueHex = String(routerData.value || '0x0');

    logger.info(`Router Payload generado -> To: ${toAddress} | Data length: ${dataHex.length} bytes | Value: ${valueHex}`);

    // 2. Simulación en modo DRY_RUN (eth_call atómico)
    if (ENV.dryRun) {
      logger.warn(`[DRY-RUN SIMULACIÓN] Ejecutando prueba eth_call en ChainID ${chainId}...`);
      try {
        const txRequest = {
          to: toAddress,
          data: dataHex,
          value: valueHex,
          from: wallet ? wallet.address : '0x0000000000000000000000000000000000000001',
        };
        await provider.call(txRequest);
        logger.success(`✅ [SIMULACIÓN EXITOSA] eth_call simulado sin reversión en bloque actual.`);
        addScanLog(`✅ [SIMULACIÓN OK] ${tradeName} validado sin reversión.`);
        return true;
      } catch (err: any) {
        logger.error(`❌ [SIMULACIÓN FALLIDA] Reversión detectada en eth_call: ${err.message}`);
        addScanLog(`❌ [SIMULACIÓN REVERTIDA] ${tradeName}: ${err.message}`);
        return false;
      }
    }

    // 3. Ejecución en Producción
    if (!wallet) {
      logger.error(`Imposible emitir transacción: no hay private key configurada.`);
      return false;
    }

    return executeWithNonceLock(chainId, async () => {
      try {
        // 1. Pre-Flight Simulation Obligatorio: Validar eth_call en el nodo antes de enviar
        try {
          const simRequest = {
            to: toAddress,
            from: wallet.address,
            data: dataHex,
            value: valueHex,
          };
          await provider.call(simRequest);
          logger.success(`✅ [PRE-FLIGHT OK] Simulación de ${tradeName} validada al 100% sin reversión en bloque actual.`);
        } catch (simErr: any) {
          logger.warn(`⚠️ [PRE-FLIGHT BLOQUEADO] Reversión evitada para ${tradeName}: ${simErr.message}. Cero gas gastado.`);
          addScanLog(`⚠️ [SIMULACIÓN BLOQUEADA] ${tradeName}: Descartada para proteger saldo.`);
          return false;
        }

        logger.success(`[LIVE EXECUTION] Transmitiendo transacción de arbitraje a ChainID ${chainId}...`);
        
        let gasLimit = 650000n;
        try {
          const estimated = await provider.estimateGas({
            to: toAddress,
            from: wallet.address,
            data: dataHex,
            value: valueHex,
          });
          gasLimit = (estimated * 130n) / 100n;
        } catch {
          gasLimit = chainId === 1 ? 700000n : 550000n;
        }

        const feeData = await provider.getFeeData();
        const txPayload: any = {
          to: toAddress,
          data: dataHex,
          value: valueHex,
          gasLimit: gasLimit,
        };

        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          const baseFee = BigInt(feeData.maxFeePerGas) - BigInt(feeData.maxPriorityFeePerGas);
          const dynamicMaxFee = (baseFee * 15n) / 10n + BigInt(feeData.maxPriorityFeePerGas);
          txPayload.maxFeePerGas = dynamicMaxFee > BigInt(feeData.maxPriorityFeePerGas) ? dynamicMaxFee : BigInt(feeData.maxPriorityFeePerGas) * 2n;
          txPayload.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else if (feeData.gasPrice) {
          txPayload.gasPrice = (BigInt(feeData.gasPrice) * 12n) / 10n;
        }

        const nonce = await inMemoryNonceManager.getNextNonce(wallet, chainId);
        txPayload.nonce = nonce;

        const tx = await wallet.sendTransaction(txPayload);
        logger.info(`Transacción enviada -> Hash: ${tx.hash} (Nonce: ${nonce})`);
        addScanLog(`🚀 Transacción enviada -> Hash: ${tx.hash} (Nonce: ${nonce})`);

        const receipt = await tx.wait(1);
        if (receipt && receipt.status === 1) {
          const explorerMap: Record<number, string> = {
            1: 'https://etherscan.io/tx/',
            42161: 'https://arbiscan.io/tx/',
            10: 'https://optimistic.etherscan.io/tx/',
            8453: 'https://basescan.org/tx/',
            137: 'https://polygonscan.com/tx/',
            56: 'https://bscscan.com/tx/',
            43114: 'https://snowtrace.io/tx/',
          };
          const explorerUrl = (explorerMap[chainId] || 'https://etherscan.io/tx/') + tx.hash;
          logger.success(`🎉 Transacción confirmada en bloque #${receipt.blockNumber}! Explorer: ${explorerUrl}`);
          addScanLog(`🎉 [CONFIRMADA] Arbitraje Ejecutado Bloque #${receipt.blockNumber} | Explorer: ${explorerUrl}`);
          return true;
        } else {
          inMemoryNonceManager.resetNonce(chainId);
          logger.error(`Transacción revertida en bloque #${receipt?.blockNumber || 'desconocido'}.`);
          addScanLog(`❌ Transacción de arbitraje revertida.`);
          return false;
        }
      } catch (err: any) {
        inMemoryNonceManager.resetNonce(chainId);
        logger.error(`Error en ejecución live: ${err.message}`);
        addScanLog(`❌ Error en transmisión live: ${err.message}`);
        return false;
      }
    });
  }

  /**
   * Ejecuta un Flash Bundle atómico consolidado de 5 a 10 micro-arbitrajes con amortización de gas
   */
  async executeFlashBundle(
    chainId: number,
    flashLoanToken: TokenConfig,
    totalFlashLoanAmount: string,
    microOpportunities: Array<{ leg1: DEXQuote; leg2: DEXQuote }>,
    estimatedProfitUSD: number
  ): Promise<boolean> {
    if (this.executingChains.has(chainId)) {
      return false;
    }

    this.executingChains.add(chainId);
    try {
      const provider = this.rpcManager.getExecutionProvider(chainId);
      let wallet: ethers.Wallet | null = null;
      if (ENV.privateKey && ENV.privateKey !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const formattedKey = ENV.privateKey.startsWith('0x') ? ENV.privateKey : `0x${ENV.privateKey}`;
        wallet = new ethers.Wallet(formattedKey, provider);
      }
      if (!wallet) return false;

      const { routerData } = await this.protocolinkClient.buildFlashBundleTransaction(
        wallet.address,
        chainId,
        flashLoanToken,
        totalFlashLoanAmount,
        microOpportunities
      );

      if (!routerData || !routerData.to || !routerData.data) {
        return false;
      }

      const bundleName = `Flash-Bundle (${microOpportunities.length} Micro-Pares | Est. Profit: +$${estimatedProfitUSD.toFixed(4)} USD)`;
      return await this.broadcastTransaction(
        chainId,
        bundleName,
        wallet,
        provider,
        routerData
      );
    } catch (err: any) {
      logger.error(`Error preparando Flash Bundle en Chain ${chainId}: ${err.message}`);
      return false;
    } finally {
      this.executingChains.delete(chainId);
    }
  }
}

class InMemoryNonceManager {
  private chainNonces: Map<number, number> = new Map();

  async getNextNonce(wallet: ethers.Wallet, chainId: number): Promise<number> {
    const cached = this.chainNonces.get(chainId);
    const onChainCount = await wallet.getNonce('pending');
    const nonceToUse = cached !== undefined && cached >= onChainCount ? cached : onChainCount;
    this.chainNonces.set(chainId, nonceToUse + 1);
    return nonceToUse;
  }

  resetNonce(chainId: number) {
    this.chainNonces.delete(chainId);
  }
}

const inMemoryNonceManager = new InMemoryNonceManager();

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
