import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("----------------------------------------------------");
  console.log("Deploying FlashLoanArbitrageReceiver contract...");
  console.log("Deployer Wallet:", deployer.address);

  // Aave V3 Pool Addresses Provider (Ethereum Mainnet default)
  const ADDRESS_PROVIDER = process.env.AAVE_ADDRESS_PROVIDER || "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";

  const ReceiverFactory = await ethers.getContractFactory("FlashLoanArbitrageReceiver");
  const receiverContract = await ReceiverFactory.deploy(ADDRESS_PROVIDER);

  await receiverContract.waitForDeployment();
  const contractAddress = await receiverContract.getAddress();

  console.log("----------------------------------------------------");
  console.log(`✅ FlashLoanArbitrageReceiver deployed successfully!`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Owner: ${deployer.address}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error("Error during contract deployment:", error);
  process.exitCode = 1;
});
