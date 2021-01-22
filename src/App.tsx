import { ChainId } from '@uniswap/sdk';
import { ethers } from 'ethers';
import Swap from './components/swap/Swap';

const defaultProvider = new ethers.providers.JsonRpcProvider(
  `https://eth-mainnet.alchemyapi.io/v2/${process.env.REACT_APP_ALCHEMY_API_KEY}`,
);

function App() {
  return (
    <>
      <h1>React</h1>
      <Swap
        chainId={ChainId.MAINNET}
        provider={defaultProvider}
        origin={{
          name: 'WETH',
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          decimals: 18,
        }}
        target={{
          name: 'DAI',
          address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          decimals: 18,
        }}
      />
    </>
  );
}

export default App;

// DAI '0x6B175474E89094C44Da98b954EedeAC495271d0F'
// WETH '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
