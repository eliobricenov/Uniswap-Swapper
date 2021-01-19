import { FC, useCallback, useEffect, useState } from 'react';
import { ChainId, Fetcher, Route, Token } from '@uniswap/sdk';

const chainId = ChainId.MAINNET;

export interface SwapCandidate {
  address: string;
  name: string;
}

type Props = {
  hostSwap: SwapCandidate;
  targetSwap: SwapCandidate;
};

const Swap: FC<Props> = ({ hostSwap, targetSwap }: Props) => {
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<Route | null>(null);
  const [hostAmount, setHostAmount] = useState(0);
  const [targetAmount, setTargetAmount] = useState(0);

  const fetchRouter = useCallback(async () => {
    try {
      setLoading(true);
      const hostToken = new Token(chainId, hostSwap.address, 18);
      const targetToken = new Token(chainId, targetSwap.address, 18);
      const pair = await Fetcher.fetchPairData(hostToken, targetToken);
      const route = new Route([pair], targetToken);
      setRoute(route);
      setHostAmount(+route.midPrice.toSignificant(6));
      setTargetAmount(+route.midPrice.invert().toSignificant(6));
    } catch (error) {
      console.log('error =>', error);
    } finally {
      setLoading(false);
    }
  }, [hostSwap, targetSwap]);

  const handleHostAmountChange = (change: number) => {};

  const handleTargetAmountChange = () => {};

  useEffect(() => {
    fetchRouter();
  }, [fetchRouter]);

  return (
    <>
      {loading && <span>Loading</span>}
      <label>
        Host Amount:
        <br />
        <br />
        <input
          value={hostAmount}
          type="number"
          name="hostAmount"
          onChange={(v) => setHostAmount(+v.target.value)}
        />
      </label>
      <br />
      <br />
      <label>
        Target Amount:
        <br />
        <br />
        <input
          value={targetAmount}
          type="number"
          name="targetAmount"
          onChange={(v) => setTargetAmount(+v.target.value)}
        />
      </label>
    </>
  );
};

export default Swap;
