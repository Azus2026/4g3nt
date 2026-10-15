import { ethers } from 'ethers';

export interface KnownPoolEntry {
  fee: number;
  address: string;
  protocol: string;
}

export const KNOWN_ONCHAIN_POOLS: Record<string, KnownPoolEntry[]> = {
  // === ARBITRUM (42161) ===
  '42161-WETH-USDC': [
    { fee: 500, address: '0xC6962004f452bE9203591991D15f6b388e09E8D0', protocol: 'uniswap-v3' },
    { fee: 3000, address: '0xc473e2aEE3441BF9240Be85eb122aBB059A3B57c', protocol: 'uniswap-v3-3000' },
    { fee: 100, address: '0x6f38e88e36bf22bf2a64c47814b7e8d479eb6782', protocol: 'uniswap-v3-100' },
    { fee: 500, address: '0xd9e2a1a61B6E61b275cEc326465d417e52C1b95c', protocol: 'pancakeswap-v3' },
    { fee: 500, address: '0xd9e2a1a61B6E61b275cEc326465d417e52C1b95c', protocol: 'camelot-v3' },
    { fee: 500, address: '0xf3Eb87C1F6020982173C908E7eB31aA66c1f0296', protocol: 'sushiswap-v3' }
  ],
  '42161-WETH-USDC.e': [
    { fee: 500, address: '0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443', protocol: 'uniswap-v3' },
    { fee: 3000, address: '0x17c14D2c40463234F53830bee64bE9cA5fa7cf57', protocol: 'uniswap-v3-3000' }
  ],
  '42161-WETH-USDT': [
    { fee: 500, address: '0x641C00A822e8b671738d32a431a4FB6074E5c79d', protocol: 'uniswap-v3' },
    { fee: 3000, address: '0xc82819f72a9e77e2c0c3a69B3196478f4430366E', protocol: 'uniswap-v3-3000' }
  ],
  '42161-WETH-ARB': [
    { fee: 500, address: '0xC6F780497A95e246EB9449f5e4770916DCd6396A', protocol: 'uniswap-v3' },
    { fee: 3000, address: '0x92c63D99A9DaA1E2CcfE97c9bca97F3d2D754124', protocol: 'uniswap-v3-3000' },
    { fee: 500, address: '0x0d7c4b40018969f81750d0a164c3839a77353EFB', protocol: 'pancakeswap-v3' },
    { fee: 500, address: '0x0d7c4b40018969f81750d0a164c3839a77353EFB', protocol: 'camelot-v3' }
  ],
  '42161-USDC-ARB': [
    { fee: 500, address: '0xb0f6cA817C649B2Ff419c8A6EFE3255C8F8C8113', protocol: 'uniswap-v3' },
    { fee: 3000, address: '0xaEBDcA9412F5e557bA562B2F4Acf7F7bAeaF142D', protocol: 'uniswap-v3-3000' }
  ],
  '42161-WBTC-WETH': [
    { fee: 500, address: '0x2f5e87C931237A3a792A995429460a927705193B', protocol: 'uniswap-v3' },
    { fee: 3000, address: '0x149e36e72726e0bcea5c45d017f7C41427770497', protocol: 'uniswap-v3-3000' }
  ],
  '42161-USDC-USDC.e': [
    { fee: 100, address: '0x8e295789c934f4d439e403d15951d3b070bb23ec', protocol: 'uniswap-v3-100' },
    { fee: 500, address: '0xA9E9CB6a8435d8868846394593Ac7bF5fFf9F5a6', protocol: 'uniswap-v3' }
  ],
  '42161-USDC-USDT': [
    { fee: 100, address: '0xbE3aD6a84615DF91e779aFcaB05D6a350519e48c', protocol: 'uniswap-v3-100' },
    { fee: 500, address: '0xbcE73c78491325492d2448374a4968C0FaD0B58D', protocol: 'uniswap-v3' }
  ],
  '42161-WETH-wstETH': [
    { fee: 100, address: '0x35218a643914752945214041198242484a921d7b', protocol: 'uniswap-v3-100' },
    { fee: 500, address: '0xb93F8aD5d9a9F68B3597DFF85C3f2C2aF75d4001', protocol: 'uniswap-v3' }
  ],

  // === BASE (8453) ===
  '8453-WETH-USDC': [
    { fee: 500, address: '0xd0b53D9277642d899DF5C87A3966A349A798F224', protocol: 'uniswap-v3' },
    { fee: 3000, address: '0x6c561B4584216C6Db4784a919D9F88A110825BcA', protocol: 'uniswap-v3-3000' },
    { fee: 500, address: '0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59', protocol: 'aerodrome-slipstream' },
    { fee: 500, address: '0xB775272E537cc670C65DC852908aD47015244EaF', protocol: 'pancakeswap-v3' }
  ],
  '8453-WETH-USDT': [
    { fee: 500, address: '0xd92E07A250B3e1c953531b4B841804f323869279', protocol: 'uniswap-v3' },
    { fee: 3000, address: '0xcE1d8c1c4f42E1Ff7b494b5952f4E776dF3510e4', protocol: 'uniswap-v3-3000' }
  ],
  '8453-WETH-AERO': [
    { fee: 3000, address: '0x3d5D142e057E940a08e1687f8749E7f07e53f18e', protocol: 'uniswap-v3-3000' },
    { fee: 500, address: '0x9E882399CdF65bF6F6d3Fe6689d0a790518eC0a3', protocol: 'uniswap-v3' }
  ],
  '8453-USDC-AERO': [
    { fee: 3000, address: '0x2426DC8807F1c3A87B11874251B423f03b5D8b21', protocol: 'uniswap-v3-3000' },
    { fee: 500, address: '0xE5B5f532f8D444Fec8BfD9E4a7BffF2D172B52a9', protocol: 'uniswap-v3' }
  ],
  '8453-cbBTC-WETH': [
    { fee: 500, address: '0x7AeA2EBEA773Fba25f8263595C3C6f125d03C880', protocol: 'uniswap-v3' },
    { fee: 3000, address: '0x8c7080fF878D3a284687C5fD7B1a141b7A8B781a', protocol: 'uniswap-v3-3000' }
  ],

  // === OPTIMISM (10) ===
  '10-WETH-USDC': [
    { fee: 500, address: '0x85149247691df622eaF1a8Bd0CaFd40BC45154a9', protocol: 'uniswap-v3' },
    { fee: 3000, address: '0x1fb3cfbd2313d01b4491799a4c8491c13d96ec09', protocol: 'uniswap-v3-3000' }
  ],
  '10-WETH-OP': [
    { fee: 3000, address: '0x68F5C0A2DE713a54991E01858Fd27a3832401849', protocol: 'uniswap-v3-3000' },
    { fee: 500, address: '0xFC163968270146059c1186e8A9C198E45e7fdf13', protocol: 'uniswap-v3' }
  ],

  // === POLYGON (137) ===
  '137-WETH-USDC': [
    { fee: 500, address: '0x45dDa9cb7c25131DF268515131f647d726f50608', protocol: 'uniswap-v3' },
    { fee: 3000, address: '0x50ea4bde4a413efb8e21a2c34d5ea8d3b8782fb5', protocol: 'uniswap-v3-3000' }
  ]
};

const UNISWAP_V3_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_V3_INIT_CODE_HASH = '0xe34f199b19b2b4f47f68442619d555527d244f78a32977f00d33e0892040b016';

export function computeUniV3PoolAddress(
  tokenA: string,
  tokenB: string,
  fee: number,
  factory: string = UNISWAP_V3_FACTORY,
  initCodeHash: string = UNISWAP_V3_INIT_CODE_HASH
): string {
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
  const salt = ethers.solidityPackedKeccak256(
    ['address', 'address', 'uint24'],
    [token0, token1, fee]
  );
  return ethers.getCreate2Address(factory, salt, initCodeHash);
}

export function getKnownPoolAddress(chainId: number, token0Symbol: string, token1Symbol: string, feeTier: number = 500): string | null {
  const key1 = `${chainId}-${token0Symbol}-${token1Symbol}`;
  const key2 = `${chainId}-${token1Symbol}-${token0Symbol}`;

  const list = KNOWN_ONCHAIN_POOLS[key1] || KNOWN_ONCHAIN_POOLS[key2];
  if (list) {
    const match = list.find(e => e.fee === feeTier) || list[0];
    if (match) return match.address;
  }

  return null;
}
