export interface ChainConfig {
  chainId: number;
  name: string;
  symbol: string;
  nativeToken: string;
  defaultRpcUrls: string[];
  premiumRpcUrl: string;
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
      'https://cloudflare-eth.com',
      'https://eth.llamarpc.com',
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
    ],
    premiumRpcUrl: process.env.ETH_RPC_URL || 'https://cloudflare-eth.com',
    wssUrl: 'wss://ethereum-rpc.publicnode.com',
    blockExplorer: 'https://etherscan.io',
    flashLoanProviders: ['balancerv2', 'aavev3', 'uniswapv3'],
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    symbol: 'ARB',
    nativeToken: 'ETH',
    defaultRpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum-one-rpc.publicnode.com',
      'https://arbitrum.drpc.org',
    ],
    premiumRpcUrl: 'https://arb1.arbitrum.io/rpc',
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
      'https://mainnet.optimism.io',
      'https://optimism-rpc.publicnode.com',
      'https://optimism.drpc.org',
    ],
    premiumRpcUrl: 'https://mainnet.optimism.io',
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
      'https://base-rpc.publicnode.com',
      'https://base.gateway.tenderly.co',
      'https://base.meowrpc.com',
      'https://base.drpc.org',
    ],
    premiumRpcUrl: 'https://base-rpc.publicnode.com',
    wssUrl: 'wss://base-rpc.publicnode.com',
    blockExplorer: 'https://basescan.org',
    flashLoanProviders: ['balancerv2', 'aavev3'],
  },
  56: {
    chainId: 56,
    name: 'BNB Smart Chain',
    symbol: 'BSC',
    nativeToken: 'BNB',
    defaultRpcUrls: [
      'https://bsc-dataseed.binance.org',
      'https://bsc.drpc.org',
      'https://binance.llamarpc.com',
    ],
    premiumRpcUrl: 'https://bsc-dataseed.binance.org',
    wssUrl: 'wss://bsc-rpc.publicnode.com',
    blockExplorer: 'https://bscscan.com',
    flashLoanProviders: ['pancakeswapv3'],
  },
  137: {
    chainId: 137,
    name: 'Polygon PoS',
    symbol: 'POL',
    nativeToken: 'POL',
    defaultRpcUrls: [
      'https://polygon-bor-rpc.publicnode.com',
      'https://polygon.drpc.org',
      'https://polygon-rpc.com',
    ],
    premiumRpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    wssUrl: 'wss://polygon-bor-rpc.publicnode.com',
    blockExplorer: 'https://polygonscan.com',
    flashLoanProviders: ['aavev3', 'balancerv2'],
  },
  43114: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    symbol: 'AVAX',
    nativeToken: 'AVAX',
    defaultRpcUrls: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.llamarpc.com',
      'https://avalanche-c-chain-rpc.publicnode.com',
    ],
    premiumRpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    wssUrl: 'wss://avalanche-c-chain-rpc.publicnode.com',
    blockExplorer: 'https://snowtrace.io',
    flashLoanProviders: ['aavev3'],
  },
  81457: {
    chainId: 81457,
    name: 'Blast Mainnet',
    symbol: 'BLAST',
    nativeToken: 'ETH',
    defaultRpcUrls: [
      'https://rpc.blast.io',
      'https://blast.blockpi.network/v1/rpc/public',
    ],
    premiumRpcUrl: process.env.BLAST_RPC_URL || 'https://rpc.blast.io',
    wssUrl: 'wss://blast-rpc.publicnode.com',
    blockExplorer: 'https://blastscan.io',
    flashLoanProviders: ['thruster'],
  },
  59144: {
    chainId: 59144,
    name: 'Linea Mainnet',
    symbol: 'LINEA',
    nativeToken: 'ETH',
    defaultRpcUrls: [
      'https://rpc.linea.build',
      'https://linea.blockpi.network/v1/rpc/public',
    ],
    premiumRpcUrl: process.env.LINEA_RPC_URL || 'https://rpc.linea.build',
    wssUrl: 'wss://linea-rpc.publicnode.com',
    blockExplorer: 'https://lineascan.build',
    flashLoanProviders: ['lynex'],
  },
  534352: {
    chainId: 534352,
    name: 'Scroll Mainnet',
    symbol: 'SCROLL',
    nativeToken: 'ETH',
    defaultRpcUrls: [
      'https://rpc.scroll.io',
      'https://scroll.blockpi.network/v1/rpc/public',
    ],
    premiumRpcUrl: process.env.SCROLL_RPC_URL || 'https://rpc.scroll.io',
    wssUrl: 'wss://scroll-rpc.publicnode.com',
    blockExplorer: 'https://scrollscan.com',
    flashLoanProviders: ['aavev3'],
  },
};
