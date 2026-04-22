import { describe, it, expect } from 'vitest';
import { serializeLegalMonetaryTotal } from '../../src/serializers/monetary-serializer';
import type { MonetaryTotalInput } from '../../src/types/common';

/**
 * Sprint 4 / AR-5 — PayableRoundingAmount tam iptal regression guard.
 * M9 uyarınca calculator float, hesap yuvarlanmıyor → sapma yok → bu alan üretilmez.
 */

describe('AR-5 — PayableRoundingAmount üretilmez', () => {
  it('LegalMonetaryTotal XML çıktısında PayableRoundingAmount etiketi YOK', () => {
    const mt: MonetaryTotalInput = {
      lineExtensionAmount: 1000,
      taxExclusiveAmount: 1000,
      taxInclusiveAmount: 1200,
      payableAmount: 1200,
    };
    const xml = serializeLegalMonetaryTotal(mt, 'TRY');
    expect(xml).not.toContain('PayableRoundingAmount');
    expect(xml).not.toContain('payableRoundingAmount');
  });

  it('Normal monetary total serileştirme ve sıra (LineExt → TaxExcl → TaxIncl → PayableAmount)', () => {
    const mt: MonetaryTotalInput = {
      lineExtensionAmount: 1000,
      taxExclusiveAmount: 1000,
      taxInclusiveAmount: 1200,
      allowanceTotalAmount: 50,
      payableAmount: 1200,
    };
    const xml = serializeLegalMonetaryTotal(mt, 'TRY');
    const lineIdx = xml.indexOf('<cbc:LineExtensionAmount');
    const exclIdx = xml.indexOf('<cbc:TaxExclusiveAmount');
    const inclIdx = xml.indexOf('<cbc:TaxInclusiveAmount');
    const allowIdx = xml.indexOf('<cbc:AllowanceTotalAmount');
    const payIdx = xml.indexOf('<cbc:PayableAmount');

    expect(lineIdx).toBeLessThan(exclIdx);
    expect(exclIdx).toBeLessThan(inclIdx);
    expect(inclIdx).toBeLessThan(allowIdx);
    expect(allowIdx).toBeLessThan(payIdx);
  });
});
