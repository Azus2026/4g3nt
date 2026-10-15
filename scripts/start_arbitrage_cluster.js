require('dotenv').config();
const { Client } = require('ssh2');

const config = {
  host: process.env.VPS_HOST || '217.77.14.31',
  port: parseInt(process.env.VPS_PORT || '22', 10),
  username: process.env.VPS_USER || 'root',
  password: process.env.VPS_PASSWORD,
  readyTimeout: 20000,
};

console.log('🚀 Iniciando arranque completo de arbitrage-cluster en VPS...');
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Conectado. Iniciando proceso...');
  const cmd = `
cd /root/4g3nt
ls -la
if [ ! -d "dist" ] || [ ! -f "dist/src/index.js" ]; then
  echo "Compilando TypeScript..."
  npm run build
fi
pm2 delete arbitrage-cluster || true
pm2 start dist/src/index.js --name "arbitrage-cluster" --max-memory-restart 4G --node-args="--max-old-space-size=4096"
pm2 save
sleep 4
echo "=== PM2 STATUS ==="
pm2 status
echo "=== PUERTO 3000 ==="
netstat -tuln | grep 3000 || ss -tuln | grep 3000
echo "=== PROBANDO HTTP LOCAL ==="
curl -s http://localhost:3000/api/status | head -n 30
`;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error al ejecutar comando:', err);
      conn.end();
      return;
    }

    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.on('close', (code) => {
      console.log(`\n✅ Proceso completado con código: ${code}`);
      conn.end();
      process.exit(0);
    });
  });
});

conn.on('error', (err) => {
  console.error('❌ Error de conexión SSH:', err.message);
  process.exit(1);
});

conn.connect(config);
