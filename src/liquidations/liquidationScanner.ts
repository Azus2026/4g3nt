import { TokenConfig } from '../config/registry';
import { logger } from '../utils/logger';

export interface LendingPoolConfig {
  protocol: 'AAVE_V3' | 'COMPOUND_V3' | 'MOONWELL' | 'MORPHO_BLUE' | 'RADIANT';
  chainId: number;
  poolAddress: string;
  liquidationBonusPercent: number; // 5% a 10%
  oracleAddress: string;
}

export interface LiquidationCandidate {
  userAddress: string;
  protocol: string;
  chainId: number;
  debtToken: TokenConfig;
  collateralToken: TokenConfig;
  debtToCoverUSD: number;
  healthFactor: number;
  liquidationBonusPercent: number;
}

export interface LiquidationOpportunity {
  id: string;
  candidate: LiquidationCandidate;
  flashLoanAmountUSD: number;
  expectedGrossBonusUSD: number;
  swapSlippageUSD: number;
  estimatedGasUSD: number;
  flashLoanFeeUSD: number;
  netProfitUSD: number;
  isExecutable: boolean;
}

/**
 * Atomic Lending Liquidation Scanner
 * Monitorea cuentas sobre-apalancadas con Health Factor < 1.0 en protocolos de préstamo
 * y ejecuta la liquidación atómica con Flash Loan + Swap de colateral en el mismo bloque.
 */
export class LiquidationScanner {
  /**
   * Evalúa la rentabilidad neta de liquidar una posición de deuda en riesgo
   */
  public evaluateLiquidation(candidate: LiquidationCandidate): LiquidationOpportunity | null {
    if (candidate.healthFactor >= 1.0) return null;

    const bonusRate = candidate.liquidationBonusPercent / 100;
    const grossBonusUSD = candidate.debtToCoverUSD * bonusRate;
    const swapSlippageUSD = candidate.debtToCoverUSD * 0.0035; // 0.35% de slippage promedio al vender colateral
    const gasCostUSD = candidate.chainId === 1 ? 9.5 : 0.12;
    const flashLoanFeeUSD = 0.0; // Balancer 0% fee

    const netProfitUSD = grossBonusUSD - swapSlippageUSD - gasCostUSD - flashLoanFeeUSD;
    const isExecutable = netProfitUSD > 1.0 && candidate.healthFactor < 0.995;

    return {
      id: `LIQ-${Date.now()}-${candidate.protocol}-${candidate.userAddress.slice(0, 6)}`,
      candidate,
      flashLoanAmountUSD: candidate.debtToCoverUSD,
      expectedGrossBonusUSD: Number(grossBonusUSD.toFixed(2)),
      swapSlippageUSD: Number(swapSlippageUSD.toFixed(2)),
      estimatedGasUSD: gasCostUSD,
      flashLoanFeeUSD,
      netProfitUSD: Number(netProfitUSD.toFixed(2)),
      isExecutable
    };
  }
}

export const liquidationScanner = new LiquidationScanner();
