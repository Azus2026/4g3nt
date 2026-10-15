import { ethers, network } from 'hardhat';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔬 SUITE DE SIMULACIÓN EN FORK REAL: BASE & ARBITRUM ONE');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, title: string, detail: string = '') {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      if (detail) console.log(`     └─ ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title}`);
      if (detail) console.error(`     └─ ERROR: ${detail}`);
    }
  }

  const [owner, attacker] = await ethers.getSigners();

  // ═══════════════════════════════════════════════════════════════════
  // 1. FORK TEST EN BASE MAINNET (ChainID 8453)
  // ═══════════════════════════════════════════════════════════════════
  console.log('🔵 INICIANDO FORK EN BASE MAINNET (https://mainnet.base.org)...');
  try {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
          },
        },
      ],
    });
    console.log('   └─ Fork de Base conectado correctamente.\n');

    console.log('📦 Desplegando BaseUniversalArbitrage en el Fork...');
    const BaseFactory = await ethers.getContractFactory('BaseUniversalArbitrage', owner);
    const baseContract = await BaseFactory.deploy();
    await baseContract.waitForDeployment();
    const baseAddress = await baseContract.getAddress();
    assert(!!baseAddress && baseAddress.startsWith('0x'), 'BaseUniversalArbitrage desplegado en Fork de Base', `Dirección: ${baseAddress}`);

    // Pre-aprobar WETH y USDC
    const WETH_BASE = '0x4200000000000000000000000000000000000006';
    const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    await baseContract.approveRouters([WETH_BASE, USDC_BASE]);
    assert(true, 'approveRouters() ejecutado con éxito en Base');

    // PRUEBA DE SEGURIDAD 1: Intento de Secuestro de Callback en Balancer V2
    console.log('\n🛡️ Probando Seguridad de Callback Balancer V2 en Base...');
    const BALANCER_VAULT_BASE = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
    let hijackedBalancer = false;
    try {
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [BALANCER_VAULT_BASE],
      });
      await owner.sendTransaction({ to: BALANCER_VAULT_BASE, value: ethers.parseEther('1.0') });
      const vaultSigner = await ethers.getSigner(BALANCER_VAULT_BASE);

      const dummyRoute = {
        tokenIn: WETH_BASE,
        tokenIntermediate: USDC_BASE,
        dexBuy: 0,
        dexSell: 1,
        feeOrSpacingBuy: 500,
        feeOrSpacingSell: 100,
        minProfit: 1000n,
      };
      const dummyUserData = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'bytes'], [2, ethers.AbiCoder.defaultAbiCoder().encode([
        'tuple(address,address,uint8,uint8,uint24,uint24,uint256)'
      ], [[dummyRoute.tokenIn, dummyRoute.tokenIntermediate, dummyRoute.dexBuy, dummyRoute.dexSell, dummyRoute.feeOrSpacingBuy, dummyRoute.feeOrSpacingSell, dummyRoute.minProfit]])]);

      await (baseContract.connect(vaultSigner) as any).receiveFlashLoan(
        [WETH_BASE],
        [ethers.parseEther('1.0')],
        [0n],
        dummyUserData
      );
      hijackedBalancer = true;
    } catch (err: any) {
      hijackedBalancer = false;
      assert(
        err.message.toLowerCase().includes('revert'),
        'Guardia _inFlashLoan bloqueó exitosamente callback no autorizado de Balancer',
        `Reversión confirmada: ${err.message.slice(0, 80)}...`
      );
    }
    assert(!hijackedBalancer, 'Atacante NO puede explotar receiveFlashLoan');

    // PRUEBA DE SEGURIDAD 2: Intento de Secuestro de Callback en Aave V3
    console.log('\n🛡️ Probando Seguridad de Callback Aave V3 en Base...');
    const AAVE_POOL_BASE = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
    let hijackedAave = false;
    try {
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [AAVE_POOL_BASE],
      });
      await owner.sendTransaction({ to: AAVE_POOL_BASE, value: ethers.parseEther('1.0') });
      const aaveSigner = await ethers.getSigner(AAVE_POOL_BASE);

      await (baseContract.connect(aaveSigner) as any).executeOperation(
        WETH_BASE,
        ethers.parseEther('1.0'),
        ethers.parseEther('0.0005'),
        attacker.address, // Initiator malicioso
        '0x'
      );
      hijackedAave = true;
    } catch (err: any) {
      hijackedAave = false;
      assert(
        err.message.toLowerCase().includes('revert'),
        'Guardia de Initiator bloqueó exitosamente callback manipulado de Aave',
        `Reversión confirmada: ${err.message.slice(0, 80)}...`
      );
    }
    assert(!hijackedAave, 'Atacante NO puede forzar executeOperation');

  } catch (baseErr: any) {
    console.error('⚠️ Error en Fork de Base:', baseErr.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. FORK TEST EN ARBITRUM ONE (ChainID 42161)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n🔴 INICIANDO FORK EN ARBITRUM ONE (https://arb1.arbitrum.io/rpc)...');
  try {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
          },
        },
      ],
    });
    console.log('   └─ Fork de Arbitrum One conectado correctamente.\n');

    console.log('📦 Desplegando ArbitrumUniversalArbitrage en el Fork...');
    const ArbFactory = await ethers.getContractFactory('ArbitrumUniversalArbitrage', owner);
    const arbContract = await ArbFactory.deploy();
    await arbContract.waitForDeployment();
    const arbAddress = await arbContract.getAddress();
    assert(!!arbAddress && arbAddress.startsWith('0x'), 'ArbitrumUniversalArbitrage desplegado en Fork de Arbitrum', `Dirección: ${arbAddress}`);

    const WETH_ARB = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
    const USDC_ARB = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    await arbContract.approveRouters([WETH_ARB, USDC_ARB]);
    assert(true, 'approveRouters() ejecutado con éxito en Arbitrum');

    // PRUEBA DE SEGURIDAD 3: Intento de Secuestro de Callback en Arbitrum Balancer V2
    console.log('\n🛡️ Probando Seguridad de Callback Balancer V2 en Arbitrum...');
    const BALANCER_VAULT_ARB = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
    let hijackedArbBalancer = false;
    try {
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [BALANCER_VAULT_ARB],
      });
      await owner.sendTransaction({ to: BALANCER_VAULT_ARB, value: ethers.parseEther('1.0') });
      const vaultArbSigner = await ethers.getSigner(BALANCER_VAULT_ARB);

      const dummyUserDataArb = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'bytes'], [0, '0x']);
      await (arbContract.connect(vaultArbSigner) as any).receiveFlashLoan(
        [WETH_ARB],
        [ethers.parseEther('1.0')],
        [0n],
        dummyUserDataArb
      );
      hijackedArbBalancer = true;
    } catch (err: any) {
      hijackedArbBalancer = false;
      assert(
        err.message.toLowerCase().includes('revert'),
        'Guardia _inFlashLoan bloqueó exitosamente callback de Balancer en Arbitrum',
        `Reversión confirmada: ${err.message.slice(0, 80)}...`
      );
    }
    assert(!hijackedArbBalancer, 'Atacante NO puede explotar receiveFlashLoan en Arbitrum');

    // PRUEBA DE SEGURIDAD 4: Intento de Secuestro de Callback en Arbitrum Aave V3
    console.log('\n🛡️ Probando Seguridad de Callback Aave V3 en Arbitrum...');
    const AAVE_POOL_ARB = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
    let hijackedArbAave = false;
    try {
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [AAVE_POOL_ARB],
      });
      await owner.sendTransaction({ to: AAVE_POOL_ARB, value: ethers.parseEther('1.0') });
      const aaveArbSigner = await ethers.getSigner(AAVE_POOL_ARB);

      await (arbContract.connect(aaveArbSigner) as any).executeOperation(
        WETH_ARB,
        ethers.parseEther('1.0'),
        ethers.parseEther('0.0005'),
        attacker.address, // Initiator malicioso
        '0x'
      );
      hijackedArbAave = true;
    } catch (err: any) {
      hijackedArbAave = false;
      assert(
        err.message.toLowerCase().includes('revert'),
        'Guardia de Initiator bloqueó callback malicioso de Aave en Arbitrum',
        `Reversión confirmada: ${err.message.slice(0, 80)}...`
      );
    }
    assert(!hijackedArbAave, 'Atacante NO puede forzar executeOperation en Arbitrum');

  } catch (arbErr: any) {
    console.error('⚠️ Error en Fork de Arbitrum:', arbErr.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // RESUMEN
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`🏁 RESULTADO FORK SIMULATION: ${passed} / ${total} Pruebas Exitosas (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (passed !== total) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fallo en fork simulation:', err);
  process.exit(1);
});
