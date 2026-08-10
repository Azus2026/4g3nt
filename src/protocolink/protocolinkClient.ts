import * as api from '@protocolink/api';
import { TokenConfig } from '../config/registry';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

export interface DEXQuote {
  protocolId: string;
  chainId: number;
  inputToken: TokenConfig;
  outputToken: TokenConfig;
  inputAmount: string;
  outputAmount: string;
  logic: any;
}

export interface ArbitrageOpportunity {
  pairId: string;
  pairName: string;
  chainId: number;
  flashLoanAmount: string;
  tokenA: TokenConfig;
  tokenB: TokenConfig;
  leg1: DEXQuote;
  leg2: DEXQuote;
  flashLoanFeeAmount: string;
  netReturnTokenA: string;
  grossProfitTokenA: string;
  grossProfitUSD: number;
  estimatedGasUSD: number;
  netProfitUSD: number;
  isProfitable: boolean;
  cexReferencePriceUSD?: number;
  cexDEXSpreadPercent?: number;
}

export class ProtocolinkClient {

  /**
   * Genera la lógica de Préstamo Flash (Aave V3 / Balancer V2)
   */
  async getFlashLoanPair(token: TokenConfig, amount: string, chainId: number) {
    const loans = [{ token: token, amount: amount }];

    try {
      if (ENV.flashLoanProvider === 'balancerv2' && (chainId === 1 || chainId === 137 || chainId === 42161)) {
        return api.protocols.balancerv2.newFlashLoanLogicPair(loans);
      }
      return api.protocols.aavev3.newFlashLoanLogicPair(loans);
    } catch (err: any) {
      return api.protocols.aavev3.newFlashLoanLogicPair(loans);
    }
  }

  /**
   * Consulta cotizaciones de Swap en DEXs por cadena
   */
  async getSwapQuotation(
    protocolId: string,
    chainId: number,
    tokenIn: TokenConfig,
    tokenOut: TokenConfig,
    amountIn: string
  ): Promise<DEXQuote | null> {
    try {
      let quotation: any = null;
      let logic: any = null;

      if (protocolId === 'uniswap-v3') {
        quotation = await api.protocols.uniswapv3.getSwapTokenQuotation(chainId, {
          input: { token: tokenIn, amount: amountIn },
          tokenOut: tokenOut,
        });
        logic = api.protocols.uniswapv3.newSwapTokenLogic(quotation);
      } else if (protocolId === 'openocean-v2') {
        quotation = await api.protocols.openoceanv2.getSwapTokenQuotation(chainId, {
          input: { token: tokenIn, amount: amountIn },
          tokenOut: tokenOut,
        });
        logic = api.protocols.openoceanv2.newSwapTokenLogic(quotation);
      } else if (protocolId === 'paraswap-v5') {
        quotation = await api.protocols.paraswapv5.getSwapTokenQuotation(chainId, {
          input: { token: tokenIn, amount: amountIn },
          tokenOut: tokenOut,
        });
        logic = api.protocols.paraswapv5.newSwapTokenLogic(quotation);
      } else if (protocolId === 'zeroex-v4') {
        quotation = await api.protocols.zeroexv4.getSwapTokenQuotation(chainId, {
          input: { token: tokenIn, amount: amountIn },
          tokenOut: tokenOut,
          apiKey: '',
        });
        logic = api.protocols.zeroexv4.newSwapTokenLogic(quotation);
      }

      if (quotation && quotation.output && quotation.output.amount) {
        return {
          protocolId,
          chainId,
          inputToken: tokenIn,
          outputToken: tokenOut,
          inputAmount: amountIn,
          outputAmount: quotation.output.amount,
          logic,
        };
      }
    } catch (error: any) {
      // Ignorar rutas sin liquidez suficiente
    }
    return null;
  }

  /**
   * Construye el paquete de transacción atómica del Router
   */
  async buildArbitrageTransaction(
    account: string,
    chainId: number,
    leg1: DEXQuote,
    leg2: DEXQuote,
    flashLoanToken: TokenConfig,
    flashLoanAmount: string
  ) {
    const [flashLoanLoanLogic, flashLoanRepayLogic] = await this.getFlashLoanPair(flashLoanToken, flashLoanAmount, chainId);

    const logics = [
      flashLoanLoanLogic,
      leg1.logic,
      leg2.logic,
      flashLoanRepayLogic,
    ];

    try {
      const routerData = {
        chainId: chainId,
        account: account,
        logics: logics,
      };

      const transactionRequest = await api.buildRouterTransactionRequest(routerData);

      return {
        logics,
        routerData: transactionRequest,
      };
    } catch (err: any) {
      logger.warn(`Falló la solicitud de construcción del router: ${err.message}`);
      return { logics, routerData: null };
    }
  }
}
