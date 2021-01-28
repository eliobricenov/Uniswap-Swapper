import { JsonRpcSigner } from '@ethersproject/providers';
import { CurrencyAmount, Pair, Percent, Token, Trade } from '@uniswap/sdk';
import { ethers } from 'ethers';

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
  hostAmount: string;
  targetAmount: string;
};

export type SwapParams = {
  sourceToken: Token;
  targetToken: Token;
  signer: JsonRpcSigner;
  trade: Trade;
  slippagePercentage: string;
};

export type SwapFactoryParams = {
  value: string;
  sourceToken: Token;
  targetToken: Token;
  uniswapContract: ethers.Contract;
  amountIn: string;
  amountOut: string;
  amountInMax: string;
  amountOutMin: string;
  path: string[];
  to: string;
  deadline: number;
};
