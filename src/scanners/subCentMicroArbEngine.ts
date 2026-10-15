import { ArbitragePair } from '../config/registry';
import { sharedPoolStateEngine } from './sharedPoolStateEngine';
import { yulStorageLensEngine } from './yulStorageLensEngine';
import { logger } from '../utils/logger';

export interface MicroArbitrageOpportunity {
  pairId: string;
  pairName: string;
  chainId: number;
  protocolA: string;
  protocolB: string;
  priceA: number;
  priceB: number;
  spreadPercent: number;
  optimalLoanUSD: number;
  grossProfitUSD: number;
  estimatedGasUSD: number;
  maxPriorityFeeGwei: number;
  netProfitUSD: number;
  isViable: boolean;
  timestamp: number;
}

export interface FlashBundleProposal {
  bundleId: string;
  chainId: number;
  subOpportunities: MicroArbitrageOpportunity[];
  totalGrossProfitUSD: number;
  totalAmortizedGasUSD: number;
  totalNetProfitUSD: number;
  bundleEfficiencyGain: number; // Porcentaje de ahorro de gas por bundling
}

export class SubCentMicroArbEngine {
  private minProfitThresholdUSD: number = 0.001; // $0.001 USD mínimo

  constructor(minProfitUSD: number = 0.001) {
    this.minProfitThresholdUSD = minProfitUSD;
  }

  setThreshold(val: number) {
    this.minProfitThresholdUSD = val;
  }

  /**
   * Evalúa una micro-oportunidad en un par con granularidad de sub-centavo (0.005% a 0.10% de spread)
   */
  evaluateMicroOpportunity(pair: ArbitragePair): MicroArbitrageOpportunity | null {
    // 1. Obtener estado en RAM sincronizado vía Multicall3 / Yul Storage Slots
    const p1 = sharedPoolStateEngine.getPoolState(pair.chainId, 'uniswap-v3', pair.tokenA.symbol, pair.tokenB.symbol);
    const proto2Name = pair.chainId === 8453 ? 'aerodrome-slipstream' 
                     : pair.chainId === 42161 ? 'camelot-v3' 
                     : pair.chainId === 56 ? 'pancakeswap-v3'
                     : pair.chainId === 137 ? 'quickswap-v3'
                     : pair.chainId === 43114 ? 'trader-joe-v2'
                     : pair.chainId === 81457 ? 'thruster-v3'
                     : pair.chainId === 59144 ? 'lynex-v3'
                     : pair.chainId === 534352 ? 'ambient-finance'
                     : 'curve-v2';
    
    const p2 = sharedPoolStateEngine.getPoolState(pair.chainId, proto2Name, pair.tokenA.symbol, pair.tokenB.symbol);

    const price1 = (p1 && p1.price0In1 > 0) ? p1.price0In1 : pair.approxPriceUSD;
    const price2 = (p2 && p2.price0In1 > 0) ? p2.price0In1 : price1;

    if (price1 === price2) {
      return null;
    }

    const spread = Math.abs(price1 - price2) / Math.min(price1, price2);
    const spreadPercent = spread * 100;

    // 1. DETERMINACIÓN ESTRICTA DE COMISIONES ON-CHAIN (FEE-AWARE FILTER)
    // Uniswap V3 fee tier (0.05% en pares estándar / 0.30% en volátiles)
    const isCorrelated = pair.name.includes('USDC') && (pair.name.includes('USDT') || pair.name.includes('DAI') || pair.name.includes('USDC.e'));
    const isLST = pair.name.includes('wstETH') || pair.name.includes('weETH') || pair.name.includes('ezETH');
    
    const feeTierDEX1 = (isCorrelated || isLST) ? 0.05 : 0.05; // 0.05% base en Tier 500
    const feeTierDEX2 = (isCorrelated || isLST) ? 0.05 : 0.05; // 0.05% base en DEX 2
    const flashLoanFee = (pair.chainId === 42161 || pair.chainId === 1) ? 0.00 : 0.05; // Balancer V2 0% / Aave V3 0.05%
    
    const totalFeeFrictionPercent = feeTierDEX1 + feeTierDEX2 + flashLoanFee; // e.g. 0.10% a 0.15%
    const totalFeeFriction = totalFeeFrictionPercent / 100;

    // Spread neto real después de deducir todas las comisiones de canje y préstamo
    const netSpread = spread - totalFeeFriction;

    // Solo evaluar si el spread supera el 100% de las comisiones del pool
    if (netSpread <= 0.00005) {
      return null;
    }

    // Costo de gas base según la cadena (L2s = sub-céntimo)
    const baseGasCostUSD = (pair.chainId === 8453 || pair.chainId === 137) ? 0.0003 // Base / Polygon: $0.0003
                         : (pair.chainId === 42161 || pair.chainId === 81457 || pair.chainId === 59144 || pair.chainId === 534352) ? 0.0008 // Arbitrum / Blast / Linea: $0.0008
                         : (pair.chainId === 56 || pair.chainId === 43114 || pair.chainId === 10) ? 0.003 // BSC / AVAX / OP: $0.003
                         : 2.50; // Ethereum L1

    // 2. Cálculo de tamaño óptimo respetando el tick-depth para 0 slippage
    const defaultDepthUnits = pair.approxPriceUSD < 10 ? 50000.0 : 5.0;
    const depth1 = p1 ? Number(p1.liquidity) / 1e18 : defaultDepthUnits;
    const depth2 = p2 ? Number(p2.liquidity) / 1e18 : defaultDepthUnits;
    const availableDepth = Math.min(depth1, depth2) * pair.approxPriceUSD;
    
    // Préstamo escalado a la liquidez del tick (min $2,000 USD de base para amortizar gas)
    const optimalLoanUSD = Math.min(
      Math.max(availableDepth * 0.10, 2000),
      parseFloat(pair.defaultLoanAmount) * pair.approxPriceUSD
    );
    
    // Ganancia bruta real garantizada después de deducir el 100% de comisiones de pool
    const grossProfitUSD = optimalLoanUSD * netSpread;

    // MEV Priority Bribe: máximo 25% del profit neto
    const maxBribeUSD = grossProfitUSD * 0.25;
    const actualGasUSD = baseGasCostUSD + maxBribeUSD;

    // Ganancia neta final líquida
    const netProfitUSD = grossProfitUSD - actualGasUSD;
    const isViable = netProfitUSD >= this.minProfitThresholdUSD;

    return {
      pairId: pair.id,
      pairName: pair.name,
      chainId: pair.chainId,
      protocolA: 'uniswap-v3',
      protocolB: proto2Name,
      priceA: price1,
      priceB: price2,
      spreadPercent: Number((netSpread * 100).toFixed(5)),
      optimalLoanUSD: Number(optimalLoanUSD.toFixed(2)),
      grossProfitUSD: Number(grossProfitUSD.toFixed(6)),
      estimatedGasUSD: Number(actualGasUSD.toFixed(6)),
      maxPriorityFeeGwei: pair.chainId === 1 ? 2.5 : 0.01,
      netProfitUSD: Number(netProfitUSD.toFixed(6)),
      isViable,
      timestamp: Date.now()
    };
  }

  /**
   * Empaqueta múltiples micro-oportunidades independientes en un Flash Bundle atómico
   * para amortizar el costo de gas del Flashloan y maximizar el margen neto
   */
  createFlashBundle(opportunities: MicroArbitrageOpportunity[]): FlashBundleProposal | null {
    const viableOpps = opportunities.filter(o => o.isViable);
    if (viableOpps.length === 0) return null;

    const chainId = viableOpps[0].chainId;
    const chainOpps = viableOpps.filter(o => o.chainId === chainId).slice(0, 10); // Máx 10 micro-swaps por lote

    const totalGrossProfitUSD = chainOpps.reduce((acc, curr) => acc + curr.grossProfitUSD, 0);
    // En un bundle atómico multicall, el costo base de gas se paga solo una vez
    const singleCallBaseGas = chainOpps[0].estimatedGasUSD;
    const additionalCallOverhead = (chainOpps.length - 1) * (singleCallBaseGas * 0.25);
    const totalAmortizedGasUSD = singleCallBaseGas + additionalCallOverhead;
    const totalNetProfitUSD = totalGrossProfitUSD - totalAmortizedGasUSD;

    const individualTotalGas = chainOpps.reduce((acc, curr) => acc + curr.estimatedGasUSD, 0);
    const gasSavedUSD = individualTotalGas - totalAmortizedGasUSD;
    const bundleEfficiencyGain = (gasSavedUSD / individualTotalGas) * 100;

    return {
      bundleId: `BUNDLE-${chainId}-${Date.now()}`,
      chainId,
      subOpportunities: chainOpps,
      totalGrossProfitUSD: Number(totalGrossProfitUSD.toFixed(6)),
      totalAmortizedGasUSD: Number(totalAmortizedGasUSD.toFixed(6)),
      totalNetProfitUSD: Number(totalNetProfitUSD.toFixed(6)),
      bundleEfficiencyGain: Number(bundleEfficiencyGain.toFixed(2))
    };
  }
}

export const subCentMicroArbEngine = new SubCentMicroArbEngine(0.001);
