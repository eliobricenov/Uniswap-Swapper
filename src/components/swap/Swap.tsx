import { FC, useCallback, useEffect, useState } from 'react';
import {
  ChainId,
  CurrencyAmount,
  Fetcher,
  Pair,
  Percent,
  Route,
  TokenAmount,
  Trade,
  TradeType,
  WETH,
} from '@uniswap/sdk';
import formattedPriceImpact from '../FormattedPriceImpact';
import { BaseProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import {
  escapeRegExp,
  computeTradePriceBreakdown,
  computeSlippageAdjustedAmounts,
  inputRegex,
  isNonCalculableChange,
  fetchToken,
} from './utils';
import { makeSwap } from './uniswap-service';
export interface SwapCandidate {
  address: string;
  name: string;
}

type Props = {
  chainId: ChainId;
  origin?: SwapCandidate;
  target?: SwapCandidate;
  slippagePercentage?: number;
  provider?: BaseProvider;
  onError: (error: any) => void;
  onSwap: (swap: any) => void;
};

type TradeState = {
  priceImpactWithoutFee: Percent | undefined;
  realizedLPFee: CurrencyAmount | undefined | null;
  hostAmount: string;
  targetAmount: string;
};

const initialTradeState: TradeState = {
  hostAmount: '',
  targetAmount: '',
  priceImpactWithoutFee: undefined,
  realizedLPFee: null,
};

const Swap: FC<Props> = ({
  chainId,
  provider,
  onSwap,
  onError,
  ...tokens
}: Props) => {
  const { origin = WETH[chainId], target = WETH[chainId] } = tokens;
  const [loading, setLoading] = useState(false);
  const [pair, setPair] = useState<Pair | null>(null);
  const [trade, setTrade] = useState<Trade | null>(null);
  const [tradeInformation, setTradeInformation] = useState(initialTradeState);

  const fetchRouter = useCallback(async () => {
    try {
      setLoading(true);

      const [originToken, targetToken] = await Promise.all([
        fetchToken(chainId, origin, provider),
        fetchToken(chainId, target, provider),
      ]);

      const pair = await Fetcher.fetchPairData(
        originToken,
        targetToken,
        provider,
      );

      setPair(pair); // token1 = origin; token0 = target
    } catch (error) {
      onError(error);
      console.log('error =>', error);
    } finally {
      setLoading(false);
    }
  }, [origin, target, chainId, provider, onError]);

  const handleHostAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));

    if (!isValidChange || !pair) {
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
      new Route([pair], pair.token1),
      new TokenAmount(
        pair.token1,
        ethers.utils.parseUnits(swapInput, pair.token1.decimals).toString(),
      ),
      TradeType.EXACT_INPUT,
    );

    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade,
    );

    setTrade(trade);
    setTradeInformation({
      priceImpactWithoutFee,
      realizedLPFee,
      hostAmount: swapInput,
      targetAmount: trade.outputAmount.toSignificant(6),
    });
  };

  const handleTargetAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));
    if (!isValidChange || !pair) {
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
      new Route([pair], pair.token0),
      new TokenAmount(
        pair.token0,
        ethers.utils.parseUnits(swapInput, pair.token0.decimals).toString(),
      ),
      TradeType.EXACT_INPUT,
    );

    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade,
    );

    setTradeInformation({
      priceImpactWithoutFee,
      realizedLPFee,
      targetAmount: swapInput,
      hostAmount: trade.outputAmount.toSignificant(6),
    });
  };

  const handleSwap = async () => {
    if (!pair || !trade) {
      return;
    }

    const signer = new ethers.providers.Web3Provider(
      (window as any).ethereum,
    ).getSigner();

    const tx = await makeSwap({
      signer,
      pair,
      trade,
      slippagePercentage: '2',
    });

    onSwap(tx);
    await tx.wait();
  };

  useEffect(() => {
    fetchRouter();
  }, [fetchRouter]);

  return (
    <>
      {loading && <span>Loading</span>}
      {!loading && pair && (
        <>
          <label>
            {`From (${origin.name}): `}
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
              onChange={(v) =>
                handleHostAmountChange(v.target.value.replace(/,/g, '.'))
              }
            />
          </label>
          <br />
          <br />
          <label>
            {`To (${target.name}):`}
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
              onChange={(v) =>
                handleTargetAmountChange(v.target.value.replace(/,/g, '.'))
              }
            />
          </label>
          <br />
          <br />
          {tradeInformation && trade && (
            <>
              <div>
                {trade.tradeType === TradeType.EXACT_INPUT
                  ? 'Minimum received: ' +
                    (computeSlippageAdjustedAmounts(trade).min.toSignificant(
                      4,
                    ) ?? '-') +
                    (trade.outputAmount.currency.symbol ?? '')
                  : 'Maximum sold: ' +
                    (computeSlippageAdjustedAmounts(trade).max.toSignificant(
                      4,
                    ) ?? '-') +
                    (trade.inputAmount.currency.symbol ?? '')}
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
                    (trade.inputAmount.currency.symbol ?? '')
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
