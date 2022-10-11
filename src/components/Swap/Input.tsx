import { Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { TextButton } from 'components/Button'
import { loadingTransitionCss } from 'css/loading'
import {
  useIsSwapFieldIndependent,
  useSwapAmount,
  useSwapCurrency,
  useSwapCurrencyAmount,
  useSwapInfo,
} from 'hooks/swap'
import { usePrefetchCurrencyColor } from 'hooks/useCurrencyColor'
import { useCallback, useMemo, useState } from 'react'
import { TradeState } from 'state/routing/types'
import { Field } from 'state/swap'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'
import invariant from 'tiny-invariant'
import { formatCurrencyAmount } from 'utils/formatCurrencyAmount'
import { maxAmountSpend } from 'utils/maxAmountSpend'

import Column from '../Column'
import Row from '../Row'
import TokenImg from '../TokenImg'
import TokenInput, { TokenInputHandle } from './TokenInput'

export const USDC = styled(Row)`
  ${loadingTransitionCss};
`

export const Balance = styled(ThemedText.Body2)`
  transition: color 0.25s ease-in-out;
`

export const InputColumn = styled(Column)<{ approved?: boolean; hasColor?: boolean | null; disableHover?: boolean }>`
  background-color: ${({ theme }) => theme.module};
  border-radius: ${({ theme }) => theme.borderRadius - 0.25}em;
  margin-bottom: 4px;
  padding: 20px 0 24px 0;
  position: relative;

  // Set transitions to reduce color flashes when switching color/token.
  // When color loads, transition the background so that it transitions from the empty or last state, but not _to_ the empty state.
  transition: ${({ hasColor }) => (hasColor ? 'background-color 0.25s ease-out' : undefined)};
  > {
    // When color is loading, delay the color/stroke so that it seems to transition from the last state.
    transition: ${({ hasColor }) => (hasColor === null ? 'color 0.25s ease-in, stroke 0.25s ease-in' : undefined)};
  }

  ${TokenImg} {
    filter: ${({ approved }) => (approved ? undefined : 'saturate(0) opacity(0.4)')};
    transition: filter 0.25s;
  }

  &:before {
    box-sizing: border-box;
    background-size: 100%;
    border-radius: inherit;

    position: absolute;
    top: 0;
    left: 0;

    width: 100%;
    height: 100%;
    pointer-events: none;
    content: '';
    border: 1px solid ${({ theme }) => theme.module};
    transition: 125ms ease border-color;
  }

  ${({ theme, disableHover }) =>
    !disableHover &&
    `&:hover:before {
    border-color: ${theme.interactive};
  }`}

  ${({ theme, disableHover }) =>
    !disableHover &&
    `&:focus-within:before {
    border-color: ${theme.outline};
  }`}
`

interface UseFormattedFieldAmountArguments {
  currencyAmount?: CurrencyAmount<Currency>
  fieldAmount?: string
}

export function useFormattedFieldAmount({ currencyAmount, fieldAmount }: UseFormattedFieldAmountArguments) {
  return useMemo(() => {
    if (fieldAmount !== undefined) {
      return fieldAmount
    }
    if (currencyAmount) {
      return currencyAmount.toSignificant(6)
    }
    return ''
  }, [currencyAmount, fieldAmount])
}

export default function Input() {
  const { i18n } = useLingui()
  const {
    [Field.INPUT]: { balance, amount: tradeCurrencyAmount, usdc },
    error,
    trade: { state: tradeState },
  } = useSwapInfo()

  const [inputAmount, updateInputAmount] = useSwapAmount(Field.INPUT)
  const [inputCurrency, updateInputCurrency] = useSwapCurrency(Field.INPUT)
  const inputCurrencyAmount = useSwapCurrencyAmount(Field.INPUT)
  const [input, setInput] = useState<TokenInputHandle | null>(null)

  // extract eagerly in case of reversal
  usePrefetchCurrencyColor(inputCurrency)

  const isDisabled = error !== undefined
  const isRouteLoading = isDisabled || tradeState === TradeState.LOADING
  const isDependentField = !useIsSwapFieldIndependent(Field.INPUT)
  const isLoading = isRouteLoading && isDependentField

  const amount = useFormattedFieldAmount({
    currencyAmount: tradeCurrencyAmount,
    fieldAmount: inputAmount,
  })

  //TODO(ianlapham): mimic logic from app swap page
  const mockApproved = true

  const insufficientBalance = useMemo(
    () =>
      balance &&
      (inputCurrencyAmount ? inputCurrencyAmount.greaterThan(balance) : tradeCurrencyAmount?.greaterThan(balance)),
    [balance, inputCurrencyAmount, tradeCurrencyAmount]
  )

  const max = useMemo(() => {
    // account for gas needed if using max on native token
    const max = maxAmountSpend(balance)
    if (!max || !balance) return
    if (max.equalTo(0) || balance.lessThan(max)) return
    if (inputCurrencyAmount && max.equalTo(inputCurrencyAmount)) return
    return max.toExact()
  }, [balance, inputCurrencyAmount])
  const onClickMax = useCallback(() => {
    invariant(max)
    updateInputAmount(max)
    input?.focus()
  }, [input, max, updateInputAmount])

  return (
    <InputColumn gap={0.5} approved={mockApproved} disableHover={isDisabled || !inputCurrency}>
      <TokenInput
        ref={setInput}
        amount={amount}
        currency={inputCurrency}
        disabled={isDisabled}
        field={Field.INPUT}
        onChangeInput={updateInputAmount}
        onChangeCurrency={updateInputCurrency}
        loading={isLoading}
      >
        <ThemedText.Body2 color="secondary" userSelect>
          <Row>
            <USDC isLoading={isRouteLoading}>{usdc ? `$${formatCurrencyAmount(usdc, 6, 'en', 2)}` : ''}</USDC>
            {balance && (
              <Row gap={0.5}>
                <Balance color={insufficientBalance ? 'error' : 'secondary'}>
                  <Trans>Balance:</Trans> <span>{formatCurrencyAmount(balance, 4, i18n.locale)}</span>
                </Balance>
                {max && (
                  <TextButton onClick={onClickMax}>
                    <ThemedText.ButtonSmall>
                      <Trans>Max</Trans>
                    </ThemedText.ButtonSmall>
                  </TextButton>
                )}
              </Row>
            )}
          </Row>
        </ThemedText.Body2>
      </TokenInput>
    </InputColumn>
  )
}
