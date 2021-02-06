import { SwapFactory, SwapOperations } from './uniswap-service.types';
import { validateTransaction } from '../utils';

export const swapFactory = async ({ params, operationType }: SwapFactory) => {
  const {
    value,
    sourceToken,
    uniswapContract,
    amountIn,
    amountInMax,
    amountOut,
    amountOutMin,
    path,
    to,
    deadline,
    signer,
  } = params;

  const validation = {
    signer,
    tokenAddress: sourceToken.address,
    spenderAddress: uniswapContract.address,
  };

  switch (operationType) {
    case SwapOperations.ETH_TO_TOKEN:
      await validateTransaction({
        ...validation,
        amount: value,
      });
      return uniswapContract.swapExactETHForTokens(
        amountOutMin,
        path,
        to,
        deadline,
        {
          value,
        }
      );
    case SwapOperations.TOKEN_TO_ETH:
      await validateTransaction({
        ...validation,
        amount: amountInMax,
      });
      return uniswapContract.swapTokensForExactETH(
        amountOut,
        amountInMax,
        path,
        to,
        deadline
      );
    case SwapOperations.TOKEN_TO_TOKEN:
      await validateTransaction({
        ...validation,
        amount: amountIn,
      });
      return uniswapContract.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        to,
        deadline
      );
    default:
      throw new Error('Unsupported swap operation');
  }
};

export default swapFactory;
