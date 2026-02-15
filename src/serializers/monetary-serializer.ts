import type { MonetaryTotalInput, ExchangeRateInput, PaymentMeansInput } from '../types/common';
import { cbcTag, cbcAmountTag, joinLines } from '../utils/xml-helpers';
import { formatDecimal, isNonEmpty } from '../utils/formatters';

/** LegalMonetaryTotal → XML fragment */
export function serializeLegalMonetaryTotal(mt: MonetaryTotalInput, currencyCode: string, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:LegalMonetaryTotal>`);
  lines.push(`${i2}${cbcAmountTag('LineExtensionAmount', mt.lineExtensionAmount, currencyCode)}`);
  lines.push(`${i2}${cbcAmountTag('TaxExclusiveAmount', mt.taxExclusiveAmount, currencyCode)}`);
  lines.push(`${i2}${cbcAmountTag('TaxInclusiveAmount', mt.taxInclusiveAmount, currencyCode)}`);

  if (mt.allowanceTotalAmount !== undefined) {
    lines.push(`${i2}${cbcAmountTag('AllowanceTotalAmount', mt.allowanceTotalAmount, currencyCode)}`);
  }
  if (mt.chargeTotalAmount !== undefined) {
    lines.push(`${i2}${cbcAmountTag('ChargeTotalAmount', mt.chargeTotalAmount, currencyCode)}`);
  }
  if (mt.payableRoundingAmount !== undefined) {
    lines.push(`${i2}${cbcAmountTag('PayableRoundingAmount', mt.payableRoundingAmount, currencyCode)}`);
  }

  lines.push(`${i2}${cbcAmountTag('PayableAmount', mt.payableAmount, currencyCode)}`);
  lines.push(`${indent}</cac:LegalMonetaryTotal>`);

  return joinLines(lines);
}

/** PricingExchangeRate → XML fragment (§1.3) */
export function serializeExchangeRate(er: ExchangeRateInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:PricingExchangeRate>`);
  lines.push(`${i2}${cbcTag('SourceCurrencyCode', er.sourceCurrencyCode)}`);
  lines.push(`${i2}${cbcTag('TargetCurrencyCode', er.targetCurrencyCode)}`);
  lines.push(`${i2}${cbcTag('CalculationRate', formatDecimal(er.calculationRate, 6))}`);
  if (isNonEmpty(er.date)) {
    lines.push(`${i2}${cbcTag('Date', er.date)}`);
  }
  lines.push(`${indent}</cac:PricingExchangeRate>`);

  return joinLines(lines);
}

/** PaymentMeans → XML fragment (§3.6 KAMU) */
export function serializePaymentMeans(pm: PaymentMeansInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:PaymentMeans>`);
  if (isNonEmpty(pm.paymentMeansCode)) {
    lines.push(`${i2}${cbcTag('PaymentMeansCode', pm.paymentMeansCode)}`);
  }
  if (isNonEmpty(pm.paymentDueDate)) {
    lines.push(`${i2}${cbcTag('PaymentDueDate', pm.paymentDueDate)}`);
  }
  if (isNonEmpty(pm.paymentChannelCode)) {
    lines.push(`${i2}${cbcTag('PaymentChannelCode', pm.paymentChannelCode)}`);
  }

  if (pm.payeeFinancialAccount) {
    lines.push(`${i2}<cac:PayeeFinancialAccount>`);
    lines.push(`${i3}${cbcTag('ID', pm.payeeFinancialAccount.id)}`);
    if (isNonEmpty(pm.payeeFinancialAccount.currencyCode)) {
      lines.push(`${i3}${cbcTag('CurrencyCode', pm.payeeFinancialAccount.currencyCode)}`);
    }
    if (isNonEmpty(pm.payeeFinancialAccount.paymentNote)) {
      lines.push(`${i3}${cbcTag('PaymentNote', pm.payeeFinancialAccount.paymentNote)}`);
    }
    lines.push(`${i2}</cac:PayeeFinancialAccount>`);
  }

  lines.push(`${indent}</cac:PaymentMeans>`);
  return joinLines(lines);
}
