import { ChainId } from '@uniswap/sdk';
import { ethers } from 'ethers';
import Swap from './components/swap/Swap';

const defaultProvider = new ethers.providers.JsonRpcProvider(
  process.env.REACT_APP_PROVIDER_URL
);

function App() {
  return (
    <>
      <h1>SWAP</h1>
      <Swap
        chainId={ChainId.ROPSTEN}
        provider={defaultProvider}
        slippagePercentage={1}
        target={{
          address: '0x09a33be88094268360b9e340efd3657bbf351aa6'.toLowerCase(),
          name: 'stakedETH',
          symbol: 'stETH',
        }}
        onSwap={() => {}}
        onError={() => {}}
      />
    </>
  );
}

export default App;

// WETH '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
// DAI '0x6B175474E89094C44Da98b954EedeAC495271d0F'

// RINKEBY
// WETH 0xc778417E063141139Fce010982780140Aa0cD5Ab
// DAI 0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa
// USDC 0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b
// UNI 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984
