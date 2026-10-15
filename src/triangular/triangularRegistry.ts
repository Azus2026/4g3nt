import { TokenConfig } from '../config/registry';

export interface TriangularCycle {
  id: string;
  name: string;
  chainId: number;
  tokenA: TokenConfig;
  tokenB: TokenConfig;
  tokenC: TokenConfig;
  fee1?: number;
  fee2?: number;
  fee3?: number;
  defaultLoanAmount: string;
  approxPriceUSD: number;
  isUltraLowFee1bps?: boolean;
}

const TOKENS_BASE = {
  WETH: { chainId: 8453, symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, name: 'Wrapped Ether' },
  USDC: { chainId: 8453, symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, name: 'USD Coin' },
  USDBC: { chainId: 8453, symbol: 'USDbC', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6, name: 'Bridged USD Coin' },
  CBBTC: { chainId: 8453, symbol: 'cbBTC', address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8, name: 'Coinbase BTC' },
  AERO: { chainId: 8453, symbol: 'AERO', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', decimals: 18, name: 'Aerodrome' },
  VIRTUAL: { chainId: 8453, symbol: 'VIRTUAL', address: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', decimals: 18, name: 'Virtual Protocol' },
  DEGEN: { chainId: 8453, symbol: 'DEGEN', address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', decimals: 18, name: 'Degen' },
  BRETT: { chainId: 8453, symbol: 'BRETT', address: '0x532f27101965dd16442E59d40670FaF5eBB142E4', decimals: 18, name: 'Brett' },
  TOSHI: { chainId: 8453, symbol: 'TOSHI', address: '0xAC1Bd2447a10150d01025454429261ED16f57B66', decimals: 18, name: 'Toshi' },
  HIGHER: { chainId: 8453, symbol: 'HIGHER', address: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe', decimals: 18, name: 'Higher' },
  CLANKER: { chainId: 8453, symbol: 'CLANKER', address: '0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb', decimals: 18, name: 'Clanker' },
  MIGGLES: { chainId: 8453, symbol: 'MIGGLES', address: '0xB1a03E715470566e97C1a97F67f053CE4d07e559', decimals: 18, name: 'Miggles' },
  DAI: { chainId: 8453, symbol: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, name: 'Dai' },
  USDT: { chainId: 8453, symbol: 'USDT', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6, name: 'Tether USD' },
  WSTETH: { chainId: 8453, symbol: 'wstETH', address: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452', decimals: 18, name: 'Wrapped stETH' }
};

export const TRIANGULAR_CYCLES: TriangularCycle[] = [
  // =========================================================================
  // 🔷 BASE (ChainID: 8453) - ULTRA-LOW FEE 1 BPS & 5 BPS (Micro-Spread 0.025%)
  // =========================================================================
  {
    id: 'base-tri-weth-cbbtc-usdc-1bps',
    name: 'WETH ➔ cbBTC ➔ USDC ➔ WETH (Base 1bps / 5bps)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.CBBTC,
    tokenC: TOKENS_BASE.USDC,
    fee1: 100,
    fee2: 500,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475,
    isUltraLowFee1bps: true
  },
  {
    id: 'base-tri-usdc-aero-usdbc-1bps',
    name: 'USDC ➔ AERO ➔ USDbC ➔ USDC (Base Stable-Tri 1bps)',
    chainId: 8453,
    tokenA: TOKENS_BASE.USDC,
    tokenB: TOKENS_BASE.AERO,
    tokenC: TOKENS_BASE.USDBC,
    fee1: 500,
    fee2: 100,
    fee3: 100,
    defaultLoanAmount: '35.0',
    approxPriceUSD: 1.0,
    isUltraLowFee1bps: true
  },
  {
    id: 'base-tri-weth-usdbc-usdc-1bps',
    name: 'WETH ➔ USDbC ➔ USDC ➔ WETH (Base Stable Curve 1bps)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.USDBC,
    tokenC: TOKENS_BASE.USDC,
    fee1: 500,
    fee2: 100,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475,
    isUltraLowFee1bps: true
  },
  {
    id: 'base-tri-weth-wsteth-usdc-1bps',
    name: 'WETH ➔ wstETH ➔ USDC ➔ WETH (Base LST 1bps)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.WSTETH,
    tokenC: TOKENS_BASE.USDC,
    fee1: 100,
    fee2: 500,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475,
    isUltraLowFee1bps: true
  },

  // =========================================================================
  // 🔷 BASE (ChainID: 8453) - HIGH-VOLATILITY MEME & AI FAST CYCLES
  // =========================================================================
  {
    id: 'base-tri-weth-virtual-usdc',
    name: 'WETH ➔ VIRTUAL ➔ USDC ➔ WETH (Base AI Alpha)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.VIRTUAL,
    tokenC: TOKENS_BASE.USDC,
    fee1: 500,
    fee2: 500,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475
  },
  {
    id: 'base-tri-weth-degen-usdc',
    name: 'WETH ➔ DEGEN ➔ USDC ➔ WETH (Base Degen Alpha)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.DEGEN,
    tokenC: TOKENS_BASE.USDC,
    fee1: 3000,
    fee2: 500,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475
  },
  {
    id: 'base-tri-weth-aero-usdc',
    name: 'WETH ➔ AERO ➔ USDC ➔ WETH (Base Aerodrome Slipstream)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.AERO,
    tokenC: TOKENS_BASE.USDC,
    fee1: 500,
    fee2: 500,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475
  },
  {
    id: 'base-tri-weth-brett-usdc',
    name: 'WETH ➔ BRETT ➔ USDC ➔ WETH (Base Brett Meme)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.BRETT,
    tokenC: TOKENS_BASE.USDC,
    fee1: 3000,
    fee2: 500,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475
  },
  {
    id: 'base-tri-weth-toshi-usdc',
    name: 'WETH ➔ TOSHI ➔ USDC ➔ WETH (Base Toshi Meme)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.TOSHI,
    tokenC: TOKENS_BASE.USDC,
    fee1: 3000,
    fee2: 500,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475
  },
  {
    id: 'base-tri-weth-higher-usdc',
    name: 'WETH ➔ HIGHER ➔ USDC ➔ WETH (Base SocialFi)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.HIGHER,
    tokenC: TOKENS_BASE.USDC,
    fee1: 3000,
    fee2: 500,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475
  },
  {
    id: 'base-tri-weth-clanker-usdc',
    name: 'WETH ➔ CLANKER ➔ USDC ➔ WETH (Base AI Agent)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.CLANKER,
    tokenC: TOKENS_BASE.USDC,
    fee1: 3000,
    fee2: 500,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475
  },
  {
    id: 'base-tri-weth-miggles-usdc',
    name: 'WETH ➔ MIGGLES ➔ USDC ➔ WETH (Base Miggles)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.MIGGLES,
    tokenC: TOKENS_BASE.USDC,
    fee1: 3000,
    fee2: 500,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475
  },
  {
    id: 'base-tri-weth-virtual-aero',
    name: 'WETH ➔ VIRTUAL ➔ AERO ➔ WETH (Base Inter-Dex AI Loop)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.VIRTUAL,
    tokenC: TOKENS_BASE.AERO,
    fee1: 500,
    fee2: 3000,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475
  },
  {
    id: 'base-tri-weth-degen-aero',
    name: 'WETH ➔ DEGEN ➔ AERO ➔ WETH (Base Inter-Dex Degen Loop)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.DEGEN,
    tokenC: TOKENS_BASE.AERO,
    fee1: 3000,
    fee2: 3000,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475
  },
  {
    id: 'base-tri-weth-cbbtc-aero',
    name: 'WETH ➔ cbBTC ➔ AERO ➔ WETH (Base Bitcoin-Aero)',
    chainId: 8453,
    tokenA: TOKENS_BASE.WETH,
    tokenB: TOKENS_BASE.CBBTC,
    tokenC: TOKENS_BASE.AERO,
    fee1: 100,
    fee2: 500,
    fee3: 500,
    defaultLoanAmount: '0.014',
    approxPriceUSD: 2475
  },

  // ==========================================
  // ARBITRUM ONE (ChainID: 42161) - Balancer 0% Fee
  // ==========================================
  {
    id: 'arb-tri-weth-arb-usdc',
    name: 'WETH ➔ ARB ➔ USDC ➔ WETH (Arbitrum)',
    chainId: 42161,
    tokenA: { chainId: 42161, symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, name: 'Wrapped Ether' },
    tokenB: { chainId: 42161, symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, name: 'Arbitrum' },
    tokenC: { chainId: 42161, symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, name: 'USD Coin' },
    defaultLoanAmount: '2.0',
    approxPriceUSD: 2475,
  },
  {
    id: 'arb-tri-usdc-wbtc-weth',
    name: 'USDC ➔ WBTC ➔ WETH ➔ USDC (Arbitrum)',
    chainId: 42161,
    tokenA: { chainId: 42161, symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, name: 'USD Coin' },
    tokenB: { chainId: 42161, symbol: 'WBTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8, name: 'Wrapped BTC' },
    tokenC: { chainId: 42161, symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, name: 'Wrapped Ether' },
    defaultLoanAmount: '5000.0',
    approxPriceUSD: 1.0,
  },

  // ==========================================
  // OPTIMISM (ChainID: 10) - Velodrome & Synthetix
  // ==========================================
  {
    id: 'op-tri-weth-op-usdc',
    name: 'WETH ➔ OP ➔ USDC ➔ WETH (Optimism)',
    chainId: 10,
    tokenA: { chainId: 10, symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, name: 'Wrapped Ether' },
    tokenB: { chainId: 10, symbol: 'OP', address: '0x4200000000000000000000000000000000000042', decimals: 18, name: 'Optimism' },
    tokenC: { chainId: 10, symbol: 'USDC', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, name: 'USD Coin' },
    defaultLoanAmount: '2.0',
    approxPriceUSD: 2475,
  }
];
