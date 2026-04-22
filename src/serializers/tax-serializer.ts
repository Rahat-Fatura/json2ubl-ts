import type { TaxTotalInput, TaxSubtotalInput, WithholdingTaxTotalInput, WithholdingTaxSubtotalInput } from '../types/common';
import {
  cbcOptionalTag,
  cbcOptionalAmountTag,
  cbcRequiredTag,
  joinLines,
} from '../utils/xml-helpers';
import { formatDecimal } from '../utils/formatters';
import {
  TAX_SUBTOTAL_SEQ,
  TAX_CATEGORY_SEQ,
  TAX_SCHEME_SEQ,
  emitInOrder,
} from './xsd-sequence';

/** TaxTotal → XML fragment. XSD sequence: TaxAmount → TaxSubtotal. */
export function serializeTaxTotal(tt: TaxTotalInput, currencyCode: string, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:TaxTotal>`);
  lines.push(`${i2}${cbcOptionalAmountTag('TaxAmount', tt.taxAmount, currencyCode)}`);
  for (const ts of tt.taxSubtotals) {
    lines.push(serializeTaxSubtotal(ts, currencyCode, i2));
  }
  lines.push(`${indent}</cac:TaxTotal>`);
  return joinLines(lines);
}

/**
 * TaxSubtotal → XML fragment.
 * B-09 fix: TaxExemptionReasonCode/Reason artık TaxCategory altında (TaxSubtotal altında DEĞİL).
 * Sequence: TAX_SUBTOTAL_SEQ.
 */
export function serializeTaxSubtotal(ts: TaxSubtotalInput, currencyCode: string, indent: string = ''): string {
  const inner = emitInOrder(TAX_SUBTOTAL_SEQ, {
    TaxableAmount: () => cbcOptionalAmountTag('TaxableAmount', ts.taxableAmount, currencyCode),
    TaxAmount: () => cbcOptionalAmountTag('TaxAmount', ts.taxAmount, currencyCode),
    CalculationSequenceNumeric: () =>
      ts.calculationSequenceNumeric !== undefined
        ? cbcOptionalTag('CalculationSequenceNumeric', String(ts.calculationSequenceNumeric))
        : '',
    Percent: () =>
      ts.percent !== undefined ? cbcOptionalTag('Percent', formatDecimal(ts.percent, 0)) : '',
    TaxCategory: () => serializeTaxCategory(ts, indent + '  '),
  });

  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:TaxSubtotal>`, body, `${indent}</cac:TaxSubtotal>`].filter(Boolean).join('\n');
}

/**
 * TaxCategory → XML fragment.
 * B-09 fix: TaxExemptionReasonCode/Reason burada (TaxSubtotal altından taşındı).
 * Sequence: TAX_CATEGORY_SEQ.
 */
function serializeTaxCategory(ts: TaxSubtotalInput, indent: string): string {
  const inner = emitInOrder(TAX_CATEGORY_SEQ, {
    TaxExemptionReasonCode: () => cbcOptionalTag('TaxExemptionReasonCode', ts.taxExemptionReasonCode),
    TaxExemptionReason: () => cbcOptionalTag('TaxExemptionReason', ts.taxExemptionReason),
    TaxScheme: () => serializeTaxScheme(ts.taxTypeCode, ts.taxTypeName, indent + '  '),
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:TaxCategory>`, body, `${indent}</cac:TaxCategory>`].filter(Boolean).join('\n');
}

/** TaxScheme → XML fragment. Sequence: TAX_SCHEME_SEQ. TaxTypeCode zorunlu. */
function serializeTaxScheme(taxTypeCode: string, taxTypeName: string | undefined, indent: string): string {
  const inner = emitInOrder(TAX_SCHEME_SEQ, {
    Name: () => cbcOptionalTag('Name', taxTypeName),
    TaxTypeCode: () => cbcRequiredTag('TaxTypeCode', taxTypeCode, 'TaxScheme'),
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:TaxScheme>`, body, `${indent}</cac:TaxScheme>`].filter(Boolean).join('\n');
}

/** WithholdingTaxTotal → XML fragment (UBL-TR). */
export function serializeWithholdingTaxTotal(wtt: WithholdingTaxTotalInput, currencyCode: string, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:WithholdingTaxTotal>`);
  lines.push(`${i2}${cbcOptionalAmountTag('TaxAmount', wtt.taxAmount, currencyCode)}`);
  for (const ts of wtt.taxSubtotals) {
    lines.push(serializeWithholdingSubtotal(ts, currencyCode, i2));
  }
  lines.push(`${indent}</cac:WithholdingTaxTotal>`);
  return joinLines(lines);
}

function serializeWithholdingSubtotal(ts: WithholdingTaxSubtotalInput, currencyCode: string, indent: string): string {
  const inner = emitInOrder(TAX_SUBTOTAL_SEQ, {
    TaxableAmount: () => cbcOptionalAmountTag('TaxableAmount', ts.taxableAmount, currencyCode),
    TaxAmount: () => cbcOptionalAmountTag('TaxAmount', ts.taxAmount, currencyCode),
    Percent: () => cbcOptionalTag('Percent', formatDecimal(ts.percent, 0)),
    TaxCategory: () => {
      const cat = emitInOrder(TAX_CATEGORY_SEQ, {
        TaxScheme: () => serializeTaxScheme(ts.taxTypeCode, ts.taxTypeName, indent + '    '),
      });
      const body = joinLines(cat.map(s => indent + '    ' + s));
      return [`${indent}  <cac:TaxCategory>`, body, `${indent}  </cac:TaxCategory>`].filter(Boolean).join('\n');
    },
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:TaxSubtotal>`, body, `${indent}</cac:TaxSubtotal>`].filter(Boolean).join('\n');
}

