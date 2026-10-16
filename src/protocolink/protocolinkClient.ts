import * as api from '@protocolink/api';
import * as common from '@protocolink/common';
import { ethers } from 'ethers';
import axios from 'axios';
import { TokenConfig } from '../config/registry';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { flashLoanProviderService } from '../services/flashLoanProviderService';

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
  flashLoanToken?: TokenConfig;
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
  sweetSpotRatio?: number;
}

const V3_QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
];

const UNISWAP_V3_QUOTER_ADDRESSES: Record<number, string> = {
  1: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  42161: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  137: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  10: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  8453: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
};

const PANCAKE_V3_QUOTER_ADDRESSES: Record<number, string> = {
  1: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
  42161: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
  8453: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
};

const RPC_FALLBACKS: Record<number, string> = {
  1: process.env.ETH_RPC_URL || 'https://ethereum.publicnode.com',
  42161: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  137: process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com',
  10: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
  8453: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
};

const CACHED_PROVIDERS: Record<number, ethers.JsonRpcProvider> = {};

function getProvider(chainId: number): ethers.JsonRpcProvider {
  if (!CACHED_PROVIDERS[chainId]) {
    const url = RPC_FALLBACKS[chainId];
    CACHED_PROVIDERS[chainId] = new ethers.JsonRpcProvider(url, chainId, { staticNetwork: true });
  }
  return CACHED_PROVIDERS[chainId];
}

export class ProtocolinkClient {

  /**
   * Convierte un TokenConfig en una instancia válida de common.Token exigida por Protocolink SDK
   */
  toApiToken(token: TokenConfig, fallbackChainId?: number): common.Token {
    if (!token) {
      return new common.Token(fallbackChainId || 1, '0x0000000000000000000000000000000000000000', 18, 'ETH', 'Ether');
    }
    const chainId = token.chainId || fallbackChainId || 1;
    const address = token.address || '0x0000000000000000000000000000000000000000';
    const decimals = token.decimals || 18;
    const symbol = token.symbol || 'ETH';
    const name = token.name || symbol;
    return new common.Token(chainId, address, decimals, symbol, name);
  }

  /**
   * Genera la lógica de Préstamo Flash (Aave V3 / Balancer V2) con api.Token estricto
   */
  async getFlashLoanPair(token: TokenConfig, amount: string, chainId: number) {
    const apiToken = this.toApiToken(token, chainId);
    const loans = [{ token: apiToken, amount: amount }];

    let chosenProvider: 'balancer' | 'aave' = 'balancer';
    if (chainId === 8453 || chainId === 42161) {
      try {
        const provider = getProvider(chainId);
        const parsedAmount = ethers.parseUnits(amount, token.decimals || 18);
        const info = await flashLoanProviderService.selectOptimalProvider(
          chainId,
          token.address,
          parsedAmount,
          provider
        );
        chosenProvider = info.provider;
      } catch {
        const providerPref = (ENV.flashLoanProvider || 'balancer').toLowerCase();
        chosenProvider = (providerPref === 'balancer' || providerPref === 'balancerv2') ? 'balancer' : 'aave';
      }
    } else {
      const providerPref = (ENV.flashLoanProvider || 'balancer').toLowerCase();
      chosenProvider = (providerPref === 'balancer' || providerPref === 'balancerv2') ? 'balancer' : 'aave';
    }

    try {
      if (chosenProvider === 'balancer' && (chainId === 1 || chainId === 42161 || chainId === 8453)) {
        return api.protocols.balancerv2.newFlashLoanLogicPair(loans);
      }
      return api.protocols.aavev3.newFlashLoanLogicPair(loans);
    } catch {
      return api.protocols.aavev3.newFlashLoanLogicPair(loans);
    }
  }

  /**
   * Consulta cotización On-Chain directa usando el Quoter V2 de Uniswap V3 con proveedor en caché
   */
  async getOnChainUniswapV3Quote(
    chainId: number,
    tokenIn: TokenConfig,
    tokenOut: TokenConfig,
    amountIn: string,
    feeTier: number = 500
  ): Promise<DEXQuote | null> {
    const quoterAddress = UNISWAP_V3_QUOTER_ADDRESSES[chainId];
    if (!quoterAddress) return null;

    try {
      const provider = getProvider(chainId);
      const quoter = new ethers.Contract(quoterAddress, V3_QUOTER_V2_ABI, provider);
      const parsedAmountIn = ethers.parseUnits(amountIn, tokenIn.decimals);
      
      const res = await Promise.race([
        quoter.quoteExactInputSingle.staticCall({
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          amountIn: parsedAmountIn,
          fee: feeTier,
          sqrtPriceLimitX96: 0
        }).catch(async () => {
          return quoter.quoteExactInputSingle.staticCall(
            tokenIn.address,
            tokenOut.address,
            feeTier,
            parsedAmountIn,
            0
          );
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500))
      ]);

      const amountOut = Array.isArray(res) ? res[0] : res;
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
    } catch {
      return null;
    }
  }

  /**
   * Consulta cotización On-Chain directa usando PancakeSwap V3
   */
  async getPancakeSwapV3Quote(
    chainId: number,
    tokenIn: TokenConfig,
    tokenOut: TokenConfig,
    amountIn: string,
    feeTier: number = 500
  ): Promise<DEXQuote | null> {
    const quoterAddress = PANCAKE_V3_QUOTER_ADDRESSES[chainId];
    if (!quoterAddress) return null;

    try {
      const provider = getProvider(chainId);
      const quoter = new ethers.Contract(quoterAddress, V3_QUOTER_V2_ABI, provider);
      const parsedAmountIn = ethers.parseUnits(amountIn, tokenIn.decimals);

      const res = await Promise.race([
        quoter.quoteExactInputSingle.staticCall({
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          amountIn: parsedAmountIn,
          fee: feeTier,
          sqrtPriceLimitX96: 0,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500))
      ]);

      const amountOut = Array.isArray(res) ? res[0] : res;
      const formattedOut = ethers.formatUnits(amountOut, tokenOut.decimals);

      return {
        protocolId: 'pancakeswap-v3',
        chainId,
        inputToken: tokenIn,
        outputToken: tokenOut,
        inputAmount: amountIn,
        outputAmount: formattedOut,
        logic: null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Consulta API Agregador KyberSwap
   */
  async getKyberSwapQuote(
    chainId: number,
    tokenIn: TokenConfig,
    tokenOut: TokenConfig,
    amountIn: string
  ): Promise<DEXQuote | null> {
    const chainSlugMap: Record<number, string> = { 1: 'ethereum', 42161: 'arbitrum', 10: 'optimism', 8453: 'base' };
    const slug = chainSlugMap[chainId];
    if (!slug) return null;

    try {
      const rawAmount = ethers.parseUnits(amountIn, tokenIn.decimals).toString();
      const url = `https://aggregator-api.kyberswap.com/${slug}/api/v1/routes?tokenIn=${tokenIn.address}&tokenOut=${tokenOut.address}&amountIn=${rawAmount}`;
      const res = await axios.get(url, { timeout: 3000 });
      if (res.data && res.data.data && res.data.data.routeSummary) {
        const outRaw = res.data.data.routeSummary.amountOut;
        const formattedOut = ethers.formatUnits(outRaw, tokenOut.decimals);
        return {
          protocolId: 'kyberswap-v1',
          chainId,
          inputToken: tokenIn,
          outputToken: tokenOut,
          inputAmount: amountIn,
          outputAmount: formattedOut,
          logic: null,
        };
      }
    } catch {
      // Ignorar timeouts de KyberSwap
    }
    return null;
  }

  private quoteCache: Map<string, { quote: DEXQuote | null; expiresAt: number }> = new Map();

  /**
   * Consulta cotizaciones de Swap en DEXs por cadena con caché inteligente de 2.5s
   */
  async getSwapQuotation(
    protocolId: string,
    chainId: number,
    tokenIn: TokenConfig,
    tokenOut: TokenConfig,
    amountIn: string
  ): Promise<DEXQuote | null> {
    const cacheKey = `${protocolId}-${chainId}-${tokenIn.address.toLowerCase()}-${tokenOut.address.toLowerCase()}-${amountIn}`;
    const cached = this.quoteCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.quote;
    }

    try {
      if (protocolId === 'uniswap-v3-0.05%') {
        const q = await this.getOnChainUniswapV3Quote(chainId, tokenIn, tokenOut, amountIn, 500);
        this.quoteCache.set(cacheKey, { quote: q, expiresAt: now + 2500 });
        return q;
      } else if (protocolId === 'uniswap-v3-0.3%') {
        const q = await this.getOnChainUniswapV3Quote(chainId, tokenIn, tokenOut, amountIn, 3000);
        this.quoteCache.set(cacheKey, { quote: q, expiresAt: now + 2500 });
        return q;
      } else if (protocolId === 'uniswap-v3-1%') {
        const q = await this.getOnChainUniswapV3Quote(chainId, tokenIn, tokenOut, amountIn, 10000);
        this.quoteCache.set(cacheKey, { quote: q, expiresAt: now + 2500 });
        return q;
      } else if (protocolId === 'kyberswap-v1') {
        const q = await this.getKyberSwapQuote(chainId, tokenIn, tokenOut, amountIn);
        this.quoteCache.set(cacheKey, { quote: q, expiresAt: now + 2500 });
        return q;
      } else if (protocolId === 'pancakeswap-v3') {
        const q = await this.getPancakeSwapV3Quote(chainId, tokenIn, tokenOut, amountIn, 500);
        this.quoteCache.set(cacheKey, { quote: q, expiresAt: now + 2500 });
        return q;
      }

      let quotation: any = null;
      let logic: any = null;
      const apiTokenIn = this.toApiToken(tokenIn);
      const apiTokenOut = this.toApiToken(tokenOut);

      if (protocolId === 'uniswap-v3') {
        try {
          quotation = await api.protocols.uniswapv3.getSwapTokenQuotation(chainId, {
            input: { token: apiTokenIn, amount: amountIn },
            tokenOut: apiTokenOut,
            slippage: 100,
          });
          logic = api.protocols.uniswapv3.newSwapTokenLogic(quotation);
        } catch {
          return await this.getOnChainUniswapV3Quote(chainId, tokenIn, tokenOut, amountIn, 500);
        }
      } else if (protocolId === 'camelot-v3') {
        quotation = await api.protocols.paraswapv5.getSwapTokenQuotation(chainId, {
          input: { token: apiTokenIn, amount: amountIn },
          tokenOut: apiTokenOut,
          includeDEXS: ['CamelotV3', 'Camelot'],
          slippage: 100,
        } as any).catch(() => null);
        if (quotation) logic = api.protocols.paraswapv5.newSwapTokenLogic(quotation);
      } else if (protocolId === 'aerodrome-base') {
        quotation = await api.protocols.paraswapv5.getSwapTokenQuotation(chainId, {
          input: { token: apiTokenIn, amount: amountIn },
          tokenOut: apiTokenOut,
          includeDEXS: ['AerodromeSlipstream', 'Aerodrome', 'AerodromeSlipstreamNewFactory'],
          slippage: 100,
        } as any).catch(() => null);
        if (quotation) logic = api.protocols.paraswapv5.newSwapTokenLogic(quotation);
      } else if (protocolId === 'sushiswap-v3') {
        quotation = await api.protocols.paraswapv5.getSwapTokenQuotation(chainId, {
          input: { token: apiTokenIn, amount: amountIn },
          tokenOut: apiTokenOut,
          includeDEXS: ['SushiSwapV3', 'SushiSwap'],
          slippage: 100,
        } as any).catch(() => null);
        if (quotation) logic = api.protocols.paraswapv5.newSwapTokenLogic(quotation);
      } else if (protocolId === 'balancer-v2') {
        quotation = await api.protocols.paraswapv5.getSwapTokenQuotation(chainId, {
          input: { token: apiTokenIn, amount: amountIn },
          tokenOut: apiTokenOut,
          includeDEXS: ['BalancerV2'],
          slippage: 100,
        } as any).catch(() => null);
        if (quotation) logic = api.protocols.paraswapv5.newSwapTokenLogic(quotation);
      } else if (protocolId === 'curve-v2') {
        quotation = await api.protocols.paraswapv5.getSwapTokenQuotation(chainId, {
          input: { token: apiTokenIn, amount: amountIn },
          tokenOut: apiTokenOut,
          includeDEXS: ['CurveV2', 'CurveV1StableNg', 'CurveV1Factory'],
          slippage: 100,
        } as any).catch(() => null);
        if (quotation) logic = api.protocols.paraswapv5.newSwapTokenLogic(quotation);
      } else if (protocolId === 'zeroexv4') {
        quotation = await api.protocols.zeroexv4.getSwapTokenQuotation(chainId, {
          input: { token: apiTokenIn, amount: amountIn },
          tokenOut: apiTokenOut,
          apiKey: process.env.ZEROEX_API_KEY || '',
          slippage: 100,
        } as any).catch(() => null);
        if (quotation) logic = api.protocols.zeroexv4.newSwapTokenLogic(quotation);
      } else if (protocolId === 'openocean-v2') {
        quotation = await api.protocols.openoceanv2.getSwapTokenQuotation(chainId, {
          input: { token: apiTokenIn, amount: amountIn },
          tokenOut: apiTokenOut,
          slippage: 100,
        }).catch(() => null);
        if (quotation) logic = api.protocols.openoceanv2.newSwapTokenLogic(quotation);
      } else if (protocolId === 'velora-v2-all' || protocolId === 'paraswap-v5') {
        quotation = await api.protocols.paraswapv5.getSwapTokenQuotation(chainId, {
          input: { token: apiTokenIn, amount: amountIn },
          tokenOut: apiTokenOut,
          slippage: 100,
          excludeDEXS: ['Dexalot', 'Dexalot-42161'],
        } as any).catch(() => null);
        if (quotation) logic = api.protocols.paraswapv5.newSwapTokenLogic(quotation);
      }

      if (quotation && quotation.output && quotation.output.amount) {
        const resultQuote: DEXQuote = {
          protocolId,
          chainId,
          inputToken: tokenIn,
          outputToken: tokenOut,
          inputAmount: amountIn,
          outputAmount: quotation.output.amount,
          logic,
        };
        this.quoteCache.set(cacheKey, { quote: resultQuote, expiresAt: now + 500 });
        return resultQuote;
      }
    } catch {
      // Ignorar errores de ruta
    }

    this.quoteCache.set(cacheKey, { quote: null, expiresAt: now + 500 });
    return null;
  }

  /**
   * Genera un objeto de lógica de Protocolink válido cuando un quoter custom retorne logic: null
   */
  async getProtocolinkLogic(chainId: number, quote: DEXQuote) {
    if (quote.logic) return quote.logic;

    const apiTokenIn = this.toApiToken(quote.inputToken, chainId);
    const apiTokenOut = this.toApiToken(quote.outputToken, chainId);

    // Intentos multi-protocolo (Uniswap V3, ParaSwap V5, OpenOcean, ZeroEx)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // 1. Prioridad: Uniswap V3 nativo (100% compatible con Flash Loans)
        const uniQuote = await api.protocols.uniswapv3.getSwapTokenQuotation(chainId, {
          input: { token: apiTokenIn, amount: quote.inputAmount },
          tokenOut: apiTokenOut,
          slippage: 100,
        }).catch(() => null);
        if (uniQuote && uniQuote.output && uniQuote.output.amount) {
          return api.protocols.uniswapv3.newSwapTokenLogic(uniQuote);
        }

        // 2. Agregador ParaSwap V5
        const psQuote = await api.protocols.paraswapv5.getSwapTokenQuotation(chainId, {
          input: { token: apiTokenIn, amount: quote.inputAmount },
          tokenOut: apiTokenOut,
          slippage: 100,
          excludeDEXS: ['Dexalot', 'Dexalot-42161'],
        } as any).catch(() => null);
        if (psQuote && psQuote.output && psQuote.output.amount) {
          return api.protocols.paraswapv5.newSwapTokenLogic(psQuote);
        }

        // 3. Agregador OpenOcean V2
        const ooQuote = await api.protocols.openoceanv2.getSwapTokenQuotation(chainId, {
          input: { token: apiTokenIn, amount: quote.inputAmount },
          tokenOut: apiTokenOut,
          slippage: 100,
        }).catch(() => null);
        if (ooQuote && ooQuote.output && ooQuote.output.amount) {
          return api.protocols.openoceanv2.newSwapTokenLogic(ooQuote);
        }
      } catch {
        // Breve pausa antes del reintento
        if (attempt === 0) await new Promise(r => setTimeout(r, 100));
      }
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

    const logic1 = leg1.logic || await this.getProtocolinkLogic(chainId, leg1);
    if (logic1 && logic1.fields && logic1.fields.output && logic1.fields.output.amount) {
      leg2.inputAmount = logic1.fields.output.amount;
    }
    const logic2 = leg2.logic || await this.getProtocolinkLogic(chainId, leg2);

    if (logic1 && logic2) {
      // Validar estrictamente que el retorno cubra el préstamo flash + comisión del proveedor
      if (logic2.fields && logic2.fields.output && logic2.fields.output.amount) {
        const outNum = parseFloat(logic2.fields.output.amount);
        const inNum = parseFloat(flashLoanAmount);
        const isAaveLoan = (flashLoanLoanLogic as any)?.protocolId?.toLowerCase().includes('aave') || (flashLoanLoanLogic as any)?.rid?.toLowerCase().includes('aave');
        const feeRate = isAaveLoan ? 0.0005 : 0;
        const totalRequired = inNum * (1 + feeRate);
        if (outNum < totalRequired) {
          logger.warn(`⚠️ [ARBITRAJE INVIABLE] Retorno real (${outNum}) menor que préstamo + comisión (${totalRequired}). Abortado.`);
          return { logics: [], routerData: null };
        }
      }

      const logics = [
        flashLoanLoanLogic,
        logic1,
        logic2,
        flashLoanRepayLogic,
      ];

      try {
        const routerData = {
          chainId: chainId,
          account: account,
          logics: logics,
        };

        const transactionRequest = await api.buildRouterTransactionRequest(routerData);
        if (transactionRequest && transactionRequest.to && transactionRequest.data) {
          logger.success(`✅ Router Atómico de Protocolink generado exitosamente para Chain ${chainId}.`);
          return {
            logics,
            routerData: transactionRequest,
          };
        }
      } catch (err: any) {
        const detail = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
        logger.warn(`Falló la construcción atómica del router Flash Loan en Chain ${chainId} (${detail}). Ciclo abortado por seguridad (0% capital propio).`);
      }
    }

    return { logics: [], routerData: null };
  }

  /**
   * Empaqueta un arbitraje triangular de 3 patas de forma 100% atómica con Flash Loan
   */
  async buildTriangularArbitrageTransaction(
    account: string,
    chainId: number,
    opp: {
      flashLoanAmount: string;
      tokenA: TokenConfig;
      leg1: DEXQuote;
      leg2: DEXQuote;
      leg3: DEXQuote;
    }
  ): Promise<{ logics: any[]; routerData: any | null }> {
    const { flashLoanAmount, tokenA, leg1, leg2, leg3 } = opp;
    const [flashLoanLoanLogic, flashLoanRepayLogic] = await this.getFlashLoanPair(tokenA, flashLoanAmount, chainId);
    const logic1 = leg1.logic || (await this.getProtocolinkLogic(chainId, leg1));
    const logic2 = leg2.logic || (await this.getProtocolinkLogic(chainId, leg2));
    const logic3 = leg3.logic || (await this.getProtocolinkLogic(chainId, leg3));

    if (logic1 && logic2 && logic3) {
      const logics = [
        flashLoanLoanLogic,
        logic1,
        logic2,
        logic3,
        flashLoanRepayLogic,
      ];

      try {
        const routerData = {
          chainId: chainId,
          account: account,
          logics: logics,
        };

        const transactionRequest = await api.buildRouterTransactionRequest(routerData);
        if (transactionRequest && transactionRequest.to && transactionRequest.data) {
          logger.success(`✅ Router Atómico Triangular generado exitosamente para Chain ${chainId}.`);
          return {
            logics,
            routerData: transactionRequest,
          };
        }
      } catch (err: any) {
        const detail = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
        logger.warn(`Falló la construcción atómica del router triangular en Chain ${chainId} (${detail}).`);
      }
    }

    return { logics: [], routerData: null };
  }

  /**
   * Empaqueta un Flash Bundle de 5 a 10 micro-arbitrajes atómicos en un solo viaje Multicall
   */
  async buildFlashBundleTransaction(
    account: string,
    chainId: number,
    flashLoanToken: TokenConfig,
    totalFlashLoanAmount: string,
    microOpportunities: Array<{ leg1: DEXQuote; leg2: DEXQuote }>
  ): Promise<{ logics: any[]; routerData: any | null }> {
    const [flashLoanLoanLogic, flashLoanRepayLogic] = await this.getFlashLoanPair(flashLoanToken, totalFlashLoanAmount, chainId);

    const swapLogics: any[] = [];
    for (const micro of microOpportunities) {
      try {
        const l1 = micro.leg1.logic || await this.getProtocolinkLogic(chainId, micro.leg1);
        if (l1 && l1.fields && l1.fields.output && l1.fields.output.amount) {
          micro.leg2.inputAmount = l1.fields.output.amount;
        }
        const l2 = micro.leg2.logic || await this.getProtocolinkLogic(chainId, micro.leg2);
        if (l1 && l2) {
          swapLogics.push(l1, l2);
        }
      } catch {}
    }

    if (swapLogics.length >= 2) {
      const logics = [
        flashLoanLoanLogic,
        ...swapLogics,
        flashLoanRepayLogic,
      ];

      try {
        const routerData = {
          chainId: chainId,
          account: account,
          logics: logics,
        };

        const transactionRequest = await api.buildRouterTransactionRequest(routerData);
        if (transactionRequest && transactionRequest.to && transactionRequest.data) {
          logger.success(`✅ Flash Bundle Atómico (${swapLogics.length / 2} Micro-Pares) generado para Chain ${chainId}.`);
          return {
            logics,
            routerData: transactionRequest,
          };
        }
      } catch (err: any) {
        const detail = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
        logger.warn(`Falló la construcción del Flash Bundle en Chain ${chainId} (${detail}).`);
      }
    }

    return { logics: [], routerData: null };
  }
}
