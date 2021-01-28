import { BaseProvider } from '@ethersproject/providers';
import {
  Percent,
  JSBI,
  Trade,
  CurrencyAmount,
  Fraction,
  TokenAmount,
  Token,
  Fetcher,
  ChainId,
  WETH,
} from '@uniswap/sdk';
import { SwapCandidate } from '../components/swap/swap.types';

const BASE_FEE = new Percent(JSBI.BigInt(30), JSBI.BigInt(10000));
const ONE_HUNDRED_PERCENT = new Percent(JSBI.BigInt(10000), JSBI.BigInt(10000));
const INPUT_FRACTION_AFTER_FEE = ONE_HUNDRED_PERCENT.subtract(BASE_FEE);

export const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`);

export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000));

/**
 * Formatted version of price impact text with warning colors
 */
export default function formatPriceImpact(priceImpact?: Percent) {
  return priceImpact
    ? priceImpact.lessThan(ONE_BIPS)
      ? '<0.01%'
      : `${priceImpact.toFixed(2)}%`
    : '-';
}

export const fetchTokenFromCandidate = async (
  chainId: ChainId,
  candidate?: SwapCandidate,
  provider?: BaseProvider
) => {
  return candidate
    ? Fetcher.fetchTokenData(
        chainId,
        candidate.address,
        provider,
        candidate.symbol,
        candidate.name
      )
    : new Token(
        chainId,
        WETH[chainId].address,
        WETH[chainId].decimals,
        'ETH',
        'Ether'
      );
};

export const escapeRegExp = (input: string) => {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const basisPointsToPercent = (num: number): Percent => {
  return new Percent(JSBI.BigInt(num), JSBI.BigInt(10000));
};

export const computeSlippageAdjustedAmounts = (
  trade: Trade,
  allowedSlippage: number
): Record<string, CurrencyAmount> => {
  const pct = basisPointsToPercent(allowedSlippage);
  return {
    max: trade.maximumAmountIn(pct),
    min: trade.minimumAmountOut(pct),
  };
};

export const computeTradePriceBreakdown = (
  trade?: Trade | null
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
          ONE_HUNDRED_PERCENT
        )
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
        priceImpactWithoutFeeFraction?.denominator
      )
    : undefined;

  // the amount of the input that accrues to LPs
  const realizedLPFeeAmount =
    realizedLPFee &&
    trade &&
    (trade.inputAmount instanceof TokenAmount
      ? new TokenAmount(
          trade.inputAmount.token,
          realizedLPFee.multiply(trade.inputAmount.raw).quotient
        )
      : CurrencyAmount.ether(
          realizedLPFee.multiply(trade.inputAmount.raw).quotient
        ));

  return {
    priceImpactWithoutFee: priceImpactWithoutFeePercent,
    realizedLPFee: realizedLPFeeAmount,
  };
};

export const isNonCalculableChange = (value: string) => {
  const nonCalculableValues = ['', '.'];
  return nonCalculableValues.includes(value) || +value <= 0;
};
