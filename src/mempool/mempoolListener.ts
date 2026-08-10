import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export interface PendingSwapSignal {
  chainId: number;
  hash: string;
  from: string;
  to: string;
  valueEth: string;
  timestamp: number;
}

export class MempoolListener {
  private wsProvider: ethers.WebSocketProvider | null = null;

  constructor(wssUrl: string, chainId: number, onSignal: (signal: PendingSwapSignal) => void) {
    try {
      this.wsProvider = new ethers.WebSocketProvider(wssUrl, chainId);
      logger.info(`[MEMPOOL LISTENER - Chain ${chainId}] 🛡️ Escuchando transacciones pendientes (Mempool Back-running)...`);

      this.wsProvider.on('pending', async (txHash: string) => {
        try {
          if (!this.wsProvider) return;
          const tx = await this.wsProvider.getTransaction(txHash);
          if (tx && tx.to && tx.value > ethers.parseEther('1.0')) { // Filtrar transacciones grandes > 1 ETH
            onSignal({
              chainId,
              hash: txHash,
              from: tx.from,
              to: tx.to,
              valueEth: ethers.formatEther(tx.value),
              timestamp: Date.now(),
            });
          }
        } catch {
          // Ignorar txs no encontradas
        }
      });
    } catch {
      logger.warn(`No se pudo conectar a Mempool WSS en ChainID ${chainId}`);
    }
  }
}
