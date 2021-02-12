import { FC, useCallback, useEffect, useReducer, useState } from 'react';
import { ChainId, Fetcher, Token, TradeType } from '@uniswap/sdk';
import { BaseProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import {
  escapeRegExp,
  computeTradePriceBreakdown,
  inputRegex,
  isNonCalculableChange,
  fetchTokenFromCandidate,
  getTrade,
  computeSlippageAdjustedAmounts,
} from '../../utils/uniswap';
import { isWETH, makeSwap } from '../../services/uniswap-service';
import { SwapCandidate } from './swap.types';
import SwapInput from '../swap-input/SwapInput';
import TradeStats from '../trade-stats/TradeStats';
import { ActionType, initialState, swapReducer } from './swap.reducer';
import { erc20ABI } from '../../contracts';

type Props = {
  chainId: ChainId;
  source?: SwapCandidate;
  target?: SwapCandidate;
  slippagePercentage: number;
  provider?: BaseProvider;
  onError: (error: any) => void;
  onSwap: (swap: any) => void;
};

const Swap: FC<Props> = ({
  source,
  target,
  chainId,
  provider = ethers.providers.getDefaultProvider(),
  slippagePercentage,
  onSwap,
  onError,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [signer, setSigner] = useState<
    ethers.providers.JsonRpcSigner | undefined
  >(undefined);
  const [state, dispatch] = useReducer(swapReducer, initialState);

  const fetchPair = useCallback(async () => {
    try {
      setLoading(true);

      // todo reduce wait time with a batch load
      dispatch({ type: ActionType.RESET });
      const [sourceToken, targetToken] = await Promise.all([
        fetchTokenFromCandidate(chainId, source, provider),
        fetchTokenFromCandidate(chainId, target, provider),
      ]);
      const pair = await Fetcher.fetchPairData(
        sourceToken,
        targetToken,
        provider
      );

      const ethBalance = await signer?.getBalance();
      const [sourceTokenBalance, targetTokenBalance] = await Promise.all([
        new ethers.Contract(sourceToken.address, erc20ABI, signer).balanceOf(
          signer?.getAddress()
        ),
        new ethers.Contract(targetToken.address, erc20ABI, signer).balanceOf(
          signer?.getAddress()
        ),
      ]);

      dispatch({
        type: ActionType.UPDATE_PAIR,
        sourceToken,
        targetToken,
        pair,
        sourceTokenBalance: ethers.BigNumber.from(sourceTokenBalance),
        targetTokenBalance: ethers.BigNumber.from(targetTokenBalance),
        ethBalance: ethBalance,
      });
    } catch (error) {
      onError(error);
      console.error('error =>', error);
    } finally {
      setLoading(false);
    }
  }, [source, target, chainId, provider, signer, onError]);

  const flipSwapDirectionAndRecalculate = () => {
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
      type: ActionType.FLIP_DIRECTION_AND_RECALCULATE,
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

  const handleFlipDirection = () => {
    const { sourceAmount, targetAmount, pair } = state;

    if (loading) {
      return;
    }

    if (sourceAmount && targetAmount && pair) {
      flipSwapDirectionAndRecalculate();
      return;
    }

    dispatch({ type: ActionType.FLIP_DIRECTION });
  };

  const handleSourceAmountChange = async (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));
    const { sourceToken, pair, sourceTokenBalance, ethBalance } = state;

    if (
      !isValidChange ||
      !pair ||
      !sourceToken ||
      !sourceTokenBalance ||
      !ethBalance
    ) {
      return;
    }

    if (isNonCalculableChange(swapInput)) {
      dispatch({
        type: ActionType.UPDATE_CALCULATION,
        sourceAmount: swapInput,
        targetAmount: '',
      });
      return;
    }

    const trade = getTrade(swapInput, sourceToken, pair);

    const balance = isWETH(sourceToken) ? ethBalance : sourceTokenBalance;
    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade
    );

    console.log('use ETH =>', isWETH(sourceToken));
    console.log('available =>', balance.toString());
    console.log('needed =>', trade.inputAmount.raw.toString());

    console.log(
      'enough balance =>',
      balance.gte(trade.inputAmount.raw.toString())
    );

    dispatch({
      type: ActionType.UPDATE_AMOUNT,
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
        type: ActionType.UPDATE_CALCULATION,
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
      type: ActionType.UPDATE_AMOUNT,
      trade,
      priceImpactWithoutFee,
      realizedLPFee,
      targetAmount: swapInput,
      sourceAmount: trade.outputAmount.toSignificant(6),
    });
  };

  const handleSwap = async () => {
    const { sourceToken, targetToken, trade } = state;

    if (!sourceToken || !targetToken || !trade || !signer) {
      return;
    }

    try {
      setProcessing(true);
      const tx = await makeSwap({
        sourceToken,
        targetToken,
        signer,
        trade,
        slippagePercentage: '1',
      });

      onSwap(tx);
      setProcessing(false);
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

  useEffect(() => {
    const loadEthereum = async () => {
      setLoading(true);
      try {
        await (window as any).ethereum.enable();
        setSigner(
          new ethers.providers.Web3Provider(
            (window as any).ethereum
          ).getSigner()
        );
      } catch (error) {
        console.error('error =>', error);
      } finally {
        setLoading(false);
      }
    };
    loadEthereum();
  }, []);

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
              <button onClick={handleFlipDirection}>Invert Direction</button>
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
              {processing && <span>Processing</span>}
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
