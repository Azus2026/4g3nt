import { TriangularCycle } from './triangularRegistry';
import { ProtocolinkClient, DEXQuote } from '../protocolink/protocolinkClient';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

export interface TriangularOpportunity {
  cycleId: string;
  cycleName: string;
  chainId: number;
  flashLoanAmount: string;
  tokenA: any;
  tokenB: any;
  tokenC: any;
  leg1: DEXQuote;
  leg2: DEXQuote;
  leg3: DEXQuote;
  flashLoanFeeAmount: string;
  netReturnTokenA: string;
  grossProfitTokenA: string;
  grossProfitUSD: number;
  estimatedGasUSD: number;
  netProfitUSD: number;
  isProfitable: boolean;
}

export class TriangularScanner {
  private client: ProtocolinkClient;
  private supportedProtocols = ['uniswap-v3', 'camelot-v3', 'aerodrome-base', 'sushiswap-v3', 'balancer-v2', 'curve-v2', 'paraswap-v5'];

  constructor() {
    this.client = new ProtocolinkClient();
  }

  public async evaluateCycleForAmount(
    cycle: TriangularCycle,
    loanAmountStr: string
  ): Promise<TriangularOpportunity | null> {
    const { tokenA, tokenB, tokenC, chainId, approxPriceUSD } = cycle;

    try {
      // 1. PATA 1: Token A ➔ Token B
      const leg1Quotes = (
        await Promise.all(
          this.supportedProtocols.map(proto =>
            this.client.getSwapQuotation(proto, chainId, tokenA, tokenB, loanAmountStr).catch(() => null)
          )
        )
      ).filter((q): q is DEXQuote => q !== null && parseFloat(q.outputAmount) > 0);

      if (leg1Quotes.length === 0) return null;
      leg1Quotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount));
      const bestLeg1 = leg1Quotes[0];

      // 2. PATA 2: Token B ➔ Token C
      const leg2Quotes = (
        await Promise.all(
          this.supportedProtocols.map(proto =>
            this.client.getSwapQuotation(proto, chainId, tokenB, tokenC, bestLeg1.outputAmount).catch(() => null)
          )
        )
      ).filter((q): q is DEXQuote => q !== null && parseFloat(q.outputAmount) > 0);

      if (leg2Quotes.length === 0) return null;
      leg2Quotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount));
      const bestLeg2 = leg2Quotes[0];

      // 3. PATA 3: Token C ➔ Token A
      const leg3Quotes = (
        await Promise.all(
          this.supportedProtocols.map(proto =>
            this.client.getSwapQuotation(proto, chainId, tokenC, tokenA, bestLeg2.outputAmount).catch(() => null)
          )
        )
      ).filter((q): q is DEXQuote => q !== null && parseFloat(q.outputAmount) > 0);

      leg3Quotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount));
      const bestLeg3 = leg3Quotes[0];

      // Filtro Estricto Cross-DEX: Al menos dos patas deben usar protocolos/pools independientes
      const uniqueProtocols = new Set([
        bestLeg1.protocolId.toLowerCase(),
        bestLeg2.protocolId.toLowerCase(),
        bestLeg3.protocolId.toLowerCase()
      ]);
      if (uniqueProtocols.size < 2) {
        return null;
      }

      // 4. Cálculo Económico (Balancer 0.00% en Arbitrum/Mainnet vs Aave 0.05% en Base/OP)
      const isBalancerSupported = chainId === 1 || chainId === 137 || chainId === 42161;
      const flashLoanFeeRate = isBalancerSupported ? 0.00 : 0.0005;
      const loanNum = parseFloat(loanAmountStr);
      const flashLoanFeeNum = loanNum * flashLoanFeeRate;
      const totalRequiredToRepay = loanNum + flashLoanFeeNum;

      const returnTokenANum = parseFloat(bestLeg3.outputAmount);
      // Filtro de Sensatez de Liquidez
      if (returnTokenANum < totalRequiredToRepay * 0.80) {
        return null;
      }

      const grossProfitTokenA = returnTokenANum - totalRequiredToRepay;
      const grossProfitUSD = grossProfitTokenA * approxPriceUSD;

      // Estimación Gas L2
      const gasUnits = chainId === 1 ? 450000 : 220000;
      const gweiPrice = chainId === 1 ? 20 : 0.1;
      const estimatedGasEth = (gasUnits * gweiPrice * 1e-9);
      const estimatedGasUSD = estimatedGasEth * (cycle.id.includes('weth') ? approxPriceUSD : 3000);

      const netProfitUSD = grossProfitUSD - estimatedGasUSD;
      const isProfitable = netProfitUSD >= ENV.minProfitUSD;

      return {
        cycleId: cycle.id,
        cycleName: cycle.name,
        chainId,
        flashLoanAmount: loanAmountStr,
        tokenA,
        tokenB,
        tokenC,
        leg1: bestLeg1,
        leg2: bestLeg2,
        leg3: bestLeg3,
        flashLoanFeeAmount: flashLoanFeeNum.toFixed(6),
        netReturnTokenA: returnTokenANum.toFixed(6),
        grossProfitTokenA: grossProfitTokenA.toFixed(6),
        grossProfitUSD,
        estimatedGasUSD,
        netProfitUSD,
        isProfitable,
      };
    } catch {
      return null;
    }
  }

  public async scanCycle(cycle: TriangularCycle): Promise<TriangularOpportunity | null> {
    const opp = await this.evaluateCycleForAmount(cycle, cycle.defaultLoanAmount);
    if (!opp || !opp.isProfitable) return opp;

    // Si es rentable, probar 2.5x para maximizar ganancia
    const boostedAmt = (parseFloat(cycle.defaultLoanAmount) * 2.5).toFixed(6);
    const boostedOpp = await this.evaluateCycleForAmount(cycle, boostedAmt);
    if (boostedOpp && boostedOpp.netProfitUSD > opp.netProfitUSD) {
      return boostedOpp;
    }
    return opp;
  }
}
