require('dotenv').config();
const { ethers } = require('ethers');

const walletAddress = '0x00Ae5b5dC1F52aF53B75edb4eB540DA0121D08aA';

const chains = [
  { name: 'Ethereum Mainnet', symbol: 'ETH', rpc: process.env.ETH_RPC_URL },
  { name: 'Arbitrum One', symbol: 'ETH', rpc: process.env.ARBITRUM_RPC_URL },
  { name: 'Optimism Mainnet', symbol: 'ETH', rpc: 'https://optimism.llamarpc.com' },
  { name: 'Polygon PoS', symbol: 'POL/MATIC', rpc: 'https://polygon.llamarpc.com' },
  { name: 'Base Mainnet', symbol: 'ETH', rpc: 'https://base.llamarpc.com' },
  { name: 'BNB Smart Chain', symbol: 'BNB', rpc: 'https://bsc.llamarpc.com' },
  { name: 'Avalanche C-Chain', symbol: 'AVAX', rpc: 'https://avalanche.llamarpc.com' },
];

async function checkBalances() {
  console.log(`Checking balances for wallet: ${walletAddress}\n`);
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(walletAddress);
      const ethVal = parseFloat(ethers.formatEther(balance));
      console.log(`- ${chain.name} (${chain.symbol}): ${ethVal.toFixed(6)} ${chain.symbol}`);
    } catch (err) {
      console.log(`- ${chain.name} (${chain.symbol}): Error checking balance (${err.message})`);
    }
  }
  process.exit(0);
}

checkBalances();
