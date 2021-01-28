import { FC, useCallback, useEffect, useState } from 'react';
import {
  ChainId,
  Fetcher,
  Route,
  TokenAmount,
  Trade,
  TradeType,
} from '@uniswap/sdk';
import { BaseProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import formattedPriceImpact, {
  escapeRegExp,
  computeTradePriceBreakdown,
  computeSlippageAdjustedAmounts,
  inputRegex,
  isNonCalculableChange,
  fetchTokenFromCandidate,
} from './utils';
import { makeSwap } from './uniswap-service';
import { SwapCandidate, SwapState, TradeInformation } from './swap.types';

type Props = {
  chainId: ChainId;
  source?: SwapCandidate;
  target?: SwapCandidate;
  slippagePercentage: number;
  provider?: BaseProvider;
  onError: (error: any) => void;
  onSwap: (swap: any) => void;
};

const initialSwapState: SwapState = {
  sourceToken: null,
  targetToken: null,
  pair: null,
};

const initialTradeState: TradeInformation = {
  trade: null,
  hostAmount: '',
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
  const [swap, setSwap] = useState(initialSwapState);
  const [tradeInformation, setTradeInformation] = useState(initialTradeState);

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
      setSwap({
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

  const handleHostAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));
    const { sourceToken, pair } = swap;

    if (!isValidChange || !pair || !sourceToken) {
      return;
    }

    if (isNonCalculableChange(swapInput)) {
      setTradeInformation({
        ...tradeInformation,
        hostAmount: swapInput,
        targetAmount: '',
      });
      return;
    }

    const trade = new Trade(
      new Route([pair], sourceToken),
      new TokenAmount(
        sourceToken,
        ethers.utils.parseUnits(swapInput, sourceToken.decimals).toString()
      ),
      TradeType.EXACT_INPUT
    );

    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade
    );

    setTradeInformation({
      trade,
      priceImpactWithoutFee,
      realizedLPFee,
      hostAmount: swapInput,
      targetAmount: trade.outputAmount.toSignificant(6),
    });
  };

  const handleTargetAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));
    const { targetToken, pair } = swap;

    if (!isValidChange || !pair || !targetToken) {
      return;
    }

    if (isNonCalculableChange(swapInput)) {
      setTradeInformation({
        ...tradeInformation,
        hostAmount: swapInput,
        targetAmount: '',
      });
      return;
    }

    const trade = new Trade(
      new Route([pair], targetToken),
      new TokenAmount(
        targetToken,
        ethers.utils.parseUnits(swapInput, targetToken.decimals).toString()
      ),
      TradeType.EXACT_INPUT
    );

    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade
    );

    setTradeInformation({
      trade,
      priceImpactWithoutFee,
      realizedLPFee,
      targetAmount: swapInput,
      hostAmount: trade.outputAmount.toSignificant(6),
    });
  };

  const handleSwap = async () => {
    const { sourceToken, targetToken } = swap;
    const { trade } = tradeInformation;

    if (!sourceToken || !targetToken || !trade) {
      return;
    }

    try {
      const signer = new ethers.providers.Web3Provider(
        (window as any).ethereum
      ).getSigner();

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
    }
  };

  useEffect(() => {
    fetchPair();
  }, [fetchPair]);

  const canShowSwapPanel = !loading && swap.sourceToken && swap.targetToken;
  const canShowTradeInformation = tradeInformation && tradeInformation.trade;

  return (
    <>
      {loading && <span>Loading</span>}
      {canShowSwapPanel && (
        <>
          <label>
            {`From ${swap.sourceToken?.symbol}: `}
            <br />
            <br />
            <input
              value={tradeInformation.hostAmount}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              pattern="^[0-9]*[.,]?[0-9]*$"
              placeholder="0.0"
              minLength={1}
              name="hostAmount"
              onChange={v =>
                handleHostAmountChange(v.target.value.replace(/,/g, '.'))
              }
            />
          </label>
          <br />
          <br />
          <label>
            {`To ${swap.targetToken?.symbol}:`}
            <br />
            <br />
            <input
              value={tradeInformation.targetAmount}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              pattern="^[0-9]*[.,]?[0-9]*$"
              placeholder="0.0"
              minLength={1}
              onChange={v =>
                handleTargetAmountChange(v.target.value.replace(/,/g, '.'))
              }
            />
          </label>
          <br />
          <br />
          {canShowTradeInformation && (
            <>
              <div>
                {tradeInformation.trade?.tradeType === TradeType.EXACT_INPUT
                  ? 'Minimum received: ' +
                    (computeSlippageAdjustedAmounts(
                      tradeInformation.trade!,
                      slippagePercentage
                    ).min.toSignificant(4) ?? '-') +
                    (tradeInformation.trade.outputAmount.currency.symbol ?? '')
                  : 'Maximum sold: ' +
                    (computeSlippageAdjustedAmounts(
                      tradeInformation.trade!,
                      slippagePercentage
                    ).max.toSignificant(4) ?? '-') +
                    (tradeInformation.trade?.inputAmount.currency.symbol ?? '')}
              </div>
              <div>
                Price Impact:{' '}
                {formattedPriceImpact(tradeInformation.priceImpactWithoutFee)}
              </div>

              <div>
                Liquidity Provider Fee:{' '}
                {tradeInformation.realizedLPFee
                  ? tradeInformation.realizedLPFee?.toSignificant(6) +
                    ' ' +
                    (tradeInformation.trade?.inputAmount.currency.symbol ?? '')
                  : '-'}
              </div>
              <br />
              <button onClick={handleSwap}>SWAP</button>
            </>
          )}
        </>
      )}
    </>
  );
};

export default Swap;
