import { BigNumber, Contract, providers } from 'ethers';
import { erc20ABI } from '../contracts';

export type BalanceParams = {
  tokenAddress: string;
  amount: string;
  signer: providers.JsonRpcSigner;
};

// TODO: turn this into a hook
export const hasEnoughBalance = async ({
  tokenAddress,
  signer,
  amount,
}: BalanceParams) => {
  const tokenContract = new Contract(tokenAddress, erc20ABI, signer);
  const currentBalance = await tokenContract.balanceOf(signer.getAddress());
  return BigNumber.from(currentBalance).gte(BigNumber.from(amount));
};

export const checkBalance = async (params: BalanceParams) => {
  const enoughBalance = await hasEnoughBalance(params);

  if (!enoughBalance) {
    throw new Error('Not enough balance to make the transaction');
  }
};
