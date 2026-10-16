import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { SweetSpotOptimizer } from './sweetSpotOptimizer';
import { flashLoanProviderService } from '../services/flashLoanProviderService';

export interface EconomicCalculationParams {
  chainId: number;
  loanTokenAddress: string;
  loanAmount: bigint;
  simulatedGrossProfitUnits: bigint;
  tokenPriceUSD: number;
  ethPriceUSD: number;
  gasEstimatedL2?: bigint;
  l2GasPriceGwei?: number;
  calldataSizeBytes?: number;
  slippageBufferBps?: number; // e.g. 15 bps = 0.15%
}

export interface EconomicEvaluationResult {
  tokenDecimals: number;
  loanTokenSymbol: string;
  loanAmountFormatted: string;
  loanAmountUSD: number;
  grossProfitFormatted: string;
  grossProfitUSD: number;
  l2GasUSD: number;
  l1DataFeeUSD: number;
  totalGasCostUSD: number;
  totalGasCostETH: number;
  slippageBufferUSD: number;
  netProfitUSD: number;
  minRequiredProfitUSD: number;
  isProfitable: boolean;
  rejectionReason?: string;
  recommendedContractMinProfitUnits: bigint;
}

export class EconomicMath {
  /**
   * Calcula el minProfit en unidades del token para trasladar al Smart Contract.
   * Garantiza que el contrato inteligente no acepte spreads microscópicos que no cubran
   * los costos de transacción o el umbral mínimo configurado.
   */
  public static calculateContractMinProfit(
    minProfitUSD: number,
    tokenPriceUSD: number,
    tokenDecimals: number
  ): bigint {
    const safeMinUSD = Math.max(minProfitUSD, 0.25);
    const safePrice = Math.max(tokenPriceUSD, 0.00001);
    const requiredTokensFloat = safeMinUSD / safePrice;
    
    try {
      const units = ethers.parseUnits(requiredTokensFloat.toFixed(tokenDecimals > 8 ? 8 : tokenDecimals), tokenDecimals);
      return units > 0n ? units : 1n;
    } catch {
      // Fallback seguro según decimales
      if (tokenDecimals === 6) return 250_000n; // 0.25 USDC
      if (tokenDecimals === 8) return 370n; // ~$0.25 BTC
      return 100_000_000_000_000n; // 0.0001 WETH (~$0.25)
    }
  }

  /**
   * Evaluación económica integral y rigurosa:
   * Beneficio Neto USD = Retorno Bruto - Préstamo - Comisión Flash - Gas L2 - L1 Data Fee - Margen de Seguridad
   */
  public static evaluateOpportunity(params: EconomicCalculationParams): EconomicEvaluationResult {
    const tokenDecimals = flashLoanProviderService.getStrictDecimals(params.loanTokenAddress, 18);
    const loanTokenSymbol = tokenDecimals === 6 ? 'USDC' : (tokenDecimals === 8 ? 'cbBTC' : 'WETH');

    const loanAmountFormatted = ethers.formatUnits(params.loanAmount, tokenDecimals);
    const loanAmountNum = parseFloat(loanAmountFormatted);
    const loanAmountUSD = loanAmountNum * params.tokenPriceUSD;

    const grossProfitFormatted = ethers.formatUnits(params.simulatedGrossProfitUnits, tokenDecimals);
    const grossProfitTokens = parseFloat(grossProfitFormatted);
    const grossProfitUSD = parseFloat((grossProfitTokens * params.tokenPriceUSD).toFixed(6));

    // Gas Real L2 + L1 Data Fee
    const gasUnits = params.gasEstimatedL2 || 220_000n;
    const l2Gwei = params.l2GasPriceGwei || 0.05;
    const calldataBytes = params.calldataSizeBytes || 384;

    const gasBreakdown = SweetSpotOptimizer.calculateTotalGasCostUSD(
      params.chainId,
      gasUnits,
      l2Gwei,
      params.ethPriceUSD,
      calldataBytes
    );

    const totalGasCostUSD = gasBreakdown.totalGasUSD;
    const totalGasCostETH = params.ethPriceUSD > 0 ? totalGasCostUSD / params.ethPriceUSD : 0;

    // Margen de seguridad por slippage / movimiento de reservas (15 bps = 0.15% del préstamo, o 15% del margen bruto)
    // El margen de seguridad evita transacciones con spreads tan finos que un swap mínimo previo las haga revertir.
    const slippageBufferBps = params.slippageBufferBps ?? 15;
    const loanSlippageUSD = (loanAmountUSD * slippageBufferBps) / 10_000;
    const profitHaircutUSD = grossProfitUSD * 0.10; // 10% de amortiguación sobre ganancia bruta
    const slippageBufferUSD = parseFloat(Math.min(loanSlippageUSD, profitHaircutUSD).toFixed(6));

    const netProfitUSD = parseFloat((grossProfitUSD - totalGasCostUSD - slippageBufferUSD).toFixed(6));
    const minRequiredProfitUSD = Math.max(ENV.minProfitUsd, 0.25);

    let isProfitable = false;
    let rejectionReason: string | undefined;

    if (grossProfitUSD <= 0) {
      rejectionReason = 'Gross profit is zero or negative';
    } else if (grossProfitUSD <= totalGasCostUSD) {
      rejectionReason = `Gross profit ($${grossProfitUSD}) does not cover total gas ($${totalGasCostUSD})`;
    } else if (netProfitUSD < minRequiredProfitUSD) {
      rejectionReason = `Net profit ($${netProfitUSD}) below minimum threshold ($${minRequiredProfitUSD})`;
    } else {
      isProfitable = true;
    }

    const recommendedContractMinProfitUnits = this.calculateContractMinProfit(
      minRequiredProfitUSD,
      params.tokenPriceUSD,
      tokenDecimals
    );

    return {
      tokenDecimals,
      loanTokenSymbol,
      loanAmountFormatted,
      loanAmountUSD,
      grossProfitFormatted,
      grossProfitUSD,
      l2GasUSD: gasBreakdown.l2GasUSD,
      l1DataFeeUSD: gasBreakdown.l1DataFeeUSD,
      totalGasCostUSD,
      totalGasCostETH,
      slippageBufferUSD,
      netProfitUSD: Math.max(0, netProfitUSD),
      minRequiredProfitUSD,
      isProfitable,
      rejectionReason,
      recommendedContractMinProfitUnits,
    };
  }
}
