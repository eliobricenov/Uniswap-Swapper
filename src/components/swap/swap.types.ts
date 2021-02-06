import { CurrencyAmount, Pair, Percent, Token, Trade } from '@uniswap/sdk';

export type SwapCandidate = {
  address: string;
  name: string;
  symbol: string;
};

export type SwapState = {
  sourceToken: Token | null;
  targetToken: Token | null;
  pair: Pair | null;
};

export type TradeInformation = {
  trade: Trade | null;
  priceImpactWithoutFee: Percent | undefined;
  realizedLPFee: CurrencyAmount | undefined | null;
  sourceAmount: string;
  targetAmount: string;
};
