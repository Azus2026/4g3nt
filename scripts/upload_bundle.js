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
  readyTimeout: 30000,
};

console.log('🚀 Conectando SSH al VPS...');
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Conectado. Abriendo SFTP...');
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      return;
    }

    console.log('📤 Subiendo update_bundle.tar.gz...');
    sftp.fastPut(localBundle, remoteBundle, (putErr) => {
      if (putErr) {
        console.error('Upload Error:', putErr);
        conn.end();
        return;
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
          console.error('Exec error:', execErr);
          conn.end();
          return;
        }

        stream.on('data', (d) => process.stdout.write(d.toString()));
        stream.on('close', (code) => {
          console.log('\n🎉 ¡DESPLIEGUE Y REINICIO COMPLETADOS EXITOSAMENTE! (Código:', code, ')');
          conn.end();
          process.exit(0);
        });
      });
    });
  });
}).on('error', (e) => {
  console.error('SSH Error:', e.message);
}).connect(config);
