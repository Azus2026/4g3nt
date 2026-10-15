const { ethers } = require('ethers');
require('dotenv').config();

const ARBITRAGE_CONTRACT_BASE = process.env.ARBITRAGE_CONTRACT_BASE || '0xAD04bf95c85FF99aF80d885132B52A619C5F52BD';
const RPC_URL = 'https://developer-access-mainnet.base.org';

const iface = new ethers.Interface([
  'function executeSpotTriangular((address tokenA, address tokenB, address tokenC, uint8 dex1, uint8 dex2, uint8 dex3, uint24 feeOrSpacing1, uint24 feeOrSpacing2, uint24 feeOrSpacing3, uint256 minProfit) route, uint256 amountIn) external',
  'error NotOwner()',
  'error NotProfitable(uint256 received, uint256 required)',
  'error Reentrancy()',
  'error SwapFailed(uint8 leg)'
]);

const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CBBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';

async function testExactMath() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, 8453);
  const formattedKey = process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : ('0x' + process.env.PRIVATE_KEY);
  const wallet = new ethers.Wallet(formattedKey, provider);

  const tradeAmountIn = ethers.parseEther('0.014'); // 0.014 WETH ($35 USD)

  const routeStruct = {
    tokenA: WETH,
    tokenB: CBBTC,
    tokenC: USDC,
    dex1: 0, // UniV3
    dex2: 0, // UniV3
    dex3: 0, // UniV3
    feeOrSpacing1: 100, // 0.01%
    feeOrSpacing2: 500, // 0.05%
    feeOrSpacing3: 500, // 0.05%
    minProfit: 0n
  };

  const calldata = iface.encodeFunctionData('executeSpotTriangular', [routeStruct, tradeAmountIn]);

  try {
    const res = await provider.call({
      to: ARBITRAGE_CONTRACT_BASE,
      from: wallet.address,
      data: calldata
    });
    console.log('✅ Éxito! Res:', res);
  } catch (err) {
    if (err.data) {
      try {
        const decoded = iface.parseError(err.data);
        console.log('🔍 Error Decodificado On-Chain:', decoded.name, decoded.args);
        if (decoded.name === 'NotProfitable') {
          const received = decoded.args[0];
          const required = decoded.args[1];
          const receivedEth = ethers.formatEther(received);
          const requiredEth = ethers.formatEther(required);
          const lossWei = required - received;
          const lossEth = ethers.formatEther(lossWei);
          const lossUSD = parseFloat(lossEth) * 2475;
          console.log(`\n================ RESULTADO MATEMÁTICO REAL ================`);
          console.log(`Entrada ($35 USD):     ${requiredEth} WETH ($${(parseFloat(requiredEth) * 2475).toFixed(2)} USD)`);
          console.log(`Salida Real del Pool: ${receivedEth} WETH ($${(parseFloat(receivedEth) * 2475).toFixed(2)} USD)`);
          console.log(`Pérdida por Comisiones: -${lossEth} WETH (-$${lossUSD.toFixed(4)} USD)`);
          console.log(`Tasa de Retorno:       ${((parseFloat(receivedEth) / parseFloat(requiredEth)) * 100).toFixed(3)}%`);
          console.log(`============================================================`);
        }
      } catch (e) {
        console.log('Error al decodificar err.data:', e.message, err.data);
      }
    } else {
      console.log('Err sin data:', err.message);
    }
  }
}

testExactMath().catch(console.error);
