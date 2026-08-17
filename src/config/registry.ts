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
  { id: 'velora-v2-all', name: 'Velora V2 (Delta & Market)', type: 'aggregator' },
];

export const SWARM_AGENTS: AgentDefinition[] = [
  { id: 1, name: 'Agent-01 (ETH Majors)', role: 'Ethereum Core High-Liquidity Arbitrage', targetChains: [1], color: '#3b82f6' },
  { id: 2, name: 'Agent-02 (ETH Altcoins)', role: 'Ethereum DeFi & Governance Tokens', targetChains: [1], color: '#8b5cf6' },
  { id: 3, name: 'Agent-03 (Arbitrum Alpha)', role: 'Arbitrum One High-Volume WETH/USDC/ARB', targetChains: [42161], color: '#06b6d4' },
  { id: 4, name: 'Agent-04 (Arbitrum Ecosystem)', role: 'Arbitrum Camelot & DeFi Token Spreads', targetChains: [42161], color: '#a855f7' },
  { id: 5, name: 'Agent-05 (Optimism Swarm)', role: 'Optimism Velodrome & Synthetix Spreads', targetChains: [10], color: '#f43f5e' },
  { id: 6, name: 'Agent-06 (Base Aerodrome)', role: 'Base Aerodrome High-Liquidity Swarm', targetChains: [8453], color: '#eab308' },
  { id: 7, name: 'Agent-07 (Base Meme & Volatility)', role: 'Base Trending Meme & AI High Volatility', targetChains: [8453], color: '#10b981' },
  { id: 8, name: 'Agent-08 (LST & Restaking)', role: 'Liquid Staking (stETH/ezETH/weETH) De-pegs', targetChains: [1, 42161, 8453], color: '#ec4899' },
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
  SHIB_ETH:   { chainId: 1, address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18, symbol: 'SHIB', name: 'Shiba Inu' },
  CRV_ETH:    { chainId: 1, address: '0xD533a949740bb3306d119CC777fa900bA034cd52', decimals: 18, symbol: 'CRV', name: 'Curve DAO' },
  LDO_ETH:    { chainId: 1, address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', decimals: 18, symbol: 'LDO', name: 'Lido DAO' },
  PENDLE_ETH: { chainId: 1, address: '0x808507121B80c02388fAd14726482e061B8da827', decimals: 18, symbol: 'PENDLE', name: 'Pendle' },
  ENA_ETH:    { chainId: 1, address: '0x57e114B691db790C35207b2e685D4A43181e664D', decimals: 18, symbol: 'ENA', name: 'Ethena' },
  STETH_ETH:  { chainId: 1, address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', decimals: 18, symbol: 'stETH', name: 'Liquid Staked Ether' },
  WSTETH_ETH: { chainId: 1, address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', decimals: 18, symbol: 'wstETH', name: 'Wrapped stETH' },
  RETH_ETH:   { chainId: 1, address: '0xae78736Cd615f374D3085123A210448E74Fc6393', decimals: 18, symbol: 'rETH', name: 'Rocket Pool ETH' },
  EZETH_ETH:  { chainId: 1, address: '0xbf5495EFE5DB9d15ee830827026436d37061e89F', decimals: 18, symbol: 'ezETH', name: 'Renzo Restaked ETH' },
  WEETH_ETH:  { chainId: 1, address: '0xCd57e07647a7326d2E492655459b85F6d5966152', decimals: 18, symbol: 'weETH', name: 'Wrapped eETH' },
  RSETH_ETH:  { chainId: 1, address: '0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7', decimals: 18, symbol: 'rsETH', name: 'Kelp Restaked ETH' },

  // 🔵 Arbitrum One (Chain 42161)
  WETH_ARB:   { chainId: 42161, address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_ARB:   { chainId: 42161, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDCE_ARB:  { chainId: 42161, address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6, symbol: 'USDC.e', name: 'Bridged USDC' },
  USDT_ARB:   { chainId: 42161, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  DAI_ARB:    { chainId: 42161, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, symbol: 'DAI', name: 'Dai' },
  ARB_ARB:    { chainId: 42161, address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, symbol: 'ARB', name: 'Arbitrum' },
  WBTC_ARB:   { chainId: 42161, address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8, symbol: 'WBTC', name: 'Wrapped BTC' },
  GMX_ARB:    { chainId: 42161, address: '0xf4756139c151178f965539a4a0ee8077c449c433', decimals: 18, symbol: 'GMX', name: 'GMX' },
  GRAIL_ARB:  { chainId: 42161, address: '0x3d9907F9a3680ECa11B675E16CCcf187122CEB77', decimals: 18, symbol: 'GRAIL', name: 'Camelot Grail' },
  PENDLE_ARB: { chainId: 42161, address: '0x0c880f6702e96d4cf45347f382a9be740e698888', decimals: 18, symbol: 'PENDLE', name: 'Pendle' },
  MAGIC_ARB:  { chainId: 42161, address: '0x539bE5761a1107D14701073786AD49223847ac1F', decimals: 18, symbol: 'MAGIC', name: 'Magic' },
  RDNT_ARB:   { chainId: 42161, address: '0x3082CC23568eA640225c2467653dB90e9250AaA0', decimals: 18, symbol: 'RDNT', name: 'Radiant' },
  STG_ARB:    { chainId: 42161, address: '0x6694340fc020c5E6B96567843da2df01b2CE1eb6', decimals: 18, symbol: 'STG', name: 'Stargate' },
  LINK_ARB:   { chainId: 42161, address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', decimals: 18, symbol: 'LINK', name: 'Chainlink' },
  UNI_ARB:    { chainId: 42161, address: '0xFa7F8980b0f1E64A2062791ce3b0e4Cd49E9f453', decimals: 18, symbol: 'UNI', name: 'Uniswap' },
  WSTETH_ARB: { chainId: 42161, address: '0x5979D7b546E38E414F7E9822514be443A4800529', decimals: 18, symbol: 'wstETH', name: 'Wrapped stETH' },
  WEETH_ARB:  { chainId: 42161, address: '0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe', decimals: 18, symbol: 'weETH', name: 'Wrapped eETH' },

  // 🔴 Optimism (Chain 10)
  WETH_OP:    { chainId: 10, address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_OP:    { chainId: 10, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDCE_OP:   { chainId: 10, address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6, symbol: 'USDC.e', name: 'Bridged USDC' },
  USDT_OP:    { chainId: 10, address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  DAI_OP:     { chainId: 10, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, symbol: 'DAI', name: 'Dai' },
  OP_OP:      { chainId: 10, address: '0x4200000000000000000000000000000000000042', decimals: 18, symbol: 'OP', name: 'Optimism' },
  WBTC_OP:    { chainId: 10, address: '0x68f180fcce63038b34199c0d238bf3b09dd0a8e0', decimals: 8, symbol: 'WBTC', name: 'Wrapped BTC' },
  SNX_OP:     { chainId: 10, address: '0x8700daec35af8ff88c16bdf0418774cb3d7599b4', decimals: 18, symbol: 'SNX', name: 'Synthetix' },
  VELO_OP:    { chainId: 10, address: '0x9560e827af36c94d2ac33a39bce1fe7e77922c3b', decimals: 18, symbol: 'VELO', name: 'Velodrome' },
  LINK_OP:    { chainId: 10, address: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6', decimals: 18, symbol: 'LINK', name: 'Chainlink' },
  AAVE_OP:    { chainId: 10, address: '0x76FBDe7f3C0336422938347Cbe99D39563a00B34', decimals: 18, symbol: 'AAVE', name: 'Aave' },
  WSTETH_OP:  { chainId: 10, address: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb', decimals: 18, symbol: 'wstETH', name: 'Wrapped stETH' },

  // 🔷 Base (Chain 8453)
  WETH_BASE:    { chainId: 8453, address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_BASE:    { chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDBC_BASE:   { chainId: 8453, address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6, symbol: 'USDbC', name: 'Bridged USD' },
  USDT_BASE:    { chainId: 8453, address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  DAI_BASE:     { chainId: 8453, address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, symbol: 'DAI', name: 'Dai' },
  AERO_BASE:    { chainId: 8453, address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', decimals: 18, symbol: 'AERO', name: 'Aerodrome' },
  BRETT_BASE:   { chainId: 8453, address: '0x532f27101965dd16442E59d40670FaF5eBB142E4', decimals: 18, symbol: 'BRETT', name: 'Brett' },
  DEGEN_BASE:   { chainId: 8453, address: '0x4ed4E862860bed51a9570b96d89af5e1b0Efefed', decimals: 18, symbol: 'DEGEN', name: 'Degen' },
  VIRTUAL_BASE: { chainId: 8453, address: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', decimals: 18, symbol: 'VIRTUAL', name: 'Virtual Protocol' },
  TOSHI_BASE:   { chainId: 8453, address: '0xAC1Bd2447a10150d01025454429261ED16f57B66', decimals: 18, symbol: 'TOSHI', name: 'Toshi' },
  HIGHER_BASE:  { chainId: 8453, address: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe', decimals: 18, symbol: 'HIGHER', name: 'Higher' },
  CLANKER_BASE: { chainId: 8453, address: '0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb', decimals: 18, symbol: 'CLANKER', name: 'Clanker' },
  MIGGLES_BASE: { chainId: 8453, address: '0xB1a03E715470566e97C1a97F67f053CE4d07e559', decimals: 18, symbol: 'MIGGLES', name: 'Miggles' },
  CBBTC_BASE:   { chainId: 8453, address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8, symbol: 'cbBTC', name: 'Coinbase BTC' },
  WBTC_BASE:    { chainId: 8453, address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', decimals: 8, symbol: 'WBTC', name: 'Wrapped BTC' },
  WSTETH_BASE:  { chainId: 8453, address: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452', decimals: 18, symbol: 'wstETH', name: 'Wrapped stETH' },
  WEETH_BASE:   { chainId: 8453, address: '0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A', decimals: 18, symbol: 'weETH', name: 'Wrapped eETH' },
};

export const MULTI_CHAIN_ARBITRAGE_PAIRS: ArbitragePair[] = [
  // 🟢 Agent 1: Ethereum Majors (10 Pares)
  { id: 'ETH-WETH-USDC', name: 'WETH / USDC (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },
  { id: 'ETH-WETH-USDT', name: 'WETH / USDT (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDT_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },
  { id: 'ETH-WETH-DAI',  name: 'WETH / DAI (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.DAI_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },
  { id: 'ETH-WBTC-WETH', name: 'WBTC / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.WBTC_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '0.5', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 1 },
  { id: 'ETH-WBTC-USDC', name: 'WBTC / USDC (Mainnet)', chainId: 1, tokenA: TOKENS.WBTC_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '0.5', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 1 },
  { id: 'ETH-WBTC-USDT', name: 'WBTC / USDT (Mainnet)', chainId: 1, tokenA: TOKENS.WBTC_ETH, tokenB: TOKENS.USDT_ETH, defaultLoanAmount: '0.5', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 1 },
  { id: 'ETH-USDC-DAI',  name: 'USDC / DAI (Mainnet)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.DAI_ETH, defaultLoanAmount: '5000', approxPriceUSD: 1, assignedAgentId: 1 },
  { id: 'ETH-USDT-DAI',  name: 'USDT / DAI (Mainnet)', chainId: 1, tokenA: TOKENS.USDT_ETH, tokenB: TOKENS.DAI_ETH, defaultLoanAmount: '5000', approxPriceUSD: 1, assignedAgentId: 1 },
  { id: 'ETH-WETH-WBTC', name: 'WETH / WBTC (Mainnet Inverse)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.WBTC_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHBTC', assignedAgentId: 1 },
  { id: 'ETH-USDC-WETH', name: 'USDC / WETH (Mainnet Stable-In)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '15000', approxPriceUSD: 1, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },

  // 🟣 Agent 2: Ethereum Altcoins & DeFi (12 Pares)
  { id: 'ETH-LINK-WETH',   name: 'LINK / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.LINK_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '500', approxPriceUSD: 16, cexSymbol: 'LINKUSDT', assignedAgentId: 2 },
  { id: 'ETH-LINK-USDC',   name: 'LINK / USDC (Mainnet)', chainId: 1, tokenA: TOKENS.LINK_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '500', approxPriceUSD: 16, cexSymbol: 'LINKUSDT', assignedAgentId: 2 },
  { id: 'ETH-UNI-WETH',    name: 'UNI / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.UNI_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '1000', approxPriceUSD: 8, cexSymbol: 'UNIUSDT', assignedAgentId: 2 },
  { id: 'ETH-UNI-USDC',    name: 'UNI / USDC (Mainnet)', chainId: 1, tokenA: TOKENS.UNI_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '1000', approxPriceUSD: 8, cexSymbol: 'UNIUSDT', assignedAgentId: 2 },
  { id: 'ETH-AAVE-WETH',   name: 'AAVE / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.AAVE_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '50', approxPriceUSD: 90, cexSymbol: 'AAVEUSDT', assignedAgentId: 2 },
  { id: 'ETH-MKR-WETH',    name: 'MKR / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.MKR_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '2', approxPriceUSD: 2500, cexSymbol: 'MKRUSDT', assignedAgentId: 2 },
  { id: 'ETH-PEPE-WETH',   name: 'PEPE / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.PEPE_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '500000000', approxPriceUSD: 0.000008, cexSymbol: 'PEPEUSDT', assignedAgentId: 2 },
  { id: 'ETH-SHIB-WETH',   name: 'SHIB / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.SHIB_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '300000000', approxPriceUSD: 0.000015, cexSymbol: 'SHIBUSDT', assignedAgentId: 2 },
  { id: 'ETH-CRV-WETH',    name: 'CRV / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.CRV_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '5000', approxPriceUSD: 0.35, cexSymbol: 'CRVUSDT', assignedAgentId: 2 },
  { id: 'ETH-LDO-WETH',    name: 'LDO / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.LDO_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '2000', approxPriceUSD: 1.2, cexSymbol: 'LDOUSDT', assignedAgentId: 2 },
  { id: 'ETH-PENDLE-WETH', name: 'PENDLE / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.PENDLE_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '1000', approxPriceUSD: 5, cexSymbol: 'PENDLEUSDT', assignedAgentId: 2 },
  { id: 'ETH-ENA-WETH',    name: 'ENA / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.ENA_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '4000', approxPriceUSD: 0.6, cexSymbol: 'ENAUSDT', assignedAgentId: 2 },

  // 🔵 Agent 3: Arbitrum Alpha (12 Pares)
  { id: 'ARB-WETH-USDC',  name: 'WETH / USDC (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },
  { id: 'ARB-WETH-USDCE', name: 'WETH / USDC.e (Arbitrum Bridged)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.USDCE_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },
  { id: 'ARB-WETH-USDT',  name: 'WETH / USDT (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.USDT_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },
  { id: 'ARB-WETH-DAI',   name: 'WETH / DAI (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.DAI_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },
  { id: 'ARB-ARB-WETH',   name: 'ARB / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.ARB_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '5000', approxPriceUSD: 0.6, cexSymbol: 'ARBUSDT', assignedAgentId: 3 },
  { id: 'ARB-ARB-USDC',   name: 'ARB / USDC (Arbitrum)', chainId: 42161, tokenA: TOKENS.ARB_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '5000', approxPriceUSD: 0.6, cexSymbol: 'ARBUSDT', assignedAgentId: 3 },
  { id: 'ARB-ARB-USDT',   name: 'ARB / USDT (Arbitrum)', chainId: 42161, tokenA: TOKENS.ARB_ARB, tokenB: TOKENS.USDT_ARB, defaultLoanAmount: '5000', approxPriceUSD: 0.6, cexSymbol: 'ARBUSDT', assignedAgentId: 3 },
  { id: 'ARB-WBTC-WETH',  name: 'WBTC / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.WBTC_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 3 },
  { id: 'ARB-WBTC-USDC',  name: 'WBTC / USDC (Arbitrum)', chainId: 42161, tokenA: TOKENS.WBTC_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 3 },
  { id: 'ARB-USDC-USDCE', name: 'USDC / USDC.e (Arbitrum Peg)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.USDCE_ARB, defaultLoanAmount: '2000', approxPriceUSD: 1, assignedAgentId: 3 },
  { id: 'ARB-USDC-USDT',  name: 'USDC / USDT (Arbitrum Peg)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.USDT_ARB, defaultLoanAmount: '2000', approxPriceUSD: 1, assignedAgentId: 3 },
  { id: 'ARB-USDC-WETH',  name: 'USDC / WETH (Arbitrum Stable-In)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '10000', approxPriceUSD: 1, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },

  // 🩵 Agent 4: Arbitrum Camelot & DeFi Token Spreads (10 Pares)
  { id: 'ARB-GMX-WETH',    name: 'GMX / WETH (Camelot DEX)', chainId: 42161, tokenA: TOKENS.GMX_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '100', approxPriceUSD: 28, cexSymbol: 'GMXUSDT', assignedAgentId: 4 },
  { id: 'ARB-GMX-USDC',    name: 'GMX / USDC (Arbitrum)', chainId: 42161, tokenA: TOKENS.GMX_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '100', approxPriceUSD: 28, cexSymbol: 'GMXUSDT', assignedAgentId: 4 },
  { id: 'ARB-GRAIL-WETH',  name: 'GRAIL / WETH (Camelot)', chainId: 42161, tokenA: TOKENS.GRAIL_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '2', approxPriceUSD: 1200, assignedAgentId: 4 },
  { id: 'ARB-PENDLE-WETH', name: 'PENDLE / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.PENDLE_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '1000', approxPriceUSD: 5, cexSymbol: 'PENDLEUSDT', assignedAgentId: 4 },
  { id: 'ARB-PENDLE-USDC', name: 'PENDLE / USDC (Arbitrum)', chainId: 42161, tokenA: TOKENS.PENDLE_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '1000', approxPriceUSD: 5, cexSymbol: 'PENDLEUSDT', assignedAgentId: 4 },
  { id: 'ARB-MAGIC-WETH',  name: 'MAGIC / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.MAGIC_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '2000', approxPriceUSD: 0.4, assignedAgentId: 4 },
  { id: 'ARB-RDNT-WETH',   name: 'RDNT / WETH (Radiant Arb)', chainId: 42161, tokenA: TOKENS.RDNT_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '5000', approxPriceUSD: 0.08, assignedAgentId: 4 },
  { id: 'ARB-STG-WETH',    name: 'STG / WETH (Stargate Arb)', chainId: 42161, tokenA: TOKENS.STG_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '3000', approxPriceUSD: 0.3, assignedAgentId: 4 },
  { id: 'ARB-LINK-WETH',   name: 'LINK / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.LINK_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '400', approxPriceUSD: 16, cexSymbol: 'LINKUSDT', assignedAgentId: 4 },
  { id: 'ARB-UNI-WETH',    name: 'UNI / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.UNI_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '600', approxPriceUSD: 8, cexSymbol: 'UNIUSDT', assignedAgentId: 4 },

  // 🔴 Agent 5: Optimism Swarm (10 Pares)
  { id: 'OP-WETH-USDC',  name: 'WETH / USDC (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.USDC_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },
  { id: 'OP-WETH-USDCE', name: 'WETH / USDC.e (Optimism Bridged)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.USDCE_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },
  { id: 'OP-WETH-USDT',  name: 'WETH / USDT (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.USDT_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },
  { id: 'OP-WETH-DAI',   name: 'WETH / DAI (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.DAI_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },
  { id: 'OP-OP-WETH',    name: 'OP / WETH (Optimism)', chainId: 10, tokenA: TOKENS.OP_OP, tokenB: TOKENS.WETH_OP, defaultLoanAmount: '2000', approxPriceUSD: 1.5, cexSymbol: 'OPUSDT', assignedAgentId: 5 },
  { id: 'OP-OP-USDC',    name: 'OP / USDC (Optimism)', chainId: 10, tokenA: TOKENS.OP_OP, tokenB: TOKENS.USDC_OP, defaultLoanAmount: '2000', approxPriceUSD: 1.5, cexSymbol: 'OPUSDT', assignedAgentId: 5 },
  { id: 'OP-SNX-WETH',   name: 'SNX / WETH (Optimism)', chainId: 10, tokenA: TOKENS.SNX_OP, tokenB: TOKENS.WETH_OP, defaultLoanAmount: '1000', approxPriceUSD: 2, assignedAgentId: 5 },
  { id: 'OP-VELO-WETH',  name: 'VELO / WETH (Velodrome)', chainId: 10, tokenA: TOKENS.VELO_OP, tokenB: TOKENS.WETH_OP, defaultLoanAmount: '5000', approxPriceUSD: 0.1, assignedAgentId: 5 },
  { id: 'OP-LINK-WETH',  name: 'LINK / WETH (Optimism)', chainId: 10, tokenA: TOKENS.LINK_OP, tokenB: TOKENS.WETH_OP, defaultLoanAmount: '300', approxPriceUSD: 16, cexSymbol: 'LINKUSDT', assignedAgentId: 5 },
  { id: 'OP-WBTC-WETH',  name: 'WBTC / WETH (Optimism)', chainId: 10, tokenA: TOKENS.WBTC_OP, tokenB: TOKENS.WETH_OP, defaultLoanAmount: '0.1', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 5 },

  // 🟡 Agent 6: Base Aerodrome High-Liquidity Swarm (10 Pares)
  { id: 'BASE-WETH-USDC',  name: 'WETH / USDC (Base Aerodrome)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 6 },
  { id: 'BASE-WETH-USDBC', name: 'WETH / USDbC (Base Bridged)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.USDBC_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 6 },
  { id: 'BASE-WETH-USDT',  name: 'WETH / USDT (Base)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.USDT_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 6 },
  { id: 'BASE-WETH-DAI',   name: 'WETH / DAI (Base)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.DAI_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 6 },
  { id: 'BASE-AERO-WETH',  name: 'AERO / WETH (Base Aerodrome)', chainId: 8453, tokenA: TOKENS.AERO_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '2500', approxPriceUSD: 1.2, assignedAgentId: 6 },
  { id: 'BASE-AERO-USDC',  name: 'AERO / USDC (Base)', chainId: 8453, tokenA: TOKENS.AERO_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '2500', approxPriceUSD: 1.2, assignedAgentId: 6 },
  { id: 'BASE-CBBTC-WETH', name: 'cbBTC / WETH (Coinbase Base)', chainId: 8453, tokenA: TOKENS.CBBTC_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 6 },
  { id: 'BASE-CBBTC-USDC', name: 'cbBTC / USDC (Base)', chainId: 8453, tokenA: TOKENS.CBBTC_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 6 },
  { id: 'BASE-WBTC-WETH',  name: 'WBTC / WETH (Base)', chainId: 8453, tokenA: TOKENS.WBTC_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 6 },
  { id: 'BASE-USDC-USDBC', name: 'USDC / USDbC (Base Stable Peg)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.USDBC_BASE, defaultLoanAmount: '2000', approxPriceUSD: 1, assignedAgentId: 6 },

  // 🟢 Agent 7: Base Meme & AI Volatility Tokens (10 Pares)
  { id: 'BASE-BRETT-WETH',   name: 'BRETT / WETH (Base Meme)', chainId: 8453, tokenA: TOKENS.BRETT_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '10000', approxPriceUSD: 0.08, assignedAgentId: 7 },
  { id: 'BASE-BRETT-USDC',   name: 'BRETT / USDC (Base)', chainId: 8453, tokenA: TOKENS.BRETT_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '10000', approxPriceUSD: 0.08, assignedAgentId: 7 },
  { id: 'BASE-DEGEN-WETH',   name: 'DEGEN / WETH (Base Meme)', chainId: 8453, tokenA: TOKENS.DEGEN_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '50000', approxPriceUSD: 0.01, assignedAgentId: 7 },
  { id: 'BASE-DEGEN-USDC',   name: 'DEGEN / USDC (Base)', chainId: 8453, tokenA: TOKENS.DEGEN_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '50000', approxPriceUSD: 0.01, assignedAgentId: 7 },
  { id: 'BASE-VIRTUAL-WETH', name: 'VIRTUAL / WETH (Base AI)', chainId: 8453, tokenA: TOKENS.VIRTUAL_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '1000', approxPriceUSD: 1.5, assignedAgentId: 7 },
  { id: 'BASE-VIRTUAL-USDC', name: 'VIRTUAL / USDC (Base AI)', chainId: 8453, tokenA: TOKENS.VIRTUAL_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '1000', approxPriceUSD: 1.5, assignedAgentId: 7 },
  { id: 'BASE-TOSHI-WETH',   name: 'TOSHI / WETH (Base Meme)', chainId: 8453, tokenA: TOKENS.TOSHI_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '5000000', approxPriceUSD: 0.0003, assignedAgentId: 7 },
  { id: 'BASE-HIGHER-WETH',  name: 'HIGHER / WETH (Base)', chainId: 8453, tokenA: TOKENS.HIGHER_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '25000', approxPriceUSD: 0.03, assignedAgentId: 7 },
  { id: 'BASE-CLANKER-WETH', name: 'CLANKER / WETH (Base AI)', chainId: 8453, tokenA: TOKENS.CLANKER_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '20', approxPriceUSD: 50, assignedAgentId: 7 },
  { id: 'BASE-MIGGLES-WETH', name: 'MIGGLES / WETH (Base)', chainId: 8453, tokenA: TOKENS.MIGGLES_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '30000', approxPriceUSD: 0.02, assignedAgentId: 7 },

  // 🩷 Agent 8: Liquid Staking & Restaking Arbitrage (10 Pares)
  { id: 'ETH-STETH-WETH',   name: 'stETH / WETH (Lido Mainnet)', chainId: 1, tokenA: TOKENS.STETH_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '20', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ETH-WSTETH-WETH',  name: 'wstETH / WETH (Lido Mainnet)', chainId: 1, tokenA: TOKENS.WSTETH_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '20', approxPriceUSD: 3500, assignedAgentId: 8 },
  { id: 'ETH-RETH-WETH',    name: 'rETH / WETH (RocketPool)', chainId: 1, tokenA: TOKENS.RETH_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '20', approxPriceUSD: 3300, assignedAgentId: 8 },
  { id: 'ETH-EZETH-WETH',   name: 'ezETH / WETH (Renzo Restaking)', chainId: 1, tokenA: TOKENS.EZETH_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '20', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ETH-WEETH-WETH',   name: 'weETH / WETH (Ether.fi Restaking)', chainId: 1, tokenA: TOKENS.WEETH_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '20', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ETH-RSETH-WETH',   name: 'rsETH / WETH (Kelp Restaking)', chainId: 1, tokenA: TOKENS.RSETH_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '20', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ARB-WSTETH-WETH',  name: 'wstETH / WETH (Arbitrum LST)', chainId: 42161, tokenA: TOKENS.WSTETH_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '10', approxPriceUSD: 3500, assignedAgentId: 8 },
  { id: 'ARB-WEETH-WETH',   name: 'weETH / WETH (Arbitrum LRT)', chainId: 42161, tokenA: TOKENS.WEETH_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '10', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'BASE-WSTETH-WETH', name: 'wstETH / WETH (Base LST)', chainId: 8453, tokenA: TOKENS.WSTETH_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '10', approxPriceUSD: 3500, assignedAgentId: 8 },
  { id: 'BASE-WEETH-WETH',  name: 'weETH / WETH (Base LRT)', chainId: 8453, tokenA: TOKENS.WEETH_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '10', approxPriceUSD: 3000, assignedAgentId: 8 },

  // 🧡 Agent 9: Cross-L2 High Volume Spreads (8 Pares)
  { id: 'ETH-WETH-USDC-CEX',  name: 'WETH / USDC (CEX Spread ETH)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '15', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 9 },
  { id: 'ARB-WETH-USDC-CEX',  name: 'WETH / USDC (CEX Spread ARB)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 9 },
  { id: 'BASE-WETH-USDC-CEX', name: 'WETH / USDC (CEX Spread BASE)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '8', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 9 },
  { id: 'OP-WETH-USDC-CEX',   name: 'WETH / USDC (CEX Spread OP)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.USDC_OP, defaultLoanAmount: '8', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 9 },
  { id: 'ARB-ARB-USDT-CEX',   name: 'ARB / USDT (CEX Spread ARB)', chainId: 42161, tokenA: TOKENS.ARB_ARB, tokenB: TOKENS.USDT_ARB, defaultLoanAmount: '10000', approxPriceUSD: 0.6, cexSymbol: 'ARBUSDT', assignedAgentId: 9 },
  { id: 'OP-OP-USDT-CEX',     name: 'OP / USDT (CEX Spread OP)', chainId: 10, tokenA: TOKENS.OP_OP, tokenB: TOKENS.USDT_OP, defaultLoanAmount: '4000', approxPriceUSD: 1.5, cexSymbol: 'OPUSDT', assignedAgentId: 9 },
  { id: 'BASE-AERO-USDC-CEX', name: 'AERO / USDC (CEX Spread BASE)', chainId: 8453, tokenA: TOKENS.AERO_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '5000', approxPriceUSD: 1.2, assignedAgentId: 9 },
  { id: 'ETH-LINK-USDT-CEX',  name: 'LINK / USDT (CEX Spread ETH)', chainId: 1, tokenA: TOKENS.LINK_ETH, tokenB: TOKENS.USDT_ETH, defaultLoanAmount: '800', approxPriceUSD: 16, cexSymbol: 'LINKUSDT', assignedAgentId: 9 },

  // 🩵 Agent 10: Stablecoin Peg Arbitrage (10 Pares)
  { id: 'ETH-USDC-USDT',   name: 'USDC / USDT (Mainnet Stable)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.USDT_ETH, defaultLoanAmount: '5000', approxPriceUSD: 1, cexSymbol: 'USDCUSDT', assignedAgentId: 10 },
  { id: 'ETH-DAI-USDC',    name: 'DAI / USDC (Mainnet Stable)', chainId: 1, tokenA: TOKENS.DAI_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '5000', approxPriceUSD: 1, assignedAgentId: 10 },
  { id: 'ETH-DAI-USDT',    name: 'DAI / USDT (Mainnet Stable)', chainId: 1, tokenA: TOKENS.DAI_ETH, tokenB: TOKENS.USDT_ETH, defaultLoanAmount: '5000', approxPriceUSD: 1, assignedAgentId: 10 },
  { id: 'ARB-USDC-USDT',   name: 'USDC / USDT (Arbitrum Stable)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.USDT_ARB, defaultLoanAmount: '3000', approxPriceUSD: 1, cexSymbol: 'USDCUSDT', assignedAgentId: 10 },
  { id: 'ARB-USDCE-USDC',  name: 'USDC.e / USDC (Arbitrum De-peg)', chainId: 42161, tokenA: TOKENS.USDCE_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '3000', approxPriceUSD: 1, assignedAgentId: 10 },
  { id: 'ARB-DAI-USDC',    name: 'DAI / USDC (Arbitrum Stable)', chainId: 42161, tokenA: TOKENS.DAI_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '3000', approxPriceUSD: 1, assignedAgentId: 10 },
  { id: 'OP-USDC-USDT',    name: 'USDC / USDT (Optimism Stable)', chainId: 10, tokenA: TOKENS.USDC_OP, tokenB: TOKENS.USDT_OP, defaultLoanAmount: '2000', approxPriceUSD: 1, cexSymbol: 'USDCUSDT', assignedAgentId: 10 },
  { id: 'OP-USDCE-USDC',   name: 'USDC.e / USDC (Optimism De-peg)', chainId: 10, tokenA: TOKENS.USDCE_OP, tokenB: TOKENS.USDC_OP, defaultLoanAmount: '2000', approxPriceUSD: 1, assignedAgentId: 10 },
  { id: 'BASE-USDC-USDT',  name: 'USDC / USDT (Base Stable)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.USDT_BASE, defaultLoanAmount: '2000', approxPriceUSD: 1, assignedAgentId: 10 },
  { id: 'BASE-USDBC-USDC', name: 'USDbC / USDC (Base De-peg)', chainId: 8453, tokenA: TOKENS.USDBC_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '2000', approxPriceUSD: 1, assignedAgentId: 10 },
];
