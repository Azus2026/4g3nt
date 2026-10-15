import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const TOKENS_TO_APPROVE = [
  "0x4200000000000000000000000000000000000006", // WETH
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
  "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // USDbC
  "0x940181a94A35A4569E4529A3CDfB74e38FD98631", // AERO
  "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", // cbBTC
  "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", // DEGEN
  "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b", // VIRTUAL
  "0x532f27101965dd16442E59d40670FaF5eBB142E4", // BRETT
  "0xAC1Bd2447a10150D01025454429261eD16f57b66", // TOSHI
];

async function main() {
  console.log("=================================================");
  console.log("🚀 DESPLIEGUE: BaseUniversalArbitrage en Base L2");
  console.log("=================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer Address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance ETH nativo:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("❌ Saldo insuficiente de ETH nativo para gas en Base.");
  }

  // 1. Desplegar Contrato
  console.log("\n1️⃣ Desplegando BaseUniversalArbitrage...");
  const factory = await ethers.getContractFactory("BaseUniversalArbitrage");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ Contrato Desplegado Exitosamente!");
  console.log("📍 Dirección:", contractAddress);
  console.log("🔗 BaseScan: https://basescan.org/address/" + contractAddress);

  // 2. Pre-aprobar Tokens a Routers en Lotes Pequeños (Gas Seguro)
  console.log("\n2️⃣ Pre-aprobando routers para máxima eficiencia de gas...");
  const batch1 = TOKENS_TO_APPROVE.slice(0, 3);
  const batch2 = TOKENS_TO_APPROVE.slice(3, 6);
  const batch3 = TOKENS_TO_APPROVE.slice(6, 9);

  for (const [idx, batch] of [batch1, batch2, batch3].entries()) {
    try {
      console.log("⚡ Aprobando Lote #" + (idx + 1) + " (" + batch.length + " tokens)...");
      const tx = await contract.approveRouters(batch, { gasLimit: 350000n });
      await tx.wait(1);
      console.log("✅ Lote #" + (idx + 1) + " aprobado (Tx: " + tx.hash + ")");
    } catch (err: any) {
      console.warn("⚠️ Advertencia Lote #" + (idx + 1) + ": " + err.message);
    }
  }

  // 3. Aprobar WETH de la wallet al nuevo contrato
  console.log("\n3️⃣ Aprobando WETH de la wallet hacia el nuevo contrato...");
  try {
    const wethAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
    const weth = new ethers.Contract(TOKENS_TO_APPROVE[0], wethAbi, deployer);
    const appTx = await weth.approve(contractAddress, ethers.MaxUint256, { gasLimit: 80000n });
    await appTx.wait(1);
    console.log("✅ WETH de la wallet aprobado al contrato (Tx: " + appTx.hash + ")");
  } catch (err: any) {
    console.warn("⚠️ Advertencia en aprobación de WETH:", err.message);
  }

  // 4. Actualizar .env local
  console.log("\n4️⃣ Actualizando archivo .env...");
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    if (envContent.includes("ARBITRAGE_CONTRACT_BASE=")) {
      envContent = envContent.replace(/ARBITRAGE_CONTRACT_BASE=.*/g, "ARBITRAGE_CONTRACT_BASE=" + contractAddress);
    } else {
      envContent += "\nARBITRAGE_CONTRACT_BASE=" + contractAddress + "\n";
    }
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log("✅ .env actualizado con ARBITRAGE_CONTRACT_BASE =", contractAddress);
  }

  console.log("\n🎉 DESPLIEGUE Y CONFIGURACIÓN COMPLETADOS CON ÉXITO!");
}

main().catch((error) => {
  console.error("❌ Error en despliegue:", error);
  process.exitCode = 1;
});