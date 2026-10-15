import { LendingPoolConfig, LiquidationCandidate } from './liquidationScanner';
import { TOKENS } from '../config/registry';

export const LENDING_POOLS: LendingPoolConfig[] = [
  // 🔵 Base Moonwell & Aave V3
  {
    protocol: 'AAVE_V3',
    chainId: 8453,
    poolAddress: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    liquidationBonusPercent: 5.0,
    oracleAddress: '0x21058C8c75e34e36949420bcF38d5494999939a3'
  },
  {
    protocol: 'MOONWELL',
    chainId: 8453,
    poolAddress: '0xfBb21E4450756fe9307018b456CebE40CeF44321',
    liquidationBonusPercent: 8.0,
    oracleAddress: '0x21058C8c75e34e36949420bcF38d5494999939a3'
  },
  {
    protocol: 'MORPHO_BLUE',
    chainId: 8453,
    poolAddress: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
    liquidationBonusPercent: 8.5,
    oracleAddress: '0x21058C8c75e34e36949420bcF38d5494999939a3'
  },

  // 🔷 Arbitrum Aave V3 & Radiant
  {
    protocol: 'AAVE_V3',
    chainId: 42161,
    poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    liquidationBonusPercent: 5.0,
    oracleAddress: '0xb56c2F0B653B2e0b10C9b928C8580Ac5Df02C7C7'
  },
  {
    protocol: 'RADIANT',
    chainId: 42161,
    poolAddress: '0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1',
    liquidationBonusPercent: 10.0,
    oracleAddress: '0xb56c2F0B653B2e0b10C9b928C8580Ac5Df02C7C7'
  },

  // 🟢 Ethereum Mainnet Aave V3 & Compound V3 & Morpho Blue
  {
    protocol: 'AAVE_V3',
    chainId: 1,
    poolAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    liquidationBonusPercent: 5.0,
    oracleAddress: '0x54586bE62E3c3580375aE3723C145253060Ca0C2'
  },
  {
    protocol: 'COMPOUND_V3',
    chainId: 1,
    poolAddress: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    liquidationBonusPercent: 7.0,
    oracleAddress: '0x54586bE62E3c3580375aE3723C145253060Ca0C2'
  },
  {
    protocol: 'MORPHO_BLUE',
    chainId: 1,
    poolAddress: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
    liquidationBonusPercent: 8.5,
    oracleAddress: '0x54586bE62E3c3580375aE3723C145253060Ca0C2'
  }
];

export function getSampleLiquidationCandidates(): LiquidationCandidate[] {
  return [
    {
      userAddress: '0x71C000000000000000000000000000000000089A',
      protocol: 'AAVE_V3',
      chainId: 8453,
      debtToken: TOKENS.USDC_BASE,
      collateralToken: TOKENS.WETH_BASE,
      debtToCoverUSD: 4500,
      healthFactor: 0.985,
      liquidationBonusPercent: 5.0
    },
    {
      userAddress: '0x42A000000000000000000000000000000000091B',
      protocol: 'RADIANT',
      chainId: 42161,
      debtToken: TOKENS.USDT_ARB,
      collateralToken: TOKENS.WBTC_ARB,
      debtToCoverUSD: 12500,
      healthFactor: 0.972,
      liquidationBonusPercent: 10.0
    },
    {
      userAddress: '0x99F000000000000000000000000000000000033C',
      protocol: 'MORPHO_BLUE',
      chainId: 1,
      debtToken: TOKENS.DAI_ETH,
      collateralToken: TOKENS.WSTETH_ETH,
      debtToCoverUSD: 35000,
      healthFactor: 0.965,
      liquidationBonusPercent: 8.5
    }
  ];
}
