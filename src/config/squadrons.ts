export interface TacticalSquadron {
  id: number;
  name: string;
  code: string;
  roleDescription: string;
  color: string;
  agentCount: number;
  regimentStart: number;
  regimentEnd: number;
  strategyEngine: string;
}

export const TACTICAL_SQUADRONS: TacticalSquadron[] = [
  {
    id: 1,
    name: 'Escuadrón 1: Fee-Tier Snipers',
    code: 'FEE_TIER_SNIPER',
    roleDescription: 'Intra-DEX Mispricing (0.01% vs 0.05% vs 0.30% vs 1.00% pools)',
    color: '#38bdf8', // Cyan
    agentCount: 25000,
    regimentStart: 1,
    regimentEnd: 250,
    strategyEngine: 'IntraDexFeeTierEngine'
  },
  {
    id: 2,
    name: 'Escuadrón 2: Exploradores de Grafos Triangulares',
    code: 'TRIANGULAR_GRAPH',
    roleDescription: 'Ciclos cerrados Bellman-Ford de 3 y 4 activos (A -> B -> C -> A)',
    color: '#a855f7', // Púrpura
    agentCount: 50000,
    regimentStart: 251,
    regimentEnd: 750,
    strategyEngine: 'NHopGraphScanner'
  },
  {
    id: 3,
    name: 'Escuadrón 3: Cazadores CEX ➔ DEX & Mempool',
    code: 'CEX_LAG_SNIPER',
    roleDescription: 'Desfases de latencia Binance WebSocket vs L2 Pool Orderbooks',
    color: '#f59e0b', // Ámbar
    agentCount: 25000,
    regimentStart: 751,
    regimentEnd: 1000,
    strategyEngine: 'CEXLagPredictor'
  },
  {
    id: 4,
    name: 'Escuadrón 4: Especialistas en Stablecoins & LSTs',
    code: 'STABLE_DEPEG_SNIPER',
    roleDescription: 'Arbitraje de paridad 1:1 en USDe, crvUSD, wstETH, weETH, ezETH',
    color: '#10b981', // Verde Esmeralda
    agentCount: 25000,
    regimentStart: 1001,
    regimentEnd: 1250,
    strategyEngine: 'StableDepegEngine'
  },
  {
    id: 5,
    name: 'Escuadrón 5: Agregadores de Flash-Bundles',
    code: 'FLASH_BUNDLE_AGGREGATOR',
    roleDescription: 'Lotes Multicall de 5 micro-arbitrajes con amortización total de gas',
    color: '#ec4899', // Rosa
    agentCount: 125000,
    regimentStart: 1251,
    regimentEnd: 2500,
    strategyEngine: 'FlashBundleAccumulator'
  }
];

export function getSquadronForRegiment(regimentId: number): TacticalSquadron {
  for (const sq of TACTICAL_SQUADRONS) {
    if (regimentId >= sq.regimentStart && regimentId <= sq.regimentEnd) {
      return sq;
    }
  }
  return TACTICAL_SQUADRONS[4]; // Default Escuadrón 5
}
