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
    wssUrl: process.env.ARBITRUM_WSS_URL || 'wss://arbitrum-one-rpc.publicnode.com',
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
};
