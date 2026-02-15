import { cbcTag, cbcAmountTag, joinLines } from '../utils/xml-helpers';
import type { AllowanceChargeInput, PeriodInput } from '../types/common';
import { formatDecimal } from '../utils/formatters';

/** AllowanceCharge → XML fragment */
export function serializeAllowanceCharge(ac: AllowanceChargeInput, currencyCode: string, indent: string = ''): string {
  const lines = [
    `${indent}<cac:AllowanceCharge>`,
    `${indent}  ${cbcTag('ChargeIndicator', ac.chargeIndicator ? 'true' : 'false')}`,
  ];
  if (ac.multiplierFactorNumeric !== undefined) {
    lines.push(`${indent}  ${cbcTag('MultiplierFactorNumeric', formatDecimal(ac.multiplierFactorNumeric, 1))}`);
  }
  lines.push(`${indent}  ${cbcAmountTag('Amount', ac.amount, currencyCode)}`);
  if (ac.baseAmount !== undefined) {
    lines.push(`${indent}  ${cbcAmountTag('BaseAmount', ac.baseAmount, currencyCode)}`);
  }
  if (ac.reason) {
    lines.push(`${indent}  ${cbcTag('AllowanceChargeReason', ac.reason)}`);
  }
  lines.push(`${indent}</cac:AllowanceCharge>`);
  return joinLines(lines);
}

/** InvoicePeriod → XML fragment */
export function serializePeriod(period: PeriodInput, indent: string = ''): string {
  const lines = [
    `${indent}<cac:InvoicePeriod>`,
  ];
  if (period.startDate) {
    lines.push(`${indent}  ${cbcTag('StartDate', period.startDate)}`);
  }
  if (period.endDate) {
    lines.push(`${indent}  ${cbcTag('EndDate', period.endDate)}`);
  }
  if (period.description) {
    lines.push(`${indent}  ${cbcTag('Description', period.description)}`);
  }
  lines.push(`${indent}</cac:InvoicePeriod>`);
  return joinLines(lines);
}
