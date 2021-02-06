import { Contract, BigNumber, providers } from 'ethers';
import { erc20ABI } from '../contracts';

export type AllowanceParams = {
  tokenAddress: string;
  signer: providers.JsonRpcSigner;
  spenderAddress: string;
  amount: string;
};

export const hasEnoughAllowance = async ({
  tokenAddress,
  signer,
  spenderAddress,
  amount,
}: AllowanceParams) => {
  const tokenContract = new Contract(tokenAddress, erc20ABI, signer);
  const currentAllowance = await tokenContract.allowance(
    signer.getAddress(),
    spenderAddress
  );

  return BigNumber.from(currentAllowance).gte(BigNumber.from(amount));
};

export const approveTransactionAmount = async ({
  tokenAddress,
  signer,
  amount,
  spenderAddress,
}: AllowanceParams) => {
  const tokenContract = new Contract(tokenAddress, erc20ABI, signer);
  const amountToAllow = BigNumber.from(amount).toHexString();
  const tx = await tokenContract.approve(spenderAddress, amountToAllow);
  await tx.wait();
};

export const approveIfRequired = async (params: AllowanceParams) => {
  const hasEnough = await hasEnoughAllowance(params);
  console.log('approveIfRequired ~ hasEnough', hasEnough);
  if (!hasEnough) {
    await approveTransactionAmount(params);
  }
};
