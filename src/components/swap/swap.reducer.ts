import { Token, Pair, Trade, Percent, CurrencyAmount } from '@uniswap/sdk';

export type State = {
  sourceToken: Token | null;
  targetToken: Token | null;
  pair: Pair | null;
  trade: Trade | null;
  priceImpactWithoutFee: Percent | undefined | null;
  realizedLPFee: CurrencyAmount | undefined | null;
  sourceAmount: string;
  targetAmount: string;
};

export enum ActionType {
  SWAP_CHANGE = 'SWAP_CHANGE',
  AMOUNT_CHANGE = 'AMOUNT_CHANGE',
  CALCULATION_CHANGE = 'CALCULATION_CHANGE',
  SWAP_DIRECTION_CHANGE = 'INVERT_DIRECTION',
  RESET_STATE = 'RESET_STATE',
}

type SwapChange = {
  type: ActionType.SWAP_CHANGE;
} & Required<Pick<State, 'sourceToken' | 'targetToken' | 'pair'>>;

type SwapCalculationChange = {
  type: ActionType.CALCULATION_CHANGE;
} & Pick<State, 'sourceAmount' | 'targetAmount'>;

type SourceAmountChange = {
  type: ActionType.AMOUNT_CHANGE;
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

type SwapDirectionChange = {
  type: ActionType.SWAP_DIRECTION_CHANGE;
} & Required<State>;

type ResetState = {
  type: ActionType.RESET_STATE;
};

export type Action =
  | SwapChange
  | SourceAmountChange
  | SwapDirectionChange
  | SwapCalculationChange
  | ResetState;

export const initialState: State = {
  sourceToken: null,
  targetToken: null,
  pair: null,
  trade: null,
  sourceAmount: '',
  targetAmount: '',
  priceImpactWithoutFee: undefined,
  realizedLPFee: null,
};

export const swapReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SWAP_CHANGE:
      return {
        ...state,
        sourceToken: action.sourceToken,
        targetToken: action.targetToken,
        pair: action.pair,
      };
    case ActionType.CALCULATION_CHANGE:
      return {
        ...state,
        sourceAmount: action.sourceAmount,
        targetAmount: action.targetAmount,
      };
    case ActionType.AMOUNT_CHANGE:
      return {
        ...state,
        trade: action.trade,
        priceImpactWithoutFee: action.priceImpactWithoutFee,
        realizedLPFee: action.realizedLPFee,
        sourceAmount: action.sourceAmount,
        targetAmount: action.targetAmount,
      };
    case ActionType.SWAP_DIRECTION_CHANGE:
      const { type, ...newState } = action;
      return newState;
    case ActionType.RESET_STATE:
      return initialState;
    default:
      return state;
  }
};
