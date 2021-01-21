import { FC, useCallback, useEffect, useState } from 'react';
import {
  ChainId,
  Fetcher,
  Route,
  Token,
  TokenAmount,
  Trade,
  TradeType,
  JSBI,
} from '@uniswap/sdk';

const chainId = ChainId.MAINNET;
const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`);

// zero values are turned into ''
const sanitizeZeroValues = (value: string) => (+value > 0 ? value : '');

const escapeRegExp = (input: string) => {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export interface SwapCandidate {
  address: string;
  name: string;
}

type Props = {
  hostToken: SwapCandidate;
  targetToken: SwapCandidate;
};

type SwapValue = {
  displayValue: string;
  value: number;
};

const defaultSwapValue: SwapValue = { displayValue: '', value: 0 };

const Swap: FC<Props> = ({ hostToken, targetToken }: Props) => {
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<Route | null>(null);
  const [hostAmount, setHostAmount] = useState<SwapValue>(defaultSwapValue);
  const [targetAmount, setTargetAmount] = useState<SwapValue>(defaultSwapValue);
  const [trade, setTrade] = useState<Trade | null>();

  const fetchRouter = useCallback(async () => {
    try {
      setLoading(true);
      const host = new Token(chainId, hostToken.address, 18);
      const target = new Token(chainId, targetToken.address, 18);
      const pair = await Fetcher.fetchPairData(host, target);
      const route = new Route([pair], host);
      setRoute(route);
    } catch (error) {
      console.log('error =>', error);
    } finally {
      setLoading(false);
    }
  }, [hostToken, targetToken]);

  const handleHostAmountChange = (swapInput: string, route: Route) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));

    if (!isValidChange) {
      return;
    }

    const hostToTargetSwapValue = +route.midPrice.toSignificant(6);
    const amountCalculation = +swapInput * hostToTargetSwapValue;
    const newTargetAmount = amountCalculation.toPrecision(6);

    setHostAmount({
      displayValue: sanitizeZeroValues(swapInput),
      value: +swapInput,
    });

    setTargetAmount({
      displayValue: sanitizeZeroValues(String(newTargetAmount)),
      value: +newTargetAmount,
    });
  };

  const handleTargetAmountChange = (change: string, route: Route) => {
    const isValidChange = inputRegex.test(escapeRegExp(change));

    if (!isValidChange) {
      return;
    }

    const targetToHostSwapValue = +route.midPrice.invert().toSignificant(6);
    const amountCalculation = +change * targetToHostSwapValue;
    const newHostAmount = amountCalculation.toPrecision(6);

    setTargetAmount({
      displayValue: sanitizeZeroValues(change),
      value: +change,
    });

    setHostAmount({
      displayValue: sanitizeZeroValues(String(newHostAmount)),
      value: +newHostAmount,
    });
  };

  useEffect(() => {
    if (route && hostToken.address && targetAmount.value > 0) {
      const host = new Token(chainId, hostToken.address, 18);
      const amount = new TokenAmount(
        host,
        JSBI.BigInt(Math.trunc(targetAmount.value)),
      );
      setTrade(new Trade(route, amount, TradeType.EXACT_INPUT));
    }
  }, [route, hostToken, targetAmount]);

  useEffect(() => {
    fetchRouter();

    return () => {
      setHostAmount(defaultSwapValue);
      setTargetAmount(defaultSwapValue);
    };
  }, [fetchRouter]);

  return (
    <>
      {loading && <span>Loading</span>}
      {route && !loading && (
        <>
          <label>
            {`From (${hostToken.name}): `}
            <br />
            <br />
            <input
              value={hostAmount.displayValue}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              placeholder="0.0"
              minLength={1}
              name="hostAmount"
              onChange={(v) => handleHostAmountChange(v.target.value, route)}
            />
          </label>
          <br />
          <br />
          <label>
            {`To (${targetToken.name}):`}
            <br />
            <br />
            <input
              value={targetAmount.displayValue}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              placeholder="0.0"
              minLength={1}
              onChange={(v) => handleTargetAmountChange(v.target.value, route)}
            />
          </label>
          <br />
          <br />
          {hostAmount.value !== 0 && targetAmount.value !== 0 && (
            <span>{`Price ${route.midPrice.toSignificant(6)} ${
              hostToken.name
            } per ${targetToken.name}`}</span>
          )}
        </>
      )}
    </>
  );
};

export default Swap;
