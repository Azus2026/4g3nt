import { NHopCyclePath } from './nhopGraphScanner';
import { TOKENS } from '../config/registry';

export const NHOP_CYCLES: NHopCyclePath[] = [
  // 🔵 Base 4-Hop AI & SocialFi Cycles
  {
    id: 'BASE-4HOP-AI-CORE',
    chainId: 8453,
    tokens: [TOKENS.USDC_BASE, TOKENS.WETH_BASE, TOKENS.VIRTUAL_BASE, TOKENS.DEGEN_BASE],
    protocols: ['aerodrome-slipstream', 'uniswap-v3', 'aerodrome-slipstream', 'uniswap-v3'],
    approxLoanUSD: 5000,
    expectedGrossMargin: 0.004
  },
  {
    id: 'BASE-4HOP-MEME-CBBTC',
    chainId: 8453,
    tokens: [TOKENS.USDC_BASE, TOKENS.CBBTC_BASE, TOKENS.WETH_BASE, TOKENS.BRETT_BASE],
    protocols: ['aerodrome-slipstream', 'uniswap-v3', 'uniswap-v3', 'aerodrome-slipstream'],
    approxLoanUSD: 8000,
    expectedGrossMargin: 0.005
  },
  {
    id: 'BASE-5HOP-OMEGA-DEFI',
    chainId: 8453,
    tokens: [TOKENS.USDC_BASE, TOKENS.WETH_BASE, TOKENS.AERO_BASE, TOKENS.VIRTUAL_BASE, TOKENS.USDBC_BASE],
    protocols: ['aerodrome-slipstream', 'aerodrome-slipstream', 'uniswap-v3', 'uniswap-v3', 'aerodrome-slipstream'],
    approxLoanUSD: 10000,
    expectedGrossMargin: 0.006
  },

  // 🔷 Arbitrum 4-Hop & 5-Hop Cycles
  {
    id: 'ARB-4HOP-DEFI-GRAIL',
    chainId: 42161,
    tokens: [TOKENS.USDC_ARB, TOKENS.WETH_ARB, TOKENS.PENDLE_ARB, TOKENS.GRAIL_ARB],
    protocols: ['camelot-v3', 'uniswap-v3', 'camelot-v3', 'uniswap-v3'],
    approxLoanUSD: 6000,
    expectedGrossMargin: 0.0045
  },
  {
    id: 'ARB-5HOP-BLUECHIP-GMX',
    chainId: 42161,
    tokens: [TOKENS.USDC_ARB, TOKENS.WBTC_ARB, TOKENS.WETH_ARB, TOKENS.GMX_ARB, TOKENS.ARB_ARB],
    protocols: ['camelot-v3', 'uniswap-v3', 'camelot-v3', 'uniswap-v3', 'camelot-v3'],
    approxLoanUSD: 12000,
    expectedGrossMargin: 0.0055
  },

  // 🟢 Ethereum 4-Hop Stable & Restaking Cycles
  {
    id: 'ETH-4HOP-STABLE-DEPEG',
    chainId: 1,
    tokens: [TOKENS.USDC_ETH, TOKENS.USDE_ETH, TOKENS.CRVUSD_ETH, TOKENS.DAI_ETH],
    protocols: ['curve-v2', 'balancer-v2', 'curve-v2', 'uniswap-v3'],
    approxLoanUSD: 250000,
    expectedGrossMargin: 0.0018
  },
  {
    id: 'ETH-5HOP-LST-MEGA',
    chainId: 1,
    tokens: [TOKENS.WETH_ETH, TOKENS.WSTETH_ETH, TOKENS.EZETH_ETH, TOKENS.WEETH_ETH, TOKENS.RETH_ETH],
    protocols: ['curve-v2', 'uniswap-v3', 'curve-v2', 'balancer-v2', 'uniswap-v3'],
    approxLoanUSD: 50000,
    expectedGrossMargin: 0.0025
  },

  // 🔴 Optimism 4-Hop Velodrome & Synthetix
  {
    id: 'OP-4HOP-VELO-SNX',
    chainId: 10,
    tokens: [TOKENS.USDC_OP, TOKENS.WETH_OP, TOKENS.OP_OP, TOKENS.VELO_OP],
    protocols: ['velodrome-slipstream', 'uniswap-v3', 'velodrome-slipstream', 'uniswap-v3'],
    approxLoanUSD: 4000,
    expectedGrossMargin: 0.004
  }
];
