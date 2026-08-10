export interface TokenConfig {
  chainId: number;
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

export interface ArbitragePair {
  id: string;
  name: string;
  chainId: number;
  tokenA: TokenConfig;
  tokenB: TokenConfig;
  defaultLoanAmount: string;
  approxPriceUSD: number;
  cexSymbol?: string;
  assignedAgentId: number; // 1 to 10
}

export interface AgentDefinition {
  id: number;
  name: string;
  role: string;
  targetChains: number[];
  color: string;
}

export interface DEXProtocol {
  id: string;
  name: string;
  type: 'uniswap-v2' | 'uniswap-v3' | 'curve' | 'balancer' | 'aggregator';
}

export const DEX_PROTOCOLS: DEXProtocol[] = [
  { id: 'uniswap-v3', name: 'Uniswap V3', type: 'uniswap-v3' },
  { id: 'uniswap-v2', name: 'Uniswap V2', type: 'uniswap-v2' },
  { id: 'sushiswap-v2', name: 'Sushiswap', type: 'uniswap-v2' },
  { id: 'curve-v2', name: 'Curve Finance', type: 'curve' },
  { id: 'balancer-v2', name: 'Balancer V2', type: 'balancer' },
  { id: 'openocean-v2', name: 'OpenOcean V2', type: 'aggregator' },
  { id: 'paraswap-v5', name: 'ParaSwap V5', type: 'aggregator' },
  { id: 'zeroex-v4', name: 'ZeroEx V4', type: 'aggregator' },
  { id: '1inch-v5', name: '1inch Network', type: 'aggregator' },
  { id: 'pancakeswap-v3', name: 'PancakeSwap V3', type: 'uniswap-v3' },
  { id: 'quickswap-v3', name: 'QuickSwap V3', type: 'uniswap-v3' },
];

export const SWARM_AGENTS: AgentDefinition[] = [
  { id: 1, name: 'Agent-01 (ETH Majors)', role: 'Ethereum Core High-Liquidity Arbitrage', targetChains: [1], color: '#3b82f6' },
  { id: 2, name: 'Agent-02 (ETH DeFi Altcoins)', role: 'Ethereum DeFi & Governance Tokens', targetChains: [1], color: '#8b5cf6' },
  { id: 3, name: 'Agent-03 (Arbitrum Swarm)', role: 'Arbitrum One High-Frequency Arbitrage', targetChains: [42161], color: '#06b6d4' },
  { id: 4, name: 'Agent-04 (Polygon Swarm)', role: 'Polygon PoS High-Frequency Arbitrage', targetChains: [137], color: '#a855f7' },
  { id: 5, name: 'Agent-05 (Optimism & Base)', role: 'Optimism & Base L2 Ecosystems', targetChains: [10, 8453], color: '#f43f5e' },
  { id: 6, name: 'Agent-06 (BNB & Avalanche)', role: 'BSC & Avalanche C-Chain Multi-DEX', targetChains: [56, 43114], color: '#eab308' },
  { id: 7, name: 'Agent-07 (Stablecoin Pegs)', role: 'Stablecoin De-peg & Cross-Protocol Arbitrage', targetChains: [1, 42161, 137], color: '#10b981' },
  { id: 8, name: 'Agent-08 (Triangular Multi-Hop)', role: 'Triangular 3-Hop On-Chain Arbitrage', targetChains: [1, 42161], color: '#ec4899' },
  { id: 9, name: 'Agent-09 (CEX-DEX Cross Spread)', role: 'Binance/Coinbase vs On-Chain Real-Time Spread', targetChains: [1, 42161, 137], color: '#f97316' },
  { id: 10, name: 'Agent-10 (Meme & Volatility)', role: 'High Volatility Meme & Trending Tokens', targetChains: [1, 8453, 56], color: '#14b8a6' },
];

export const TOKENS: Record<string, TokenConfig> = {
  // Ethereum Mainnet (1)
  WETH_ETH: { chainId: 1, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_ETH: { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDT_ETH: { chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  WBTC_ETH: { chainId: 1, address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, symbol: 'WBTC', name: 'Wrapped BTC' },
  DAI_ETH:  { chainId: 1, address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, symbol: 'DAI', name: 'Dai Stablecoin' },
  LINK_ETH: { chainId: 1, address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, symbol: 'LINK', name: 'Chainlink' },
  UNI_ETH:  { chainId: 1, address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, symbol: 'UNI', name: 'Uniswap' },
  AAVE_ETH: { chainId: 1, address: '0x7Fc66500c84A76Ad7e9c93437b45Ac5b2CE65697', decimals: 18, symbol: 'AAVE', name: 'Aave' },
  MKR_ETH:  { chainId: 1, address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', decimals: 18, symbol: 'MKR', name: 'Maker' },
  PEPE_ETH: { chainId: 1, address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals: 18, symbol: 'PEPE', name: 'Pepe' },

  // Arbitrum One (42161)
  WETH_ARB: { chainId: 42161, address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_ARB: { chainId: 42161, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDT_ARB: { chainId: 42161, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  ARB_ARB:  { chainId: 42161, address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, symbol: 'ARB', name: 'Arbitrum' },
  GMX_ARB:  { chainId: 42161, address: '0xf4756139c151178f965539a4a0ee8077c449c433', decimals: 18, symbol: 'GMX', name: 'GMX' },

  // Polygon PoS (137)
  WMATIC_POL: { chainId: 137, address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, symbol: 'WMATIC', name: 'Wrapped MATIC' },
  USDC_POL:   { chainId: 137, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDT_POL:   { chainId: 137, address: '0xc2132D05D31cE15646E929617F255460560c1800', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  WETH_POL:   { chainId: 137, address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },

  // Optimism (10)
  WETH_OP: { chainId: 10, address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_OP: { chainId: 10, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  OP_OP:   { chainId: 10, address: '0x4200000000000000000000000000000000000042', decimals: 18, symbol: 'OP', name: 'Optimism' },

  // Base (8453)
  WETH_BASE: { chainId: 8453, address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_BASE: { chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
};

// 30+ Multi-Chain Pairs Assigned to 10 Specialized Agents
export const MULTI_CHAIN_ARBITRAGE_PAIRS: ArbitragePair[] = [
  // Agent 1: ETH Majors
  { id: 'ETH-WETH-USDC', name: 'WETH / USDC (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },
  { id: 'ETH-WETH-USDT', name: 'WETH / USDT (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDT_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },
  { id: 'ETH-WBTC-WETH', name: 'WBTC / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.WBTC_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '0.5', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 1 },

  // Agent 2: ETH Altcoins
  { id: 'ETH-LINK-WETH', name: 'LINK / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.LINK_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '500', approxPriceUSD: 16, cexSymbol: 'LINKUSDT', assignedAgentId: 2 },
  { id: 'ETH-UNI-WETH',  name: 'UNI / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.UNI_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '1000', approxPriceUSD: 8, cexSymbol: 'UNIUSDT', assignedAgentId: 2 },
  { id: 'ETH-AAVE-WETH', name: 'AAVE / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.AAVE_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '50', approxPriceUSD: 90, cexSymbol: 'AAVEUSDT', assignedAgentId: 2 },

  // Agent 3: Arbitrum Swarm
  { id: 'ARB-WETH-USDC', name: 'WETH / USDC (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },
  { id: 'ARB-ARB-WETH',  name: 'ARB / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.ARB_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '5000', approxPriceUSD: 0.6, cexSymbol: 'ARBUSDT', assignedAgentId: 3 },

  // Agent 4: Polygon Swarm
  { id: 'POL-WMATIC-USDC', name: 'WMATIC / USDC (Polygon)', chainId: 137, tokenA: TOKENS.WMATIC_POL, tokenB: TOKENS.USDC_POL, defaultLoanAmount: '10000', approxPriceUSD: 0.5, cexSymbol: 'MATICUSDT', assignedAgentId: 4 },
  { id: 'POL-WETH-USDC',   name: 'WETH / USDC (Polygon)', chainId: 137, tokenA: TOKENS.WETH_POL, tokenB: TOKENS.USDC_POL, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 4 },

  // Agent 5: Optimism & Base
  { id: 'OP-WETH-USDC',   name: 'WETH / USDC (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.USDC_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },
  { id: 'OP-OP-WETH',     name: 'OP / WETH (Optimism)', chainId: 10, tokenA: TOKENS.OP_OP, tokenB: TOKENS.WETH_OP, defaultLoanAmount: '2000', approxPriceUSD: 1.5, cexSymbol: 'OPUSDT', assignedAgentId: 5 },
  { id: 'BASE-WETH-USDC', name: 'WETH / USDC (Base)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },

  // Agent 6: BNB & Avalanche Placeholder Swarm
  { id: 'ETH-MKR-WETH', name: 'MKR / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.MKR_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '2', approxPriceUSD: 2500, cexSymbol: 'MKRUSDT', assignedAgentId: 6 },

  // Agent 7: Stablecoin Pegs
  { id: 'ETH-USDC-USDT', name: 'USDC / USDT (Mainnet Stable)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.USDT_ETH, defaultLoanAmount: '50000', approxPriceUSD: 1, cexSymbol: 'USDCUSDT', assignedAgentId: 7 },
  { id: 'ETH-WETH-DAI',  name: 'WETH / DAI (Mainnet Stable)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.DAI_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 7 },
  { id: 'ARB-USDC-USDT', name: 'USDC / USDT (Arbitrum Stable)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.USDT_ARB, defaultLoanAmount: '20000', approxPriceUSD: 1, cexSymbol: 'USDCUSDT', assignedAgentId: 7 },

  // Agent 8: Triangular Multi-Hop
  { id: 'ETH-WBTC-USDC', name: 'WBTC / USDC (Mainnet Tri)', chainId: 1, tokenA: TOKENS.WBTC_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '0.5', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 8 },

  // Agent 9: CEX-DEX Cross Spread
  { id: 'ETH-WETH-USDC-CEX', name: 'WETH / USDC (CEX Spread)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '15', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 9 },

  // Agent 10: Meme & High Volatility
  { id: 'ETH-PEPE-WETH', name: 'PEPE / WETH (Meme Volatility)', chainId: 1, tokenA: TOKENS.PEPE_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '500000000', approxPriceUSD: 0.000008, cexSymbol: 'PEPEUSDT', assignedAgentId: 10 },
];
