import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { executionLedger } from '../utils/executionLedger';
import { SERVER_STATS, addScanLog } from '../server';
import { savePersistedStats } from '../utils/statsStore';
import { EconomicMath, EconomicEvaluationResult } from '../math/economicMath';

export interface DispatchSpatialParams {
  chainId: number;
  pairName: string;
  provider: 'balancer' | 'aave';
  contract: ethers.Contract;
  routeStruct: {
    tokenIn: string;
    tokenIntermediate: string;
    dexBuy: number;
    dexSell: number;
    feeOrSpacingBuy: number;
    feeOrSpacingSell: number;
    minProfit: bigint;
  };
  loanAmount: bigint;
  evaluation: EconomicEvaluationResult;
}

export interface DispatchTriangularParams {
  chainId: number;
  pairName: string;
  provider: 'balancer' | 'aave';
  contract: ethers.Contract;
  routeStruct: {
    tokenA: string;
    tokenB: string;
    tokenC: string;
    dex1: number;
    dex2: number;
    dex3: number;
    feeOrSpacing1: number;
    feeOrSpacing2: number;
    feeOrSpacing3: number;
    minProfit: bigint;
  };
  loanAmount: bigint;
  evaluation: EconomicEvaluationResult;
}

export interface DispatchResult {
  success: boolean;
  simulated: boolean;
  txHash?: string;
  reason?: string;
  realizedNetProfitUSD?: number;
}

export class TransactionDispatcher {
  private static instance: TransactionDispatcher;
  private chainLocks: Map<number, Promise<void>> = new Map();
  private chainNonces: Map<number, number> = new Map();

  private constructor() {}

  public static getInstance(): TransactionDispatcher {
    if (!TransactionDispatcher.instance) {
      TransactionDispatcher.instance = new TransactionDispatcher();
    }
    return TransactionDispatcher.instance;
  }

  /**
   * Ejecuta una función protegida por un Mutex de cadena (1 sola transacción in-flight por cadena)
   */
  public async executeWithChainLock<T>(chainId: number, fn: () => Promise<T>): Promise<T> {
    const currentLock = this.chainLocks.get(chainId) || Promise.resolve();
    let releaseLock: () => void = () => {};
    const nextLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.chainLocks.set(chainId, currentLock.then(() => nextLock));

    try {
      await currentLock;
      return await fn();
    } finally {
      releaseLock();
    }
  }

  /**
   * Obtiene el siguiente nonce de forma secuencial y coordinada
   */
  public async getNextNonce(wallet: ethers.Wallet, chainId: number): Promise<number> {
    const cached = this.chainNonces.get(chainId);
    const onChainNonce = await wallet.getNonce('pending');
    const nonceToUse = cached !== undefined && cached >= onChainNonce ? cached : onChainNonce;
    this.chainNonces.set(chainId, nonceToUse + 1);
    return nonceToUse;
  }

  /**
   * Resetea la memoria de nonces en caso de error o reversión
   */
  public resetNonce(chainId: number): void {
    this.chainNonces.delete(chainId);
  }

  /**
   * Despacho centralizado y blindado de Arbitraje Espacial (2 patas)
   */
  public async dispatchSpatial(params: DispatchSpatialParams): Promise<DispatchResult> {
    return this.executeWithChainLock(params.chainId, async () => {
      const { chainId, pairName, provider, contract, routeStruct, loanAmount, evaluation } = params;

      // 1. Verificación Económica Rigurosa
      if (!evaluation.isProfitable) {
        logger.warn(`⚠️ [DESPACHO RECHAZADO] ${pairName}: ${evaluation.rejectionReason}`);
        return { success: false, simulated: false, reason: evaluation.rejectionReason };
      }

      const providerName = provider === 'balancer' ? 'Balancer V2 (0% Fee)' : 'Aave V3 (0.05% Fee)';
      const isBalancer = provider === 'balancer';

      // 2. Pre-Flight Simulation Obligatorio: staticCall fresco inmediatamente antes del envío
      try {
        const freshProfit = isBalancer
          ? await contract.executeBalancerFlashLoanSpatial.staticCall(routeStruct, loanAmount)
          : await contract.executeFlashLoanSpatial.staticCall(routeStruct, loanAmount);

        if (!freshProfit || BigInt(freshProfit) < routeStruct.minProfit) {
          const reason = `Pre-flight staticCall returned profit below minProfit: ${freshProfit} < ${routeStruct.minProfit}`;
          executionLedger.recordSimulatedRevert({
            chainId,
            pairName,
            provider,
            loanTokenSymbol: evaluation.loanTokenSymbol,
            loanAmount: evaluation.loanAmountFormatted,
            reason,
          });
          return { success: false, simulated: false, reason };
        }
      } catch (simErr: any) {
        const reason = `Pre-flight staticCall reverted: ${simErr.message}`;
        logger.warn(`⚠️ [PRE-FLIGHT REVERTIDO] ${pairName} vía ${providerName}: ${simErr.message}`);
        executionLedger.recordSimulatedRevert({
          chainId,
          pairName,
          provider,
          loanTokenSymbol: evaluation.loanTokenSymbol,
          loanAmount: evaluation.loanAmountFormatted,
          reason,
        });
        return { success: false, simulated: false, reason };
      }

      // 3. Pre-Flight EstimateGas
      let estimatedGas: bigint;
      try {
        estimatedGas = isBalancer
          ? await contract.executeBalancerFlashLoanSpatial.estimateGas(routeStruct, loanAmount)
          : await contract.executeFlashLoanSpatial.estimateGas(routeStruct, loanAmount);
      } catch (estErr: any) {
        const reason = `Pre-flight estimateGas failed: ${estErr.message}`;
        logger.warn(`⚠️ [PRE-FLIGHT GAS ABORT] ${pairName}: ${estErr.message}`);
        executionLedger.recordSimulatedRevert({
          chainId,
          pairName,
          provider,
          loanTokenSymbol: evaluation.loanTokenSymbol,
          loanAmount: evaluation.loanAmountFormatted,
          reason,
        });
        return { success: false, simulated: false, reason };
      }

      // 4. Modo DRY_RUN (Aislado y Seguro - 0 transacciones emitidas)
      if (ENV.dryRun) {
        logger.info(`🧪 [DRY RUN VALIDADO] Flash Loan ${providerName} en ${pairName} | Gross: +$${evaluation.grossProfitUSD} | Gas: $${evaluation.totalGasCostUSD} | Net: +$${evaluation.netProfitUSD} USD. Omitiendo tx real.`);
        addScanLog(`🧪 [DRY RUN] Oportunidad validada en ${pairName} (Net: +$${evaluation.netProfitUSD} USD).`);

        SERVER_STATS.simulatedExecutedCount++;
        SERVER_STATS.simulatedPnLUSD += evaluation.netProfitUSD;

        executionLedger.recordSimulation({
          chainId,
          pairName,
          provider,
          loanTokenSymbol: evaluation.loanTokenSymbol,
          loanAmount: evaluation.loanAmountFormatted,
          simulatedGrossProfitUSD: evaluation.grossProfitUSD,
          simulatedGasUSD: evaluation.totalGasCostUSD,
          simulatedNetProfitUSD: evaluation.netProfitUSD,
        });
        savePersistedStats();

        return { success: true, simulated: true, realizedNetProfitUSD: evaluation.netProfitUSD };
      }

      // 5. Modo LIVE: Guardia de Límite Diario de Gas (maxDailyGasEth)
      const estimatedGasEth = evaluation.totalGasCostETH;
      const gasGuard = executionLedger.canSpendGas(estimatedGasEth, ENV.maxDailyGasEth, chainId);
      if (!gasGuard.allowed) {
        const reason = `Daily gas cap reached: spent ${gasGuard.spentSoFar.toFixed(6)} ETH / max: ${gasGuard.maxAllowed.toFixed(6)} ETH`;
        logger.error(`🛑 [GAS GUARD BLOQUEO] ${reason}. Transacción on-chain abortada para proteger capital.`);
        addScanLog(`🛑 [GAS GUARD] Límite diario de gas alcanzado (${gasGuard.spentSoFar.toFixed(6)} ETH). Despacho bloqueado.`);
        return { success: false, simulated: false, reason };
      }

      // 6. Transmisión On-Chain con Buffer de Gas (15%) y Nonce Coordinado
      const gasLimit = (estimatedGas * 115n) / 100n;
      logger.success(`🔥 [DISPARO ON-CHAIN] Transmitiendo Flash Loan ${providerName} en ${pairName} (Gas Limit: ${gasLimit})...`);
      addScanLog(`🚀 [DISPARO ON-CHAIN] Flash Loan ${providerName} en ${pairName}...`);

      const wallet = contract.runner as ethers.Wallet;
      if (!wallet || !wallet.sendTransaction) {
        return { success: false, simulated: false, reason: 'No signer wallet attached to contract' };
      }

      try {
        const nonce = await this.getNextNonce(wallet, chainId);

        const tx = isBalancer
          ? await contract.executeBalancerFlashLoanSpatial(routeStruct, loanAmount, { gasLimit, nonce })
          : await contract.executeFlashLoanSpatial(routeStruct, loanAmount, { gasLimit, nonce });

        logger.info(`⚡ Tx Enviada: https://${chainId === 8453 ? 'basescan.org' : 'arbiscan.io'}/tx/${tx.hash} (Nonce: ${nonce})`);
        const receipt = await tx.wait(1);

        const ledgerEntry = executionLedger.recordMinedTransaction({
          chainId,
          pairName,
          provider,
          loanTokenSymbol: evaluation.loanTokenSymbol,
          loanTokenDecimals: evaluation.tokenDecimals,
          loanTokenPriceUSD: evaluation.loanAmountUSD / parseFloat(evaluation.loanAmountFormatted || '1'),
          loanAmount: evaluation.loanAmountFormatted,
          ethPriceUSD: evaluation.totalGasCostETH > 0 ? (evaluation.totalGasCostUSD / evaluation.totalGasCostETH) : 2500,
          simulatedGrossProfitUSD: evaluation.grossProfitUSD,
          simulatedGasUSD: evaluation.totalGasCostUSD,
          simulatedNetProfitUSD: evaluation.netProfitUSD,
          receipt,
        });

        if (receipt && receipt.status === 1) {
          logger.success(`🎉 [FLASH LOAN CONFIRMADO] Bloque #${receipt.blockNumber}! Tx: ${tx.hash}`);
          addScanLog(`🎉 [CONFIRMADA] Flash Loan Bloque #${receipt.blockNumber} | Tx: ${tx.hash}`);

          const realizedUSD = ledgerEntry.realizedNetProfitUSD ?? evaluation.netProfitUSD;
          SERVER_STATS.onChainExecutedCount++;
          SERVER_STATS.onChainRealizedPnLUSD += realizedUSD;
          savePersistedStats();

          return { success: true, simulated: false, txHash: tx.hash, realizedNetProfitUSD: realizedUSD };
        } else {
          this.resetNonce(chainId);
          logger.error(`❌ [REVERSIÓN ON-CHAIN] Transacción minada con status=0 en bloque #${receipt?.blockNumber}`);
          return { success: false, simulated: false, txHash: tx.hash, reason: 'Transaction reverted on-chain' };
        }
      } catch (txErr: any) {
        this.resetNonce(chainId);
        logger.error(`❌ [ERROR TRANSMISIÓN] Fallo al enviar tx: ${txErr.message}`);
        return { success: false, simulated: false, reason: txErr.message };
      }
    });
  }

  /**
   * Despacho centralizado y blindado de Arbitraje Triangular (3 patas)
   */
  public async dispatchTriangular(params: DispatchTriangularParams): Promise<DispatchResult> {
    return this.executeWithChainLock(params.chainId, async () => {
      const { chainId, pairName, provider, contract, routeStruct, loanAmount, evaluation } = params;

      if (!evaluation.isProfitable) {
        logger.warn(`⚠️ [TRIANGULAR RECHAZADO] ${pairName}: ${evaluation.rejectionReason}`);
        return { success: false, simulated: false, reason: evaluation.rejectionReason };
      }

      const providerName = provider === 'balancer' ? 'Balancer V2 (0% Fee)' : 'Aave V3 (0.05% Fee)';
      const isBalancer = provider === 'balancer';

      // Pre-Flight staticCall
      try {
        const freshProfit = isBalancer
          ? await contract.executeBalancerFlashLoanTriangular.staticCall(routeStruct, loanAmount)
          : await contract.executeFlashLoanTriangular.staticCall(routeStruct, loanAmount);

        if (!freshProfit || BigInt(freshProfit) < routeStruct.minProfit) {
          const reason = `Pre-flight triangular staticCall returned profit below minProfit: ${freshProfit} < ${routeStruct.minProfit}`;
          executionLedger.recordSimulatedRevert({
            chainId,
            pairName,
            provider,
            loanTokenSymbol: evaluation.loanTokenSymbol,
            loanAmount: evaluation.loanAmountFormatted,
            reason,
          });
          return { success: false, simulated: false, reason };
        }
      } catch (simErr: any) {
        const reason = `Pre-flight triangular staticCall reverted: ${simErr.message}`;
        logger.warn(`⚠️ [PRE-FLIGHT TRIANGULAR REVERTIDO] ${pairName}: ${simErr.message}`);
        executionLedger.recordSimulatedRevert({
          chainId,
          pairName,
          provider,
          loanTokenSymbol: evaluation.loanTokenSymbol,
          loanAmount: evaluation.loanAmountFormatted,
          reason,
        });
        return { success: false, simulated: false, reason };
      }

      // Pre-Flight estimateGas
      let estimatedGas: bigint;
      try {
        estimatedGas = isBalancer
          ? await contract.executeBalancerFlashLoanTriangular.estimateGas(routeStruct, loanAmount)
          : await contract.executeFlashLoanTriangular.estimateGas(routeStruct, loanAmount);
      } catch (estErr: any) {
        const reason = `Pre-flight triangular estimateGas failed: ${estErr.message}`;
        logger.warn(`⚠️ [PRE-FLIGHT TRIANGULAR GAS ABORT] ${pairName}: ${estErr.message}`);
        executionLedger.recordSimulatedRevert({
          chainId,
          pairName,
          provider,
          loanTokenSymbol: evaluation.loanTokenSymbol,
          loanAmount: evaluation.loanAmountFormatted,
          reason,
        });
        return { success: false, simulated: false, reason };
      }

      // Modo DRY_RUN
      if (ENV.dryRun) {
        logger.info(`🧪 [DRY RUN VALIDADO TRIANGULAR] Flash Loan ${providerName} en ${pairName} | Gross: +$${evaluation.grossProfitUSD} | Net: +$${evaluation.netProfitUSD} USD. Omitiendo tx real.`);
        addScanLog(`🧪 [DRY RUN] Flash Triangular validado en ${pairName} (Net: +$${evaluation.netProfitUSD} USD).`);

        SERVER_STATS.simulatedExecutedCount++;
        SERVER_STATS.simulatedPnLUSD += evaluation.netProfitUSD;

        executionLedger.recordSimulation({
          chainId,
          pairName,
          provider,
          loanTokenSymbol: evaluation.loanTokenSymbol,
          loanAmount: evaluation.loanAmountFormatted,
          simulatedGrossProfitUSD: evaluation.grossProfitUSD,
          simulatedGasUSD: evaluation.totalGasCostUSD,
          simulatedNetProfitUSD: evaluation.netProfitUSD,
        });
        savePersistedStats();

        return { success: true, simulated: true, realizedNetProfitUSD: evaluation.netProfitUSD };
      }

      // Guardia Diario de Gas
      const estimatedGasEth = evaluation.totalGasCostETH;
      const gasGuard = executionLedger.canSpendGas(estimatedGasEth, ENV.maxDailyGasEth, chainId);
      if (!gasGuard.allowed) {
        const reason = `Daily gas cap reached: spent ${gasGuard.spentSoFar.toFixed(6)} ETH / max: ${gasGuard.maxAllowed.toFixed(6)} ETH`;
        logger.error(`🛑 [GAS GUARD BLOQUEO] ${reason}.`);
        addScanLog(`🛑 [GAS GUARD] Límite diario de gas alcanzado.`);
        return { success: false, simulated: false, reason };
      }

      const gasLimit = (estimatedGas * 115n) / 100n;
      logger.success(`🔥 [DISPARO TRIANGULAR ON-CHAIN] Flash Loan ${providerName} en ${pairName}...`);

      const wallet = contract.runner as ethers.Wallet;
      if (!wallet || !wallet.sendTransaction) {
        return { success: false, simulated: false, reason: 'No signer wallet attached to contract' };
      }

      try {
        const nonce = await this.getNextNonce(wallet, chainId);

        const tx = isBalancer
          ? await contract.executeBalancerFlashLoanTriangular(routeStruct, loanAmount, { gasLimit, nonce })
          : await contract.executeFlashLoanTriangular(routeStruct, loanAmount, { gasLimit, nonce });

        logger.info(`⚡ Tx Enviada: https://${chainId === 8453 ? 'basescan.org' : 'arbiscan.io'}/tx/${tx.hash} (Nonce: ${nonce})`);
        const receipt = await tx.wait(1);

        const ledgerEntry = executionLedger.recordMinedTransaction({
          chainId,
          pairName,
          provider,
          loanTokenSymbol: evaluation.loanTokenSymbol,
          loanTokenDecimals: evaluation.tokenDecimals,
          loanTokenPriceUSD: evaluation.loanAmountUSD / parseFloat(evaluation.loanAmountFormatted || '1'),
          loanAmount: evaluation.loanAmountFormatted,
          ethPriceUSD: evaluation.totalGasCostETH > 0 ? (evaluation.totalGasCostUSD / evaluation.totalGasCostETH) : 2500,
          simulatedGrossProfitUSD: evaluation.grossProfitUSD,
          simulatedGasUSD: evaluation.totalGasCostUSD,
          simulatedNetProfitUSD: evaluation.netProfitUSD,
          receipt,
        });

        if (receipt && receipt.status === 1) {
          logger.success(`🎉 [FLASH TRIANGULAR CONFIRMADO] Bloque #${receipt.blockNumber}! Tx: ${tx.hash}`);
          const realizedUSD = ledgerEntry.realizedNetProfitUSD ?? evaluation.netProfitUSD;
          SERVER_STATS.onChainExecutedCount++;
          SERVER_STATS.onChainRealizedPnLUSD += realizedUSD;
          savePersistedStats();

          return { success: true, simulated: false, txHash: tx.hash, realizedNetProfitUSD: realizedUSD };
        } else {
          this.resetNonce(chainId);
          return { success: false, simulated: false, txHash: tx.hash, reason: 'Triangular transaction reverted on-chain' };
        }
      } catch (txErr: any) {
        this.resetNonce(chainId);
        return { success: false, simulated: false, reason: txErr.message };
      }
    });
  }
}

export const transactionDispatcher = TransactionDispatcher.getInstance();
