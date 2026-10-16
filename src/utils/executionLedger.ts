import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

export type ExecutionStatus =
  | 'SIMULATED'
  | 'SIMULATED_REVERT'
  | 'SUBMITTED'
  | 'MINED_SUCCESS'
  | 'MINED_REVERTED'
  | 'DROPPED';

export interface ExecutionLedgerEntry {
  id: string;
  timestamp: string;
  chainId: number;
  pairName: string;
  provider: 'balancer' | 'aave' | 'protocolink';
  loanTokenSymbol: string;
  loanAmount: string;
  status: ExecutionStatus;
  txHash: string | null;
  blockNumber: number | null;
  simulatedGrossProfitUSD: number;
  simulatedGasUSD: number;
  simulatedNetProfitUSD: number;
  realizedGrossProfitToken: string | null;
  realizedGrossProfitUSD: number | null;
  actualGasUsedWei: string | null;
  actualGasCostETH: string | null;
  actualGasCostUSD: number | null;
  realizedNetProfitUSD: number | null;
  notes?: string;
}

export interface ExecutionLedgerSummary {
  simulatedCount: number;
  simulatedPnLUSD: number;
  submittedCount: number;
  minedSuccessCount: number;
  minedRevertedCount: number;
  totalGasSpentETH: number;
  totalGasSpentUSD: number;
  realizedPnLUSD: number;
  recentEntries: ExecutionLedgerEntry[];
}

const FLASH_LOAN_EXECUTED_ABI = [
  'event FlashLoanExecuted(address indexed token, uint256 loanAmount, uint256 grossProfit, uint256 timestamp)'
];
const flashLoanIface = new ethers.Interface(FLASH_LOAN_EXECUTED_ABI);

export class ExecutionLedger {
  private entries: ExecutionLedgerEntry[] = [];
  private filePath: string;
  private persistEnabled: boolean;

  constructor(customFilePath?: string, persistEnabled: boolean = true) {
    this.filePath = customFilePath || path.join(process.cwd(), 'data', 'execution_ledger.json');
    this.persistEnabled = persistEnabled;
    if (this.persistEnabled) {
      this.loadFromDisk();
    }
  }

  public setPersistence(enabled: boolean, customFilePath?: string): void {
    this.persistEnabled = enabled;
    if (customFilePath) {
      this.filePath = customFilePath;
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.entries = parsed;
        }
      }
    } catch {
      // Ignore corrupt or missing ledger file on startup
    }
  }

  private saveToDisk(): void {
    if (!this.persistEnabled) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.entries.slice(0, 500), null, 2), 'utf-8');
    } catch {
      // Non-blocking disk write
    }
  }

  /**
   * Registra una simulación exitosa (DRY_RUN=true).
   * NUNCA incrementa contadores de operaciones minadas ni ganancias realizadas on-chain.
   */
  public recordSimulation(params: {
    chainId: number;
    pairName: string;
    provider: 'balancer' | 'aave' | 'protocolink';
    loanTokenSymbol: string;
    loanAmount: string;
    simulatedGrossProfitUSD: number;
    simulatedGasUSD: number;
    simulatedNetProfitUSD: number;
    notes?: string;
  }): ExecutionLedgerEntry {
    const entry: ExecutionLedgerEntry = {
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      chainId: params.chainId,
      pairName: params.pairName,
      provider: params.provider,
      loanTokenSymbol: params.loanTokenSymbol,
      loanAmount: params.loanAmount,
      status: 'SIMULATED',
      txHash: null,
      blockNumber: null,
      simulatedGrossProfitUSD: Number(params.simulatedGrossProfitUSD.toFixed(6)),
      simulatedGasUSD: Number(params.simulatedGasUSD.toFixed(6)),
      simulatedNetProfitUSD: Number(params.simulatedNetProfitUSD.toFixed(6)),
      realizedGrossProfitToken: null,
      realizedGrossProfitUSD: null,
      actualGasUsedWei: null,
      actualGasCostETH: null,
      actualGasCostUSD: null,
      realizedNetProfitUSD: null,
      notes: params.notes || 'DRY_RUN staticCall + estimateGas',
    };

    this.entries.unshift(entry);
    if (this.entries.length > 500) this.entries.pop();
    this.saveToDisk();
    return entry;
  }

  /**
   * Registra una simulación que revirtió o falló en el pre-flight (staticCall / estimateGas).
   * Cero gas consumido on-chain.
   */
  public recordSimulatedRevert(params: {
    chainId: number;
    pairName: string;
    provider: 'balancer' | 'aave' | 'protocolink';
    loanTokenSymbol: string;
    loanAmount: string;
    reason: string;
  }): ExecutionLedgerEntry {
    const entry: ExecutionLedgerEntry = {
      id: `sim-rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      chainId: params.chainId,
      pairName: params.pairName,
      provider: params.provider,
      loanTokenSymbol: params.loanTokenSymbol,
      loanAmount: params.loanAmount,
      status: 'SIMULATED_REVERT',
      txHash: null,
      blockNumber: null,
      simulatedGrossProfitUSD: 0,
      simulatedGasUSD: 0,
      simulatedNetProfitUSD: 0,
      realizedGrossProfitToken: null,
      realizedGrossProfitUSD: null,
      actualGasUsedWei: null,
      actualGasCostETH: null,
      actualGasCostUSD: null,
      realizedNetProfitUSD: null,
      notes: `Pre-flight aborted: ${params.reason}`,
    };

    this.entries.unshift(entry);
    if (this.entries.length > 500) this.entries.pop();
    this.saveToDisk();
    return entry;
  }

  /**
   * Registra una transacción real minada en blockchain a partir de su TransactionReceipt.
   * Extrae la ganancia real del evento FlashLoanExecuted y descuenta el gas efectivamente cobrado.
   */
  public recordMinedTransaction(params: {
    chainId: number;
    pairName: string;
    provider: 'balancer' | 'aave' | 'protocolink';
    loanTokenSymbol: string;
    loanTokenDecimals: number;
    loanTokenPriceUSD: number;
    loanAmount: string;
    ethPriceUSD: number;
    simulatedGrossProfitUSD: number;
    simulatedGasUSD: number;
    simulatedNetProfitUSD: number;
    receipt: {
      hash?: string;
      transactionHash?: string;
      status?: number | null;
      blockNumber?: number | null;
      gasUsed?: bigint;
      effectiveGasPrice?: bigint;
      gasPrice?: bigint;
      logs?: ReadonlyArray<{ topics: ReadonlyArray<string>; data: string }>;
      l1Fee?: bigint;
    };
  }): ExecutionLedgerEntry {
    const { receipt } = params;
    const txHash = receipt.hash || receipt.transactionHash || null;
    const isSuccess = receipt.status === 1;

    const gasUsed = receipt.gasUsed ?? 0n;
    const gasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
    const l1Fee = receipt.l1Fee ?? 0n;
    const totalGasWei = gasUsed * gasPrice + l1Fee;
    const actualGasCostETHNum = Number(ethers.formatEther(totalGasWei));
    const actualGasCostUSD = actualGasCostETHNum * params.ethPriceUSD;

    let realizedGrossTokenStr = '0';
    let realizedGrossUSD = 0;

    if (isSuccess && receipt.logs && receipt.logs.length > 0) {
      for (const log of receipt.logs) {
        try {
          const parsed = flashLoanIface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
          if (parsed && parsed.name === 'FlashLoanExecuted') {
            const grossProfitRaw: bigint = parsed.args.grossProfit;
            realizedGrossTokenStr = ethers.formatUnits(grossProfitRaw, params.loanTokenDecimals);
            realizedGrossUSD = parseFloat(realizedGrossTokenStr) * params.loanTokenPriceUSD;
            break;
          }
        } catch {
          // Ignore unrelated logs (ERC20 Transfer, Swap, etc.)
        }
      }
    }

    const realizedNetProfitUSD = isSuccess
      ? realizedGrossUSD - actualGasCostUSD
      : -actualGasCostUSD;

    const entry: ExecutionLedgerEntry = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      chainId: params.chainId,
      pairName: params.pairName,
      provider: params.provider,
      loanTokenSymbol: params.loanTokenSymbol,
      loanAmount: params.loanAmount,
      status: isSuccess ? 'MINED_SUCCESS' : 'MINED_REVERTED',
      txHash,
      blockNumber: receipt.blockNumber ?? null,
      simulatedGrossProfitUSD: Number(params.simulatedGrossProfitUSD.toFixed(6)),
      simulatedGasUSD: Number(params.simulatedGasUSD.toFixed(6)),
      simulatedNetProfitUSD: Number(params.simulatedNetProfitUSD.toFixed(6)),
      realizedGrossProfitToken: realizedGrossTokenStr,
      realizedGrossProfitUSD: Number(realizedGrossUSD.toFixed(6)),
      actualGasUsedWei: totalGasWei.toString(),
      actualGasCostETH: actualGasCostETHNum.toFixed(9),
      actualGasCostUSD: Number(actualGasCostUSD.toFixed(6)),
      realizedNetProfitUSD: Number(realizedNetProfitUSD.toFixed(6)),
      notes: isSuccess ? 'On-chain FlashLoanExecuted verified' : 'Transaction reverted on-chain',
    };

    this.entries.unshift(entry);
    if (this.entries.length > 500) this.entries.pop();
    this.saveToDisk();
    return entry;
  }

  public getSummary(): ExecutionLedgerSummary {
    let simulatedCount = 0;
    let simulatedPnLUSD = 0;
    let submittedCount = 0;
    let minedSuccessCount = 0;
    let minedRevertedCount = 0;
    let totalGasSpentETH = 0;
    let totalGasSpentUSD = 0;
    let realizedPnLUSD = 0;

    for (const e of this.entries) {
      if (e.status === 'SIMULATED') {
        simulatedCount++;
        simulatedPnLUSD += e.simulatedNetProfitUSD;
      } else if (e.status === 'SUBMITTED') {
        submittedCount++;
      } else if (e.status === 'MINED_SUCCESS') {
        minedSuccessCount++;
        totalGasSpentETH += parseFloat(e.actualGasCostETH || '0');
        totalGasSpentUSD += e.actualGasCostUSD || 0;
        realizedPnLUSD += e.realizedNetProfitUSD || 0;
      } else if (e.status === 'MINED_REVERTED') {
        minedRevertedCount++;
        totalGasSpentETH += parseFloat(e.actualGasCostETH || '0');
        totalGasSpentUSD += e.actualGasCostUSD || 0;
        realizedPnLUSD += e.realizedNetProfitUSD || 0;
      }
    }

    return {
      simulatedCount,
      simulatedPnLUSD: Number(simulatedPnLUSD.toFixed(4)),
      submittedCount,
      minedSuccessCount,
      minedRevertedCount,
      totalGasSpentETH: Number(totalGasSpentETH.toFixed(8)),
      totalGasSpentUSD: Number(totalGasSpentUSD.toFixed(4)),
      realizedPnLUSD: Number(realizedPnLUSD.toFixed(4)),
      recentEntries: this.entries.slice(0, 50),
    };
  }

  /**
   * Obtiene el total de gas consumido en ETH durante las últimas 24 horas.
   */
  public getDailyGasSpentETH(chainId?: number): number {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let dailyGas = 0;

    for (const e of this.entries) {
      if (e.status === 'MINED_SUCCESS' || e.status === 'MINED_REVERTED') {
        const entryTime = new Date(e.timestamp).getTime();
        if (entryTime >= oneDayAgo) {
          if (!chainId || e.chainId === chainId) {
            dailyGas += parseFloat(e.actualGasCostETH || '0');
          }
        }
      }
    }

    return Number(dailyGas.toFixed(8));
  }

  /**
   * Verifica si una transacción que gastará estimatedGasETH puede ser emitida
   * sin exceder el límite diario de gasto en gas (maxDailyGasEth).
   */
  public canSpendGas(
    estimatedGasETH: number,
    maxDailyGasEth: number,
    chainId?: number
  ): { allowed: boolean; spentSoFar: number; maxAllowed: number; remaining: number } {
    const spentSoFar = this.getDailyGasSpentETH(chainId);
    const remaining = Math.max(0, maxDailyGasEth - spentSoFar);
    const allowed = (spentSoFar + estimatedGasETH) <= maxDailyGasEth;

    return {
      allowed,
      spentSoFar,
      maxAllowed: maxDailyGasEth,
      remaining: Number(remaining.toFixed(8)),
    };
  }

  public reset(): void {
    this.entries = [];
    this.saveToDisk();
  }
}

export const executionLedger = new ExecutionLedger();
