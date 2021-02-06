import { FC, useCallback, useEffect, useReducer, useState } from 'react';
import { ChainId, Fetcher, TradeType } from '@uniswap/sdk';
import { BaseProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import {
  escapeRegExp,
  computeTradePriceBreakdown,
  inputRegex,
  isNonCalculableChange,
  fetchTokenFromCandidate,
  getTrade,
} from '../../utils/uniswap';
import { makeSwap } from '../../services/uniswap-service';
import { SwapCandidate } from './swap.types';
import SwapInput from '../swap-input/SwapInput';
import TradeStats from '../trade-stats/TradeStats';
import { ActionType, State, swapReducer } from './swap.reducer';

type Props = {
  chainId: ChainId;
  source?: SwapCandidate;
  target?: SwapCandidate;
  slippagePercentage: number;
  provider?: BaseProvider;
  onError: (error: any) => void;
  onSwap: (swap: any) => void;
};

const initialState: State = {
  sourceToken: null,
  targetToken: null,
  pair: null,
  trade: null,
  sourceAmount: '',
  targetAmount: '',
  priceImpactWithoutFee: undefined,
  realizedLPFee: null,
};

const Swap: FC<Props> = ({
  source,
  target,
  chainId,
  provider,
  slippagePercentage,
  onSwap,
  onError,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [state, dispatch] = useReducer(swapReducer, initialState);

  const fetchPair = useCallback(async () => {
    try {
      setLoading(true);
      const [sourceToken, targetToken] = await Promise.all([
        fetchTokenFromCandidate(chainId, source, provider),
        fetchTokenFromCandidate(chainId, target, provider),
      ]);
      const pair = await Fetcher.fetchPairData(
        sourceToken,
        targetToken,
        provider
      );
      dispatch({
        type: ActionType.SWAP_CHANGE,
        sourceToken,
        targetToken,
        pair,
      });
    } catch (error) {
      onError(error);
      console.error('error =>', error);
    } finally {
      setLoading(false);
    }
  }, [source, target, chainId, provider, onError]);

  const invertSwapDirection = () => {
    const {
      sourceToken,
      targetToken,
      pair,
      targetAmount,
      sourceAmount,
    } = state;

    if (!pair || !targetToken) {
      return;
    }

    const trade = getTrade(targetAmount, targetToken, pair);
    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade
    );

    dispatch({
      type: ActionType.SWAP_DIRECTION_CHANGE,
      sourceToken: targetToken,
      targetToken: sourceToken,
      pair,
      trade,
      priceImpactWithoutFee,
      realizedLPFee,
      sourceAmount: targetAmount,
      targetAmount: sourceAmount,
    });
  };

  const handleSourceAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));
    const { sourceToken, pair } = state;

    if (!isValidChange || !pair || !sourceToken) {
      return;
    }

    if (isNonCalculableChange(swapInput)) {
      dispatch({
        type: ActionType.CALCULATION_CHANGE,
        sourceAmount: swapInput,
        targetAmount: '',
      });
      return;
    }

    const trade = getTrade(swapInput, sourceToken, pair);
    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade
    );

    dispatch({
      type: ActionType.AMOUNT_CHANGE,
      trade,
      priceImpactWithoutFee,
      realizedLPFee,
      sourceAmount: swapInput,
      targetAmount: trade.outputAmount.toSignificant(6),
    });
  };

  const handleTargetAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));
    const { targetToken, pair } = state;

    if (!isValidChange || !pair || !targetToken) {
      return;
    }

    if (isNonCalculableChange(swapInput)) {
      dispatch({
        type: ActionType.CALCULATION_CHANGE,
        targetAmount: swapInput,
        sourceAmount: '',
      });
      return;
    }

    const trade = getTrade(swapInput, targetToken, pair);
    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade
    );

    dispatch({
      type: ActionType.AMOUNT_CHANGE,
      trade,
      priceImpactWithoutFee,
      realizedLPFee,
      targetAmount: swapInput,
      sourceAmount: trade.outputAmount.toSignificant(6),
    });
  };

  const handleSwap = async () => {
    const { sourceToken, targetToken, trade } = state;

    if (!sourceToken || !targetToken || !trade) {
      return;
    }

    try {
      const signer = new ethers.providers.Web3Provider(
        (window as any).ethereum
      ).getSigner();

      setProcessing(true);
      const tx = await makeSwap({
        sourceToken,
        targetToken,
        signer,
        trade,
        slippagePercentage: '1',
      });

      onSwap(tx);
      const receipt = await tx.wait();
      console.log('receipt', receipt);
    } catch (error) {
      onError(error);
      console.error('error =>', error);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchPair();
  }, [fetchPair]);

  const {
    sourceToken,
    sourceAmount,
    targetToken,
    targetAmount,
    trade,
    priceImpactWithoutFee,
    realizedLPFee,
  } = state;

  return (
    <>
      {loading && <span>Loading</span>}
      {!loading && sourceToken && targetToken && (
        <>
          <SwapInput
            label={`From ${sourceToken.symbol}:`}
            value={sourceAmount}
            onChange={handleSourceAmountChange}
          />
          <br />
          <br />
          {trade && (
            <>
              <button onClick={invertSwapDirection}>Invert Direction</button>
              <br />
              <br />
            </>
          )}
          <SwapInput
            label={`From ${targetToken.symbol}:`}
            value={targetAmount}
            onChange={handleTargetAmountChange}
          />
          <br />
          <br />
          {trade && priceImpactWithoutFee && realizedLPFee && (
            <>
              <TradeStats
                trade={trade}
                tradeType={TradeType.EXACT_INPUT}
                slippagePercentage={slippagePercentage}
                priceImpact={priceImpactWithoutFee}
                realizedFee={realizedLPFee}
              />
              <br />
              <button disabled={processing} onClick={handleSwap}>
                SWAP
              </button>
            </>
          )}
        </>
      )}
    </>
  );
};

export default Swap;
