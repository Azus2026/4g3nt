import { ArbitragePair } from '../config/registry';
import { ENV } from '../config/env';
import { ProtocolinkClient, DEXQuote, ArbitrageOpportunity } from '../protocolink/protocolinkClient';
import { CEXFetcher } from '../cex/cexFetcher';
import { logger } from '../utils/logger';

export class ArbitrageScanner {
  private client: ProtocolinkClient;
  private cexFetcher: CEXFetcher;
  private supportedProtocols = ['uniswap-v3', 'openocean-v2', 'paraswap-v5', 'zeroex-v4'];

  constructor() {
    this.client = new ProtocolinkClient();
    this.cexFetcher = new CEXFetcher();
  }

  /**
   * Escanea una pareja de tokens en su cadena correspondiente buscando discrepancias DEX/CEX
   */
  async scanPair(pair: ArbitragePair): Promise<ArbitrageOpportunity | null> {
    const { tokenA, tokenB, defaultLoanAmount, approxPriceUSD, chainId, cexSymbol } = pair;

    // 1. Obtener cotizaciones para la Leg 1 (TokenA -> TokenB)
    const leg1QuotesPromises = this.supportedProtocols.map(proto =>
      this.client.getSwapQuotation(proto, chainId, tokenA, tokenB, defaultLoanAmount)
    );
    const leg1QuotesRaw = await Promise.all(leg1QuotesPromises);
    const leg1Quotes = leg1QuotesRaw.filter((q): q is DEXQuote => q !== null);

    if (leg1Quotes.length === 0) return null;

    leg1Quotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount));
    const bestLeg1 = leg1Quotes[0];

    // 2. Obtener cotizaciones para la Leg 2 (TokenB -> TokenA)
    const leg2QuotesPromises = this.supportedProtocols
      .filter(proto => proto !== bestLeg1.protocolId)
      .map(proto => this.client.getSwapQuotation(proto, chainId, tokenB, tokenA, bestLeg1.outputAmount));

    const leg2QuotesRaw = await Promise.all(leg2QuotesPromises);
    const leg2Quotes = leg2QuotesRaw.filter((q): q is DEXQuote => q !== null);

    if (leg2Quotes.length === 0) return null;

    leg2Quotes.sort((a, b) => parseFloat(b.outputAmount) - parseFloat(a.outputAmount));
    const bestLeg2 = leg2Quotes[0];

    // 3. Obtener cotización de CEX si está disponible
    let cexAvgPriceUSD: number | undefined;
    let cexSpreadPercent: number | undefined;

    if (cexSymbol) {
      const cexInfo = await this.cexFetcher.getAggregatedCEXPrice(cexSymbol);
      if (cexInfo.avgPrice > 0) {
        cexAvgPriceUSD = cexInfo.avgPrice;
        // Calcular la dispersión entre el precio del DEX Leg1 y el CEX
        const dexImpliedPrice = (parseFloat(defaultLoanAmount) * approxPriceUSD) / parseFloat(bestLeg1.outputAmount);
        cexSpreadPercent = Math.abs(((dexImpliedPrice - cexAvgPriceUSD) / cexAvgPriceUSD) * 100);
      }
    }

    // 4. Cálculos de comisiones y ganancia neta
    const flashLoanFeeRate = ENV.flashLoanProvider === 'balancerv2' ? 0.0 : 0.0005;
    const loanNum = parseFloat(defaultLoanAmount);
    const flashLoanFeeNum = loanNum * flashLoanFeeRate;
    const totalRequiredToRepay = loanNum + flashLoanFeeNum;

    const returnTokenANum = parseFloat(bestLeg2.outputAmount);
    const grossProfitTokenA = returnTokenANum - totalRequiredToRepay;
    const grossProfitUSD = grossProfitTokenA * approxPriceUSD;

    // Ajuste de estimación de Gas por Cadena (L1 ~350k gas, L2 ~150k gas)
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
      flashLoanAmount: defaultLoanAmount,
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
}
