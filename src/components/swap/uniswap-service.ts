import { Percent, Token, WETH } from '@uniswap/sdk';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from './contract';
import { SwapParams, SwapFactoryParams } from './swap.types';

export const makeSwap = async ({
  sourceToken,
  targetToken,
  signer,
  trade,
  slippagePercentage,
}: SwapParams) => {
  const uniswapContract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  );

  const slippageTolerance = new Percent(slippagePercentage, '1000');

  const amountIn = ethers.BigNumber.from(
    trade.inputAmount.raw.toString()
  ).toHexString();

  const amountOut = ethers.BigNumber.from(
    trade.outputAmount.raw.toString()
  ).toHexString();

  const amountOutMin = ethers.BigNumber.from(
    trade.minimumAmountOut(slippageTolerance).raw.toString()
  ).toHexString();

  const amountInMax = ethers.BigNumber.from(
    trade.maximumAmountIn(slippageTolerance).raw.toString()
  ).toHexString();

  const path = [sourceToken.address, targetToken.address];
  const to = await signer.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const value = ethers.BigNumber.from(
    trade.inputAmount.raw.toString()
  ).toHexString();

  return swapFactory({
    value,
    sourceToken,
    targetToken,
    uniswapContract,
    amountIn,
    amountOut,
    amountOutMin,
    amountInMax,
    path,
    to,
    deadline,
  });
};

const isWETH = (token: Token) => WETH[token.chainId].address === token.address;

const swapFactory = async ({
  value,
  sourceToken,
  targetToken,
  uniswapContract,
  amountIn,
  amountInMax,
  amountOut,
  amountOutMin,
  path,
  to,
  deadline,
}: SwapFactoryParams) => {
  if (isWETH(sourceToken)) {
    return uniswapContract.swapExactETHForTokens(
      amountOutMin,
      path,
      to,
      deadline,
      {
        value,
      }
    );
  }

  if (isWETH(targetToken)) {
    return uniswapContract.swapTokensForExactETH(
      amountOut,
      amountInMax,
      path,
      to,
      deadline
    );
  }

  return uniswapContract.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    path,
    to,
    deadline
  );
};
