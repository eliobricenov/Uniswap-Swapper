import React, { FC, useCallback, useEffect, useState } from 'react';
import {
  ChainId,
  CurrencyAmount,
  Fetcher,
  Fraction,
  JSBI,
  Percent,
  Route,
  Token,
  TokenAmount,
  Trade,
  TradeType,
} from '@uniswap/sdk';
import formattedPriceImpact from '../FormattedPriceImpact';
import { BaseProvider } from '@ethersproject/providers';
interface SwapCandidate {
  address: string;
  name: string;
  decimals: number;
}

type Props = {
  origin: SwapCandidate;
  target: SwapCandidate;
  chainId: ChainId;
  slippagePercentage?: number;
  provider?: BaseProvider;
};

type SwapState = {
  originToken: Token | null;
  targetToken: Token | null;
  originToTarget: Route | null;
  targetToOrigin: Route | null;
};

const initialSwapState: SwapState = {
  originToken: null,
  targetToken: null,
  originToTarget: null,
  targetToOrigin: null,
};

type TradeState = {
  trade: Trade | null;
  priceImpactWithoutFee: Percent | undefined;
  realizedLPFee: CurrencyAmount | undefined | null;
  hostAmount: string;
  targetAmount: string;
};

const initialTradeState: TradeState = {
  trade: null,
  hostAmount: '',
  targetAmount: '',
  priceImpactWithoutFee: undefined,
  realizedLPFee: null,
};

const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`);
const BASE_FEE = new Percent(JSBI.BigInt(30), JSBI.BigInt(10000));
const ONE_HUNDRED_PERCENT = new Percent(JSBI.BigInt(10000), JSBI.BigInt(10000));
const INPUT_FRACTION_AFTER_FEE = ONE_HUNDRED_PERCENT.subtract(BASE_FEE);

const escapeRegExp = (input: string) => {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

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

const computeTradePriceBreakdown = (
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

const Swap: FC<Props> = ({ origin, target, chainId, provider }: Props) => {
  const [loading, setLoading] = useState(false);
  const [swapInformation, setSwapInformation] = useState(initialSwapState);
  const [tradeInformation, setTradeInformation] = useState(initialTradeState);

  const fetchRouter = useCallback(async () => {
    try {
      setLoading(true);
      const originToken = new Token(chainId, origin.address, origin.decimals);
      const targetToken = new Token(chainId, target.address, target.decimals);
      const pair = await Fetcher.fetchPairData(
        originToken,
        targetToken,
        provider,
      );
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
  }, [origin, target, chainId, provider]);

  const handleHostAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));

    if (!isValidChange) {
      return;
    }

    if (!swapInput) {
      setTradeInformation({
        ...tradeInformation,
        hostAmount: '',
        targetAmount: '',
      });
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

    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade,
    );

    setTradeInformation({
      trade,
      priceImpactWithoutFee,
      realizedLPFee,
      hostAmount: swapInput,
      targetAmount: trade.outputAmount.toSignificant(6),
    });
  };

  const handleTargetAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));

    if (!isValidChange) {
      return;
    }

    if (!swapInput) {
      setTradeInformation({
        ...tradeInformation,
        hostAmount: '',
        targetAmount: '',
      });
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

    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade,
    );

    setTradeInformation({
      trade,
      priceImpactWithoutFee,
      realizedLPFee,
      targetAmount: swapInput,
      hostAmount: trade.outputAmount.toSignificant(6),
    });
  };

  useEffect(() => {
    fetchRouter();
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
                value={tradeInformation.hostAmount}
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
                value={tradeInformation.targetAmount}
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
            {!tradeInformation.trade ? null : (
              <>
                <div>
                  {tradeInformation.trade.tradeType === TradeType.EXACT_INPUT
                    ? 'Minimum received: ' +
                      (computeSlippageAdjustedAmounts(
                        tradeInformation.trade,
                      ).min.toSignificant(4) ?? '-') +
                      (tradeInformation.trade.outputAmount.currency.symbol ??
                        '')
                    : 'Maximum sold: ' +
                      (computeSlippageAdjustedAmounts(
                        tradeInformation.trade,
                      ).max.toSignificant(4) ?? '-') +
                      (tradeInformation.trade.inputAmount.currency.symbol ??
                        '')}
                </div>
                <div>
                  Price Impact:{' '}
                  {formattedPriceImpact(tradeInformation.priceImpactWithoutFee)}
                </div>

                <div>
                  Liquidity Provider Fee:{' '}
                  {tradeInformation.realizedLPFee
                    ? tradeInformation.realizedLPFee?.toSignificant(6) +
                      ' ' +
                      (tradeInformation.trade.inputAmount.currency.symbol ?? '')
                    : '-'}
                </div>
              </>
            )}
          </>
        )}
    </>
  );
};

export default Swap;
