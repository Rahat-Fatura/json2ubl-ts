import { describe, it, expect } from 'vitest';
import { serializeTaxSubtotal, serializeWithholdingTaxTotal } from '../../src/serializers/tax-serializer';
import type { TaxSubtotalInput, WithholdingTaxTotalInput } from '../../src/types/common';

/**
 * Sprint 4 / B-42 — Percent 2-basamak yuvarlama (M9 gereği).
 * Calculator tam float, serializer yazım anında 2 basamak. Kesirli oran korunur.
 */

describe('B-42 — TaxSubtotal Percent 2-basamak', () => {
  it('integer oran (18) → "18.00"', () => {
    const ts: TaxSubtotalInput = {
      taxableAmount: 1000,
      taxAmount: 180,
      percent: 18,
      taxTypeCode: '0015',
    };
    const xml = serializeTaxSubtotal(ts, 'TRY');
    expect(xml).toContain('<cbc:Percent>18.00</cbc:Percent>');
  });

  it('kesirli oran (18.5) → "18.50" (kayıp yok)', () => {
    const ts: TaxSubtotalInput = {
      taxableAmount: 1000,
      taxAmount: 185,
      percent: 18.5,
      taxTypeCode: '0015',
    };
    const xml = serializeTaxSubtotal(ts, 'TRY');
    expect(xml).toContain('<cbc:Percent>18.50</cbc:Percent>');
  });

  it('düşük kesirli oran (0.5) → "0.50"', () => {
    const ts: TaxSubtotalInput = {
      taxableAmount: 1000,
      taxAmount: 5,
      percent: 0.5,
      taxTypeCode: '0059',
    };
    const xml = serializeTaxSubtotal(ts, 'TRY');
    expect(xml).toContain('<cbc:Percent>0.50</cbc:Percent>');
  });

  it('percent undefined → Percent etiketi yazılmaz', () => {
    const ts: TaxSubtotalInput = {
      taxableAmount: 1000,
      taxAmount: 0,
      taxTypeCode: '0015',
    };
    const xml = serializeTaxSubtotal(ts, 'TRY');
    expect(xml).not.toContain('<cbc:Percent>');
  });
});

describe('B-42 — WithholdingTaxSubtotal Percent 2-basamak', () => {
  it('stopaj integer oran (23) → "23.00"', () => {
    const wtt: WithholdingTaxTotalInput = {
      taxAmount: 3450,
      taxSubtotals: [
        {
          taxableAmount: 15000,
          taxAmount: 3450,
          percent: 23,
          taxTypeCode: '0003',
          taxTypeName: 'Gelir Vergisi Stopajı',
        },
      ],
    };
    const xml = serializeWithholdingTaxTotal(wtt, 'TRY');
    expect(xml).toContain('<cbc:Percent>23.00</cbc:Percent>');
  });

  it('stopaj kesirli oran (9.9) → "9.90"', () => {
    const wtt: WithholdingTaxTotalInput = {
      taxAmount: 99,
      taxSubtotals: [
        {
          taxableAmount: 1000,
          taxAmount: 99,
          percent: 9.9,
          taxTypeCode: '0003',
          taxTypeName: 'Gelir Vergisi Stopajı',
        },
      ],
    };
    const xml = serializeWithholdingTaxTotal(wtt, 'TRY');
    expect(xml).toContain('<cbc:Percent>9.90</cbc:Percent>');
  });
});
