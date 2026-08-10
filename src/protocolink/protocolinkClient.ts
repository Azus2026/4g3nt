import * as api from '@protocolink/api';
import { ethers } from 'ethers';
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

const UNISWAP_V3_QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
];

const UNISWAP_V3_QUOTER_ADDRESSES: Record<number, string> = {
  1: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  42161: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  137: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  10: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  8453: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
};

const RPC_FALLBACKS: Record<number, string> = {
  1: 'https://ethereum.publicnode.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  137: 'https://polygon-bor-rpc.publicnode.com',
  10: 'https://mainnet.optimism.io',
  8453: 'https://mainnet.base.org',
  56: 'https://bsc-dataseed.binance.org',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
};

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
   * Consulta cotización On-Chain directa usando el Quoter de Uniswap V3 para una tasa de comisión específica
   */
  async getOnChainUniswapV3Quote(
    chainId: number,
    tokenIn: TokenConfig,
    tokenOut: TokenConfig,
    amountIn: string,
    feeTier: number = 500
  ): Promise<DEXQuote | null> {
    const quoterAddress = UNISWAP_V3_QUOTER_ADDRESSES[chainId];
    const rpcUrl = RPC_FALLBACKS[chainId];
    if (!quoterAddress || !rpcUrl) return null;

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
      const quoter = new ethers.Contract(quoterAddress, UNISWAP_V3_QUOTER_ABI, provider);
      const parsedAmountIn = ethers.parseUnits(amountIn, tokenIn.decimals);
      
      const amountOut = await quoter.quoteExactInputSingle.staticCall(
        tokenIn.address,
        tokenOut.address,
        feeTier,
        parsedAmountIn,
        0
      );

      const formattedOut = ethers.formatUnits(amountOut, tokenOut.decimals);
      const feePercent = feeTier === 500 ? '0.05%' : (feeTier === 3000 ? '0.3%' : '1%');

      return {
        protocolId: `uniswap-v3-${feePercent}`,
        chainId,
        inputToken: tokenIn,
        outputToken: tokenOut,
        inputAmount: amountIn,
        outputAmount: formattedOut,
        logic: null,
      };
    } catch (err: any) {
      return null;
    }
  }

  /**
   * Consulta cotizaciones de Swap en DEXs por cadena (Resistente a fallos con retorno individual seguro)
   */
  async getSwapQuotation(
    protocolId: string,
    chainId: number,
    tokenIn: TokenConfig,
    tokenOut: TokenConfig,
    amountIn: string
  ): Promise<DEXQuote | null> {
    try {
      if (protocolId === 'uniswap-v3-0.05%') {
        return await this.getOnChainUniswapV3Quote(chainId, tokenIn, tokenOut, amountIn, 500);
      } else if (protocolId === 'uniswap-v3-0.3%') {
        return await this.getOnChainUniswapV3Quote(chainId, tokenIn, tokenOut, amountIn, 3000);
      } else if (protocolId === 'uniswap-v3-1%') {
        return await this.getOnChainUniswapV3Quote(chainId, tokenIn, tokenOut, amountIn, 10000);
      }

      let quotation: any = null;
      let logic: any = null;

      if (protocolId === 'uniswap-v3') {
        try {
          quotation = await api.protocols.uniswapv3.getSwapTokenQuotation(chainId, {
            input: { token: tokenIn, amount: amountIn },
            tokenOut: tokenOut,
          });
          logic = api.protocols.uniswapv3.newSwapTokenLogic(quotation);
        } catch {
          return await this.getOnChainUniswapV3Quote(chainId, tokenIn, tokenOut, amountIn, 500);
        }
      } else if (protocolId === 'openocean-v2') {
        quotation = await api.protocols.openoceanv2.getSwapTokenQuotation(chainId, {
          input: { token: tokenIn, amount: amountIn },
          tokenOut: tokenOut,
        }).catch(() => null);
        if (quotation) logic = api.protocols.openoceanv2.newSwapTokenLogic(quotation);
      } else if (protocolId === 'paraswap-v5') {
        quotation = await api.protocols.paraswapv5.getSwapTokenQuotation(chainId, {
          input: { token: tokenIn, amount: amountIn },
          tokenOut: tokenOut,
        }).catch(() => null);
        if (quotation) logic = api.protocols.paraswapv5.newSwapTokenLogic(quotation);
      } else if (protocolId === 'zeroex-v4') {
        quotation = await api.protocols.zeroexv4.getSwapTokenQuotation(chainId, {
          input: { token: tokenIn, amount: amountIn },
          tokenOut: tokenOut,
          apiKey: '',
        }).catch(() => null);
        if (quotation) logic = api.protocols.zeroexv4.newSwapTokenLogic(quotation);
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
      // Ignorar errores de ruta sin lanzar excepción
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
