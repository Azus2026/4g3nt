import { sharedPoolStateEngine } from './sharedPoolStateEngine';
import { ArbitragePair } from '../config/registry';
import { DEXQuote } from '../protocolink/protocolinkClient';

export interface IntraDexOpportunity {
  pairId: string;
  pairName: string;
  chainId: number;
  protocol: string;
  cheapFeeTier: number; // e.g. 500 (0.05%)
  expensiveFeeTier: number; // e.g. 3000 (0.30%)
  cheapPrice: number;
  expensivePrice: number;
  spreadPercent: number;
  netSpreadPercent: number;
  optimalLoanUSD: number;
  grossProfitUSD: number;
  estimatedGasUSD: number;
  netProfitUSD: number;
  isViable: boolean;
  leg1: DEXQuote;
  leg2: DEXQuote;
  timestamp: number;
}

export class IntraDexFeeTierEngine {
  private static instance: IntraDexFeeTierEngine;

  public static getInstance(): IntraDexFeeTierEngine {
    if (!IntraDexFeeTierEngine.instance) {
      IntraDexFeeTierEngine.instance = new IntraDexFeeTierEngine();
    }
    return IntraDexFeeTierEngine.instance;
  }

  /**
   * Evalúa el desajuste entre los niveles de comisión (Fee Tiers) dentro del mismo DEX (Uniswap V3 / Aerodrome)
   */
  evaluateFeeTierMispricing(pair: ArbitragePair): IntraDexOpportunity | null {
    // 1. Obtener estado de la piscina del 0.05% (Tier 500)
    const p500 = sharedPoolStateEngine.getPoolState(pair.chainId, 'uniswap-v3', pair.tokenA.symbol, pair.tokenB.symbol);
    // 2. Lectura de la piscina del 0.30% (Tier 3000)
    const p3000 = sharedPoolStateEngine.getPoolState(pair.chainId, 'uniswap-v3-3000', pair.tokenA.symbol, pair.tokenB.symbol);

    if (!p500 || !p3000 || p500.price0In1 <= 0 || p3000.price0In1 <= 0) {
      return null;
    }

    const price500 = p500.price0In1;
    const price3000 = p3000.price0In1;

    if (price500 === price3000) {
      return null;
    }

    const priceMin = Math.min(price500, price3000);
    const priceMax = Math.max(price500, price3000);
    const spread = (priceMax - priceMin) / priceMin;
    const spreadPercent = spread * 100;

    // Fricción intra-DEX: Fee 500 (0.05%) + Fee 3000 (0.30%) + FlashLoan Balancer 0% (o Aave 0.05%)
    const flashLoanFee = (pair.chainId === 42161 || pair.chainId === 1) ? 0.00 : 0.05;
    const totalFrictionPercent = 0.05 + 0.30 + flashLoanFee; // 0.35% a 0.40%
    const netSpreadPercent = spreadPercent - totalFrictionPercent;

    if (netSpreadPercent <= 0.02) {
      return null; // No supera el costo de las comisiones combinadas
    }

    const baseGasCostUSD = (pair.chainId === 8453 || pair.chainId === 137) ? 0.0003
                         : (pair.chainId === 42161 || pair.chainId === 81457) ? 0.0008
                         : 0.003;

    const defaultDepthUnits = pair.approxPriceUSD < 10 ? 50000.0 : 5.0;
    const depth = p500 ? Number(p500.liquidity) / 1e18 : defaultDepthUnits;
    const optimalLoanUSD = Math.min(Math.max(depth * pair.approxPriceUSD * 0.15, 3000), 25000);

    const grossProfitUSD = optimalLoanUSD * (netSpreadPercent / 100);
    const netProfitUSD = grossProfitUSD - baseGasCostUSD;
    const isViable = netProfitUSD >= 0.005;

    const is500Cheaper = price500 < price3000;
    const cheapTier = is500Cheaper ? 500 : 3000;
    const expensiveTier = is500Cheaper ? 3000 : 500;

    const loanAmountInToken = (optimalLoanUSD / pair.approxPriceUSD).toFixed(6);

    const leg1: DEXQuote = {
      protocolId: `uniswap-v3-tier-${cheapTier}`,
      chainId: pair.chainId,
      inputToken: pair.tokenA,
      outputToken: pair.tokenB,
      inputAmount: loanAmountInToken,
      outputAmount: (parseFloat(loanAmountInToken) * priceMin).toFixed(6),
      logic: null
    };

    const leg2: DEXQuote = {
      protocolId: `uniswap-v3-tier-${expensiveTier}`,
      chainId: pair.chainId,
      inputToken: pair.tokenB,
      outputToken: pair.tokenA,
      inputAmount: leg1.outputAmount,
      outputAmount: (parseFloat(leg1.outputAmount) / priceMax * (1 + netSpreadPercent / 100)).toFixed(6),
      logic: null
    };

    return {
      pairId: pair.id,
      pairName: `${pair.name} (Intra-DEX Tier ${cheapTier} ➔ ${expensiveTier})`,
      chainId: pair.chainId,
      protocol: 'uniswap-v3',
      cheapFeeTier: cheapTier,
      expensiveFeeTier: expensiveTier,
      cheapPrice: priceMin,
      expensivePrice: priceMax,
      spreadPercent: Number(spreadPercent.toFixed(4)),
      netSpreadPercent: Number(netSpreadPercent.toFixed(4)),
      optimalLoanUSD: Number(optimalLoanUSD.toFixed(2)),
      grossProfitUSD: Number(grossProfitUSD.toFixed(6)),
      estimatedGasUSD: Number(baseGasCostUSD.toFixed(6)),
      netProfitUSD: Number(netProfitUSD.toFixed(6)),
      isViable,
      leg1,
      leg2,
      timestamp: Date.now()
    };
  }
}

export const intraDexFeeTierEngine = IntraDexFeeTierEngine.getInstance();
