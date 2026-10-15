require('dotenv').config();
const { Client } = require('ssh2');

const config = {
  host: process.env.VPS_HOST || '217.77.14.31',
  port: parseInt(process.env.VPS_PORT || '22', 10),
  username: process.env.VPS_USER || 'root',
  password: process.env.VPS_PASSWORD,
  readyTimeout: 20000,
};

console.log('🚀 Consultando logs de arbitrage-cluster en VPS...');
const conn = new Client();

conn.on('ready', () => {
  const cmd = `
pm2 logs arbitrage-cluster --lines 30 --nostream
curl -s http://localhost:3000/api/status
`;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error:', err);
      conn.end();
      return;
    }

    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.on('close', (code) => {
      conn.end();
      process.exit(0);
    });
  });
});

conn.on('error', (err) => {
  console.error('Error SSH:', err.message);
  process.exit(1);
});

conn.connect(config);
