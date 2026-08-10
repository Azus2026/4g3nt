import fs from 'fs';
import path from 'path';
import { SERVER_STATS } from '../server';
import { logger } from './logger';

const STATS_FILE = path.join(process.cwd(), 'data', 'stats.json');

export function loadPersistedStats(): void {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(STATS_FILE)) {
      const content = fs.readFileSync(STATS_FILE, 'utf-8');
      const saved = JSON.parse(content);
      if (typeof saved.detectedOpportunitiesCount === 'number') {
        SERVER_STATS.detectedOpportunitiesCount = saved.detectedOpportunitiesCount;
      }
      if (typeof saved.detectedPnLUSD === 'number') {
        SERVER_STATS.detectedPnLUSD = saved.detectedPnLUSD;
      }
      if (typeof saved.onChainExecutedCount === 'number') {
        SERVER_STATS.onChainExecutedCount = saved.onChainExecutedCount;
      }
      if (typeof saved.onChainRealizedPnLUSD === 'number') {
        SERVER_STATS.onChainRealizedPnLUSD = saved.onChainRealizedPnLUSD;
      }
      if (typeof saved.opportunitiesFound === 'number') {
        SERVER_STATS.opportunitiesFound = saved.opportunitiesFound;
      }
      if (typeof saved.scansCompleted === 'number') {
        SERVER_STATS.scansCompleted = saved.scansCompleted;
      }
      logger.info(`💾 Estadísticas cargadas desde disco: ${SERVER_STATS.detectedOpportunitiesCount} Oportunidades Detectadas ($${SERVER_STATS.detectedPnLUSD.toFixed(2)}) | On-Chain: ${SERVER_STATS.onChainExecutedCount} Transacciones ($${SERVER_STATS.onChainRealizedPnLUSD.toFixed(2)})`);
    }
  } catch (err: any) {
    logger.warn(`No se pudieron cargar las estadísticas guardadas: ${err.message}`);
  }
}

export function savePersistedStats(): void {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const payload = {
      detectedOpportunitiesCount: SERVER_STATS.detectedOpportunitiesCount,
      detectedPnLUSD: SERVER_STATS.detectedPnLUSD,
      onChainExecutedCount: SERVER_STATS.onChainExecutedCount,
      onChainRealizedPnLUSD: SERVER_STATS.onChainRealizedPnLUSD,
      opportunitiesFound: SERVER_STATS.opportunitiesFound,
      scansCompleted: SERVER_STATS.scansCompleted,
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(STATS_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err: any) {
    logger.warn(`No se pudieron guardar las estadísticas en disco: ${err.message}`);
  }
}
