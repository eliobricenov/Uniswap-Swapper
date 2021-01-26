import { FC, useCallback, useEffect, useState } from 'react';
import {
  ChainId,
  CurrencyAmount,
  Fetcher,
  Percent,
  Route,
  Token,
  TokenAmount,
  Trade,
  TradeType,
  WETH,
} from '@uniswap/sdk';
import formattedPriceImpact from '../FormattedPriceImpact';
import { BaseProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import contractABI, { contractAddress } from './contract';
import {
  escapeRegExp,
  computeTradePriceBreakdown,
  computeSlippageAdjustedAmounts,
  inputRegex,
  getPair,
  isNonCalculableChange,
} from './utils';
interface SwapCandidate {
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

type SwapState = {
  originToken: Token | null;
  targetToken: Token | null;
  originToTarget: Route | null;
  targetToOrigin: Route | null;
};

type TradeState = {
  trade: Trade | null;
  priceImpactWithoutFee: Percent | undefined;
  realizedLPFee: CurrencyAmount | undefined | null;
  hostAmount: string;
  targetAmount: string;
};

const initialTradeState: TradeState = {
  trade: null,
  hostAmount: '',
  targetAmount: '',
  priceImpactWithoutFee: undefined,
  realizedLPFee: null,
};

const initialSwapState: SwapState = {
  originToken: null,
  targetToken: null,
  originToTarget: null,
  targetToOrigin: null,
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
  const [swapInformation, setSwapInformation] = useState(initialSwapState);
  const [tradeInformation, setTradeInformation] = useState(initialTradeState);

  const fetchRouter = useCallback(async () => {
    try {
      setLoading(true);

      const [originToken, targetToken] = await Promise.all([
        Fetcher.fetchTokenData(chainId, origin.address),
        Fetcher.fetchTokenData(chainId, target.address),
      ]);

      const pair = await getPair(originToken, targetToken, provider);
      const originToTarget = new Route([pair], originToken);
      const targetToOrigin = new Route([pair], targetToken);

      setSwapInformation({
        originToken,
        targetToken,
        originToTarget,
        targetToOrigin,
      });
    } catch (error) {
      onError(error);
      console.log('error =>', error);
    } finally {
      setLoading(false);
    }
  }, [origin, target, chainId, provider, onError]);

  const handleHostAmountChange = (swapInput: string) => {
    const isValidChange = inputRegex.test(escapeRegExp(swapInput));
    const { originToken, originToTarget } = swapInformation;

    if (!isValidChange || !originToken || !originToTarget) {
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

    const amount = new TokenAmount(
      originToken,
      ethers.utils.parseUnits(swapInput, originToken.decimals).toString(),
    );

    const trade = new Trade(originToTarget, amount, TradeType.EXACT_INPUT);

    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade,
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
    const { targetToken, targetToOrigin } = swapInformation;

    if (!isValidChange || !targetToken || !targetToOrigin) {
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

    const amount = new TokenAmount(
      targetToken,
      ethers.utils.parseUnits(swapInput, targetToken.decimals).toString(),
    );

    const trade = new Trade(targetToOrigin, amount, TradeType.EXACT_INPUT);

    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(
      trade,
    );

    setTradeInformation({
      trade,
      priceImpactWithoutFee,
      realizedLPFee,
      targetAmount: swapInput,
      hostAmount: trade.outputAmount.toSignificant(6),
    });
  };

  useEffect(() => {
    fetchRouter();
  }, [fetchRouter]);

  return (
    <>
      {loading && <span>Loading</span>}
      {swapInformation.originToTarget &&
        swapInformation.targetToOrigin &&
        !loading && (
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
                onChange={(v) => handleHostAmountChange(v.target.value.replace(/,/g, '.'))}
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
                onChange={(v) => handleTargetAmountChange(v.target.value.replace(/,/g, '.'))}
              />
            </label>
            <br />
            <br />
            {tradeInformation.trade && (
              <>
                <div>
                  {tradeInformation.trade.tradeType === TradeType.EXACT_INPUT
                    ? 'Minimum received: ' +
                      (computeSlippageAdjustedAmounts(
                        tradeInformation.trade,
                      ).min.toSignificant(4) ?? '-') +
                      (tradeInformation.trade.outputAmount.currency.symbol ??
                        '')
                    : 'Maximum sold: ' +
                      (computeSlippageAdjustedAmounts(
                        tradeInformation.trade,
                      ).max.toSignificant(4) ?? '-') +
                      (tradeInformation.trade.inputAmount.currency.symbol ??
                        '')}
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
                      (tradeInformation.trade.inputAmount.currency.symbol ?? '')
                    : '-'}
                </div>
                <br />
                <button
                  onClick={async () => {
                    const { trade } = tradeInformation;

                    if (!trade) {
                      return;
                    }

                    const abi = contractABI;
                    const provider = new ethers.providers.Web3Provider(
                      (window as any).ethereum,
                    );
                    const signer = provider.getSigner();

                    const contract = new ethers.Contract(
                      contractAddress,
                      abi,
                      signer,
                    );

                    const contractWithSigner = contract.connect(signer);

                    console.log(
                      '\n\n ~ onClick={ ~ contractWithSigner',
                      contractWithSigner,
                    );

                    const slippageTolerance = new Percent('2', '1000');
                    const amountIn = ethers.BigNumber.from(
                      trade.inputAmount.raw.toString(),
                    ).toHexString();
                    const amountOutMin = ethers.BigNumber.from(
                      trade.minimumAmountOut(slippageTolerance).raw.toString(),
                    ).toHexString();
                    const path = [origin.address, target.address];
                    const to = '0x02046bfc18021f4633715984690D7A04D2C62c3e';
                    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

                    await contractWithSigner.functions.approve([
                      contractAddress,
                      amountIn
                    ]);

                    onSwap({
                      amountIn,
                      amountOutMin,
                      path,
                      to,
                      deadline,
                    });
                  }}>
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
