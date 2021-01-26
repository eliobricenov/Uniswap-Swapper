import { BaseProvider } from '@ethersproject/providers';
import {
  Percent,
  JSBI,
  Trade,
  CurrencyAmount,
  Fraction,
  TokenAmount,
  Token,
  Pair,
} from '@uniswap/sdk';
import { ethers } from 'ethers';
import { pairContractABI } from './contract';

const BASE_FEE = new Percent(JSBI.BigInt(30), JSBI.BigInt(10000));
const ONE_HUNDRED_PERCENT = new Percent(JSBI.BigInt(10000), JSBI.BigInt(10000));
const INPUT_FRACTION_AFTER_FEE = ONE_HUNDRED_PERCENT.subtract(BASE_FEE);

export const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`);

export const escapeRegExp = (input: string) => {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const basisPointsToPercent = (num: number): Percent => {
  return new Percent(JSBI.BigInt(num), JSBI.BigInt(10000));
};

export const computeSlippageAdjustedAmounts = (
  trade: Trade,
): Record<string, CurrencyAmount> => {
  const pct = basisPointsToPercent(2);
  return {
    max: trade.maximumAmountIn(pct),
    min: trade.minimumAmountOut(pct),
  };
};

export const computeTradePriceBreakdown = (
  trade?: Trade | null,
): {
  priceImpactWithoutFee: Percent | undefined;
  realizedLPFee: CurrencyAmount | undefined | null;
} => {
  // for each hop in our trade, take away the x*y=k price impact from 0.3% fees
  // e.g. for 3 tokens/2 hops: 1 - ((1 - .03) * (1-.03))
  const realizedLPFee = !trade
    ? undefined
    : ONE_HUNDRED_PERCENT.subtract(
        trade.route.pairs.reduce<Fraction>(
          (currentFee: Fraction): Fraction =>
            currentFee.multiply(INPUT_FRACTION_AFTER_FEE),
          ONE_HUNDRED_PERCENT,
        ),
      );

  // remove lp fees from price impact
  const priceImpactWithoutFeeFraction =
    trade && realizedLPFee
      ? trade.priceImpact.subtract(realizedLPFee)
      : undefined;

  // the x*y=k impact
  const priceImpactWithoutFeePercent = priceImpactWithoutFeeFraction
    ? new Percent(
        priceImpactWithoutFeeFraction?.numerator,
        priceImpactWithoutFeeFraction?.denominator,
      )
    : undefined;

  // the amount of the input that accrues to LPs
  const realizedLPFeeAmount =
    realizedLPFee &&
    trade &&
    (trade.inputAmount instanceof TokenAmount
      ? new TokenAmount(
          trade.inputAmount.token,
          realizedLPFee.multiply(trade.inputAmount.raw).quotient,
        )
      : CurrencyAmount.ether(
          realizedLPFee.multiply(trade.inputAmount.raw).quotient,
        ));

  return {
    priceImpactWithoutFee: priceImpactWithoutFeePercent,
    realizedLPFee: realizedLPFeeAmount,
  };
};

export const getPair = async (
  a: Token,
  b: Token,
  provider?: BaseProvider,
): Promise<Pair> => {
  const pairAddress = Pair.getAddress(a, b);

  const pairContract = new ethers.Contract(
    pairAddress,
    pairContractABI,
    provider
  );

  const reserves = await pairContract.getReserves();

  const [reserve0, reserve1] = reserves;

  const tokens = [a, b];
  const [token0, token1] = tokens[0].sortsBefore(tokens[1])
    ? tokens
    : [tokens[1], tokens[0]];

  const pair = new Pair(
    new TokenAmount(token0, reserve0),
    new TokenAmount(token1, reserve1),
  );

  return pair;
};

export const isNonCalculableChange = (value: string) => {
  const nonCalculableValues = ['', '.'];
  return nonCalculableValues.includes(value) || +value <= 0;
};
