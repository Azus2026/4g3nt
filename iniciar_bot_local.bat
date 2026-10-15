@echo off
title Protocolink AI Arbitrage Swarm V2 - Local Engine
color 0b
echo ======================================================================
echo    INICIANDO CLUSTER DE ARBITRAJE LOCAL EN TU COMPUTADORA
echo ======================================================================
echo.
echo [1/2] Verificando dependencias y compilacion...
cd /d "%~dp0"
call npm run build
echo.
echo [2/2] Levantando Motores (Low-Fee + Spot Base + Arbitrum Flash Loans)...
echo.
echo Dashboard Web: http://localhost:3000
echo.
echo Presiona Ctrl + C si deseas detener el bot en cualquier momento.
echo ======================================================================
echo.
npm start
pause
