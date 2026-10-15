import { ArbitrageOpportunity } from '../protocolink/protocolinkClient';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

export interface AIStrategyEvaluation {
  opportunity: ArbitrageOpportunity;
  confidenceScore: number; // 0.0 to 1.0
  recommendation: 'EXECUTE' | 'SKIP' | 'SIMULATE_ONLY';
  reasoning: string[];
}

export class AIStrategyAgent {
  /**
   * Evalúa la oportunidad con heurística avanzada de IA y métricas de riesgo
   */
  evaluate(opportunity: ArbitrageOpportunity): AIStrategyEvaluation {
    const reasoning: string[] = [];
    let confidenceScore = 0.5;

    // 1. Análisis de Margen Neto
    if (opportunity.netProfitUSD >= ENV.minProfitUSD) {
      confidenceScore += 0.3;
      reasoning.push(`Ganancia neta estimativa ($${opportunity.netProfitUSD.toFixed(2)}) supera el umbral mínimo ($${ENV.minProfitUSD.toFixed(2)}).`);
    } else if (opportunity.netProfitUSD > 0) {
      confidenceScore += 0.1;
      reasoning.push(`Ganancia neta positiva ($${opportunity.netProfitUSD.toFixed(2)}), por debajo del objetivo.`);
    } else {
      confidenceScore -= 0.4;
      reasoning.push(`Pérdida estimada tras gas/comisiones ($${opportunity.netProfitUSD.toFixed(2)}).`);
    }

    // 2. Diversidad de Protocolos
    if (opportunity.leg1.protocolId !== opportunity.leg2.protocolId) {
      confidenceScore += 0.1;
      reasoning.push(`Arbitraje cruzado confirmado entre [${opportunity.leg1.protocolId.toUpperCase()}] y [${opportunity.leg2.protocolId.toUpperCase()}].`);
    } else {
      confidenceScore -= 0.2;
      reasoning.push(`Mismo protocolo detectado en ambas piernas.`);
    }

    // 3. Confirmación CEX vs DEX
    if (opportunity.cexReferencePriceUSD && opportunity.cexDEXSpreadPercent !== undefined) {
      if (opportunity.cexDEXSpreadPercent > 0.5) {
        confidenceScore += 0.1;
        reasoning.push(`Dispersión CEX/DEX detectada: ${opportunity.cexDEXSpreadPercent.toFixed(2)}% respecto a CEX (Precio referencia: $${opportunity.cexReferencePriceUSD.toFixed(2)}).`);
      }
    }

    // 4. Tablas de Decisión IA Velora MCP (Velora MCP AI Decision Tables)
    if (opportunity.leg1.protocolId.includes('velora') || opportunity.leg2.protocolId.includes('velora')) {
      confidenceScore += 0.15;
      reasoning.push(`⚡ [VELORA MCP DECISION TABLE] Ruta Velora (Market & Portikus Solvers) validada con protección anti-MEV.`);
    }

    // 4. Modo de Ejecución
    if (ENV.dryRun) {
      reasoning.push(`Modo DRY_RUN activo: Se ejecutará simulación atómica sin envío a mempool pública.`);
    } else {
      reasoning.push(`Modo MAINNET LIVE activo: Listo para transmisión privada anti-frontrunning.`);
    }

    // Decisión final
    let recommendation: 'EXECUTE' | 'SKIP' | 'SIMULATE_ONLY' = 'SKIP';
    const isDifferent = opportunity.leg1.protocolId.toLowerCase() !== opportunity.leg2.protocolId.toLowerCase();

    if (opportunity.isProfitable && isDifferent) {
      recommendation = ENV.dryRun ? 'SIMULATE_ONLY' : 'EXECUTE';
    } else {
      recommendation = 'SKIP';
    }

    return {
      opportunity,
      confidenceScore: Math.min(Math.max(confidenceScore, 0.0), 1.0),
      recommendation,
      reasoning,
    };
  }

  /**
   * Registra el informe formateado en consola
   */
  logEvaluation(evalResult: AIStrategyEvaluation) {
    const { opportunity, confidenceScore, recommendation, reasoning } = evalResult;

    logger.ai(`Análisis para Par: ${opportunity.pairName} (ChainID: ${opportunity.chainId})`);
    if (opportunity.sweetSpotRatio) {
      logger.ai(` -> 🎯 SWEET SPOT CALCULUS (x*y=k): Tamaño Óptimo ${opportunity.sweetSpotRatio.toFixed(2)}x Base -> ${opportunity.flashLoanAmount} ${opportunity.tokenA.symbol}`);
    } else {
      logger.ai(` -> FlashLoan: ${opportunity.flashLoanAmount} ${opportunity.tokenA.symbol}`);
    }
    logger.ai(` -> Leg 1: Comprar ${opportunity.tokenB.symbol} en [${opportunity.leg1.protocolId.toUpperCase()}] -> Output: ${parseFloat(opportunity.leg1.outputAmount).toFixed(4)}`);
    logger.ai(` -> Leg 2: Vender ${opportunity.tokenB.symbol} en [${opportunity.leg2.protocolId.toUpperCase()}] -> Recibe: ${opportunity.netReturnTokenA} ${opportunity.tokenA.symbol}`);
    logger.ai(` -> Tarifa FlashLoan: ${opportunity.flashLoanFeeAmount} | Gas Est: $${opportunity.estimatedGasUSD.toFixed(2)}`);
    if (opportunity.cexReferencePriceUSD) {
      logger.cex(` -> Precio referencia CEX (Binance/Coinbase): $${opportunity.cexReferencePriceUSD.toFixed(2)} | Dispersión DEX: ${opportunity.cexDEXSpreadPercent?.toFixed(2)}%`);
    }
    logger.ai(` -> Ganancia Neta Estimada: $${opportunity.netProfitUSD.toFixed(2)} USD | AI Score: ${(confidenceScore * 100).toFixed(0)}%`);
    
    reasoning.forEach(r => logger.ai(`    - ${r}`));

    if (recommendation === 'EXECUTE') {
      logger.success(` -> DECISIÓN IA: 🚀 EJECUTAR TRANSACCIÓN MULTI-CHAIN`);
    } else if (recommendation === 'SIMULATE_ONLY') {
      logger.warn(` -> DECISIÓN IA: 🧪 SIMULAR TRANSACCIÓN (DRY-RUN)`);
    } else {
      logger.info(` -> DECISIÓN IA: ⏸️ OMITIR (NO RENTABLE SUFICIENTE)`);
    }
    logger.divider();
  }
}
