import { ethers } from 'ethers';
import axios from 'axios';
import { SUPPORTED_CHAINS, ChainConfig } from '../config/chains';
import { logger } from '../utils/logger';

export interface ActiveRPC {
  chainId: number;
  url: string;
  latencyMs: number;
  provider: ethers.JsonRpcProvider;
}

export class RPCManager {
  private activeProviders: Map<number, ActiveRPC> = new Map();
  private customRpcCache: Map<number, string[]> = new Map();
  private wsProviders: Map<number, ethers.WebSocketProvider> = new Map();

  constructor() {
    this.initDefaultRpc();
  }

  private initDefaultRpc() {
    for (const [chainIdStr, chain] of Object.entries(SUPPORTED_CHAINS)) {
      const chainId = parseInt(chainIdStr, 10);
      const primaryUrl = chain.defaultRpcUrls[0];
      const provider = new ethers.JsonRpcProvider(primaryUrl, chainId, { staticNetwork: true });
      this.activeProviders.set(chainId, {
        chainId,
        url: primaryUrl,
        latencyMs: 100,
        provider,
      });
    }
  }

  /**
   * Conecta al canal WebSocket wss:// para escuchar eventos newHeads en milisegundo 0
   */
  subscribeNewHeads(chainId: number, callback: (blockNumber: number) => void): void {
    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain || !chain.wssUrl) return;

    try {
      const wsProvider = new ethers.WebSocketProvider(chain.wssUrl, chainId);
      wsProvider.on('block', (blockNumber: number) => {
        logger.rpc(`[WSS - Chain ${chainId}] ⚡ Nuevo Bloque Detectado #${blockNumber} (Milisegundo 0)`);
        callback(blockNumber);
      });
      wsProvider.on('error', () => {
        // Fallback silencioso en fallo de WSS
      });

      this.wsProviders.set(chainId, wsProvider);
    } catch {
      // Usar polling HTTP de respaldo si WSS no está disponible
    }
  }

  /**
   * Carga lista de RPCs actualizadas directamente desde Chainlist.org
   */
  async loadChainlistRPCs(): Promise<void> {
    try {
      logger.rpc('Descargando nodos RPC dinámicos desde Chainlist.org (https://chainlist.org/rpcs.json)...');
      const response = await axios.get('https://chainlist.org/rpcs.json', { timeout: 8000 });
      if (Array.isArray(response.data)) {
        for (const item of response.data) {
          const chainId = item.chainId;
          if (SUPPORTED_CHAINS[chainId] && Array.isArray(item.rpc)) {
            const rpcUrls = item.rpc
              .map((r: any) => (typeof r === 'string' ? r : r.url))
              .filter((url: string) => url && url.startsWith('http') && !url.includes('${'));
            
            if (rpcUrls.length > 0) {
              this.customRpcCache.set(chainId, rpcUrls);
            }
          }
        }
        logger.rpc('✅ RPCs dinámicas cargadas correctamente desde Chainlist.');
      }
    } catch (err: any) {
      logger.warn(`No se pudo descargar rpcs.json de Chainlist: ${err.message}. Se usarán RPCs predeterminadas por defecto.`);
    }
  }

  /**
   * Prueba latencia y selecciona el mejor RPC para una cadena dada
   */
  async benchmarkAndSelectBestRPC(chainId: number): Promise<ethers.JsonRpcProvider> {
    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain) {
      throw new Error(`ChainID ${chainId} no soportada.`);
    }

    const candidateUrls = [
      ...chain.defaultRpcUrls,
      ...(this.customRpcCache.get(chainId) || []),
    ];

    let bestRpc: ActiveRPC | null = null;

    for (const url of candidateUrls.slice(0, 5)) {
      try {
        const start = Date.now();
        const testProvider = new ethers.JsonRpcProvider(url, chainId, { staticNetwork: true });
        await testProvider.getBlockNumber();
        const latencyMs = Date.now() - start;

        if (!bestRpc || latencyMs < bestRpc.latencyMs) {
          bestRpc = {
            chainId,
            url,
            latencyMs,
            provider: testProvider,
          };
        }
      } catch (e) {
        // Ignorar nodos caídos o con límites de cuota
      }
    }

    if (bestRpc) {
      this.activeProviders.set(chainId, bestRpc);
      logger.rpc(`[Chain ${chainId} - ${chain.name}] Nodo activo seleccionado: ${bestRpc.url} (${bestRpc.latencyMs}ms)`);
      return bestRpc.provider;
    }

    // Fallback a provider por defecto
    const fallbackUrl = chain.defaultRpcUrls[0];
    const fallbackProvider = new ethers.JsonRpcProvider(fallbackUrl, chainId, { staticNetwork: true });
    this.activeProviders.set(chainId, { chainId, url: fallbackUrl, latencyMs: 999, provider: fallbackProvider });
    return fallbackProvider;
  }

  getProvider(chainId: number): ethers.JsonRpcProvider {
    const active = this.activeProviders.get(chainId);
    if (active) return active.provider;
    return new ethers.JsonRpcProvider(SUPPORTED_CHAINS[chainId]?.defaultRpcUrls[0] || 'https://cloudflare-eth.com');
  }

  getActiveRPCs(): ActiveRPC[] {
    return Array.from(this.activeProviders.values());
  }
}
