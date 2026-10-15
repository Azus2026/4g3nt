import { ethers } from 'ethers';
import { rpcManager } from '../providers/rpcManager';
import { logger } from '../utils/logger';

export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

export const MULTICALL3_ABI = [
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
  'function getEthBalance(address addr) view returns (uint256 balance)',
  'function getBlockHash(uint256 blockNumber) view returns (bytes32 blockHash)',
  'function getCurrentBlockTimestamp() view returns (uint256 timestamp)'
];

export interface PoolCallItem {
  poolAddress: string;
  chainId: number;
  protocol: string;
  token0Symbol: string;
  token1Symbol: string;
  decimals0: number;
  decimals1: number;
  fee?: number;
}

export interface PoolStateResult {
  poolAddress: string;
  chainId: number;
  protocol: string;
  token0Symbol: string;
  token1Symbol: string;
  sqrtPriceX96: bigint;
  tick: number;
  fee: number;
  liquidity: bigint;
  price0In1: number;
  price1In0: number;
  success: boolean;
}

export class MulticallBatchScanner {
  // Selector para slot0(): 0x3850c7bd
  private static readonly SLOT0_SELECTOR = '0x3850c7bd';
  // Selector para liquidity(): 0x1a686502
  private static readonly LIQUIDITY_SELECTOR = '0x1a686502';

  /**
   * Ejecuta el escaneo de un lote de pools usando Multicall3 en una sola petición RPC
   */
  async scanPoolBatch(chainId: number, pools: PoolCallItem[]): Promise<PoolStateResult[]> {
    if (pools.length === 0) return [];

    const provider = rpcManager.getProvider(chainId);
    const multicall = new ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider);

    // Construir llamadas: 2 llamadas por pool (slot0 + liquidity)
    const calls: { target: string; allowFailure: boolean; callData: string }[] = [];
    const validPools: PoolCallItem[] = [];

    for (const p of pools) {
      try {
        const cleanAddress = ethers.getAddress(p.poolAddress.toLowerCase());
        calls.push({ target: cleanAddress, allowFailure: true, callData: MulticallBatchScanner.SLOT0_SELECTOR });
        calls.push({ target: cleanAddress, allowFailure: true, callData: MulticallBatchScanner.LIQUIDITY_SELECTOR });
        validPools.push({ ...p, poolAddress: cleanAddress });
      } catch {
        // Ignorar dirección inválida
      }
    }

    if (calls.length === 0) return [];

    try {
      const response: { success: boolean; returnData: string }[] = await multicall.aggregate3.staticCall(calls);
      const results: PoolStateResult[] = [];

      for (let i = 0; i < validPools.length; i++) {
        const pool = validPools[i];
        const slot0Res = response[i * 2];
        const liqRes = response[i * 2 + 1];

        if (slot0Res && slot0Res.success && slot0Res.returnData.length >= 66) {
          try {
            // Decodificar slot0: uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked
            const raw = slot0Res.returnData;
            const sqrtPriceX96 = BigInt('0x' + raw.slice(2, 66));
            
            // Decodificar tick (int24 con signo seguro sin desbordamiento)
            const rawTickBigInt = BigInt('0x' + raw.slice(66, 130));
            const tick = Number(BigInt.asIntN(24, rawTickBigInt));

            let liquidity = 0n;
            if (liqRes && liqRes.success && liqRes.returnData.length >= 66) {
              liquidity = BigInt('0x' + liqRes.returnData.slice(2, 66));
            }

            // Calcular precio matemático decimal: (sqrtPriceX96 / 2^96)^2 * (10^(decimals0 - decimals1))
            const sqrtPriceNum = Number(sqrtPriceX96) / Math.pow(2, 96);
            const rawPrice = sqrtPriceNum * sqrtPriceNum;
            const decimalAdjustment = Math.pow(10, pool.decimals0 - pool.decimals1);
            const price0In1 = rawPrice * decimalAdjustment;
            const price1In0 = price0In1 > 0 ? 1 / price0In1 : 0;

            const poolFee = pool.fee || (pool.protocol.includes('3000') ? 3000 : pool.protocol.includes('10000') ? 10000 : pool.protocol.includes('100') ? 100 : 500);

            results.push({
              poolAddress: pool.poolAddress,
              chainId,
              protocol: pool.protocol,
              token0Symbol: pool.token0Symbol,
              token1Symbol: pool.token1Symbol,
              sqrtPriceX96,
              tick,
              fee: poolFee,
              liquidity,
              price0In1,
              price1In0,
              success: true
            });
          } catch (decodeErr) {
            results.push(this.createFailedResult(pool, chainId));
          }
        } else {
          results.push(this.createFailedResult(pool, chainId));
        }
      }

      return results;
    } catch (err: any) {
      if (err.message && (err.message.includes('rate limit') || err.message.includes('429') || err.message.includes('599') || err.message.includes('timeout'))) {
        rpcManager.rotateProvider(chainId);
      }
      logger.warn(`[MULTICALL BATCH] Error en cadena ${chainId}: ${err.message}`);
      return pools.map(p => this.createFailedResult(p, chainId));
    }
  }

  private createFailedResult(p: PoolCallItem, chainId: number): PoolStateResult {
    return {
      poolAddress: p.poolAddress,
      chainId,
      protocol: p.protocol,
      token0Symbol: p.token0Symbol,
      token1Symbol: p.token1Symbol,
      sqrtPriceX96: 0n,
      tick: 0,
      fee: p.fee || 500,
      liquidity: 0n,
      price0In1: 0,
      price1In0: 0,
      success: false
    };
  }
}

export const multicallBatchScanner = new MulticallBatchScanner();
