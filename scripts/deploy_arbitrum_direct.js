const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Iniciando despliegue de ArbitrumUniversalArbitrage en Arbitrum One...');
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log('Saldo en Arbitrum:', ethers.formatEther(bal), 'ETH');
  
  const factory = await ethers.getContractFactory('ArbitrumUniversalArbitrage');
  console.log('Desplegando contrato en Arbitrum...');
  const contract = await factory.deploy({
    gasLimit: 2500000
  });
  await contract.waitForDeployment();
  
  const addr = await contract.getAddress();
  console.log('✅ ¡Contrato Desplegado Exitosamente en Arbitrum One!');
  console.log('📍 Dirección:', addr);
  console.log('🔗 Arbiscan: https://arbiscan.io/address/' + addr);
}

main().catch(console.error);
