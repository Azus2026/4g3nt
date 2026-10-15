import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=================================================");
  console.log("🚀 DESPLIEGUE: ArbitrumUniversalArbitrage en Arbitrum One");
  console.log("=================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer Address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance ETH nativo en Arbitrum:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("❌ Saldo insuficiente de ETH nativo para gas en Arbitrum.");
  }

  // 1. Desplegar Contrato
  console.log("\n1️⃣ Desplegando ArbitrumUniversalArbitrage...");
  const factory = await ethers.getContractFactory("ArbitrumUniversalArbitrage");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ Contrato Desplegado Exitosamente en Arbitrum One!");
  console.log("📍 Dirección:", contractAddress);
  console.log("🔗 Arbiscan: https://arbiscan.io/address/" + contractAddress);

  // Pre-aprobar tokens clave en Arbitrum One
  const TOKENS_TO_APPROVE = [
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
    "0x912CE59144191C1204E64559FE8253a0e49E6548", // ARB
    "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", // GMX
    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // WBTC
    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
  ];

  console.log("⚡ Ejecutando approveRouters() en Arbitrum One...");
  const txApprove = await contract.approveRouters(TOKENS_TO_APPROVE);
  await txApprove.wait(1);
  console.log("✅ Routers Uniswap V3, Camelot y Pancake pre-aprobados con éxito.");

  // Guardar en .env
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    if (envContent.includes("ARBITRAGE_CONTRACT_ARBITRUM=")) {
      envContent = envContent.replace(/ARBITRAGE_CONTRACT_ARBITRUM=.*/, `ARBITRAGE_CONTRACT_ARBITRUM=${contractAddress}`);
    } else {
      envContent += `\nARBITRAGE_CONTRACT_ARBITRUM=${contractAddress}\n`;
    }
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log("💾 Dirección guardada en .env como ARBITRAGE_CONTRACT_ARBITRUM");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
