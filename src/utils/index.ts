import { AllowanceParams, approveIfRequired } from './allowance';
import { BalanceParams, checkBalance } from './balance';

export * from './uniswap';
export * from './allowance';
export * from './balance';

export const validateTransaction = async (
  params: AllowanceParams & BalanceParams
) => {
  return Promise.all([
    checkBalance({ ...params }),
    approveIfRequired({ ...params }),
  ]);
};
