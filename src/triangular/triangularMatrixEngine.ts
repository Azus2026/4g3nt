import { BASE_100_TOKENS, BaseToken } from '../config/baseTokens100';
import { TriangularCycle } from './triangularRegistry';

export class TriangularMatrixEngine {
  private static instance: TriangularMatrixEngine;
  private generatedCycles: TriangularCycle[] = [];

  private constructor() {
    this.generateMatrix();
  }

  public static getInstance(): TriangularMatrixEngine {
    if (!TriangularMatrixEngine.instance) {
      TriangularMatrixEngine.instance = new TriangularMatrixEngine();
    }
    return TriangularMatrixEngine.instance;
  }

  /**
   * Genera dinámicamente las rutas óptimas de 3 patas ancladas en WETH, USDC, USDbC y cbBTC
   */
  private generateMatrix(): void {
    const anchors = BASE_100_TOKENS.filter(t => ['WETH', 'USDC', 'USDbC', 'cbBTC', 'AERO'].includes(t.symbol));
    const intermediates = BASE_100_TOKENS.filter(t => !['WETH', 'USDC', 'USDbC', 'cbBTC', 'AERO'].includes(t.symbol));

    const feeTiers = [100, 500, 3000]; // 1 bps, 5 bps, 30 bps

    for (const anchorA of anchors) {
      for (const anchorB of anchors) {
        if (anchorA.symbol === anchorB.symbol) continue;

        for (const token of intermediates) {
          // Ruta: AnchorA -> Token -> AnchorB -> AnchorA
          for (const fee1 of feeTiers) {
            for (const fee2 of feeTiers) {
              const cycleId = `base-dyn-${anchorA.symbol.toLowerCase()}-${token.symbol.toLowerCase()}-${anchorB.symbol.toLowerCase()}-${fee1}-${fee2}`;
              const is1bps = fee1 === 100 || fee2 === 100;

              this.generatedCycles.push({
                id: cycleId,
                name: `${anchorA.symbol} ➔ ${token.symbol} ➔ ${anchorB.symbol} ➔ ${anchorA.symbol} (${is1bps ? '1bps Ultra' : 'V3 Dynamic'})`,
                chainId: 8453,
                tokenA: {
                  chainId: 8453,
                  symbol: anchorA.symbol,
                  name: anchorA.name,
                  address: anchorA.address,
                  decimals: anchorA.decimals
                },
                tokenB: {
                  chainId: 8453,
                  symbol: token.symbol,
                  name: token.name,
                  address: token.address,
                  decimals: token.decimals
                },
                tokenC: {
                  chainId: 8453,
                  symbol: anchorB.symbol,
                  name: anchorB.name,
                  address: anchorB.address,
                  decimals: anchorB.decimals
                },
                fee1,
                fee2,
                fee3: 500,
                defaultLoanAmount: anchorA.symbol === 'WETH' ? '0.014' : '35.0',
                approxPriceUSD: anchorA.approxPriceUSD,
                isUltraLowFee1bps: is1bps
              });
            }
          }
        }
      }
    }
  }

  public getAllCycles(): TriangularCycle[] {
    return this.generatedCycles;
  }

  public getCyclesCount(): number {
    return this.generatedCycles.length;
  }
}

export const triangularMatrixEngine = TriangularMatrixEngine.getInstance();
