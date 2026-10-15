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
      const provider = new ethers.JsonRpcProvider(primaryUrl, chainId, { staticNetwork: true, batchMaxCount: 1 });
      this.activeProviders.set(chainId, {
        chainId,
        url: primaryUrl,
        latencyMs: 100,
        provider,
      });
    }
  }

  private executionProviders: Map<number, ethers.JsonRpcProvider> = new Map();
  private lastBlockTrigger: Map<number, number> = new Map();

  /**
   * Conecta al canal WebSocket wss:// para escuchar eventos newHeads con debounce inteligente
   */
  subscribeNewHeads(chainId: number, callback: (blockNumber: number) => void): void {
    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain || !chain.wssUrl) return;

    try {
      const wsProvider = new ethers.WebSocketProvider(chain.wssUrl, chainId);
      wsProvider.on('block', (blockNumber: number) => {
        const now = Date.now();
        const last = this.lastBlockTrigger.get(chainId) || 0;
        // Debounce: Limitar a máximo 1 escaneo cada 1500ms en L2 para ahorrar 85% de llamadas
        if (now - last < 1500) {
          return;
        }
        this.lastBlockTrigger.set(chainId, now);

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
   * Prueba latencia y selecciona el mejor RPC público para escaneo continuo
   */
  async benchmarkAndSelectBestRPC(chainId: number): Promise<ethers.JsonRpcProvider> {
    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain) {
      throw new Error(`ChainID ${chainId} no soportada.`);
    }

    // Inicializar el Provider Premium de Ejecución (QuickNode) exclusivamente para broadcast atómico
    if (chain.premiumRpcUrl) {
      const execProvider = new ethers.JsonRpcProvider(chain.premiumRpcUrl, chainId, { staticNetwork: true, batchMaxCount: 1 });
      this.executionProviders.set(chainId, execProvider);
    }

    const candidateUrls = [
      ...chain.defaultRpcUrls,
      ...(this.customRpcCache.get(chainId) || []),
    ];

    let bestRpc: ActiveRPC | null = null;

    for (const url of candidateUrls.slice(0, 4)) {
      try {
        const start = Date.now();
        const testProvider = new ethers.JsonRpcProvider(url, chainId, { staticNetwork: true, batchMaxCount: 1 });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 3000));
        await Promise.race([testProvider.getBlockNumber(), timeoutPromise]);
        const latencyMs = Date.now() - start;

        if (!bestRpc || latencyMs < bestRpc.latencyMs) {
          bestRpc = {
            chainId,
            url,
            latencyMs,
            provider: testProvider,
          };
        }
      } catch {
        // Ignorar nodos con error
      }
    }

    if (bestRpc) {
      this.activeProviders.set(chainId, bestRpc);
      logger.rpc(`[Chain ${chainId} - ${chain.name}] Nodo público gratuito seleccionado: ${bestRpc.url} (${bestRpc.latencyMs}ms)`);
      return bestRpc.provider;
    }

    // Fallback a provider por defecto
    const fallbackUrl = chain.defaultRpcUrls[0];
    const fallbackProvider = new ethers.JsonRpcProvider(fallbackUrl, chainId, { staticNetwork: true, batchMaxCount: 1 });
    this.activeProviders.set(chainId, { chainId, url: fallbackUrl, latencyMs: 999, provider: fallbackProvider });
    return fallbackProvider;
  }

  private rpcIndexMap: Map<number, number> = new Map();

  /**
   * Rota al siguiente RPC disponible para una cadena cuando ocurre un error 429 o timeout
   */
  rotateProvider(chainId: number): ethers.JsonRpcProvider {
    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain || chain.defaultRpcUrls.length === 0) return this.getProvider(chainId);

    const currentIndex = this.rpcIndexMap.get(chainId) || 0;
    const nextIndex = (currentIndex + 1) % chain.defaultRpcUrls.length;
    this.rpcIndexMap.set(chainId, nextIndex);

    const nextUrl = chain.defaultRpcUrls[nextIndex];
    const newProvider = new ethers.JsonRpcProvider(nextUrl, chainId, { staticNetwork: true, batchMaxCount: 1 });

    this.activeProviders.set(chainId, {
      chainId,
      url: nextUrl,
      latencyMs: 150,
      provider: newProvider
    });

    logger.rpc(`[Chain ${chainId}] 🔄 RPC rotado automáticamente a: ${nextUrl}`);
    return newProvider;
  }

  /**
   * Obtiene el Provider Gratuito de Consulta Continua
   */
  getProvider(chainId: number): ethers.JsonRpcProvider {
    const active = this.activeProviders.get(chainId);
    if (active) return active.provider;
    return new ethers.JsonRpcProvider(SUPPORTED_CHAINS[chainId]?.defaultRpcUrls[0] || 'https://cloudflare-eth.com', chainId, { staticNetwork: true, batchMaxCount: 1 });
  }

  /**
   * Obtiene el Provider Premium (QuickNode) para Ejecución y Envío de Transacciones
   */
  getExecutionProvider(chainId: number): ethers.JsonRpcProvider {
    const exec = this.executionProviders.get(chainId);
    if (exec) return exec;
    return this.getProvider(chainId);
  }

  getActiveRPCs(): ActiveRPC[] {
    return Array.from(this.activeProviders.values());
  }
}

export const rpcManager = new RPCManager();

