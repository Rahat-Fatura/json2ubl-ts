import type { MonetaryTotalInput, ExchangeRateInput, PaymentMeansInput } from '../types/common';
import { cbcOptionalTag, cbcOptionalAmountTag, cbcRequiredTag, joinLines } from '../utils/xml-helpers';
import { formatDecimal, isNonEmpty } from '../utils/formatters';
import {
  LEGAL_MONETARY_TOTAL_SEQ,
  EXCHANGE_RATE_SEQ,
  PAYMENT_MEANS_SEQ,
  emitInOrder,
} from './xsd-sequence';

/** LegalMonetaryTotal → XML fragment. Sequence: LEGAL_MONETARY_TOTAL_SEQ. */
export function serializeLegalMonetaryTotal(mt: MonetaryTotalInput, currencyCode: string, indent: string = ''): string {
  const inner = emitInOrder(LEGAL_MONETARY_TOTAL_SEQ, {
    LineExtensionAmount: () => cbcOptionalAmountTag('LineExtensionAmount', mt.lineExtensionAmount, currencyCode),
    TaxExclusiveAmount: () => cbcOptionalAmountTag('TaxExclusiveAmount', mt.taxExclusiveAmount, currencyCode),
    TaxInclusiveAmount: () => cbcOptionalAmountTag('TaxInclusiveAmount', mt.taxInclusiveAmount, currencyCode),
    AllowanceTotalAmount: () =>
      mt.allowanceTotalAmount !== undefined
        ? cbcOptionalAmountTag('AllowanceTotalAmount', mt.allowanceTotalAmount, currencyCode)
        : '',
    ChargeTotalAmount: () =>
      mt.chargeTotalAmount !== undefined ? cbcOptionalAmountTag('ChargeTotalAmount', mt.chargeTotalAmount, currencyCode) : '',
    PayableRoundingAmount: () =>
      mt.payableRoundingAmount !== undefined
        ? cbcOptionalAmountTag('PayableRoundingAmount', mt.payableRoundingAmount, currencyCode)
        : '',
    PayableAmount: () => cbcOptionalAmountTag('PayableAmount', mt.payableAmount, currencyCode),
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:LegalMonetaryTotal>`, body, `${indent}</cac:LegalMonetaryTotal>`].join('\n');
}

/** PricingExchangeRate → XML fragment (§1.3). Sequence: EXCHANGE_RATE_SEQ. */
export function serializeExchangeRate(er: ExchangeRateInput, indent: string = ''): string {
  const inner = emitInOrder(EXCHANGE_RATE_SEQ, {
    SourceCurrencyCode: () => cbcOptionalTag('SourceCurrencyCode', er.sourceCurrencyCode),
    TargetCurrencyCode: () => cbcOptionalTag('TargetCurrencyCode', er.targetCurrencyCode),
    CalculationRate: () => cbcOptionalTag('CalculationRate', formatDecimal(er.calculationRate, 6)),
    Date: () => (isNonEmpty(er.date) ? cbcOptionalTag('Date', er.date) : ''),
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:PricingExchangeRate>`, body, `${indent}</cac:PricingExchangeRate>`].join('\n');
}

/**
 * PaymentMeans → XML fragment (§3.6 KAMU).
 * Sequence: PAYMENT_MEANS_SEQ. B-70 fix: PaymentMeansCode required (PaymentMeans verildiyse).
 */
export function serializePaymentMeans(pm: PaymentMeansInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';

  const payeeFinancialAccountXml = (): string => {
    if (!pm.payeeFinancialAccount) return '';
    const parts: string[] = [`${i2}<cac:PayeeFinancialAccount>`];
    parts.push(`${i3}${cbcRequiredTag('ID', pm.payeeFinancialAccount.id, 'PayeeFinancialAccount')}`);
    if (isNonEmpty(pm.payeeFinancialAccount.currencyCode)) {
      parts.push(`${i3}${cbcOptionalTag('CurrencyCode', pm.payeeFinancialAccount.currencyCode)}`);
    }
    if (isNonEmpty(pm.payeeFinancialAccount.paymentNote)) {
      parts.push(`${i3}${cbcOptionalTag('PaymentNote', pm.payeeFinancialAccount.paymentNote)}`);
    }
    parts.push(`${i2}</cac:PayeeFinancialAccount>`);
    return parts.join('\n');
  };

  const inner = emitInOrder(PAYMENT_MEANS_SEQ, {
    PaymentMeansCode: () => cbcRequiredTag('PaymentMeansCode', pm.paymentMeansCode, 'PaymentMeans'),
    PaymentDueDate: () => cbcOptionalTag('PaymentDueDate', pm.paymentDueDate),
    PaymentChannelCode: () => cbcOptionalTag('PaymentChannelCode', pm.paymentChannelCode),
    PayeeFinancialAccount: () => payeeFinancialAccountXml(),
  });
  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:PaymentMeans>`, body, `${indent}</cac:PaymentMeans>`].join('\n');
}
