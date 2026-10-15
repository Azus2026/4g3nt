const { ethers } = require('ethers');

const CONTRACT_ADDR = '0xdA593D75439364a864a92416430FFA1268724059';
const RPC_URL = 'https://developer-access-mainnet.base.org';

const ABI = [
  'function executeSpotSpatial((address tokenIn, address tokenIntermediate, uint8 dexBuy, uint8 dexSell, uint24 feeOrSpacingBuy, uint24 feeOrSpacingSell, uint256 minProfit) route, uint256 amountIn) external',
  'function executeSpotTriangular((address tokenA, address tokenB, address tokenC, uint8 dex1, uint8 dex2, uint8 dex3, uint24 feeOrSpacing1, uint24 feeOrSpacing2, uint24 feeOrSpacing3, uint256 minProfit) route, uint256 amountIn) external',
  'function owner() external view returns (address)'
];

const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

async function test() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, 8453, { staticNetwork: true });
  const contract = new ethers.Contract(CONTRACT_ADDR, ABI, provider);

  const owner = await contract.owner();
  console.log('Contract Address:', CONTRACT_ADDR);
  console.log('Contract Owner:', owner);

  // Test 1: 2-Leg Spatial (AeroV2 -> UniV3)
  console.log('\n--- Probando Simulación 2-Leg Spatial: AeroV2 (AMM) -> UniV3 (CL) ---');
  const route2Leg = {
    tokenIn: WETH,
    tokenIntermediate: USDC,
    dexBuy: 2, // AeroV2 volatile
    dexSell: 0, // UniV3
    feeOrSpacingBuy: 0,
    feeOrSpacingSell: 500,
    minProfit: 0n
  };

  try {
    const callerAddress = '0x00Ae5b5dC1F52aF53B75edb4eB540DA0121D08aA';
    await contract.executeSpotSpatial.staticCall(route2Leg, ethers.parseEther('0.014'), { from: callerAddress });
    console.log('🎉 RESULTADO: ¡2-Leg Spatial PASÓ la simulación (Es RENTABLE on-chain)!');
  } catch (err) {
    console.log('⚠️ Revert normal en simulación (Protección de Fondos Activa):', err.message.slice(0, 120));
  }
}

test().catch(console.error);
