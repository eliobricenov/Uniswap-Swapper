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
  Percent,
  Fraction,
} from '@uniswap/sdk';

const chainId = ChainId.MAINNET;
const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`);
const escapeRegExp = (input: string) => {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const BASE_FEE = new Percent(JSBI.BigInt(30), JSBI.BigInt(10000));
const ONE_HUNDRED_PERCENT = new Percent(JSBI.BigInt(10000), JSBI.BigInt(10000));
const INPUT_FRACTION_AFTER_FEE = ONE_HUNDRED_PERCENT.subtract(BASE_FEE);

const getPriceImpact = (trade: Trade) => {
  const realizedLPFee = ONE_HUNDRED_PERCENT.subtract(
    trade.route.pairs.reduce<Fraction>(
      (currentFee: Fraction): Fraction =>
        currentFee.multiply(INPUT_FRACTION_AFTER_FEE),
      ONE_HUNDRED_PERCENT,
    ),
  );

  const priceImpactWithoutFeeFraction = trade.priceImpact.subtract(
    realizedLPFee,
  );

  return new Percent(
    priceImpactWithoutFeeFraction?.numerator,
    priceImpactWithoutFeeFraction?.denominator,
  );
};

export interface SwapCandidate {
  address: string;
  name: string;
  decimals: number;
}

type Props = {
  hostToken: SwapCandidate;
  targetToken: SwapCandidate;
  slippagePercentage?: number;
};

type SwapValue = {
  displayValue: string;
  value: number;
};

const Swap: FC<Props> = ({
  hostToken,
  targetToken,
  slippagePercentage = 1,
}: Props) => {
  // const slippageTolerance = new Percent(
  //   JSBI.BigInt(slippagePercentage),
  //   JSBI.BigInt(10000),
  // );
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<Route | null>(null);
  const [hostAmount, setHostAmount] = useState('');
  const [targetAmount, setTargetAmount] = useState('');

  const fetchRouter = useCallback(async () => {
    try {
      setLoading(true);
      const host = new Token(chainId, hostToken.address, hostToken.decimals);
      const target = new Token(
        chainId,
        targetToken.address,
        targetToken.decimals,
      );
      const pair = await Fetcher.fetchPairData(host, target);
      const route = new Route([pair], host);
      setRoute(route);
    } catch (error) {
      console.log('error =>', error);
    } finally {
      setLoading(false);
    }
  }, [hostToken, targetToken]);

  const handleHostAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));

    if (!isValidChange) {
      return;
    }

    if (!swapInput) {
      setHostAmount('');
      setTargetAmount('');
      return
    }

    const host = new Token(chainId, hostToken.address, hostToken.decimals);
    const amount = new TokenAmount(
      host,
      JSBI.multiply(
        JSBI.BigInt(swapInput),
        JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(hostToken.decimals)),
      ),
    );
    const trade = new Trade(route!, amount, TradeType.EXACT_INPUT);
    setHostAmount(swapInput);
    setTargetAmount(trade.outputAmount.toSignificant(6));
  };

  const handleTargetAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));

    if (!isValidChange) {
      return;
    }

    if (!swapInput) {
      setHostAmount('');
      setTargetAmount('');
      return
    }

    const host = new Token(chainId, hostToken.address, hostToken.decimals);
    const amount = new TokenAmount(
      host,
      JSBI.multiply(
        JSBI.BigInt(swapInput),
        JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(hostToken.decimals)),
      ),
    );
    const trade = new Trade(route!, amount, TradeType.EXACT_INPUT);
    setTargetAmount(swapInput);
    setHostAmount(trade.outputAmount.invert().toSignificant(6));
  };

  useEffect(() => {
    fetchRouter();

    return () => {
      setHostAmount('');
      setTargetAmount('');
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
              value={hostAmount}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              placeholder="0.0"
              minLength={1}
              name="hostAmount"
              onChange={(v) => handleHostAmountChange(v.target.value)}
            />
          </label>
          <br />
          <br />
          <label>
            {`To (${targetToken.name}):`}
            <br />
            <br />
            <input
              value={targetAmount}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              placeholder="0.0"
              minLength={1}
              onChange={(v) => handleTargetAmountChange(v.target.value)}
            />
          </label>
          <br />
          <br />
          {/* {hostAmount.value !== 0 && targetAmount.value !== 0 && (
            <>
              <span>{`Price ${trade.executionPrice.invert().toSignificant(6)} ${
                hostToken.name
              } per ${targetToken.name}`}</span>
              <br />
              <br />
              {trade && (
                <>
                  <br />
                  <br />
                  <span>
                    {`Minimum Received: ${
                      trade.minimumAmountOut(slippageTolerance).raw
                    }`}
                  </span>
                  <br />
                  <br />
                  <span>{`Price Impact: ${getPriceImpact(trade).toFixed(
                    6,
                  )}`}</span>
                  <br />
                  <br />
                  <span>
                    {`Liquidity Provider Fee: ${hostAmount.value * 0.003} ${
                      hostToken.name
                    }`}
                  </span>
                </>
              )}
            </>
          )} */}
        </>
      )}
    </>
  );
};

export default Swap;
