import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface OpportunityHistoryRecord {
  id: string;
  timestamp: string;
  chainId: number;
  pairName: string;
  leg1Protocol: string;
  leg2Protocol: string;
  inputAmount: string;
  outputAmount: string;
  grossProfitUSD: number;
  netProfitUSD: number;
  isExecuted: boolean;
  txHash?: string;
}

export interface WeeklySummaryStats {
  weekPeriod: string;
  totalScans: number;
  totalOpportunitiesDetected: number;
  totalDetectedPnLUSD: number;
  totalOnChainExecuted: number;
  totalRealizedPnLUSD: number;
  bestOpportunityUSD: number;
  mostVolatilePair: string;
  chainBreakdown: {
    arbitrum: number;
    base: number;
    ethereum: number;
    optimism: number;
  };
  dailyPnLHistory: { date: string; pnlUSD: number; count: number }[];
  top10Pools: { name: string; chainId: number; count: number; avgSpreadUSD: number }[];
}

export class HistoryStore {
  private filePath: string;
  private records: OpportunityHistoryRecord[] = [];

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'arbitrage_history.json');
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.records = JSON.parse(raw);
      }
    } catch (err: any) {
      logger.warn(`Error al cargar historial desde disco: ${err.message}`);
      this.records = [];
    }
  }

  saveToDisk() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.records, null, 2), 'utf-8');
    } catch (err: any) {
      logger.warn(`Error al guardar historial en disco: ${err.message}`);
    }
  }

  addRecord(opp: any, isExecuted: boolean = false, txHash?: string) {
    const record: OpportunityHistoryRecord = {
      id: opp.id || `OPP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      chainId: opp.chainId || 42161,
      pairName: opp.pairName || opp.cycleName || 'Unknown Pair',
      leg1Protocol: opp.leg1?.protocolId || 'UNISWAP-V3',
      leg2Protocol: opp.leg2?.protocolId || 'CAMELOT-V3',
      inputAmount: opp.leg1?.inputAmount || '0',
      outputAmount: opp.leg2?.outputAmount || '0',
      grossProfitUSD: opp.grossProfitUSD || 0,
      netProfitUSD: opp.netProfitUSD || 0,
      isExecuted,
      txHash
    };

    this.records.unshift(record);
    // Mantener hasta 5,000 registros históricos en memoria
    if (this.records.length > 5000) {
      this.records.pop();
    }
    this.saveToDisk();
  }

  clearHistory() {
    this.records = [];
    this.saveToDisk();
  }

  getWeeklySummary(totalScansCompleted: number = 0): WeeklySummaryStats {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekRecords = this.records.filter(r => new Date(r.timestamp) >= sevenDaysAgo);

    let totalDetectedPnLUSD = 0;
    let totalOnChainExecuted = 0;
    let totalRealizedPnLUSD = 0;
    let bestOpportunityUSD = 0;

    const chainCounts = { arbitrum: 0, base: 0, ethereum: 0, optimism: 0 };
    const pairCounts: Record<string, { chainId: number; count: number; totalProfit: number }> = {};
    const dailyMap: Record<string, { pnlUSD: number; count: number }> = {};

    // Inicializar los últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = { pnlUSD: 0, count: 0 };
    }

    for (const r of weekRecords) {
      totalDetectedPnLUSD += r.netProfitUSD;
      if (r.netProfitUSD > bestOpportunityUSD) {
        bestOpportunityUSD = r.netProfitUSD;
      }
      if (r.isExecuted) {
        totalOnChainExecuted++;
        totalRealizedPnLUSD += r.netProfitUSD;
      }

      // Conteo por cadena
      if (r.chainId === 42161) chainCounts.arbitrum++;
      else if (r.chainId === 8453) chainCounts.base++;
      else if (r.chainId === 1) chainCounts.ethereum++;
      else if (r.chainId === 10) chainCounts.optimism++;

      // Conteo por par
      if (!pairCounts[r.pairName]) {
        pairCounts[r.pairName] = { chainId: r.chainId, count: 0, totalProfit: 0 };
      }
      pairCounts[r.pairName].count++;
      pairCounts[r.pairName].totalProfit += r.netProfitUSD;

      // Agrupación diaria
      const dateKey = r.timestamp.split('T')[0];
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].pnlUSD += r.netProfitUSD;
        dailyMap[dateKey].count++;
      }
    }

    // Calcular par más volátil
    let mostVolatilePair = 'N/A';
    let maxPairCount = 0;
    for (const [name, data] of Object.entries(pairCounts)) {
      if (data.count > maxPairCount) {
        maxPairCount = data.count;
        mostVolatilePair = name;
      }
    }

    // Top 10 pools
    const top10Pools = Object.entries(pairCounts)
      .map(([name, data]) => ({
        name,
        chainId: data.chainId,
        count: data.count,
        avgSpreadUSD: data.count > 0 ? data.totalProfit / data.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const dailyPnLHistory = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      pnlUSD: Number(data.pnlUSD.toFixed(2)),
      count: data.count
    }));

    return {
      weekPeriod: `${sevenDaysAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`,
      totalScans: totalScansCompleted,
      totalOpportunitiesDetected: weekRecords.length,
      totalDetectedPnLUSD: Number(totalDetectedPnLUSD.toFixed(2)),
      totalOnChainExecuted,
      totalRealizedPnLUSD: Number(totalRealizedPnLUSD.toFixed(2)),
      bestOpportunityUSD: Number(bestOpportunityUSD.toFixed(2)),
      mostVolatilePair,
      chainBreakdown: chainCounts,
      dailyPnLHistory,
      top10Pools
    };
  }
}

export const historyStore = new HistoryStore();
