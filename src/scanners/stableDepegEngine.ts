import { sharedPoolStateEngine } from './sharedPoolStateEngine';
import { ArbitragePair } from '../config/registry';
import { DEXQuote } from '../protocolink/protocolinkClient';

export interface StableDepegOpportunity {
  pairId: string;
  pairName: string;
  chainId: number;
  stableAsset: string;
  referenceAsset: string;
  spotPrice: number;
  peggedPrice: number;
  depegPercent: number;
  netDepegSpreadPercent: number;
  optimalLoanUSD: number;
  grossProfitUSD: number;
  estimatedGasUSD: number;
  netProfitUSD: number;
  isViable: boolean;
  leg1: DEXQuote;
  leg2: DEXQuote;
  timestamp: number;
}

const PEGGED_SYMBOLS = new Set([
  'USDC', 'USDT', 'DAI', 'USDC.e', 'USDe', 'crvUSD', 'FRAX', 'FDUSD',
  'wstETH', 'weETH', 'ezETH', 'cbBTC', 'WBTC'
]);

export class StableDepegEngine {
  private static instance: StableDepegEngine;

  public static getInstance(): StableDepegEngine {
    if (!StableDepegEngine.instance) {
      StableDepegEngine.instance = new StableDepegEngine();
    }
    return StableDepegEngine.instance;
  }

  /**
   * Evalúa desvíos temporales en activos vinculados 1:1 (Stablecoins y Liquid Restaking Tokens)
   */
  evaluateDepegOpportunity(pair: ArbitragePair): StableDepegOpportunity | null {
    const isTokenAPegged = PEGGED_SYMBOLS.has(pair.tokenA.symbol);
    const isTokenBPegged = PEGGED_SYMBOLS.has(pair.tokenB.symbol);

    if (!isTokenAPegged && !isTokenBPegged) {
      return null;
    }

    const p1 = sharedPoolStateEngine.getPoolState(pair.chainId, 'uniswap-v3', pair.tokenA.symbol, pair.tokenB.symbol);
    const proto2Name = pair.chainId === 8453 ? 'aerodrome-slipstream' : pair.chainId === 42161 ? 'camelot-v3' : 'curve-v2';
    const p2 = sharedPoolStateEngine.getPoolState(pair.chainId, proto2Name, pair.tokenA.symbol, pair.tokenB.symbol);

    const price1 = (p1 && p1.price0In1 > 0) ? p1.price0In1 : pair.approxPriceUSD;
    const price2 = (p2 && p2.price0In1 > 0) ? p2.price0In1 : price1;

    if (price1 === price2) {
      return null;
    }

    const priceMin = Math.min(price1, price2);
    const priceMax = Math.max(price1, price2);
    const depegSpread = (priceMax - priceMin) / priceMin;
    const depegPercent = depegSpread * 100;

    // En pares vinculados, el swap fee es ultra-bajo (Tier 100 = 0.01% o Tier 500 = 0.05%)
    const feeTier = (pair.name.includes('USDC') && pair.name.includes('USDT')) ? 0.01 : 0.05;
    const flashLoanFee = (pair.chainId === 42161 || pair.chainId === 1) ? 0.00 : 0.05;
    const totalFriction = (feeTier * 2) + flashLoanFee; // 0.02% a 0.15%

    const netDepegSpreadPercent = depegPercent - totalFriction;

    if (netDepegSpreadPercent <= 0.01) {
      return null;
    }

    const baseGasCostUSD = (pair.chainId === 8453 || pair.chainId === 137) ? 0.0003
                         : (pair.chainId === 42161 || pair.chainId === 81457) ? 0.0008
                         : 0.003;

    // En activos vinculados, la liquidez es profunda: préstamos de hasta $50,000 USD
    const optimalLoanUSD = Math.min(parseFloat(pair.defaultLoanAmount) * pair.approxPriceUSD * 1.5, 50000);
    const grossProfitUSD = optimalLoanUSD * (netDepegSpreadPercent / 100);
    const netProfitUSD = grossProfitUSD - baseGasCostUSD;
    const isViable = netProfitUSD >= 0.005;

    const loanAmountInToken = (optimalLoanUSD / pair.approxPriceUSD).toFixed(6);

    const leg1: DEXQuote = {
      protocolId: price1 < price2 ? 'uniswap-v3' : proto2Name,
      chainId: pair.chainId,
      inputToken: pair.tokenA,
      outputToken: pair.tokenB,
      inputAmount: loanAmountInToken,
      outputAmount: (parseFloat(loanAmountInToken) * priceMin).toFixed(6),
      logic: null
    };

    const leg2: DEXQuote = {
      protocolId: price1 < price2 ? proto2Name : 'uniswap-v3',
      chainId: pair.chainId,
      inputToken: pair.tokenB,
      outputToken: pair.tokenA,
      inputAmount: leg1.outputAmount,
      outputAmount: (parseFloat(leg1.outputAmount) / priceMax * (1 + netDepegSpreadPercent / 100)).toFixed(6),
      logic: null
    };

    return {
      pairId: pair.id,
      pairName: `${pair.name} (Stable/LST Depeg Sniping)`,
      chainId: pair.chainId,
      stableAsset: pair.tokenA.symbol,
      referenceAsset: pair.tokenB.symbol,
      spotPrice: priceMin,
      peggedPrice: 1.0,
      depegPercent: Number(depegPercent.toFixed(4)),
      netDepegSpreadPercent: Number(netDepegSpreadPercent.toFixed(4)),
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

export const stableDepegEngine = StableDepegEngine.getInstance();
