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
  type: 'uniswap-v2' | 'uniswap-v3' | 'curve' | 'balancer' | 'aggregator' | 'aerodrome' | 'camelot';
}

export const DEX_PROTOCOLS: DEXProtocol[] = [
  { id: 'uniswap-v3', name: 'Uniswap V3', type: 'uniswap-v3' },
  { id: 'uniswap-v2', name: 'Uniswap V2', type: 'uniswap-v2' },
  { id: 'sushiswap-v2', name: 'Sushiswap', type: 'uniswap-v2' },
  { id: 'curve-v2', name: 'Curve Finance', type: 'curve' },
  { id: 'balancer-v2', name: 'Balancer V2', type: 'balancer' },
  { id: '1inch-v5', name: '1inch V5 Aggregator', type: 'aggregator' },
  { id: 'kyberswap-v1', name: 'KyberSwap Aggregator', type: 'aggregator' },
  { id: 'aerodrome-base', name: 'Aerodrome Finance (Base)', type: 'aerodrome' },
  { id: 'camelot-arb', name: 'Camelot DEX (Arbitrum)', type: 'camelot' },
  { id: 'openocean-v2', name: 'OpenOcean V2', type: 'aggregator' },
  { id: 'paraswap-v5', name: 'ParaSwap V5', type: 'aggregator' },
];

export const SWARM_AGENTS: AgentDefinition[] = [
  { id: 1, name: 'Agent-01 (ETH Majors)', role: 'Ethereum Core High-Liquidity Arbitrage', targetChains: [1], color: '#3b82f6' },
  { id: 2, name: 'Agent-02 (ETH Altcoins)', role: 'Ethereum DeFi & Governance Tokens', targetChains: [1], color: '#8b5cf6' },
  { id: 3, name: 'Agent-03 (Arbitrum Alpha)', role: 'Arbitrum One High-Volume WETH/USDC/ARB', targetChains: [42161], color: '#06b6d4' },
  { id: 4, name: 'Agent-04 (Arbitrum Ecosystem)', role: 'Arbitrum Camelot & DeFi Token Spreads', targetChains: [42161], color: '#a855f7' },
  { id: 5, name: 'Agent-05 (Optimism Swarm)', role: 'Optimism Velodrome & Synthetix Spreads', targetChains: [10], color: '#f43f5e' },
  { id: 6, name: 'Agent-06 (Base Aerodrome)', role: 'Base Aerodrome High-Liquidity Swarm', targetChains: [8453], color: '#eab308' },
  { id: 7, name: 'Agent-07 (Base Meme & Volatility)', role: 'Base Trending Meme & High Volatility', targetChains: [8453], color: '#10b981' },
  { id: 8, name: 'Agent-08 (LST & Restaking)', role: 'Liquid Staking (stETH/ezETH/weETH) De-pegs', targetChains: [1, 42161], color: '#ec4899' },
  { id: 9, name: 'Agent-09 (Cross-L2 Arbitrage)', role: 'Arbitrum vs Optimism vs Base Cross-Spread', targetChains: [42161, 10, 8453], color: '#f97316' },
  { id: 10, name: 'Agent-10 (Stablecoin Pegs)', role: 'USDC / USDT / DAI De-peg Arbitrage', targetChains: [1, 42161, 10, 8453], color: '#14b8a6' },
];

export const TOKENS: Record<string, TokenConfig> = {
  // 🟢 Ethereum Mainnet (Chain 1)
  WETH_ETH:   { chainId: 1, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_ETH:   { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDT_ETH:   { chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  WBTC_ETH:   { chainId: 1, address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, symbol: 'WBTC', name: 'Wrapped BTC' },
  DAI_ETH:    { chainId: 1, address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, symbol: 'DAI', name: 'Dai Stablecoin' },
  LINK_ETH:   { chainId: 1, address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, symbol: 'LINK', name: 'Chainlink' },
  UNI_ETH:    { chainId: 1, address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, symbol: 'UNI', name: 'Uniswap' },
  AAVE_ETH:   { chainId: 1, address: '0x7Fc66500c84A76Ad7e9c93437b45Ac5b2CE65697', decimals: 18, symbol: 'AAVE', name: 'Aave' },
  MKR_ETH:    { chainId: 1, address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', decimals: 18, symbol: 'MKR', name: 'Maker' },
  PEPE_ETH:   { chainId: 1, address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals: 18, symbol: 'PEPE', name: 'Pepe' },
  PENDLE_ETH: { chainId: 1, address: '0x808507121B80c02388fAd14726482e061B8da827', decimals: 18, symbol: 'PENDLE', name: 'Pendle' },
  ENA_ETH:    { chainId: 1, address: '0x57e114B691db790C35207b2e685D4A43181e664D', decimals: 18, symbol: 'ENA', name: 'Ethena' },
  STETH_ETH:  { chainId: 1, address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', decimals: 18, symbol: 'stETH', name: 'Liquid Staked Ether' },
  EZETH_ETH:  { chainId: 1, address: '0xbf5495EFE5DB9d15ee830827026436d37061e89F', decimals: 18, symbol: 'ezETH', name: 'Renzo Restaked ETH' },
  WEETH_ETH:  { chainId: 1, address: '0xCd57e07647a7326d2E492655459b85F6d5966152', decimals: 18, symbol: 'weETH', name: 'Wrapped eETH' },

  // 🔵 Arbitrum One (Chain 42161)
  WETH_ARB:   { chainId: 42161, address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_ARB:   { chainId: 42161, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDT_ARB:   { chainId: 42161, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  ARB_ARB:    { chainId: 42161, address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, symbol: 'ARB', name: 'Arbitrum' },
  GMX_ARB:    { chainId: 42161, address: '0xf4756139c151178f965539a4a0ee8077c449c433', decimals: 18, symbol: 'GMX', name: 'GMX' },
  WBTC_ARB:   { chainId: 42161, address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8, symbol: 'WBTC', name: 'Wrapped BTC' },
  PENDLE_ARB: { chainId: 42161, address: '0x0c880f6702e96d4cf45347f382a9be740e698888', decimals: 18, symbol: 'PENDLE', name: 'Pendle' },
  MAGIC_ARB:  { chainId: 42161, address: '0x539bE5761a1107D14701073786AD49223847ac1F', decimals: 18, symbol: 'MAGIC', name: 'Magic' },

  // 🔴 Optimism (Chain 10)
  WETH_OP: { chainId: 10, address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_OP: { chainId: 10, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDT_OP: { chainId: 10, address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  OP_OP:   { chainId: 10, address: '0x4200000000000000000000000000000000000042', decimals: 18, symbol: 'OP', name: 'Optimism' },
  WBTC_OP: { chainId: 10, address: '0x68f180fcce63038b34199c0d238bf3b09dd0a8e0', decimals: 8, symbol: 'WBTC', name: 'Wrapped BTC' },
  SNX_OP:  { chainId: 10, address: '0x8700daec35af8ff88c16bdf0418774cb3d7599b4', decimals: 18, symbol: 'SNX', name: 'Synthetix' },
  VELO_OP: { chainId: 10, address: '0x9560e827af36c94d2ac33a39bce1fe7e77922c3b', decimals: 18, symbol: 'VELO', name: 'Velodrome' },

  // 🔷 Base (Chain 8453)
  WETH_BASE:    { chainId: 8453, address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_BASE:    { chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDT_BASE:    { chainId: 8453, address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  AERO_BASE:    { chainId: 8453, address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', decimals: 18, symbol: 'AERO', name: 'Aerodrome' },
  BRETT_BASE:   { chainId: 8453, address: '0x532f27101965dd16442E59d40670FaF5eBB142E4', decimals: 18, symbol: 'BRETT', name: 'Brett' },
  DEGEN_BASE:   { chainId: 8453, address: '0x4ed4E862860bed51a9570b96d89af5e1b0Efefed', decimals: 18, symbol: 'DEGEN', name: 'Degen' },
  VIRTUAL_BASE: { chainId: 8453, address: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', decimals: 18, symbol: 'VIRTUAL', name: 'Virtual Protocol' },
  TOSHI_BASE:   { chainId: 8453, address: '0xAC1Bd2447a10150d01025454429261ED16f57B66', decimals: 18, symbol: 'TOSHI', name: 'Toshi' },
  WBTC_BASE:    { chainId: 8453, address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', decimals: 8, symbol: 'WBTC', name: 'Wrapped BTC' },
};

export const MULTI_CHAIN_ARBITRAGE_PAIRS: ArbitragePair[] = [
  // 🟢 Agent 1: Ethereum Majors
  { id: 'ETH-WETH-USDC', name: 'WETH / USDC (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },
  { id: 'ETH-WETH-USDT', name: 'WETH / USDT (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDT_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },
  { id: 'ETH-WBTC-WETH', name: 'WBTC / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.WBTC_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '0.5', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 1 },

  // 🟣 Agent 2: Ethereum Altcoins
  { id: 'ETH-LINK-WETH', name: 'LINK / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.LINK_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '500', approxPriceUSD: 16, cexSymbol: 'LINKUSDT', assignedAgentId: 2 },
  { id: 'ETH-UNI-WETH',  name: 'UNI / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.UNI_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '1000', approxPriceUSD: 8, cexSymbol: 'UNIUSDT', assignedAgentId: 2 },
  { id: 'ETH-AAVE-WETH', name: 'AAVE / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.AAVE_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '50', approxPriceUSD: 90, cexSymbol: 'AAVEUSDT', assignedAgentId: 2 },
  { id: 'ETH-PENDLE-WETH', name: 'PENDLE / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.PENDLE_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '1000', approxPriceUSD: 5, cexSymbol: 'PENDLEUSDT', assignedAgentId: 2 },
  { id: 'ETH-MKR-WETH',  name: 'MKR / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.MKR_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '2', approxPriceUSD: 2500, cexSymbol: 'MKRUSDT', assignedAgentId: 2 },
  { id: 'ETH-PEPE-WETH', name: 'PEPE / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.PEPE_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '500000000', approxPriceUSD: 0.000008, cexSymbol: 'PEPEUSDT', assignedAgentId: 2 },

  // 🔵 Agent 3: Arbitrum Alpha
  { id: 'ARB-WETH-USDC', name: 'WETH / USDC (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },
  { id: 'ARB-WETH-USDT', name: 'WETH / USDT (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.USDT_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },
  { id: 'ARB-ARB-WETH',  name: 'ARB / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.ARB_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '5000', approxPriceUSD: 0.6, cexSymbol: 'ARBUSDT', assignedAgentId: 3 },
  { id: 'ARB-WBTC-WETH', name: 'WBTC / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.WBTC_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 3 },

  // 🩵 Agent 4: Arbitrum Ecosystem & Camelot DEX
  { id: 'ARB-GMX-WETH',    name: 'GMX / WETH (Camelot DEX)', chainId: 42161, tokenA: TOKENS.GMX_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '100', approxPriceUSD: 28, cexSymbol: 'GMXUSDT', assignedAgentId: 4 },
  { id: 'ARB-PENDLE-WETH', name: 'PENDLE / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.PENDLE_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '1000', approxPriceUSD: 5, cexSymbol: 'PENDLEUSDT', assignedAgentId: 4 },
  { id: 'ARB-MAGIC-WETH',  name: 'MAGIC / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.MAGIC_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '2000', approxPriceUSD: 0.4, assignedAgentId: 4 },

  // 🔴 Agent 5: Optimism Swarm
  { id: 'OP-WETH-USDC', name: 'WETH / USDC (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.USDC_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },
  { id: 'OP-WETH-USDT', name: 'WETH / USDT (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.USDT_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },
  { id: 'OP-OP-WETH',   name: 'OP / WETH (Optimism)', chainId: 10, tokenA: TOKENS.OP_OP, tokenB: TOKENS.WETH_OP, defaultLoanAmount: '2000', approxPriceUSD: 1.5, cexSymbol: 'OPUSDT', assignedAgentId: 5 },
  { id: 'OP-SNX-WETH',  name: 'SNX / WETH (Optimism)', chainId: 10, tokenA: TOKENS.SNX_OP, tokenB: TOKENS.WETH_OP, defaultLoanAmount: '1000', approxPriceUSD: 2, assignedAgentId: 5 },
  { id: 'OP-VELO-WETH', name: 'VELO / WETH (Velodrome)', chainId: 10, tokenA: TOKENS.VELO_OP, tokenB: TOKENS.WETH_OP, defaultLoanAmount: '5000', approxPriceUSD: 0.1, assignedAgentId: 5 },

  // 🟡 Agent 6: Base Aerodrome High-Liquidity Swarm
  { id: 'BASE-WETH-USDC', name: 'WETH / USDC (Base Aerodrome)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 6 },
  { id: 'BASE-WETH-USDT', name: 'WETH / USDT (Base)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.USDT_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 6 },
  { id: 'BASE-AERO-WETH', name: 'AERO / WETH (Base Aerodrome)', chainId: 8453, tokenA: TOKENS.AERO_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '2500', approxPriceUSD: 1.2, assignedAgentId: 6 },
  { id: 'BASE-WBTC-WETH', name: 'WBTC / WETH (Base)', chainId: 8453, tokenA: TOKENS.WBTC_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 6 },

  // 🟢 Agent 7: Base Meme & Volatility Tokens
  { id: 'BASE-BRETT-WETH',   name: 'BRETT / WETH (Base Meme)', chainId: 8453, tokenA: TOKENS.BRETT_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '10000', approxPriceUSD: 0.08, assignedAgentId: 7 },
  { id: 'BASE-DEGEN-WETH',   name: 'DEGEN / WETH (Base Meme)', chainId: 8453, tokenA: TOKENS.DEGEN_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '50000', approxPriceUSD: 0.01, assignedAgentId: 7 },
  { id: 'BASE-VIRTUAL-WETH', name: 'VIRTUAL / WETH (Base AI)', chainId: 8453, tokenA: TOKENS.VIRTUAL_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '1000', approxPriceUSD: 1.5, assignedAgentId: 7 },

  // 🩷 Agent 8: Liquid Staking & Restaking Arbitrage
  { id: 'ETH-STETH-WETH', name: 'stETH / WETH (Lido Mainnet)', chainId: 1, tokenA: TOKENS.STETH_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '20', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ETH-EZETH-WETH', name: 'ezETH / WETH (Renzo Restaking)', chainId: 1, tokenA: TOKENS.EZETH_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '20', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ETH-WEETH-WETH', name: 'weETH / WETH (Ether.fi Restaking)', chainId: 1, tokenA: TOKENS.WEETH_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '20', approxPriceUSD: 3000, assignedAgentId: 8 },

  // 🧡 Agent 9: Cross-L2 High Volume Spread
  { id: 'ETH-WETH-USDC-CEX', name: 'WETH / USDC (CEX Spread)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '15', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 9 },

  // 🩵 Agent 10: Stablecoin Pegs (Chain 1, 42161, 10, 8453)
  { id: 'ETH-USDC-USDT',  name: 'USDC / USDT (Mainnet Stable)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.USDT_ETH, defaultLoanAmount: '2000', approxPriceUSD: 1, cexSymbol: 'USDCUSDT', assignedAgentId: 10 },
  { id: 'ARB-USDC-USDT',  name: 'USDC / USDT (Arbitrum Stable)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.USDT_ARB, defaultLoanAmount: '1000', approxPriceUSD: 1, cexSymbol: 'USDCUSDT', assignedAgentId: 10 },
  { id: 'OP-USDC-USDT',   name: 'USDC / USDT (Optimism Stable)', chainId: 10, tokenA: TOKENS.USDC_OP, tokenB: TOKENS.USDT_OP, defaultLoanAmount: '1000', approxPriceUSD: 1, cexSymbol: 'USDCUSDT', assignedAgentId: 10 },
  { id: 'BASE-USDC-USDT', name: 'USDC / USDT (Base Stable)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.USDT_BASE, defaultLoanAmount: '1000', approxPriceUSD: 1, assignedAgentId: 10 },
];
