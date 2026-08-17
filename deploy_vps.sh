#!/bin/bash
# ==============================================================================
# Flash Loan Arbitrage V2 - Automated 1-Click VPS Deployment Script
# Target OS: Ubuntu 22.04 / 24.04 LTS (Contabo Cloud VPS)
# ==============================================================================

set -e

echo "======================================================================"
echo "🚀 INICIANDO DESPLIEGUE AUTOMATIZADO DEL CLUSTER DE ARBITRAJE EN VPS"
echo "======================================================================"

# 1. Actualizar repositorios del sistema
echo "[1/6] Actualizando paquetes del sistema..."
apt update -y && apt upgrade -y
apt install -y git curl ufw build-essential

# 2. Instalar Node.js 20 LTS
echo "[2/6] Instalando Node.js v20 LTS y herramientas de compilación..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g npm@latest pm2 typescript

# 3. Clonar repositorio desde GitHub
echo "[3/6] Clonando repositorio del bot..."
cd /root
if [ -d "4g3nt" ]; then
    echo "Directorio existente, actualizando repositorio..."
    cd 4g3nt
    git pull origin main
else
    git clone https://github.com/D4NY453/4g3nt.git
    cd 4g3nt
fi

# 4. Instalar dependencias de Node.js
echo "[4/6] Instalando dependencias del proyecto..."
npm install

# 5. Compilar TypeScript
echo "[5/6] Compilando TypeScript a JavaScript optimizado..."
npm run build

# 6. Configurar Firewall y PM2
echo "[6/6] Configurando Firewall y demonio PM2 para ejecución 24/7..."
ufw allow 22/tcp
ufw allow 3000/tcp
ufw --force enable

pm2 delete arbitrage-cluster 2>/dev/null || true
pm2 start dist/src/index.js --name "arbitrage-cluster" --max-memory-restart 2G
pm2 save
pm2 startup systemd -u root --hp /root || true

echo "======================================================================"
echo "🎉 ¡DESPLIEGUE COMPLETADO CON ÉXITO!"
echo "   Dashboard Web 24/7: http://$(curl -s ifconfig.me):3000"
echo "   Ver logs en vivo: pm2 logs arbitrage-cluster"
echo "======================================================================"
