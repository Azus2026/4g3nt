require('dotenv').config();
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const localBundle = path.join(__dirname, '..', 'update_bundle.tar.gz');
const remoteBundle = '/root/4g3nt/update_bundle.tar.gz';
const remoteBase = '/root/4g3nt';

const config = {
  host: process.env.VPS_HOST || '217.77.14.31',
  port: parseInt(process.env.VPS_PORT || '22', 10),
  username: process.env.VPS_USER || 'root',
  password: process.env.VPS_PASSWORD,
  readyTimeout: 20000,
};

async function tryConnect(attempt = 1) {
  console.log(`🚀 [Intento #${attempt}] Conectando SSH al VPS (217.77.14.31)...`);
  const conn = new Client();

  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      console.log('✅ SSH Conectado exitosamente. Abriendo SFTP...');
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        console.log('📤 Subiendo update_bundle.tar.gz...');
        sftp.fastPut(localBundle, remoteBundle, (putErr) => {
          if (putErr) {
            conn.end();
            return reject(putErr);
          }

          console.log('✅ Bundle subido. Extrayendo y reiniciando PM2 en el VPS...');
          const cmd = `
cd ${remoteBase}
tar -xzf update_bundle.tar.gz
pm2 restart arbitrage-cluster || pm2 start dist/src/index.js --name "arbitrage-cluster" --max-memory-restart 4G --node-args="--max-old-space-size=4096"
sleep 4
echo "=== ESTADO PM2 ==="
pm2 status
echo "=== TELEMETRÍA DASHBOARD ==="
curl -s http://localhost:3000/api/status
`;

          conn.exec(cmd, (execErr, stream) => {
            if (execErr) {
              conn.end();
              return reject(execErr);
            }

            stream.on('data', (d) => process.stdout.write(d.toString()));
            stream.on('close', (code) => {
              console.log('\n🎉 ¡DESPLIEGUE Y REINICIO COMPLETADOS EXITOSAMENTE! (Código:', code, ')');
              conn.end();
              resolve(true);
            });
          });
        });
      });
    });

    conn.on('error', (err) => {
      console.log(`⚠️ Intento #${attempt} falló:`, err.message);
      conn.end();
      reject(err);
    });

    conn.connect(config);
  });
}

async function main() {
  for (let i = 1; i <= 10; i++) {
    try {
      await tryConnect(i);
      process.exit(0);
    } catch (e) {
      console.log(`⏳ Esperando 4 segundos antes del reintento #${i + 1}...`);
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

main();
