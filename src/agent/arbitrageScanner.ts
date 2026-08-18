import { ArbitragePair } from '../config/registry';
import { ENV } from '../config/env';
import { ProtocolinkClient, DEXQuote, ArbitrageOpportunity } from '../protocolink/protocolinkClient';
import { CEXFetcher } from '../cex/cexFetcher';
import { SweetSpotOptimizer } from '../math/sweetSpotOptimizer';

export class ArbitrageScanner {
  private client: ProtocolinkClient;
  private cexFetcher: CEXFetcher;
  private supportedProtocols = ['velora-v2-all', 'paraswap-v5', 'openocean-v2'];

  constructor() {
    this.client = new ProtocolinkClient();
    this.cexFetcher = new CEXFetcher();
  }

  /**
   * Escanea de forma individual para una cantidad de préstamo específica
   */
  public async evaluatePairForAmount(pair: ArbitragePair, loanAmountStr: string): Promise<ArbitrageOpportunity | null> {
    const { tokenA, tokenB, approxPriceUSD, chainId, cexSymbol } = pair;

    // 1. Leg 1: TokenA -> TokenB
    const leg1QuotesPromises = this.supportedProtocols.map(proto =>
      this.client.getSwapQuotation(proto, chainId, tokenA, tokenB, loanAmountStr).catch(() => null)
    );
    const leg1QuotesRaw = await Promise.all(leg1QuotesPromises);
    const leg1Quotes = leg1QuotesRaw.filter((q): q is DEXQuote => q !== null && parseFloat(q.outputAmount) > 0);

    if (leg1Quotes.length === 0) return null;

    leg1Quotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount));
    const bestLeg1 = leg1Quotes[0];

    // 2. Leg 2: TokenB -> TokenA
    const leg2QuotesPromises = this.supportedProtocols.map(proto =>
      this.client.getSwapQuotation(proto, chainId, tokenB, tokenA, bestLeg1.outputAmount).catch(() => null)
    );

    const leg2QuotesRaw = await Promise.all(leg2QuotesPromises);
    const leg2Quotes = leg2QuotesRaw.filter((q): q is DEXQuote => q !== null && parseFloat(q.outputAmount) > 0);

    if (leg2Quotes.length === 0) return null;

    leg2Quotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount));
    const bestLeg2 = leg2Quotes[0];

    // 3. CEX Reference Ticker
    let cexAvgPriceUSD: number | undefined;
    let cexSpreadPercent: number | undefined;

    if (cexSymbol) {
      const cexInfo = await this.cexFetcher.getAggregatedCEXPrice(cexSymbol).catch(() => ({ avgPrice: 0 }));
      if (cexInfo.avgPrice > 0) {
        cexAvgPriceUSD = cexInfo.avgPrice;
        const dexImpliedPrice = (parseFloat(loanAmountStr) * approxPriceUSD) / parseFloat(bestLeg1.outputAmount);
        cexSpreadPercent = Math.abs(((dexImpliedPrice - cexAvgPriceUSD) / cexAvgPriceUSD) * 100);
      }
    }

    // 4. Balancer 0.00% Flash Loan Fee vs Aave 0.05%
    const isBalancerSupported = chainId === 1 || chainId === 137 || chainId === 42161;
    const flashLoanFeeRate = isBalancerSupported ? 0.00 : 0.0005;
    const loanNum = parseFloat(loanAmountStr);
    const flashLoanFeeNum = loanNum * flashLoanFeeRate;
    const totalRequiredToRepay = loanNum + flashLoanFeeNum;

    const returnTokenANum = parseFloat(bestLeg2.outputAmount);
    const grossProfitTokenA = returnTokenANum - totalRequiredToRepay;
    const grossProfitUSD = grossProfitTokenA * approxPriceUSD;

    // Estimación Gas
    const gasUnits = chainId === 1 ? 350000 : 150000;
    const gweiPrice = chainId === 1 ? 20 : 0.1;
    const estimatedGasEth = (gasUnits * gweiPrice * 1e-9);
    const estimatedGasUSD = estimatedGasEth * (pair.id.includes('WETH') ? approxPriceUSD : 3000);

    const netProfitUSD = grossProfitUSD - estimatedGasUSD;
    const isProfitable = netProfitUSD >= ENV.minProfitUSD;

    return {
      pairId: pair.id,
      pairName: pair.name,
      chainId,
      flashLoanAmount: loanAmountStr,
      tokenA,
      tokenB,
      leg1: bestLeg1,
      leg2: bestLeg2,
      flashLoanFeeAmount: flashLoanFeeNum.toFixed(6),
      netReturnTokenA: returnTokenANum.toFixed(6),
      grossProfitTokenA: grossProfitTokenA.toFixed(6),
      grossProfitUSD,
      estimatedGasUSD,
      netProfitUSD,
      isProfitable,
      cexReferencePriceUSD: cexAvgPriceUSD,
      cexDEXSpreadPercent: cexSpreadPercent,
    };
  }

  /**
   * Optimización Matemática del Sweet Spot (x*y=k & Golden Section Search)
   * Calcula la derivada del beneficio respecto al préstamo para encontrar la máxima ganancia neta
   */
  async scanPair(pair: ArbitragePair): Promise<ArbitrageOpportunity | null> {
    return SweetSpotOptimizer.findOptimalLoan(pair, (amtStr) => this.evaluatePairForAmount(pair, amtStr));
  }
}
