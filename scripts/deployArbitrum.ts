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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
