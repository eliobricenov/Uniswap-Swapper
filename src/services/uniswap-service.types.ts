import { JsonRpcSigner } from '@ethersproject/providers';
import { Token, Trade } from '@uniswap/sdk';
import { ethers } from 'ethers';

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
