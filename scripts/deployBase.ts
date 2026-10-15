import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Iniciando despliegue de BaseMultiDexArbitrage en Base Mainnet (ChainID 8453)...");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Saldo ETH Nativo para Gas:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("❌ Saldo insuficiente de ETH nativo en Base para pagar el gas de despliegue.");
  }

  // 1. Desplegar Contrato
  console.log("📦 Compilando y transmitiendo transacción de despliegue...");
  const ArbitrageFactory = await ethers.getContractFactory("BaseUniversalArbitrage");
  const contract = await ArbitrageFactory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("🎉 ¡CONTRATO DESPLEGADO EXITOSAMENTE!");
  console.log("📍 Dirección del Contrato:", contractAddress);
  console.log("🔗 Ver en BaseScan: https://basescan.org/address/" + contractAddress);

  // 2. Pre-aprobar los tokens principales para ahorrar gas en las ejecuciones
  const TOKENS_TO_APPROVE = [
    "0x4200000000000000000000000000000000000006", // WETH
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // USDbC
    "0x940181a94A35A4569E4529A3CDfB74e38FD98631", // AERO
    "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", // cbBTC
    "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", // DEGEN
    "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b", // VIRTUAL
    "0x532f27101965dd16442E59d40670FaF5eBB142E4", // BRETT
    "0xAC1bD2447a10150D01025454429261eD16f57b66", // TOSHI
  ];

  console.log("⚡ Ejecutando approveRouters() para los 9 tokens clave...");
  const txApprove = await contract.approveRouters(TOKENS_TO_APPROVE);
  await txApprove.wait(1);
  console.log("✅ Routers Uniswap V3 y Aerodrome Slipstream pre-aprobados con éxito.");

  // 3. Guardar dirección en el archivo .env
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    if (envContent.includes("ARBITRAGE_CONTRACT_BASE=")) {
      envContent = envContent.replace(/ARBITRAGE_CONTRACT_BASE=.*/, `ARBITRAGE_CONTRACT_BASE=${contractAddress}`);
    } else {
      envContent += `\nARBITRAGE_CONTRACT_BASE=${contractAddress}\n`;
    }
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log("💾 Dirección guardada en .env como ARBITRAGE_CONTRACT_BASE");
  }
}

main().catch((error) => {
  console.error("❌ Error en despliegue:", error);
  process.exitCode = 1;
});
