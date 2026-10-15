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
  regimentId: number;
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

export const TOTAL_AGENTS_COUNT = 250000;
export const TOTAL_REGIMENTS_COUNT = 2500;
export const TOTAL_LEGIONS_COUNT = 250;

export const REGIMENTS_METADATA = [
  { name: 'Base AI & SocialFi Legions', chain: [8453], color: '#00f2fe', role: 'Base Trending AI Agents & Social Tokens' },
  { name: 'Base Meme Volatility & Snipers', chain: [8453], color: '#10b981', role: 'Base Aerodrome Meme High Volatility' },
  { name: 'Base Aerodrome Slipstream', chain: [8453], color: '#eab308', role: 'Base Core Slipstream High-Liquidity' },
  { name: 'Arbitrum Camelot V3 Alphas', chain: [42161], color: '#06b6d4', role: 'Arbitrum Camelot V3 Native Alphas' },
  { name: 'Arbitrum Uniswap & Balancer', chain: [42161], color: '#3b82f6', role: 'Arbitrum Bluechips & DeFi Majors' },
  { name: 'BNB Chain PancakeSwap & Thena', chain: [56], color: '#f3ba2f', role: 'BSC High-Volume Retail & Meme Matrix' },
  { name: 'Polygon PoS QuickSwap & Retro', chain: [137], color: '#8247e5', role: 'Polygon Sub-Cent Fast Micro-Arb' },
  { name: 'Avalanche Trader Joe Liquidity Book', chain: [43114], color: '#e84142', role: 'Avalanche Zero-Slippage Discrete Bins' },
  { name: 'Blast Native Yield & Thruster', chain: [81457], color: '#fcfe00', role: 'Blast High-Volatility Points & Yield' },
  { name: 'Linea & Scroll ZK-Rollups', chain: [59144, 534352], color: '#00d2d3', role: 'ZK-Rollup Low-Competition Snipers' },
  { name: 'ETH Stablecoin Depeg Hunters', chain: [1], color: '#14b8a6', role: 'Ethereum Curve/Ethena Stable De-peg' },
  { name: 'ETH Liquid Restaking & LST', chain: [1], color: '#ec4899', role: 'Ethereum LRT/LST Yield Arbitrage' },
  { name: 'ETH Curve & Balancer Mega', chain: [1], color: '#8b5cf6', role: 'Ethereum Mainnet Multi-Asset Pools' },
  { name: 'Optimism Velodrome & Synthetix', chain: [10], color: '#f43f5e', role: 'Optimism Velodrome Slipstream Swarm' },
  { name: 'CoW Swap Batch Auction Solvers', chain: [1, 42161, 8453], color: '#ff793f', role: 'CoW Protocol Batch Solver Surplus' },
  { name: 'Perp-DEX vs Spot Basis Snipers', chain: [42161, 8453, 10], color: '#ffa502', role: 'GMX/Vertex/Hyperliquid Funding Basis' },
  { name: 'NHop Polygonal Graph Cycles (4-6 Hops)', chain: [8453, 42161, 1, 56, 137, 43114], color: '#ff4757', role: 'Polygonal Graph Long-Path Cyclic Arb' },
  { name: 'Atomic Lending Flash Liquidations', chain: [8453, 42161, 1, 56, 137, 43114], color: '#2ed573', role: 'Aave/Compound/Moonwell Under-Collateral Liquidation' },
  { name: 'Sub-Cent L2 High-Freq Micro-Snipers ($0.001)', chain: [8453, 42161, 137, 81457, 59144, 534352], color: '#26de81', role: 'Sub-Cent 1-5bps Micro-Spread Capture' },
  { name: 'Atomic Flash-Bundle Multi-DEX Amortizers', chain: [8453, 42161, 56, 137, 43114], color: '#a55eea', role: 'Atomic Multi-Swap Flash-Bundle Amortizer' },
  { name: 'Sub-Gwei Tick-Exact Yul Lens Snipers', chain: [8453, 42161, 1, 10], color: '#fed330', role: 'Yul Storage Slots Zero-Slippage Micro-Arb' },
  { name: 'CEX-DEX Lag Anticipation Snipers', chain: [8453, 42161, 1, 10, 56, 137, 43114], color: '#f093fb', role: 'Binance/Bybit/Coinbase CEX-to-DEX Lag' },
  { name: 'Triangular Multi-Hop High-Freq', chain: [8453, 42161, 1, 10, 56, 137, 43114], color: '#ffd166', role: 'Triangular 3-Hop Multi-DEX Micro-Arb' },
];

export function getAgentByIndex(id: number): AgentDefinition {
  const regimentIndex = Math.floor((id - 1) / 100) % REGIMENTS_METADATA.length;
  const regimentId = Math.floor((id - 1) / 100) + 1;
  const meta = REGIMENTS_METADATA[regimentIndex];
  const paddedId = id.toString().padStart(6, '0');

  return {
    id,
    regimentId,
    name: `Agent-${paddedId} (R${regimentId})`,
    role: `${meta.role} #${((id - 1) % 100) + 1}`,
    targetChains: meta.chain,
    color: meta.color,
  };
}

export function getRegimentAgents(regimentId: number): AgentDefinition[] {
  const list: AgentDefinition[] = [];
  const startId = (regimentId - 1) * 100 + 1;
  const endId = Math.min(regimentId * 100, TOTAL_AGENTS_COUNT);
  for (let i = startId; i <= endId; i++) {
    list.push(getAgentByIndex(i));
  }
  return list;
}

export function generate250000SwarmAgents(): AgentDefinition[] {
  const agents: AgentDefinition[] = [];
  // Precargar una muestra representativa en memoria
  for (let i = 1; i <= 2500; i++) {
    agents.push(getAgentByIndex(i));
  }
  return agents;
}

export const SWARM_AGENTS: AgentDefinition[] = generate250000SwarmAgents();


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
  USDE_ETH:   { chainId: 1, address: '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3', decimals: 18, symbol: 'USDe', name: 'Ethena USDe' },
  CRVUSD_ETH: { chainId: 1, address: '0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E', decimals: 18, symbol: 'crvUSD', name: 'Curve USD' },
  GHO_ETH:    { chainId: 1, address: '0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f', decimals: 18, symbol: 'GHO', name: 'Aave GHO' },
  FRAX_ETH:   { chainId: 1, address: '0x853d955aCEf822Db058eb8505911ED77F175b99e', decimals: 18, symbol: 'FRAX', name: 'Frax' },
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
  // 🟡 BNB Chain (BSC - Chain 56)
  WBNB_BSC:   { chainId: 56, address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, symbol: 'WBNB', name: 'Wrapped BNB' },
  USDT_BSC:   { chainId: 56, address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, symbol: 'USDT', name: 'Tether USD' },
  USDC_BSC:   { chainId: 56, address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, symbol: 'USDC', name: 'USD Coin' },
  CAKE_BSC:   { chainId: 56, address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, symbol: 'CAKE', name: 'PancakeSwap' },
  BTCB_BSC:   { chainId: 56, address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, symbol: 'BTCB', name: 'Bitcoin BEP20' },
  ETH_BSC:    { chainId: 56, address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, symbol: 'ETH', name: 'Ethereum BEP20' },

  // 💜 Polygon PoS (Chain 137)
  POL_POLY:   { chainId: 137, address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, symbol: 'POL', name: 'Polygon Ecosystem Token' },
  USDC_POLY:  { chainId: 137, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDT_POLY:  { chainId: 137, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  WETH_POLY:  { chainId: 137, address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  QUICK_POLY: { chainId: 137, address: '0xB5C064F955D8e7F38fE0460C556a72987494eE17', decimals: 18, symbol: 'QUICK', name: 'QuickSwap' },

  // 🔺 Avalanche C-Chain (Chain 43114)
  WAVAX_AVAX: { chainId: 43114, address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', decimals: 18, symbol: 'WAVAX', name: 'Wrapped AVAX' },
  USDC_AVAX:  { chainId: 43114, address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  USDT_AVAX:  { chainId: 43114, address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6, symbol: 'USDT', name: 'Tether USD' },
  WETH_AVAX:  { chainId: 43114, address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  JOE_AVAX:   { chainId: 43114, address: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd', decimals: 18, symbol: 'JOE', name: 'Trader Joe' },

  // 💥 Blast (Chain 81457)
  WETH_BLAST:  { chainId: 81457, address: '0x4300000000000000000000000000000000000004', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDB_BLAST:  { chainId: 81457, address: '0x4300000000000000000000000000000000000003', decimals: 18, symbol: 'USDB', name: 'Blast USDB' },
  BLAST_BLAST: { chainId: 81457, address: '0xb1a5700fA2301CDa54887346A22B278452388447', decimals: 18, symbol: 'BLAST', name: 'Blast Token' },

  // 🦊 Linea (Chain 59144)
  WETH_LINEA:  { chainId: 59144, address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_LINEA:  { chainId: 59144, address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  FOXY_LINEA:  { chainId: 59144, address: '0x5FBDF89403270a1846F5ae7D113A989F850d1566', decimals: 18, symbol: 'FOXY', name: 'Foxy' },

  // 📜 Scroll (Chain 534352)
  WETH_SCROLL: { chainId: 534352, address: '0x5300000000000000000000000000000000000004', decimals: 18, symbol: 'WETH', name: 'Wrapped Ether' },
  USDC_SCROLL: { chainId: 534352, address: '0x06eFdBF5e0263E9025a2f148967EC564574e37C6', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  SCR_SCROLL:  { chainId: 534352, address: '0xd29687c813D741E2F938F4aC377128810E217b1b', decimals: 18, symbol: 'SCR', name: 'Scroll' },
};

export const MULTI_CHAIN_ARBITRAGE_PAIRS: ArbitragePair[] = [
  // 🟢 Agent 1: Ethereum Majors & Synthetics (14 Pares)
  { id: 'ETH-WETH-USDC',   name: 'WETH / USDC (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },
  { id: 'ETH-WETH-USDT',   name: 'WETH / USDT (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDT_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },
  { id: 'ETH-WETH-DAI',    name: 'WETH / DAI (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.DAI_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },
  { id: 'ETH-WBTC-WETH',   name: 'WBTC / WETH (Mainnet)', chainId: 1, tokenA: TOKENS.WBTC_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '0.5', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 1 },
  { id: 'ETH-WBTC-USDC',   name: 'WBTC / USDC (Mainnet)', chainId: 1, tokenA: TOKENS.WBTC_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '0.5', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 1 },
  { id: 'ETH-WBTC-USDT',   name: 'WBTC / USDT (Mainnet)', chainId: 1, tokenA: TOKENS.WBTC_ETH, tokenB: TOKENS.USDT_ETH, defaultLoanAmount: '0.5', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 1 },
  { id: 'ETH-USDC-DAI',    name: 'USDC / DAI (Mainnet)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.DAI_ETH, defaultLoanAmount: '5000', approxPriceUSD: 1, assignedAgentId: 1 },
  { id: 'ETH-USDT-DAI',    name: 'USDT / DAI (Mainnet)', chainId: 1, tokenA: TOKENS.USDT_ETH, tokenB: TOKENS.DAI_ETH, defaultLoanAmount: '5000', approxPriceUSD: 1, assignedAgentId: 1 },
  { id: 'ETH-WETH-WBTC',   name: 'WETH / WBTC (Mainnet Inverse)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.WBTC_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHBTC', assignedAgentId: 1 },
  { id: 'ETH-USDC-WETH',   name: 'USDC / WETH (Mainnet Stable-In)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.WETH_ETH, defaultLoanAmount: '15000', approxPriceUSD: 1, cexSymbol: 'ETHUSDT', assignedAgentId: 1 },
  { id: 'ETH-WETH-USDE',   name: 'WETH / USDe (Ethena Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDE_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, assignedAgentId: 1 },
  { id: 'ETH-USDC-USDE',   name: 'USDC / USDe (Ethena Stable)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.USDE_ETH, defaultLoanAmount: '10000', approxPriceUSD: 1, assignedAgentId: 1 },
  { id: 'ETH-USDC-CRVUSD', name: 'USDC / crvUSD (Curve Mainnet)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.CRVUSD_ETH, defaultLoanAmount: '10000', approxPriceUSD: 1, assignedAgentId: 1 },
  { id: 'ETH-USDC-GHO',    name: 'USDC / GHO (Aave Mainnet)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.GHO_ETH, defaultLoanAmount: '10000', approxPriceUSD: 1, assignedAgentId: 1 },

  // 🟣 Agent 2: Ethereum Altcoins & DeFi (12 Pares)
  { id: 'ETH-WETH-LINK',   name: 'WETH / LINK (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.LINK_ETH, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'LINKUSDT', assignedAgentId: 2 },
  { id: 'ETH-USDC-LINK',   name: 'USDC / LINK (Mainnet)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.LINK_ETH, defaultLoanAmount: '10000', approxPriceUSD: 1, cexSymbol: 'LINKUSDT', assignedAgentId: 2 },
  { id: 'ETH-WETH-UNI',    name: 'WETH / UNI (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.UNI_ETH, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'UNIUSDT', assignedAgentId: 2 },
  { id: 'ETH-USDC-UNI',    name: 'USDC / UNI (Mainnet)', chainId: 1, tokenA: TOKENS.USDC_ETH, tokenB: TOKENS.UNI_ETH, defaultLoanAmount: '10000', approxPriceUSD: 1, cexSymbol: 'UNIUSDT', assignedAgentId: 2 },
  { id: 'ETH-WETH-AAVE',   name: 'WETH / AAVE (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.AAVE_ETH, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'AAVEUSDT', assignedAgentId: 2 },
  { id: 'ETH-WETH-MKR',    name: 'WETH / MKR (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.MKR_ETH, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'MKRUSDT', assignedAgentId: 2 },
  { id: 'ETH-WETH-PEPE',   name: 'WETH / PEPE (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.PEPE_ETH, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'PEPEUSDT', assignedAgentId: 2 },
  { id: 'ETH-WETH-SHIB',   name: 'WETH / SHIB (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.SHIB_ETH, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'SHIBUSDT', assignedAgentId: 2 },
  { id: 'ETH-WETH-CRV',    name: 'WETH / CRV (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.CRV_ETH, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'CRVUSDT', assignedAgentId: 2 },
  { id: 'ETH-WETH-LDO',    name: 'WETH / LDO (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.LDO_ETH, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'LDOUSDT', assignedAgentId: 2 },
  { id: 'ETH-WETH-PENDLE', name: 'WETH / PENDLE (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.PENDLE_ETH, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'PENDLEUSDT', assignedAgentId: 2 },
  { id: 'ETH-WETH-ENA',    name: 'WETH / ENA (Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.ENA_ETH, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ENAUSDT', assignedAgentId: 2 },

  // 🔵 Agent 3: Arbitrum Alpha (12 Pares)
  { id: 'ARB-WETH-USDC',  name: 'WETH / USDC (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },
  { id: 'ARB-WETH-USDCE', name: 'WETH / USDC.e (Arbitrum Bridged)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.USDCE_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },
  { id: 'ARB-WETH-USDT',  name: 'WETH / USDT (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.USDT_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },
  { id: 'ARB-WETH-DAI',   name: 'WETH / DAI (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.DAI_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },
  { id: 'ARB-WETH-ARB',   name: 'WETH / ARB (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.ARB_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'ARBUSDT', assignedAgentId: 3 },
  { id: 'ARB-USDC-ARB',   name: 'USDC / ARB (Arbitrum)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.ARB_ARB, defaultLoanAmount: '5000', approxPriceUSD: 1, cexSymbol: 'ARBUSDT', assignedAgentId: 3 },
  { id: 'ARB-USDT-ARB',   name: 'USDT / ARB (Arbitrum)', chainId: 42161, tokenA: TOKENS.USDT_ARB, tokenB: TOKENS.ARB_ARB, defaultLoanAmount: '5000', approxPriceUSD: 1, cexSymbol: 'ARBUSDT', assignedAgentId: 3 },
  { id: 'ARB-WBTC-WETH',  name: 'WBTC / WETH (Arbitrum)', chainId: 42161, tokenA: TOKENS.WBTC_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 3 },
  { id: 'ARB-WBTC-USDC',  name: 'WBTC / USDC (Arbitrum)', chainId: 42161, tokenA: TOKENS.WBTC_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 3 },
  { id: 'ARB-USDC-USDCE', name: 'USDC / USDC.e (Arbitrum Peg)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.USDCE_ARB, defaultLoanAmount: '2000', approxPriceUSD: 1, assignedAgentId: 3 },
  { id: 'ARB-USDC-USDT',  name: 'USDC / USDT (Arbitrum Peg)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.USDT_ARB, defaultLoanAmount: '2000', approxPriceUSD: 1, assignedAgentId: 3 },
  { id: 'ARB-USDC-WETH',  name: 'USDC / WETH (Arbitrum Stable-In)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.WETH_ARB, defaultLoanAmount: '10000', approxPriceUSD: 1, cexSymbol: 'ETHUSDT', assignedAgentId: 3 },

  // 🩵 Agent 4: Arbitrum Camelot & DeFi Token Spreads (15 Pares)
  { id: 'ARB-WETH-GMX',         name: 'WETH / GMX (Camelot DEX)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.GMX_ARB, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'GMXUSDT', assignedAgentId: 4 },
  { id: 'ARB-USDC-GMX',         name: 'USDC / GMX (Arbitrum)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.GMX_ARB, defaultLoanAmount: '5000', approxPriceUSD: 1, cexSymbol: 'GMXUSDT', assignedAgentId: 4 },
  { id: 'ARB-WETH-GRAIL',       name: 'WETH / GRAIL (Camelot)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.GRAIL_ARB, defaultLoanAmount: '3', approxPriceUSD: 3000, assignedAgentId: 4 },
  { id: 'ARB-WETH-PENDLE',      name: 'WETH / PENDLE (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.PENDLE_ARB, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'PENDLEUSDT', assignedAgentId: 4 },
  { id: 'ARB-USDC-PENDLE',      name: 'USDC / PENDLE (Arbitrum)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.PENDLE_ARB, defaultLoanAmount: '5000', approxPriceUSD: 1, cexSymbol: 'PENDLEUSDT', assignedAgentId: 4 },
  { id: 'ARB-WETH-MAGIC',       name: 'WETH / MAGIC (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.MAGIC_ARB, defaultLoanAmount: '3', approxPriceUSD: 3000, assignedAgentId: 4 },
  { id: 'ARB-WETH-RDNT',        name: 'WETH / RDNT (Radiant Arb)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.RDNT_ARB, defaultLoanAmount: '3', approxPriceUSD: 3000, assignedAgentId: 4 },
  { id: 'ARB-WETH-STG',         name: 'WETH / STG (Stargate Arb)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.STG_ARB, defaultLoanAmount: '3', approxPriceUSD: 3000, assignedAgentId: 4 },
  { id: 'ARB-WETH-LINK',        name: 'WETH / LINK (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.LINK_ARB, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'LINKUSDT', assignedAgentId: 4 },
  { id: 'ARB-WETH-UNI',         name: 'WETH / UNI (Arbitrum)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.UNI_ARB, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'UNIUSDT', assignedAgentId: 4 },
  { id: 'ARB-WETH-PENDLE-CAM',  name: 'WETH / PENDLE (Camelot Native)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.PENDLE_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'PENDLEUSDT', assignedAgentId: 4 },
  { id: 'ARB-USDC-PENDLE-CAM',  name: 'USDC / PENDLE (Camelot Native)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.PENDLE_ARB, defaultLoanAmount: '10000', approxPriceUSD: 1, cexSymbol: 'PENDLEUSDT', assignedAgentId: 4 },
  { id: 'ARB-WETH-GMX-CAM',     name: 'WETH / GMX (Camelot Alpha)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.GMX_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, cexSymbol: 'GMXUSDT', assignedAgentId: 4 },
  { id: 'ARB-USDC-GMX-CAM',     name: 'USDC / GMX (Camelot Alpha)', chainId: 42161, tokenA: TOKENS.USDC_ARB, tokenB: TOKENS.GMX_ARB, defaultLoanAmount: '10000', approxPriceUSD: 1, cexSymbol: 'GMXUSDT', assignedAgentId: 4 },
  { id: 'ARB-WETH-GRAIL-CAM',   name: 'WETH / GRAIL (Camelot Alpha)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.GRAIL_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, assignedAgentId: 4 },

  // 🔴 Agent 5: Optimism Swarm (10 Pares)
  { id: 'OP-WETH-USDC',  name: 'WETH / USDC (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.USDC_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },
  { id: 'OP-WETH-USDCE', name: 'WETH / USDC.e (Optimism Bridged)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.USDCE_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },
  { id: 'OP-WETH-USDT',  name: 'WETH / USDT (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.USDT_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },
  { id: 'OP-WETH-DAI',   name: 'WETH / DAI (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.DAI_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 5 },
  { id: 'OP-WETH-OP',    name: 'WETH / OP (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.OP_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'OPUSDT', assignedAgentId: 5 },
  { id: 'OP-USDC-OP',    name: 'USDC / OP (Optimism)', chainId: 10, tokenA: TOKENS.USDC_OP, tokenB: TOKENS.OP_OP, defaultLoanAmount: '5000', approxPriceUSD: 1, cexSymbol: 'OPUSDT', assignedAgentId: 5 },
  { id: 'OP-WETH-SNX',   name: 'WETH / SNX (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.SNX_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, assignedAgentId: 5 },
  { id: 'OP-WETH-VELO',  name: 'WETH / VELO (Velodrome)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.VELO_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, assignedAgentId: 5 },
  { id: 'OP-WETH-LINK',  name: 'WETH / LINK (Optimism)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.LINK_OP, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'LINKUSDT', assignedAgentId: 5 },
  { id: 'OP-WBTC-WETH',  name: 'WBTC / WETH (Optimism)', chainId: 10, tokenA: TOKENS.WBTC_OP, tokenB: TOKENS.WETH_OP, defaultLoanAmount: '0.1', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 5 },

  // 🟡 Agent 6: Base Aerodrome High-Liquidity Swarm (14 Pares)
  { id: 'BASE-WETH-USDC',        name: 'WETH / USDC (Base Aerodrome)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 6 },
  { id: 'BASE-WETH-USDBC',       name: 'WETH / USDbC (Base Bridged)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.USDBC_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 6 },
  { id: 'BASE-WETH-USDT',        name: 'WETH / USDT (Base)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.USDT_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 6 },
  { id: 'BASE-WETH-DAI',         name: 'WETH / DAI (Base)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.DAI_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 6 },
  { id: 'BASE-WETH-AERO',        name: 'WETH / AERO (Base Aerodrome)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.AERO_BASE, defaultLoanAmount: '3', approxPriceUSD: 3000, assignedAgentId: 6 },
  { id: 'BASE-USDC-AERO',        name: 'USDC / AERO (Base)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.AERO_BASE, defaultLoanAmount: '5000', approxPriceUSD: 1, assignedAgentId: 6 },
  { id: 'BASE-CBBTC-WETH',       name: 'cbBTC / WETH (Coinbase Base)', chainId: 8453, tokenA: TOKENS.CBBTC_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 6 },
  { id: 'BASE-CBBTC-USDC',       name: 'cbBTC / USDC (Base)', chainId: 8453, tokenA: TOKENS.CBBTC_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 6 },
  { id: 'BASE-WBTC-WETH',        name: 'WBTC / WETH (Base)', chainId: 8453, tokenA: TOKENS.WBTC_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '0.2', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 6 },
  { id: 'BASE-USDC-USDBC',       name: 'USDC / USDbC (Base Stable Peg)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.USDBC_BASE, defaultLoanAmount: '2000', approxPriceUSD: 1, assignedAgentId: 6 },
  { id: 'BASE-CBBTC-USDC-AERO',  name: 'cbBTC / USDC (Aerodrome Slipstream)', chainId: 8453, tokenA: TOKENS.CBBTC_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '0.5', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 6 },
  { id: 'BASE-CBBTC-WETH-AERO',  name: 'cbBTC / WETH (Aerodrome Slipstream)', chainId: 8453, tokenA: TOKENS.CBBTC_BASE, tokenB: TOKENS.WETH_BASE, defaultLoanAmount: '0.5', approxPriceUSD: 65000, cexSymbol: 'BTCUSDT', assignedAgentId: 6 },
  { id: 'BASE-WETH-AERO-AERO',   name: 'WETH / AERO (Aerodrome Slipstream)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.AERO_BASE, defaultLoanAmount: '5', approxPriceUSD: 3000, assignedAgentId: 6 },
  { id: 'BASE-USDC-AERO-AERO',   name: 'USDC / AERO (Aerodrome Slipstream)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.AERO_BASE, defaultLoanAmount: '10000', approxPriceUSD: 1, assignedAgentId: 6 },

  // 🟢 Agent 7: Base Meme & AI Volatility Tokens (17 Pares)
  { id: 'BASE-WETH-BRETT',        name: 'WETH / BRETT (Base Meme)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.BRETT_BASE, defaultLoanAmount: '2', approxPriceUSD: 3000, assignedAgentId: 7 },
  { id: 'BASE-USDC-BRETT',        name: 'USDC / BRETT (Base)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.BRETT_BASE, defaultLoanAmount: '3000', approxPriceUSD: 1, assignedAgentId: 7 },
  { id: 'BASE-WETH-DEGEN',        name: 'WETH / DEGEN (Base Meme)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.DEGEN_BASE, defaultLoanAmount: '2', approxPriceUSD: 3000, assignedAgentId: 7 },
  { id: 'BASE-USDC-DEGEN',        name: 'USDC / DEGEN (Base)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.DEGEN_BASE, defaultLoanAmount: '3000', approxPriceUSD: 1, assignedAgentId: 7 },
  { id: 'BASE-WETH-VIRTUAL',      name: 'WETH / VIRTUAL (Base AI)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.VIRTUAL_BASE, defaultLoanAmount: '2', approxPriceUSD: 3000, assignedAgentId: 7 },
  { id: 'BASE-USDC-VIRTUAL',      name: 'USDC / VIRTUAL (Base AI)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.VIRTUAL_BASE, defaultLoanAmount: '3000', approxPriceUSD: 1, assignedAgentId: 7 },
  { id: 'BASE-WETH-TOSHI',        name: 'WETH / TOSHI (Base Meme)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.TOSHI_BASE, defaultLoanAmount: '2', approxPriceUSD: 3000, assignedAgentId: 7 },
  { id: 'BASE-WETH-HIGHER',       name: 'WETH / HIGHER (Base)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.HIGHER_BASE, defaultLoanAmount: '2', approxPriceUSD: 3000, assignedAgentId: 7 },
  { id: 'BASE-WETH-CLANKER',      name: 'WETH / CLANKER (Base AI)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.CLANKER_BASE, defaultLoanAmount: '2', approxPriceUSD: 3000, assignedAgentId: 7 },
  { id: 'BASE-WETH-MIGGLES',      name: 'WETH / MIGGLES (Base)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.MIGGLES_BASE, defaultLoanAmount: '2', approxPriceUSD: 3000, assignedAgentId: 7 },
  { id: 'BASE-WETH-DEGEN-AERO',   name: 'WETH / DEGEN (Aerodrome Alpha)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.DEGEN_BASE, defaultLoanAmount: '4', approxPriceUSD: 3000, assignedAgentId: 7 },
  { id: 'BASE-USDC-DEGEN-AERO',   name: 'USDC / DEGEN (Aerodrome Alpha)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.DEGEN_BASE, defaultLoanAmount: '8000', approxPriceUSD: 1, assignedAgentId: 7 },
  { id: 'BASE-WETH-BRETT-AERO',   name: 'WETH / BRETT (Aerodrome Alpha)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.BRETT_BASE, defaultLoanAmount: '4', approxPriceUSD: 3000, assignedAgentId: 7 },
  { id: 'BASE-USDC-BRETT-AERO',   name: 'USDC / BRETT (Aerodrome Alpha)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.BRETT_BASE, defaultLoanAmount: '8000', approxPriceUSD: 1, assignedAgentId: 7 },
  { id: 'BASE-WETH-VIRTUAL-AERO', name: 'WETH / VIRTUAL (Aerodrome Alpha)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.VIRTUAL_BASE, defaultLoanAmount: '4', approxPriceUSD: 3000, assignedAgentId: 7 },
  { id: 'BASE-USDC-VIRTUAL-AERO', name: 'USDC / VIRTUAL (Aerodrome Alpha)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.VIRTUAL_BASE, defaultLoanAmount: '8000', approxPriceUSD: 1, assignedAgentId: 7 },
  { id: 'BASE-WETH-TOSHI-AERO',   name: 'WETH / TOSHI (Aerodrome Alpha)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.TOSHI_BASE, defaultLoanAmount: '4', approxPriceUSD: 3000, assignedAgentId: 7 },

  // 🩷 Agent 8: Liquid Staking & Restaking Arbitrage (10 Pares)
  { id: 'ETH-WETH-STETH',   name: 'WETH / stETH (Lido Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.STETH_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ETH-WETH-WSTETH',  name: 'WETH / wstETH (Lido Mainnet)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.WSTETH_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ETH-WETH-RETH',    name: 'WETH / rETH (RocketPool)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.RETH_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ETH-WETH-EZETH',   name: 'WETH / ezETH (Renzo Restaking)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.EZETH_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ETH-WETH-WEETH',   name: 'WETH / weETH (Ether.fi Restaking)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.WEETH_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ETH-WETH-RSETH',   name: 'WETH / rsETH (Kelp Restaking)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.RSETH_ETH, defaultLoanAmount: '10', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ARB-WETH-WSTETH',  name: 'WETH / wstETH (Arbitrum LST)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.WSTETH_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'ARB-WETH-WEETH',   name: 'WETH / weETH (Arbitrum LRT)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.WEETH_ARB, defaultLoanAmount: '5', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'BASE-WETH-WSTETH', name: 'WETH / wstETH (Base LST)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.WSTETH_BASE, defaultLoanAmount: '5', approxPriceUSD: 3000, assignedAgentId: 8 },
  { id: 'BASE-WETH-WEETH',  name: 'WETH / weETH (Base LRT)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.WEETH_BASE, defaultLoanAmount: '5', approxPriceUSD: 3000, assignedAgentId: 8 },

  // 🧡 Agent 9: Cross-L2 High Volume Spreads (8 Pares)
  { id: 'ETH-WETH-USDC-CEX',  name: 'WETH / USDC (CEX Spread ETH)', chainId: 1, tokenA: TOKENS.WETH_ETH, tokenB: TOKENS.USDC_ETH, defaultLoanAmount: '15', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 9 },
  { id: 'ARB-WETH-USDC-CEX',  name: 'WETH / USDC (CEX Spread ARB)', chainId: 42161, tokenA: TOKENS.WETH_ARB, tokenB: TOKENS.USDC_ARB, defaultLoanAmount: '10', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 9 },
  { id: 'BASE-WETH-USDC-CEX', name: 'WETH / USDC (CEX Spread BASE)', chainId: 8453, tokenA: TOKENS.WETH_BASE, tokenB: TOKENS.USDC_BASE, defaultLoanAmount: '8', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 9 },
  { id: 'OP-WETH-USDC-CEX',   name: 'WETH / USDC (CEX Spread OP)', chainId: 10, tokenA: TOKENS.WETH_OP, tokenB: TOKENS.USDC_OP, defaultLoanAmount: '8', approxPriceUSD: 3000, cexSymbol: 'ETHUSDT', assignedAgentId: 9 },
  { id: 'ARB-USDT-ARB-CEX',   name: 'USDT / ARB (CEX Spread ARB)', chainId: 42161, tokenA: TOKENS.USDT_ARB, tokenB: TOKENS.ARB_ARB, defaultLoanAmount: '5000', approxPriceUSD: 1, cexSymbol: 'ARBUSDT', assignedAgentId: 9 },
  { id: 'OP-USDT-OP-CEX',     name: 'USDT / OP (CEX Spread OP)', chainId: 10, tokenA: TOKENS.USDT_OP, tokenB: TOKENS.OP_OP, defaultLoanAmount: '5000', approxPriceUSD: 1, cexSymbol: 'OPUSDT', assignedAgentId: 9 },
  { id: 'BASE-USDC-AERO-CEX', name: 'USDC / AERO (CEX Spread BASE)', chainId: 8453, tokenA: TOKENS.USDC_BASE, tokenB: TOKENS.AERO_BASE, defaultLoanAmount: '5000', approxPriceUSD: 1, assignedAgentId: 9 },
  { id: 'ETH-USDT-LINK-CEX',  name: 'USDT / LINK (CEX Spread ETH)', chainId: 1, tokenA: TOKENS.USDT_ETH, tokenB: TOKENS.LINK_ETH, defaultLoanAmount: '5000', approxPriceUSD: 1, cexSymbol: 'LINKUSDT', assignedAgentId: 9 },

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
