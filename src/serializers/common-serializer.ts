import { cbcOptionalTag, cbcOptionalAmountTag, cbcRequiredTag, joinLines } from '../utils/xml-helpers';
import type { AllowanceChargeInput, PeriodInput } from '../types/common';
import { formatDecimal } from '../utils/formatters';
import { ALLOWANCE_CHARGE_SEQ, PERIOD_SEQ, emitInOrder } from './xsd-sequence';

/**
 * AllowanceCharge → XML fragment.
 * Sequence: ALLOWANCE_CHARGE_SEQ. B-12 fix: Reason, ChargeIndicator hemen SONRASI.
 */
export function serializeAllowanceCharge(ac: AllowanceChargeInput, currencyCode: string, indent: string = ''): string {
  const inner = emitInOrder(ALLOWANCE_CHARGE_SEQ, {
    ChargeIndicator: () => cbcRequiredTag('ChargeIndicator', ac.chargeIndicator ? 'true' : 'false', 'AllowanceCharge'),
    AllowanceChargeReason: () => cbcOptionalTag('AllowanceChargeReason', ac.reason),
    MultiplierFactorNumeric: () =>
      ac.multiplierFactorNumeric !== undefined
        ? cbcOptionalTag('MultiplierFactorNumeric', formatDecimal(ac.multiplierFactorNumeric, 1))
        : '',
    Amount: () => cbcOptionalAmountTag('Amount', ac.amount, currencyCode),
    BaseAmount: () =>
      ac.baseAmount !== undefined ? cbcOptionalAmountTag('BaseAmount', ac.baseAmount, currencyCode) : '',
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:AllowanceCharge>`, body, `${indent}</cac:AllowanceCharge>`].join('\n');
}

/** InvoicePeriod → XML fragment. Sequence: PERIOD_SEQ. */
export function serializePeriod(period: PeriodInput, indent: string = ''): string {
  const inner = emitInOrder(PERIOD_SEQ, {
    StartDate: () => cbcOptionalTag('StartDate', period.startDate),
    EndDate: () => cbcOptionalTag('EndDate', period.endDate),
    Description: () => cbcOptionalTag('Description', period.description),
  });
  if (inner.length === 0) return '';
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:InvoicePeriod>`, body, `${indent}</cac:InvoicePeriod>`].join('\n');
}
