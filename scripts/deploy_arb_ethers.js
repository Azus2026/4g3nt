const { ethers } = require('ethers');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const rpcs = [
  'https://arbitrum-one.publicnode.com',
  'https://1rpc.io/arb',
  'https://arb-mainnet.g.alchemy.com/v2/demo',
  'https://arb1.arbitrum.io/rpc'
];

async function deploy() {
  console.log('🚀 Desplegando ArbitrumUniversalArbitrage con Ethers directo...');
  
  let provider = null;
  for (const url of rpcs) {
    try {
      const p = new ethers.JsonRpcProvider(url, 42161, { staticNetwork: true });
      await p.getBlockNumber();
      provider = p;
      console.log('✅ Conectado a Arbitrum RPC:', url);
      break;
    } catch (e) {
      console.log('❌ Falló RPC:', url, e.message);
    }
  }

  if (!provider) throw new Error('No se pudo conectar a ningún RPC de Arbitrum.');

  const privKey = process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : ('0x' + process.env.PRIVATE_KEY);
  const wallet = new ethers.Wallet(privKey, provider);
  console.log('Deployer Wallet:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log('Saldo ETH en Arbitrum:', ethers.formatEther(balance), 'ETH');

  const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ArbitrumUniversalArbitrage.sol/ArbitrumUniversalArbitrage.json'));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  const feeData = await provider.getFeeData();
  console.log('Gas Price:', ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'), 'gwei');

  console.log('Enviando transacción de despliegue a Arbitrum One...');
  const contract = await factory.deploy({
    maxFeePerGas: (feeData.maxFeePerGas || feeData.gasPrice || 20000000n) * 110n / 100n,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 0n
  });

  console.log('Tx Hash de despliegue:', contract.deploymentTransaction().hash);
  console.log('Esperando confirmación en Arbitrum...');
  await contract.waitForDeployment();

  const contractAddr = await contract.getAddress();
  console.log('\n🎉 ¡CONTRATO DESPLEGADO EXITOSAMENTE EN ARBITRUM ONE!');
  console.log('📍 Dirección:', contractAddr);
  console.log('🔗 Arbiscan: https://arbiscan.io/address/' + contractAddr);

  let envContent = fs.readFileSync('.env', 'utf8');
  if (!envContent.includes('ARBITRAGE_CONTRACT_ARBITRUM=')) {
    envContent += `\nARBITRAGE_CONTRACT_ARBITRUM=${contractAddr}\n`;
    fs.writeFileSync('.env', envContent);
    console.log('✅ Dirección guardada en .env como ARBITRAGE_CONTRACT_ARBITRUM');
  }
}

deploy().catch(console.error);
