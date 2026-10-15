import { ethers } from "hardhat";
import dotenv from "dotenv";
dotenv.config();

const WETH_BASE_ADDRESS = "0x4200000000000000000000000000000000000006";
const ERC20_ABI = [
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

async function main() {
  const contractAddress = process.env.ARBITRAGE_CONTRACT_BASE;
  if (!contractAddress) {
    throw new Error("No ARBITRAGE_CONTRACT_BASE found in .env");
  }

  const [signer] = await ethers.getSigners();
  console.log("👤 Wallet:", signer.address);
  console.log("📍 Contrato Arbitraje:", contractAddress);

  const weth = new ethers.Contract(WETH_BASE_ADDRESS, ERC20_ABI, signer);
  const bal = await weth.balanceOf(signer.address);
  console.log("💰 Saldo WETH:", ethers.formatEther(bal), "WETH");

  const allowance = await weth.allowance(signer.address, contractAddress);
  console.log("🔍 Allowance actual:", ethers.formatEther(allowance), "WETH");

  if (allowance < ethers.parseEther("1.0")) {
    console.log("⚡ Aprobando WETH para el contrato de arbitraje...");
    const tx = await weth.approve(contractAddress, ethers.MaxUint256);
    await tx.wait(1);
    console.log("✅ WETH aprobado exitosamente para el contrato!");
  } else {
    console.log("✅ WETH ya cuenta con aprobación suficiente.");
  }
}

main().catch(console.error);
