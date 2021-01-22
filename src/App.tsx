import Swap from './components/swap/Swap';

function App() {
  return (
    <>
      <h1>React</h1>
      <Swap
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
