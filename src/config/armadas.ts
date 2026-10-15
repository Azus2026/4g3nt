export interface TacticalArmada {
  id: number;
  name: string;
  codename: string;
  role: string;
  agentsCount: number;
  regimentRange: [number, number]; // [minRegiment, maxRegiment]
  targetStrategy: 'ATOMIC_BACKRUN' | 'FLASH_LIQUIDATIONS' | 'CEX_DEX_LAG' | 'COWSWAP_INTENTS';
  color: string;
  badge: string;
  description: string;
}

export const TACTICAL_ARMADAS: TacticalArmada[] = [
  {
    id: 1,
    name: 'Armada Alfa',
    codename: 'ATOMIC WHALE BACKRUNNERS',
    role: 'Backrunning Atómico de Ballenas (Uniswap V3 / Aerodrome / PancakeSwap)',
    agentsCount: 250000,
    regimentRange: [1, 2500],
    targetStrategy: 'ATOMIC_BACKRUN',
    color: '#38bdf8', // Sky Blue
    badge: '🐋 BACKRUN (250K)',
    description: 'Captura el deslizamiento dejado por grandes swaps ($50k-$500k) colocándose en Tx Index N+1 en el mismo bloque para rebalancear la piscina.'
  },
  {
    id: 2,
    name: 'Armada Bravo',
    codename: 'AAVE & COMPOUND FLASH LIQUIDATORS',
    role: 'Liquidaciones Flash Loan Atómicas con Bono Fijo 5% a 10%',
    agentsCount: 250000,
    regimentRange: [2501, 5000],
    targetStrategy: 'FLASH_LIQUIDATIONS',
    color: '#10b981', // Emerald Green
    badge: '⚡ LIQUIDACIONES (250K)',
    description: 'Monitorea cuentas sub-colateralizadas (Health Factor < 1.0) en Aave V3 y Compound V3 para liquidar deuda y cobrar el bono fijo garantizado.'
  },
  {
    id: 3,
    name: 'Armada Charlie',
    codename: 'CEX-DEX BINANCE HFT LAG PREDICTORS',
    role: 'Arbitraje Predictivo en Tiempo Real con WebSocket Binance (<15ms)',
    agentsCount: 250000,
    regimentRange: [5001, 7500],
    targetStrategy: 'CEX_DEX_LAG',
    color: '#f59e0b', // Amber / Gold
    badge: '📡 CEX-LAG (250K)',
    description: 'Monitorea el libro de órdenes institucional de Binance en tiempo real para comprar en DEXes L2 antes de que suba el precio on-chain.'
  },
  {
    id: 4,
    name: 'Armada Delta',
    codename: 'COWSWAP & UNISWAPX INTENT SOLVERS',
    role: 'Solución de Subastas por Lotes (Batch Auctions) con Cero Riesgo de Gas',
    agentsCount: 250000,
    regimentRange: [7501, 10000],
    targetStrategy: 'COWSWAP_INTENTS',
    color: '#ec4899', // Pink / Violet
    badge: '🎯 INTENT SOLVERS (250K)',
    description: 'Empareja órdenes agrupadas fuera de cadena en CoW Protocol y UniswapX contra rutas óptimas de DEX extrayendo el excedente de la subasta.'
  }
];

export function getArmadaForRegiment(regimentId: number): TacticalArmada {
  if (regimentId <= 2500) return TACTICAL_ARMADAS[0];
  if (regimentId <= 5000) return TACTICAL_ARMADAS[1];
  if (regimentId <= 7500) return TACTICAL_ARMADAS[2];
  return TACTICAL_ARMADAS[3];
}
