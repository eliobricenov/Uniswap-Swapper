import React, { FC, useMemo } from 'react';
import { CurrencyAmount, Percent, Trade, TradeType } from '@uniswap/sdk';
import { computeSlippageAdjustedAmounts } from '../../utils';
import formatPriceImpact from '../../utils/uniswap';

type Props = {
  trade: Trade;
  tradeType: TradeType;
  slippagePercentage: number;
  priceImpact?: Percent;
  realizedFee?: CurrencyAmount;
};

const TradeStats: FC<Props> = ({
  trade,
  tradeType,
  slippagePercentage,
  priceImpact,
  realizedFee,
}) => {
  const computedAmounts = useMemo(
    () => computeSlippageAdjustedAmounts(trade, slippagePercentage),
    [trade, slippagePercentage]
  );

  const label =
    tradeType === TradeType.EXACT_INPUT ? 'Minimum received:' : 'Maximum sold:';

  const currencySymbol =
    tradeType === TradeType.EXACT_INPUT
      ? trade.outputAmount.currency.symbol
      : trade.inputAmount.currency.symbol;

  const amount =
    tradeType === TradeType.EXACT_INPUT
      ? computedAmounts.min
      : computedAmounts.max;

  const formattedAmount = amount.toSignificant(4) ?? '-';
  const formattedPriceImpact = formatPriceImpact(priceImpact);
  const formattedFee = realizedFee
    ? realizedFee.toSignificant(6)
    : trade.inputAmount.currency.symbol;

  return (
    <>
      <div>{`${label} ${formattedAmount} ${currencySymbol}`}</div>
      <div>{`Price Impact: ${formattedPriceImpact}`}</div>
      <div>{`Liquidity Provider Fee: ${formattedFee}`}</div>
    </>
  );
};

export default TradeStats;
