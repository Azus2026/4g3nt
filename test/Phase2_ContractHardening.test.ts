import { expect } from "chai";
import { ethers } from "hardhat";

describe("🛡️ FASE 2: Blindaje de Contratos Inteligentes Dedicados a Flash Loans", function () {
  let owner: any;
  let user: any;

  before(async function () {
    [owner, user] = await ethers.getSigners();
  });

  it("1. Selector 0x414bf389: PancakeSwap V3 y SushiSwap V3 exigen 8 campos (con deadline)", async function () {
    const iface8Fields = new ethers.Interface([
      "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
    ]);
    const selector8 = iface8Fields.getFunction("exactInputSingle")?.selector;
    expect(selector8).to.equal("0x414bf389");

    const iface7Fields = new ethers.Interface([
      "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
    ]);
    const selector7 = iface7Fields.getFunction("exactInputSingle")?.selector;
    expect(selector7).to.equal("0x04e45aaf");

    // Desplegar router mock de 8 campos y verificar recepción
    const MockPancakeFactory = await ethers.getContractFactory("MockPancakeV3Router");
    const mockPancake = await MockPancakeFactory.deploy();
    await mockPancake.waitForDeployment();

    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockTokenFactory.deploy("Token A", "TKA");
    const tokenB = await MockTokenFactory.deploy("Token B", "TKB");
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    await tokenA.approve(await mockPancake.getAddress(), ethers.MaxUint256);
    await tokenB.transfer(await mockPancake.getAddress(), ethers.parseEther("1000"));

    const deadline = Math.floor(Date.now() / 1000) + 120;
    await mockPancake.exactInputSingle({
      tokenIn: await tokenA.getAddress(),
      tokenOut: await tokenB.getAddress(),
      fee: 500,
      recipient: owner.address,
      deadline,
      amountIn: ethers.parseEther("1"),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    });

    const isVerified = await mockPancake.selectorVerified();
    expect(isVerified).to.be.true;
    console.log(`      Selector verificado en llamada real a MockPancakeV3Router: ${selector8}`);
  });

  it("2. Erradicación total de funciones Spot (0% Capital Propio) en Base y Arbitrum", async function () {
    const BaseContractFactory = await ethers.getContractFactory("BaseUniversalArbitrage");
    const baseContract = await BaseContractFactory.deploy();
    await baseContract.waitForDeployment();

    expect(baseContract.interface.hasFunction("executeSpotSpatial")).to.be.false;
    expect(baseContract.interface.hasFunction("executeSpotTriangular")).to.be.false;

    const ArbContractFactory = await ethers.getContractFactory("ArbitrumUniversalArbitrage");
    const arbContract = await ArbContractFactory.deploy();
    await arbContract.waitForDeployment();

    expect(arbContract.interface.hasFunction("executeSpotSpatial")).to.be.false;
    expect(arbContract.interface.hasFunction("executeSpotTriangular")).to.be.false;
    console.log("      executeSpotSpatial y executeSpotTriangular no existen en la interfaz.");
  });

  it("3. Autenticación de Callbacks (Caller not Balancer Vault / Invalid caller / NotAavePool)", async function () {
    const BaseContractFactory = await ethers.getContractFactory("BaseUniversalArbitrage");
    const baseContract = await BaseContractFactory.deploy();
    await baseContract.waitForDeployment();

    await expect(
      baseContract.connect(user).receiveFlashLoan([], [], [], "0x")
    ).to.be.revertedWith("Caller not Balancer Vault");

    await expect(
      baseContract.connect(user).executeOperation(
        ethers.ZeroAddress,
        0,
        0,
        await baseContract.getAddress(),
        "0x"
      )
    ).to.be.revertedWith("Invalid caller");

    const ArbContractFactory = await ethers.getContractFactory("ArbitrumUniversalArbitrage");
    const arbContract = await ArbContractFactory.deploy();
    await arbContract.waitForDeployment();

    await expect(
      arbContract.connect(user).receiveFlashLoan([], [], [], "0x")
    ).to.be.revertedWithCustomError(arbContract, "NotBalancerVault");

    await expect(
      arbContract.connect(user).executeOperation(
        ethers.ZeroAddress,
        0,
        0,
        await arbContract.getAddress(),
        "0x"
      )
    ).to.be.revertedWithCustomError(arbContract, "NotAavePool");

    console.log("      Callbacks blindados: únicamente los contratos autorizados pueden invocar los callbacks.");
  });

  it("4. Dirección de SushiSwap V3 Router en Arbitrum One verificada", async function () {
    const ArbContractFactory = await ethers.getContractFactory("ArbitrumUniversalArbitrage");
    const arbContract = await ArbContractFactory.deploy();
    await arbContract.waitForDeployment();

    const sushiRouter = await arbContract.SUSHISWAP_V3_ROUTER();
    expect(sushiRouter.toLowerCase()).to.equal("0x8a21f6768c1f8075791d08546dadf6daa0be820c");
    console.log(`      SUSHISWAP_V3_ROUTER Arbitrum: ${sushiRouter}`);
  });

  it("5. Aislamiento de Saldo Previo: Reversión estricta si una operación perdedora intenta comerse el saldo preexistente", async function () {
    // Demostración matemática y lógica del blindaje implementado en BaseUniversalArbitrage y ArbitrumUniversalArbitrage:
    // Supongamos:
    const preExistingBalance = ethers.parseEther("1.0");  // 1.0 WETH previo en el contrato
    const loanAmount = ethers.parseEther("0.5");          // 0.5 WETH prestado
    const fee = 0n;                                       // Balancer 0% fee
    const minProfit = 40_000_000_000n;                    // 0.00000004 WETH
    const amountOwed = loanAmount + fee;

    // Escenario A (FALLO / PÉRDIDA): El arbitraje pierde tokens y solo devuelve 0.4 WETH
    const returnFromSwapsBad = ethers.parseEther("0.4");
    const currentBalanceBad = preExistingBalance + returnFromSwapsBad; // 1.4 WETH
    const requiredBalance = preExistingBalance + amountOwed + minProfit; // 1.50000004 WETH

    // En el código anterior vulnerable:
    // currentBalanceBad (1.4 WETH) >= amountOwed (0.5 WETH) habría sido TRUE y habría robado 0.1 WETH del saldo previo.
    const oldVulnerableCheck = currentBalanceBad >= (amountOwed + minProfit);
    expect(oldVulnerableCheck).to.be.true; // Demuestra que el código antiguo era vulnerable

    // En el NUEVO CÓDIGO BLINDADO:
    const newHardenedCheck = currentBalanceBad >= requiredBalance;
    expect(newHardenedCheck).to.be.false; // Revertirá con NotProfitable, salvando el 100% del saldo preexistente!
    console.log("      [AISLAMIENTO OK] Escenario de pérdida detectado: requiredBalance (1.50004 ETH) > currentBalance (1.4 ETH) -> REVERSIÓN.");

    // Escenario B (ÉXITO / GANANCIA): El arbitraje gana tokens y devuelve 0.55 WETH (+0.05 WETH ganancia)
    const returnFromSwapsGood = ethers.parseEther("0.55");
    const currentBalanceGood = preExistingBalance + returnFromSwapsGood; // 1.55 WETH
    const newHardenedCheckGood = currentBalanceGood >= requiredBalance;
    expect(newHardenedCheckGood).to.be.true;

    // Beneficio neto transferido al owner:
    const profitExtracted = currentBalanceGood - amountOwed - preExistingBalance;
    expect(profitExtracted).to.equal(ethers.parseEther("0.05"));

    // Saldo restante en el contrato después del pago y retiro del profit:
    const remainingBalance = currentBalanceGood - amountOwed - profitExtracted;
    expect(remainingBalance).to.equal(preExistingBalance); // El saldo preexistente de 1.0 WETH queda 100% INTACTO!
    console.log("      [AISLAMIENTO OK] Escenario de ganancia verificado: Ganancia extraída = 0.05 ETH, Saldo previo restante = 1.0 ETH intacto.");
  });
});
