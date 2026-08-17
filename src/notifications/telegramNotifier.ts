import axios from 'axios';
import { ENV } from '../config/env';
import { ArbitrageOpportunity } from '../protocolink/protocolinkClient';
import { logger } from '../utils/logger';

export class TelegramNotifier {
  private botToken: string;
  private chatId: string;
  private isConfigured: boolean;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    this.isConfigured = Boolean(this.botToken && this.chatId);
  }

  /**
   * Enviar mensaje simple o formateado a Telegram
   */
  async sendMessage(text: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }, { timeout: 5000 });
      return true;
    } catch (err: any) {
      logger.warn(`[TELEGRAM ALERT] Error al enviar mensaje: ${err.message}`);
      return false;
    }
  }

  /**
   * Notificación cuando se ejecuta con éxito un arbitraje on-chain
   */
  async notifyExecution(opp: ArbitrageOpportunity, agentName: string, txHash?: string): Promise<void> {
    if (!this.isConfigured) return;

    const chainMap: Record<number, { name: string; explorer: string }> = {
      1: { name: 'Ethereum Mainnet', explorer: 'https://etherscan.io/tx/' },
      42161: { name: 'Arbitrum One', explorer: 'https://arbiscan.io/tx/' },
      8453: { name: 'Base Mainnet', explorer: 'https://basescan.org/tx/' },
      10: { name: 'Optimism Mainnet', explorer: 'https://optimistic.etherscan.io/tx/' },
    };

    const chainInfo = chainMap[opp.chainId] || { name: `Chain ${opp.chainId}`, explorer: '' };
    const txLink = txHash && chainInfo.explorer ? `<a href="${chainInfo.explorer}${txHash}">Ver en Explorador</a>` : 'Confirmada On-Chain';

    const message = `
🚀 <b>¡ARBITRAJE FLASH LOAN EJECUTADO CON ÉXITO!</b> 🚀

🤖 <b>Agente:</b> ${agentName}
🌐 <b>Red:</b> ${chainInfo.name}
💎 <b>Par:</b> ${opp.pairName}
💰 <b>Ganancia Neta:</b> <code>+$${opp.netProfitUSD.toFixed(2)} USD</code>

📦 <b>Ruta de Arbitraje:</b>
 • <b>Paso 1:</b> Comprar en <b>${opp.leg1.protocolId.toUpperCase()}</b>
 • <b>Paso 2:</b> Vender en <b>${opp.leg2.protocolId.toUpperCase()}</b>
 • <b>Préstamo Flash:</b> ${opp.flashLoanAmount} ${opp.tokenA.symbol}

⛽ <b>Costo Gas:</b> $${opp.estimatedGasUSD.toFixed(2)} USD
🔗 <b>Transacción:</b> ${txLink}
⏰ <b>Hora:</b> ${new Date().toLocaleTimeString()}
`;

    await this.sendMessage(message);
  }

  /**
   * Notificación cuando se inicia o reinicia el cluster
   */
  async notifyStartup(pairsCount: number, agentsCount: number): Promise<void> {
    if (!this.isConfigured) return;

    const msg = `
🟢 <b>CLUSTER DE ARBITRAJE INICIADO 24/7</b>

🖥️ <b>Servidor VPS:</b> Contabo Cloud (8 vCPUs)
⚡ <b>Nodos:</b> QuickNode Dedicated WSS Streams (< 2ms)
📊 <b>Pares Monitoreados:</b> ${pairsCount} pares activos
🤖 <b>Agentes Swarm:</b> ${agentsCount} agentes concurrentes
🎯 <b>Optimización:</b> Sweet Spot (x*y=k) Activado
🌐 <b>Dashboard:</b> http://217.77.14.31:3000
`;
    await this.sendMessage(msg);
  }
}

export const telegramNotifier = new TelegramNotifier();
