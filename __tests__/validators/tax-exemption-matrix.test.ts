import { describe, it, expect } from 'vitest';
import {
  TAX_EXEMPTION_MATRIX,
  validateExemptionCode,
  type TaxExemptionRule,
} from '../../src/validators/cross-check-matrix';
import { InvoiceTypeCode } from '../../src/types/enums';

/**
 * Sprint 5.1 smoke testleri — matris iskelet + skeleton validator kontrolü.
 * Sprint 5.2'de kombinatorik test kapsamı genişletilecek.
 */

describe('TAX_EXEMPTION_MATRIX — iskelet', () => {
  it('Map<string, TaxExemptionRule> yapısında, en az bir entry içerir', () => {
    expect(TAX_EXEMPTION_MATRIX).toBeInstanceOf(Map);
    expect(TAX_EXEMPTION_MATRIX.size).toBeGreaterThan(0);
  });

  it('351 kodu smoke entry içerir (Sprint 5.2 full doldurulacak)', () => {
    const rule: TaxExemptionRule | undefined = TAX_EXEMPTION_MATRIX.get('351');
    expect(rule).toBeDefined();
    expect(rule?.code).toBe('351');
    expect(rule?.requiresZeroKdvLine).toBe(true);
  });

  it('351 allowedInvoiceTypes SATIS ve SGK içerir (ACIK-SORULAR.md #12)', () => {
    const rule = TAX_EXEMPTION_MATRIX.get('351')!;
    expect(rule.allowedInvoiceTypes.has(InvoiceTypeCode.SATIS)).toBe(true);
    expect(rule.allowedInvoiceTypes.has(InvoiceTypeCode.SGK)).toBe(true);
  });

  it('351 forbiddenInvoiceTypes ISTISNA ve IHRACKAYITLI içerir', () => {
    const rule = TAX_EXEMPTION_MATRIX.get('351')!;
    expect(rule.forbiddenInvoiceTypes?.has(InvoiceTypeCode.ISTISNA)).toBe(true);
    expect(rule.forbiddenInvoiceTypes?.has(InvoiceTypeCode.IHRACKAYITLI)).toBe(true);
  });
});

describe('validateExemptionCode — skeleton davranışı', () => {
  const path = 'lines[0].taxTotal.taxSubtotals[0].taxExemptionReasonCode';

  it('bilinmeyen kod → UNKNOWN_EXEMPTION_CODE', () => {
    const err = validateExemptionCode('999', InvoiceTypeCode.SATIS, [{ amount: 0 }], path);
    expect(err).not.toBeNull();
    expect(err?.code).toBe('UNKNOWN_EXEMPTION_CODE');
    expect(err?.path).toBe(path);
    expect(err?.actual).toBe('999');
  });

  it('351 + SATIS + KDV=0 satır → geçerli (null)', () => {
    const err = validateExemptionCode('351', InvoiceTypeCode.SATIS, [{ amount: 0 }], path);
    expect(err).toBeNull();
  });

  it('351 + SATIS + yalnızca KDV>0 satırlar → EXEMPTION_REQUIRES_ZERO_KDV_LINE', () => {
    const err = validateExemptionCode('351', InvoiceTypeCode.SATIS, [{ amount: 100 }], path);
    expect(err).not.toBeNull();
    expect(err?.code).toBe('EXEMPTION_REQUIRES_ZERO_KDV_LINE');
  });

  it('351 + ISTISNA → FORBIDDEN_EXEMPTION_FOR_TYPE', () => {
    const err = validateExemptionCode('351', InvoiceTypeCode.ISTISNA, [{ amount: 0 }], path);
    expect(err).not.toBeNull();
    expect(err?.code).toBe('FORBIDDEN_EXEMPTION_FOR_TYPE');
    expect(err?.actual).toBe(InvoiceTypeCode.ISTISNA);
  });

  it('351 + IHRACKAYITLI → FORBIDDEN_EXEMPTION_FOR_TYPE (kullanıcı cevabı)', () => {
    const err = validateExemptionCode('351', InvoiceTypeCode.IHRACKAYITLI, [{ amount: 0 }], path);
    expect(err?.code).toBe('FORBIDDEN_EXEMPTION_FOR_TYPE');
  });

  it('351 + SGK + KDV=0 → geçerli (kullanıcı cevabı: SGK izinli)', () => {
    const err = validateExemptionCode('351', InvoiceTypeCode.SGK, [{ amount: 0 }], path);
    expect(err).toBeNull();
  });
});
