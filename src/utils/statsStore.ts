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
      if (typeof saved.positiveOpportunitiesCount === 'number') {
        SERVER_STATS.positiveOpportunitiesCount = saved.positiveOpportunitiesCount;
      }
      if (typeof saved.totalRealizedPnLUSD === 'number') {
        SERVER_STATS.totalRealizedPnLUSD = saved.totalRealizedPnLUSD;
      }
      if (typeof saved.opportunitiesFound === 'number') {
        SERVER_STATS.opportunitiesFound = saved.opportunitiesFound;
      }
      if (typeof saved.scansCompleted === 'number') {
        SERVER_STATS.scansCompleted = saved.scansCompleted;
      }
      logger.info(`💾 Estadísticas cargadas desde disco: ${SERVER_STATS.positiveOpportunitiesCount} arbitrajes exitosos | PnL: +$${SERVER_STATS.totalRealizedPnLUSD.toFixed(2)} USD`);
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
      positiveOpportunitiesCount: SERVER_STATS.positiveOpportunitiesCount,
      totalRealizedPnLUSD: SERVER_STATS.totalRealizedPnLUSD,
      opportunitiesFound: SERVER_STATS.opportunitiesFound,
      scansCompleted: SERVER_STATS.scansCompleted,
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(STATS_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err: any) {
    logger.warn(`No se pudieron guardar las estadísticas en disco: ${err.message}`);
  }
}
