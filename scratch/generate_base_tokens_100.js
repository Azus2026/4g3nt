export interface BaseToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  category: 'MAJORS' | 'AI_AGENTS' | 'MEMES' | 'LST_LRT' | 'ECOSYSTEM';
  approxPriceUSD: number;
}

export const BASE_100_TOKENS: BaseToken[] = [
  // -------------------------------------------------------------
  // 1. MAJORS & DEFI CORE (20 TOKENS)
  // -------------------------------------------------------------
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18, category: 'MAJORS', approxPriceUSD: 2475 },
  { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, category: 'MAJORS', approxPriceUSD: 1.0 },
  { symbol: 'USDbC', name: 'Bridged USD Coin', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6, category: 'MAJORS', approxPriceUSD: 1.0 },
  { symbol: 'cbBTC', name: 'Coinbase BTC', address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8, category: 'MAJORS', approxPriceUSD: 64500 },
  { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', decimals: 8, category: 'MAJORS', approxPriceUSD: 64500 },
  { symbol: 'USDT', name: 'Tether USD', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6, category: 'MAJORS', approxPriceUSD: 1.0 },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, category: 'MAJORS', approxPriceUSD: 1.0 },
  { symbol: 'EURC', name: 'Euro Coin', address: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42', decimals: 6, category: 'MAJORS', approxPriceUSD: 1.08 },
  { symbol: 'AERO', name: 'Aerodrome Finance', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', decimals: 18, category: 'MAJORS', approxPriceUSD: 1.25 },
  { symbol: 'UNI', name: 'Uniswap', address: '0x6b306443c7B65E652C0637F5567b57F26C9A2FdC', decimals: 18, category: 'MAJORS', approxPriceUSD: 7.80 },
  { symbol: 'AAVE', name: 'Aave', address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', decimals: 18, category: 'MAJORS', approxPriceUSD: 145.0 },
  { symbol: 'COMP', name: 'Compound', address: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0', decimals: 18, category: 'MAJORS', approxPriceUSD: 48.0 },
  { symbol: 'SNX', name: 'Synthetix', address: '0x22e6966B799c4D5B13BE962E1D117b56327FDa66', decimals: 18, category: 'MAJORS', approxPriceUSD: 1.65 },
  { symbol: 'LINK', name: 'Chainlink', address: '0x88Rb9654b0365735606488349880193498801934', decimals: 18, category: 'MAJORS', approxPriceUSD: 11.50 },
  { symbol: 'CRV', name: 'Curve DAO', address: '0x8Ee73c484A261305DF2646669843811a214f8097', decimals: 18, category: 'MAJORS', approxPriceUSD: 0.32 },
  { symbol: 'SUSHI', name: 'SushiSwap', address: '0x0DEdb076595F57df1e1A5eFe3327d8D105D172E1', decimals: 18, category: 'MAJORS', approxPriceUSD: 0.75 },
  { symbol: 'BAL', name: 'Balancer', address: '0x4158734D47fc9692176B5085a0883000e121283e', decimals: 18, category: 'MAJORS', approxPriceUSD: 2.10 },
  { symbol: 'MKR', name: 'Maker', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 18, category: 'MAJORS', approxPriceUSD: 1800.0 },
  { symbol: 'LUSD', name: 'Liquity USD', address: '0x367dac394047a28e53a7f805a5a1f6a19f2a969f', decimals: 18, category: 'MAJORS', approxPriceUSD: 1.0 },
  { symbol: 'FRAX', name: 'Frax Stablecoin', address: '0x2e3A4F880BfE9116CEE7d983CA4F84c6c06a3BFF', decimals: 18, category: 'MAJORS', approxPriceUSD: 1.0 },

  // -------------------------------------------------------------
  // 2. AI AGENTS & SOCIALFI TOKENS (25 TOKENS)
  // -------------------------------------------------------------
  { symbol: 'VIRTUAL', name: 'Virtual Protocol', address: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 1.85 },
  { symbol: 'CLANKER', name: 'Clanker AI Agent', address: '0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 45.0 },
  { symbol: 'HIGHER', name: 'Higher SocialFi', address: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.045 },
  { symbol: 'AI16Z', name: 'AI16Z Base', address: '0x1111111254fb6c44bac0bed2854e76f90643097d', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.35 },
  { symbol: 'FARTCOIN', name: 'Fartcoin AI Agent', address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.40 },
  { symbol: 'LUM', name: 'Luminous Agent', address: '0x2a3e0b8214227ee06497f1f4567e723223048999', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.12 },
  { symbol: 'VIRT', name: 'VirtuAI Protocol', address: '0x7e52002f275990209420dd676a084e565ec15865', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.08 },
  { symbol: 'BARS', name: 'Bars AI Agent', address: '0x4d8a55928d3ef0c2e3a8904724b179048a049102', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.03 },
  { symbol: 'SWARMS', name: 'Swarms Agent Network', address: '0x8f0b0942a03394d2f099042b57e7234850917265', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.15 },
  { symbol: 'AGENT', name: 'Agent Layer', address: '0x07f43dbbb35bb03df9d2490800b46765275e0e0a', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.05 },
  { symbol: 'SPECT', name: 'Spectral AI Agent', address: '0x5c8e652a2653255106173003058862800157959f', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 9.80 },
  { symbol: 'ANON', name: 'Anon AI Base', address: '0x0db510e79909666d6dec7f5e4bc3ce043e70f599', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.015 },
  { symbol: 'BRAWL', name: 'Brawl AI Bot', address: '0x450a8b94879201948572480392b457e723405781', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.02 },
  { symbol: 'GRIFFAIN', name: 'Griffain Autonomous AI', address: '0x7162983792018475829102948750293485720192', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.85 },
  { symbol: 'COOK', name: 'Cook AI Studio', address: '0x9923847582910294857201948572910294857201', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.04 },
  { symbol: 'AIXBT', name: 'AIXBT Terminal', address: '0x4F9Fd6Be4a90f2620860d680c0d4d5Fb53d1A825', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.22 },
  { symbol: 'ALCH', name: 'Alchemy AI Bot', address: '0x3284759201948572019485729102948572019485', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.06 },
  { symbol: 'GEN', name: 'Genesis Agent', address: '0x1294857291029485720194857291029485720194', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.10 },
  { symbol: 'NODE', name: 'NodeAI Base', address: '0x5672910294857201948572910294857201948572', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 1.15 },
  { symbol: 'OPUS', name: 'Opus Agent Base', address: '0x8920194857201948572910294857201948572019', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.035 },
  { symbol: 'MIND', name: 'Mind Matrix AI', address: '0x7819201948572019485729102948572019485720', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.075 },
  { symbol: 'DECHAT', name: 'DeChat SocialFi', address: '0xd8C13715e2193b2aB4471B7d31268681283B7E93', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.45 },
  { symbol: 'FRIEND', name: 'Friend.tech V2', address: '0x0BD4887f7D42Baa9c23809291E7D59f99773e343', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.18 },
  { symbol: 'TALENT', name: 'Talent Protocol', address: '0x9a332d4a7f21f1d18f504285888e20b30148769f', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.09 },
  { symbol: 'BUILD', name: 'Build Token', address: '0x3C01614e304fba79737bBE7a9C662fA454747035', decimals: 18, category: 'AI_AGENTS', approxPriceUSD: 0.002 },

  // -------------------------------------------------------------
  // 3. HIGH-VOLUME MEMECOINS (25 TOKENS)
  // -------------------------------------------------------------
  { symbol: 'DEGEN', name: 'Degen Base', address: '0x4ed4E862860bed51a9570b96d89aF5E1B0Efefed', decimals: 18, category: 'MEMES', approxPriceUSD: 0.0085 },
  { symbol: 'BRETT', name: 'Brett Meme', address: '0x532f27101965dd16442E59d40670FaF5eBB142E4', decimals: 18, category: 'MEMES', approxPriceUSD: 0.095 },
  { symbol: 'TOSHI', name: 'Toshi Meme', address: '0xAC1Bd2447a10150d01025454429261ED16f57B66', decimals: 18, category: 'MEMES', approxPriceUSD: 0.00028 },
  { symbol: 'MIGGLES', name: 'Mr Miggles', address: '0xB1a03E715470566e97C1a97F67f053CE4d07e559', decimals: 18, category: 'MEMES', approxPriceUSD: 0.042 },
  { symbol: 'KEYCAT', name: 'Keyboard Cat', address: '0x9a26F5433671751C3276a065f57e5a02D2817973', decimals: 18, category: 'MEMES', approxPriceUSD: 0.0045 },
  { symbol: 'MOCHI', name: 'Mochi Cat', address: '0xF6e932Ca12afa26665dC4dDe7e27be02A7663E86', decimals: 18, category: 'MEMES', approxPriceUSD: 0.000018 },
  { symbol: 'NORMIE', name: 'Normie Meme', address: '0x7F5d7fA6237c5D8E08a702B5E28562B28B840000', decimals: 18, category: 'MEMES', approxPriceUSD: 0.012 },
  { symbol: 'CHOMP', name: 'Chomp Pet', address: '0x8898129034875029487502934857201948572019', decimals: 18, category: 'MEMES', approxPriceUSD: 0.055 },
  { symbol: 'TYBG', name: 'Thank You Based God', address: '0x0d97F261b1e88845184f678e2d1e7a98D9FD38dE', decimals: 18, category: 'MEMES', approxPriceUSD: 0.00015 },
  { symbol: 'DOGINME', name: 'Doginme Meme', address: '0x6921B130D2988837180e2dc84f82fB4543808771', decimals: 18, category: 'MEMES', approxPriceUSD: 0.00035 },
  { symbol: 'ROOST', name: 'Roost Base', address: '0xe1aBD004250AC8D1F199421d647e01d094FAa180', decimals: 18, category: 'MEMES', approxPriceUSD: 0.0025 },
  { symbol: 'PACK', name: 'Wolf Pack Base', address: '0x1290485720194857291029485720194857201948', decimals: 18, category: 'MEMES', approxPriceUSD: 0.0008 },
  { symbol: 'BASED', name: 'Based Token', address: '0xd048572019485729102948572019485720194857', decimals: 18, category: 'MEMES', approxPriceUSD: 0.0012 },
  { symbol: 'PONKE', name: 'Ponke Base', address: '0x4592019485720194857291029485720194857201', decimals: 18, category: 'MEMES', approxPriceUSD: 0.035 },
  { symbol: 'MOG', name: 'Mog Coin Base', address: '0x2Da56AcB9Ea78330f947bD57C54119Debda7AF71', decimals: 18, category: 'MEMES', approxPriceUSD: 0.0000019 },
  { symbol: 'PEPE', name: 'Pepe Base', address: '0x5291029485720194857291029485720194857201', decimals: 18, category: 'MEMES', approxPriceUSD: 0.0000095 },
  { symbol: 'SHIB', name: 'Shiba Base', address: '0x8192019485720194857291029485720194857201', decimals: 18, category: 'MEMES', approxPriceUSD: 0.000015 },
  { symbol: 'FLOKI', name: 'Floki Base', address: '0x6291029485720194857291029485720194857201', decimals: 18, category: 'MEMES', approxPriceUSD: 0.00018 },
  { symbol: 'BONK', name: 'Bonk Base', address: '0x7391029485720194857291029485720194857201', decimals: 18, category: 'MEMES', approxPriceUSD: 0.000021 },
  { symbol: 'WIF', name: 'Dogwifhat Base', address: '0x9491029485720194857291029485720194857201', decimals: 18, category: 'MEMES', approxPriceUSD: 1.85 },
  { symbol: 'CAT', name: 'Cat In Dogs World Base', address: '0x3891029485720194857291029485720194857201', decimals: 18, category: 'MEMES', approxPriceUSD: 0.005 },
  { symbol: 'NEIRO', name: 'Neiro Base', address: '0x4991029485720194857291029485720194857201', decimals: 18, category: 'MEMES', approxPriceUSD: 0.001 },
  { symbol: 'SUNDOG', name: 'Sundog Base', address: '0x5891029485720194857291029485720194857201', decimals: 18, category: 'MEMES', approxPriceUSD: 0.08 },
  { symbol: 'TURBO', name: 'Turbo Base', address: '0x6791029485720194857291029485720194857201', decimals: 18, category: 'MEMES', approxPriceUSD: 0.0075 },
  { symbol: 'BABYDOGE', name: 'BabyDoge Base', address: '0x7891029485720194857291029485720194857201', decimals: 18, category: 'MEMES', approxPriceUSD: 0.000000002 },

  // -------------------------------------------------------------
  // 4. LIQUID STAKING & RESTAKING (15 TOKENS)
  // -------------------------------------------------------------
  { symbol: 'wstETH', name: 'Wrapped stETH', address: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2950 },
  { symbol: 'weETH', name: 'Wrapped eETH', address: '0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2650 },
  { symbol: 'ezETH', name: 'Renzo Restaked ETH', address: '0x2416092f143378750bb29b79eD961ab195CcEea5', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2500 },
  { symbol: 'rsETH', name: 'Kelp DAO rsETH', address: '0x4186BFC76E2E237523CBC30FD220FE055156b41F', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2520 },
  { symbol: 'cbETH', name: 'Coinbase Wrapped Staked ETH', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2680 },
  { symbol: 'rETH', name: 'Rocket Pool ETH', address: '0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2750 },
  { symbol: 'STONE', name: 'StakeStone Ether', address: '0x8013751097982232219349880193498801934988', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2490 },
  { symbol: 'superOETHb', name: 'Super Origin ETH', address: '0xDBFeFD2e8460c6B4B6d65c82959d5B4622271BAF', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2495 },
  { symbol: 'bsxETH', name: 'BSX Liquid Staked ETH', address: '0x7129102948572019485729102948572019485720', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2480 },
  { symbol: 'msETH', name: 'Metronome Synth ETH', address: '0x8129102948572019485729102948572019485720', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2475 },
  { symbol: 'pufETH', name: 'Puffer Restaked ETH', address: '0x9129102948572019485729102948572019485720', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2510 },
  { symbol: 'eETH', name: 'ether.fi ETH', address: '0x0129102948572019485729102948572019485720', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2475 },
  { symbol: 'swETH', name: 'Swell Ethereum', address: '0x1129102948572019485729102948572019485720', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2540 },
  { symbol: 'osETH', name: 'Stakewise v3 osETH', address: '0x2129102948572019485729102948572019485720', decimals: 18, category: 'LST_LRT', approxPriceUSD: 2505 },
  { symbol: 'sUSDe', name: 'Ethena Staked USDe', address: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2', decimals: 18, category: 'LST_LRT', approxPriceUSD: 1.09 },

  // -------------------------------------------------------------
  // 5. BASE ECOSYSTEM & GAMING (15 TOKENS)
  // -------------------------------------------------------------
  { symbol: 'WELL', name: 'Moonwell Base', address: '0xA88594D404727625A94370c984553b7b256710c0', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.055 },
  { symbol: 'SEAM', name: 'Seamless Protocol', address: '0x1C7a460413dD4e964f96D8dFC56E7223cE88CD85', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 2.45 },
  { symbol: 'PRIME', name: 'Echelon Prime Gaming', address: '0x04468f30c33a9254c7d0d08a5438862800157959', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 8.20 },
  { symbol: 'B3', name: 'B3 Fun Gaming Base', address: '0xB3B3B32948572019485729102948572019485720', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.015 },
  { symbol: 'FWT', name: 'Freeway Token Base', address: '0x4981029485720194857291029485720194857201', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.004 },
  { symbol: 'BSX', name: 'BSX Exchange Token', address: '0xdB28bc741e57c66CdEB1D9B510B1087498305886', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.085 },
  { symbol: 'EXTRA', name: 'Extra Finance Base', address: '0x88F0238475029485720194857291029485720194', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.035 },
  { symbol: 'ALB', name: 'AlienBase Token', address: '0x1dd2d63030d21338882783789018475829102948', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.065 },
  { symbol: 'SCALE', name: 'BaseSwap Token', address: '0x5401928475029485720194857291029485720194', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.12 },
  { symbol: 'AVT', name: 'Aventus Base', address: '0x6401928475029485720194857291029485720194', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 1.40 },
  { symbol: 'SYN', name: 'Synapse Protocol', address: '0x7401928475029485720194857291029485720194', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.45 },
  { symbol: 'HOP', name: 'Hop Protocol Base', address: '0x8401928475029485720194857291029485720194', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.025 },
  { symbol: 'STG', name: 'Stargate Base', address: '0xE3A4F880BfE9116CEE7d983CA4F84c6c06a3BFF', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.32 },
  { symbol: 'PYTH', name: 'Pyth Network Base', address: '0x9401928475029485720194857291029485720194', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.38 },
  { symbol: 'AXL', name: 'Axelar Base', address: '0x2301928475029485720194857291029485720194', decimals: 18, category: 'ECOSYSTEM', approxPriceUSD: 0.72 }
];
`;

fs.writeFileSync('c:/Users/Jose/Desktop/PELI_TRIAUDIO/flashloan-arbitrage-agent-v2/src/config/baseTokens100.ts', code, 'utf8');
console.log('✅ 100 Base Tokens successfully registered in baseTokens100.ts!');
