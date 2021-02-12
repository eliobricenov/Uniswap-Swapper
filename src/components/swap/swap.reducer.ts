import { Token, Pair, Trade, Percent, CurrencyAmount } from '@uniswap/sdk';
import { BigNumber } from 'ethers';

export type State = {
  sourceToken: Token | undefined;
  targetToken: Token | undefined;
  pair: Pair | undefined;
  trade: Trade | undefined;
  priceImpactWithoutFee: Percent | undefined;
  realizedLPFee: CurrencyAmount | undefined;
  sourceAmount: string;
  targetAmount: string;
  ethBalance: BigNumber | undefined;
  sourceTokenBalance: BigNumber | undefined;
  targetTokenBalance: BigNumber | undefined;
};

export enum ActionType {
  UPDATE_PAIR = 'PAIR_CHANGE',
  UPDATE_AMOUNT = 'AMOUNT_CHANGE',
  UPDATE_CALCULATION = 'CALCULATION_CHANGE',
  FLIP_DIRECTION_AND_RECALCULATE = 'INVERT_AND_RECALCULATE',
  FLIP_DIRECTION = 'INVERT',
  RESET = 'RESET_STATE',
}

type UpdatePair = {
  type: ActionType.UPDATE_PAIR;
} & Required<
  Pick<
    State,
    | 'sourceToken'
    | 'targetToken'
    | 'pair'
    | 'ethBalance'
    | 'sourceTokenBalance'
    | 'targetTokenBalance'
  >
>;

type UpdateAmount = {
  type: ActionType.UPDATE_CALCULATION;
} & Pick<State, 'sourceAmount' | 'targetAmount'>;

type UpdateCalculation = {
  type: ActionType.UPDATE_AMOUNT;
} & Required<
  Pick<
    State,
    | 'trade'
    | 'priceImpactWithoutFee'
    | 'realizedLPFee'
    | 'targetAmount'
    | 'sourceAmount'
  >
>;

type InvertDirectionAndRecalculate = {
  type: ActionType.FLIP_DIRECTION_AND_RECALCULATE;
} & Required<
  Omit<State, 'sourceTokenBalance' | 'targetTokenBalance' | 'ethBalance'>
>;

type InvertDirection = {
  type: ActionType.FLIP_DIRECTION;
};

type ResetState = {
  type: ActionType.RESET;
};

export type Action =
  | UpdatePair
  | UpdateAmount
  | UpdateCalculation
  | InvertDirectionAndRecalculate
  | InvertDirection
  | UpdateAmount
  | ResetState;

export const initialState: State = {
  sourceToken: undefined,
  sourceTokenBalance: undefined,
  targetTokenBalance: undefined,
  targetToken: undefined,
  pair: undefined,
  trade: undefined,
  sourceAmount: '',
  targetAmount: '',
  ethBalance: undefined,
  priceImpactWithoutFee: undefined,
  realizedLPFee: undefined,
};

export const swapReducer = (state: State, action: Action): State => {
  const { type, ...values } = action;

  switch (action.type) {
    case ActionType.FLIP_DIRECTION:
      return {
        ...state,
        sourceToken: state.targetToken,
        targetToken: state.sourceToken,
      };
    case ActionType.UPDATE_PAIR:
    case ActionType.UPDATE_CALCULATION:
    case ActionType.UPDATE_AMOUNT:
    case ActionType.FLIP_DIRECTION_AND_RECALCULATE:
      return {
        ...state,
        ...values,
      };
    case ActionType.RESET:
      return initialState;
    default:
      return state;
  }
};
