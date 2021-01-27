import { JsonRpcSigner } from '@ethersproject/providers';
import { Pair, Percent, Trade } from '@uniswap/sdk';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from './contract';

type SwapParams = {
  signer: JsonRpcSigner;
  pair: Pair;
  trade: Trade;
  slippagePercentage: string;
};

export const makeSwap = async ({
  signer,
  pair,
  trade,
  slippagePercentage,
}: SwapParams) => {
  const uniswapContract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer,
  );

  const slippageTolerance = new Percent(slippagePercentage, '1000');

  const amountIn = ethers.BigNumber.from(
    trade.inputAmount.raw.toString(),
  ).toHexString();

  const amountOutMin = ethers.BigNumber.from(
    trade.minimumAmountOut(slippageTolerance).raw.toString(),
  ).toHexString();

  const path = [pair.token1.address, pair.token0.address];
  const to = await signer.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  return uniswapContract.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    path,
    to,
    deadline,
  );
};
