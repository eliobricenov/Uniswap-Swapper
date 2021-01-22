import {JSBI, Percent} from '@uniswap/sdk'

export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000))

/**
 * Formatted version of price impact text with warning colors
 */
export default function formattedPriceImpact(priceImpact?: Percent) {
  return priceImpact ? (priceImpact.lessThan(ONE_BIPS) ? '<0.01%' : `${priceImpact.toFixed(2)}%`) : '-'
}
