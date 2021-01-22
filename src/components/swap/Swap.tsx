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
  CurrencyAmount,
} from '@uniswap/sdk';

const chainId = ChainId.MAINNET;
const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`);
const escapeRegExp = (input: string) => {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// const BASE_FEE = new Percent(JSBI.BigInt(30), JSBI.BigInt(10000));
// const ONE_HUNDRED_PERCENT = new Percent(JSBI.BigInt(10000), JSBI.BigInt(10000));
// const INPUT_FRACTION_AFTER_FEE = ONE_HUNDRED_PERCENT.subtract(BASE_FEE);

// const getPriceImpact = (trade: Trade) => {
//   const realizedLPFee = ONE_HUNDRED_PERCENT.subtract(
//     trade.route.pairs.reduce<Fraction>(
//       (currentFee: Fraction): Fraction =>
//         currentFee.multiply(INPUT_FRACTION_AFTER_FEE),
//       ONE_HUNDRED_PERCENT,
//     ),
//   );

//   const priceImpactWithoutFeeFraction = trade.priceImpact.subtract(
//     realizedLPFee,
//   );

//   return new Percent(
//     priceImpactWithoutFeeFraction?.numerator,
//     priceImpactWithoutFeeFraction?.denominator,
//   );
// };

const basisPointsToPercent = (num: number): Percent => {
  return new Percent(JSBI.BigInt(num), JSBI.BigInt(10000));
};

const computeSlippageAdjustedAmounts = (
  trade: Trade,
): Record<string, CurrencyAmount> => {
  const pct = basisPointsToPercent(2);
  return {
    max: trade.maximumAmountIn(pct),
    min: trade.minimumAmountOut(pct),
  };
};

export interface SwapCandidate {
  address: string;
  name: string;
  decimals: number;
}

type Props = {
  origin: SwapCandidate;
  target: SwapCandidate;
  slippagePercentage?: number;
};

type TradeState = {
  originToken: Token | null;
  targetToken: Token | null;
  originToTarget: Route | null;
  targetToOrigin: Route | null;
};

const initialState: TradeState = {
  originToken: null,
  targetToken: null,
  originToTarget: null,
  targetToOrigin: null,
};

const Swap: FC<Props> = ({ origin, target }: Props) => {
  const [loading, setLoading] = useState(false);
  const [swapInformation, setSwapInformation] = useState(initialState);
  const [hostAmount, setHostAmount] = useState('');
  const [targetAmount, setTargetAmount] = useState('');

  const fetchRouter = useCallback(async () => {
    try {
      setLoading(true);
      const originToken = new Token(chainId, origin.address, origin.decimals);
      const targetToken = new Token(chainId, target.address, target.decimals);
      const pair = await Fetcher.fetchPairData(originToken, targetToken);
      const originToTarget = new Route([pair], originToken);
      const targetToOrigin = new Route([pair], targetToken);
      setSwapInformation({
        originToken,
        targetToken,
        originToTarget,
        targetToOrigin,
      });
    } catch (error) {
      console.log('error =>', error);
    } finally {
      setLoading(false);
    }
  }, [origin, target]);

  const handleHostAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));

    if (!isValidChange) {
      return;
    }

    if (!swapInput) {
      setHostAmount('');
      setTargetAmount('');
      return;
    }

    const { originToken, originToTarget } = swapInformation;
    const amount = new TokenAmount(
      originToken!,
      JSBI.multiply(
        JSBI.BigInt(swapInput),
        JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(origin.decimals)),
      ),
    );
    const trade = new Trade(originToTarget!, amount, TradeType.EXACT_INPUT);
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
      return;
    }

    const { targetToken, targetToOrigin } = swapInformation;
    const amount = new TokenAmount(
      targetToken!,
      JSBI.multiply(
        JSBI.BigInt(swapInput),
        JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(target.decimals)),
      ),
    );
    const trade = new Trade(targetToOrigin!, amount, TradeType.EXACT_INPUT);
    setTargetAmount(swapInput);
    setHostAmount(trade.outputAmount.toSignificant(6));
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
      {swapInformation.originToTarget &&
        swapInformation.targetToOrigin &&
        !loading && (
          <>
            <label>
              {`From (${origin.name}): `}
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
              {`To (${target.name}):`}
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
          </>
        )}
    </>
  );
};

export default Swap;
