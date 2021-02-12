import { Percent, Token, WETH } from '@uniswap/sdk';
import { ethers } from 'ethers';
import { SwapParams, SwapOperations } from './uniswap-service.types';
import swapFactory from './uniswap-factory';
import { contractAddress, contractABI } from '../contracts';

export const isWETH = (token: Token) =>
  WETH[token.chainId].address === token.address;

const getOperationType = (sourceToken: Token, targetToken: Token) => {
  if (isWETH(sourceToken)) return SwapOperations.ETH_TO_TOKEN;
  if (isWETH(targetToken)) return SwapOperations.TOKEN_TO_ETH;
  return SwapOperations.TOKEN_TO_TOKEN;
};

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

  const operationType = getOperationType(sourceToken, targetToken);

  return swapFactory({
    operationType,
    params: {
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
      signer,
    },
  });
};
