const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

function generateWallet() {
  const wallet = ethers.Wallet.createRandom();
  console.log('======================================================================');
  console.log('  NUEVA BILLETERA DEDICADA DE PRODUCCIÓN GENERADA');
  console.log('======================================================================');
  console.log('Dirección Pública (Address):', wallet.address);
  console.log('Llave Privada (Private Key):', wallet.privateKey);
  console.log('Frase Mnemónica (12 palabras):', wallet.mnemonic.phrase);
  console.log('======================================================================');
  console.log('⚠️ GUARDA ESTOS DATOS EN UN LUGAR SEGURO Y NUNCA LOS COMPARTAS.');
  console.log('======================================================================\n');

  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    console.log(`Para configurar esta billetera en el bot, actualiza la línea en .env:`);
    console.log(`PRIVATE_KEY=${wallet.privateKey.replace('0x', '')}`);
  }
}

generateWallet();
