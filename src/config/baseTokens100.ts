export interface BaseToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  category: 'MAJORS' | 'AI_AGENTS' | 'MEMES' | 'LST_LRT' | 'ECOSYSTEM';
  approxPriceUSD: number;
}

/**
 * Lista Curada de Tokens Hiperlíquidos y Verificados en Base Mainnet (ChainID 8453)
 * Todos los contratos poseen piscinas activas en Uniswap V3, Aerodrome y/o PancakeSwap V3.
 */
export const BASE_100_TOKENS: BaseToken[] = [
  // -------------------------------------------------------------
  // 1. MAJORS & DEFI CORE
  // -------------------------------------------------------------
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18, category: 'MAJORS', approxPriceUSD: 2500 },
  { symbol: 'USDC', name: 'USD Coin (Native)', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, category: 'MAJORS', approxPriceUSD: 1.0 },
  { symbol: 'USDbC', name: 'Bridged USD Coin', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6, category: 'MAJORS', approxPriceUSD: 1.0 },
  { symbol: 'cbBTC', name: 'Coinbase Wrapped BTC', address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8, category: 'MAJORS', approxPriceUSD: 64500 },
  { symbol: 'USDT', name: 'Tether USD', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6, category: 'MAJORS', approxPriceUSD: 1.0 },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, category: 'MAJORS', approxPriceUSD: 1.0 },
  { symbol: 'EURC', name: 'Euro Coin', address: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42', decimals: 6, category: 'MAJORS', approxPriceUSD: 1.08 },
  { symbol: 'AERO', name: 'Aerodrome Finance', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', decimals: 18, category: 'MAJORS', approxPriceUSD: 1.25 },
  { symbol: 'LINK', name: 'Chainlink Token', address: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196', decimals: 18, category: 'MAJORS', approxPriceUSD: 11.50 },
  { symbol: 'tBTC', name: 'Threshold BTC', address: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b', decimals: 18, category: 'MAJORS', approxPriceUSD: 64500 },
  { symbol: 'WELL', name: 'Moonwell Protocol', address: '0xA88594D404727625A9437C3f886C7643872296AE', decimals: 18, category: 'MAJORS', approxPriceUSD: 0.055 },

  // -------------------------------------------------------------
  // 2. LIQUID STAKING & RESTAKING TOKENS (LST / LRT)
  // -------------------------------------------------------------
  { symbol: 'wstETH', name: 'Wrapped Liquid Staked Ether', address: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2950 },
  { symbol: 'ezETH', name: 'Renzo Restaked ETH', address: '0x2416092f143378750bb29b79eD961ab195CcEea5', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2500 },
  { symbol: 'weETH', name: 'Wrapped EtherFi ETH', address: '0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2650 },
  { symbol: 'cbETH', name: 'Coinbase Staked ETH', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2680 },
  { symbol: 'rsETH', name: 'Kelp DAO Restaked ETH', address: '0x4186BFC76E2E237523CBC30FD220FE055156b41F', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2520 },

  // -------------------------------------------------------------
  // 3. AI AGENTS & SOCIALFI ECOSYSTEM
  // -------------------------------------------------------------
  { symbol: 'VIRTUAL', name: 'Virtual Protocol', address: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 1.85 },
  { symbol: 'CLANKER', name: 'Clanker AI Agent', address: '0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 45.0 },
  { symbol: 'HIGHER', name: 'Higher SocialFi', address: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.045 },
  { symbol: 'AIXBT', name: 'AIXBT Terminal', address: '0x4F9Fd6Be4a90f2620860d680c0d4d5Fb53d1A825', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.22 },

  // -------------------------------------------------------------
  // 4. HIGH-VOLUME MEMES
  // -------------------------------------------------------------
  { symbol: 'BRETT', name: 'Brett Meme', address: '0x532f27101965dd16442E59d40670FaF5eBB142E4', decimals: 18, category: 'MEMES', approxPriceUSD: 0.095 },
  { symbol: 'TOSHI', name: 'Toshi Meme', address: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4', decimals: 18, category: 'MEMES', approxPriceUSD: 0.00028 },
  { symbol: 'DEGEN', name: 'Degen Base', address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', decimals: 18, category: 'MEMES', approxPriceUSD: 0.0085 },
  { symbol: 'KEYCAT', name: 'Keyboard Cat', address: '0x9a26F5433671751C3276a065f57e5a02D2817973', decimals: 18, category: 'MEMES', approxPriceUSD: 0.0045 },
  { symbol: 'MOG', name: 'Mog Coin Base', address: '0x2Da56AcB9Ea78330f947BD57C54119Debda7AF71', decimals: 18, category: 'MEMES', approxPriceUSD: 0.0000019 },
  { symbol: 'MIGGLES', name: 'Mr Miggles', address: '0xB1a03E715470566e97C1a97F67f053CE4d07e559', decimals: 18, category: 'MEMES', approxPriceUSD: 0.042 },
  { symbol: 'TYBG', name: 'Thank You Based God', address: '0x0d97F261b1e88845184f678e2d1e7a98D9FD38dE', decimals: 18, category: 'MEMES', approxPriceUSD: 0.00015 },
];
