import type { TaxTotalInput, TaxSubtotalInput, WithholdingTaxTotalInput } from '../types/common';
import { cbcTag, cbcAmountTag, joinLines } from '../utils/xml-helpers';
import { formatDecimal, isNonEmpty } from '../utils/formatters';

/** TaxTotal → XML fragment */
export function serializeTaxTotal(tt: TaxTotalInput, currencyCode: string, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:TaxTotal>`);
  lines.push(`${i2}${cbcAmountTag('TaxAmount', tt.taxAmount, currencyCode)}`);

  for (const ts of tt.taxSubtotals) {
    lines.push(serializeTaxSubtotal(ts, currencyCode, i2));
  }

  lines.push(`${indent}</cac:TaxTotal>`);
  return joinLines(lines);
}

/** TaxSubtotal → XML fragment */
export function serializeTaxSubtotal(ts: TaxSubtotalInput, currencyCode: string, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:TaxSubtotal>`);
  lines.push(`${i2}${cbcAmountTag('TaxableAmount', ts.taxableAmount, currencyCode)}`);
  lines.push(`${i2}${cbcAmountTag('TaxAmount', ts.taxAmount, currencyCode)}`);

  if (ts.calculationSequenceNumeric !== undefined) {
    lines.push(`${i2}${cbcTag('CalculationSequenceNumeric', String(ts.calculationSequenceNumeric))}`);
  }

  if (ts.percent !== undefined) {
    lines.push(`${i2}${cbcTag('Percent', formatDecimal(ts.percent, 0))}`);
  }

  if (isNonEmpty(ts.taxExemptionReasonCode)) {
    lines.push(`${i2}${cbcTag('TaxExemptionReasonCode', ts.taxExemptionReasonCode)}`);
  }
  if (isNonEmpty(ts.taxExemptionReason)) {
    lines.push(`${i2}${cbcTag('TaxExemptionReason', ts.taxExemptionReason)}`);
  }

  lines.push(`${i2}<cac:TaxCategory>`);
  lines.push(`${i3}<cac:TaxScheme>`);
  if (isNonEmpty(ts.taxTypeName)) {
    lines.push(`${i3}  ${cbcTag('Name', ts.taxTypeName)}`);
  }
  lines.push(`${i3}  ${cbcTag('TaxTypeCode', ts.taxTypeCode)}`);
  lines.push(`${i3}</cac:TaxScheme>`);
  lines.push(`${i2}</cac:TaxCategory>`);

  lines.push(`${indent}</cac:TaxSubtotal>`);
  return joinLines(lines);
}

/** WithholdingTaxTotal → XML fragment */
export function serializeWithholdingTaxTotal(wtt: WithholdingTaxTotalInput, currencyCode: string, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const i4 = indent + '      ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:WithholdingTaxTotal>`);
  lines.push(`${i2}${cbcAmountTag('TaxAmount', wtt.taxAmount, currencyCode)}`);

  for (const ts of wtt.taxSubtotals) {
    lines.push(`${i2}<cac:TaxSubtotal>`);
    lines.push(`${i3}${cbcAmountTag('TaxableAmount', ts.taxableAmount, currencyCode)}`);
    lines.push(`${i3}${cbcAmountTag('TaxAmount', ts.taxAmount, currencyCode)}`);
    lines.push(`${i3}${cbcTag('Percent', formatDecimal(ts.percent, 0))}`);
    lines.push(`${i3}<cac:TaxCategory>`);
    lines.push(`${i4}<cac:TaxScheme>`);
    if (isNonEmpty(ts.taxTypeName)) {
      lines.push(`${i4}  ${cbcTag('Name', ts.taxTypeName)}`);
    }
    lines.push(`${i4}  ${cbcTag('TaxTypeCode', ts.taxTypeCode)}`);
    lines.push(`${i4}</cac:TaxScheme>`);
    lines.push(`${i3}</cac:TaxCategory>`);
    lines.push(`${i2}</cac:TaxSubtotal>`);
  }

  lines.push(`${indent}</cac:WithholdingTaxTotal>`);
  return joinLines(lines);
}
