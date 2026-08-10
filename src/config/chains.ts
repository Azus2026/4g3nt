export interface ChainConfig {
  chainId: number;
  name: string;
  symbol: string;
  nativeToken: string;
  defaultRpcUrls: string[];
  wssUrl: string;
  blockExplorer: string;
  flashLoanProviders: string[];
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    nativeToken: 'ETH',
    defaultRpcUrls: [
      process.env.ETH_RPC_URL || 'https://cloudflare-eth.com',
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
    ],
    wssUrl: process.env.ETH_WSS_URL || 'wss://ethereum-rpc.publicnode.com',
    blockExplorer: 'https://etherscan.io',
    flashLoanProviders: ['balancerv2', 'aavev3', 'uniswapv3'],
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    symbol: 'ARB',
    nativeToken: 'ETH',
    defaultRpcUrls: [
      process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum',
    ],
    wssUrl: 'wss://arbitrum-one-rpc.publicnode.com',
    blockExplorer: 'https://arbiscan.io',
    flashLoanProviders: ['balancerv2', 'aavev3'],
  },
  10: {
    chainId: 10,
    name: 'Optimism Mainnet',
    symbol: 'OP',
    nativeToken: 'ETH',
    defaultRpcUrls: [
      process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
    ],
    wssUrl: 'wss://optimism-rpc.publicnode.com',
    blockExplorer: 'https://optimistic.etherscan.io',
    flashLoanProviders: ['aavev3'],
  },
  137: {
    chainId: 137,
    name: 'Polygon PoS',
    symbol: 'POL',
    nativeToken: 'POL',
    defaultRpcUrls: [
      process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      'https://polygon.llamarpc.com',
      'https://rpc.ankr.com/polygon',
    ],
    wssUrl: 'wss://polygon-bor-rpc.publicnode.com',
    blockExplorer: 'https://polygonscan.com',
    flashLoanProviders: ['balancerv2', 'aavev3'],
  },
  8453: {
    chainId: 8453,
    name: 'Base Mainnet',
    symbol: 'BASE',
    nativeToken: 'ETH',
    defaultRpcUrls: [
      process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      'https://base.llamarpc.com',
      'https://rpc.ankr.com/base',
    ],
    wssUrl: 'wss://base-rpc.publicnode.com',
    blockExplorer: 'https://basescan.org',
    flashLoanProviders: ['aavev3'],
  },
  56: {
    chainId: 56,
    name: 'BNB Smart Chain',
    symbol: 'BSC',
    nativeToken: 'BNB',
    defaultRpcUrls: [
      process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      'https://bsc.llamarpc.com',
      'https://rpc.ankr.com/bsc',
    ],
    wssUrl: 'wss://bsc-rpc.publicnode.com',
    blockExplorer: 'https://bscscan.com',
    flashLoanProviders: ['pancakeswapv3'],
  },
  43114: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    symbol: 'AVAX',
    nativeToken: 'AVAX',
    defaultRpcUrls: [
      process.env.AVAX_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.llamarpc.com',
    ],
    wssUrl: 'wss://avalanche-c-chain-rpc.publicnode.com',
    blockExplorer: 'https://snowtrace.io',
    flashLoanProviders: ['aavev3'],
  },
};
