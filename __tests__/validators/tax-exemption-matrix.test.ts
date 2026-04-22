import { describe, it, expect } from 'vitest';
import {
  TAX_EXEMPTION_MATRIX,
  validateExemptionCode,
  type TaxExemptionRule,
} from '../../src/validators/cross-check-matrix';
import { validateTaxExemptionMatrix } from '../../src/validators/cross-validators';
import { InvoiceTypeCode, InvoiceProfileId } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';

/**
 * Sprint 5.2 — B-06 + M5 matris full cross-check testleri (representative samples).
 *
 * Kapsam:
 * - Matris yapısı (Map size + özel kod entries)
 * - 351 cross-check (9 allowed × 2 durum + 7 forbidden + KDV=0 zorunluluğu)
 * - 201-350 istisna grubu (reprezantatif kodlar × izinli/yasak tip)
 * - 701-704 ihraç kayıtlı
 * - 801-812 özel matrah
 * - SGK sembolik
 * - 151 OTV SATIS
 * - validateTaxExemptionMatrix entegrasyonu (doc + line taxSubtotals)
 */

// ============================================================
// Matris Yapısı
// ============================================================

describe('TAX_EXEMPTION_MATRIX — yapı', () => {
  it('Map<string, TaxExemptionRule>, en az 75 entry içerir (exemption-config türev)', () => {
    expect(TAX_EXEMPTION_MATRIX).toBeInstanceOf(Map);
    // EXEMPTION_DEFINITIONS: 99 entry - SATIS(2: 151, 351) + manuel(151, 351) = 99
    // Aslında: ISTISNA ~83 + IHRACKAYITLI 4 + OZELMATRAH 12 + SGK 7 + 151 + 351 = ~107 beklenirdi
    // Ama exemption-config'de 201-350 aralığı seyrek (bazı kodlar eksik)
    expect(TAX_EXEMPTION_MATRIX.size).toBeGreaterThan(75);
  });

  it('351 entry full rule (allowed + forbidden + requiresZeroKdvLine) içerir', () => {
    const rule = TAX_EXEMPTION_MATRIX.get('351');
    expect(rule).toBeDefined();
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.SATIS)).toBe(true);
    expect(rule?.forbiddenInvoiceTypes?.has(InvoiceTypeCode.ISTISNA)).toBe(true);
    expect(rule?.requiresZeroKdvLine).toBe(true);
  });

  it('151 OTV entry SATIS grubu ile (forbidden yok)', () => {
    const rule = TAX_EXEMPTION_MATRIX.get('151');
    expect(rule).toBeDefined();
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.SATIS)).toBe(true);
    expect(rule?.forbiddenInvoiceTypes).toBeUndefined();
    expect(rule?.requiresZeroKdvLine).toBeFalsy();
  });

  it('201 ISTISNA grubu (IHRACKAYITLI dahil)', () => {
    const rule = TAX_EXEMPTION_MATRIX.get('201');
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.ISTISNA)).toBe(true);
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.IHRACKAYITLI)).toBe(true);
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.SATIS)).toBe(false);
  });

  it('702 IHRACKAYITLI grubu (IADE dahil, IHRACKAYITLI, diğerleri değil)', () => {
    const rule = TAX_EXEMPTION_MATRIX.get('702');
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.IHRACKAYITLI)).toBe(true);
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.IADE)).toBe(true);
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.SATIS)).toBe(false);
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.OZELMATRAH)).toBe(false);
  });

  it('801 OZELMATRAH grubu (OZELMATRAH/IADE/SGK)', () => {
    const rule = TAX_EXEMPTION_MATRIX.get('801');
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.OZELMATRAH)).toBe(true);
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.IADE)).toBe(true);
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.SGK)).toBe(true);
    expect(rule?.allowedInvoiceTypes.has(InvoiceTypeCode.ISTISNA)).toBe(false);
  });
});

// ============================================================
// 351 Cross-Check
// ============================================================

describe('351 — cross-check (M5, ACIK-SORULAR.md #12)', () => {
  const path = 'lines[0].taxTotal.taxSubtotals[0].taxExemptionReasonCode';
  const kdvZero = [{ amount: 0 }];
  const kdvPositive = [{ amount: 100 }];

  // Allowed types × KDV=0 → kabul
  const allowedTypes: InvoiceTypeCode[] = [
    InvoiceTypeCode.SATIS, InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.KOMISYONCU,
    InvoiceTypeCode.HKSSATIS, InvoiceTypeCode.HKSKOMISYONCU,
    InvoiceTypeCode.KONAKLAMAVERGISI, InvoiceTypeCode.TEKNOLOJIDESTEK,
    InvoiceTypeCode.YTBSATIS, InvoiceTypeCode.YTBTEVKIFAT,
    InvoiceTypeCode.SGK,
  ];

  allowedTypes.forEach(type => {
    it(`351 + ${type} + KDV=0 → kabul`, () => {
      expect(validateExemptionCode('351', type, kdvZero, path)).toBeNull();
    });
    it(`351 + ${type} + KDV>0 (tüm) → EXEMPTION_REQUIRES_ZERO_KDV_LINE`, () => {
      const err = validateExemptionCode('351', type, kdvPositive, path);
      expect(err?.code).toBe('EXEMPTION_REQUIRES_ZERO_KDV_LINE');
    });
  });

  // Forbidden types → ret
  const forbiddenTypes: InvoiceTypeCode[] = [
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.IADE,
    InvoiceTypeCode.YTBISTISNA, InvoiceTypeCode.YTBIADE,
    InvoiceTypeCode.TEVKIFATIADE, InvoiceTypeCode.YTBTEVKIFATIADE,
    InvoiceTypeCode.IHRACKAYITLI,
  ];

  forbiddenTypes.forEach(type => {
    it(`351 + ${type} → FORBIDDEN_EXEMPTION_FOR_TYPE (KDV=0 olsa bile)`, () => {
      const err = validateExemptionCode('351', type, kdvZero, path);
      expect(err?.code).toBe('FORBIDDEN_EXEMPTION_FOR_TYPE');
    });
  });
});

// ============================================================
// İstisna Grubu (201-350) — reprezantatif kodlar
// ============================================================

describe('201-350 istisna grubu — reprezantatif (Schematron satır 316)', () => {
  const path = 'test.path';
  const kdv = [{ amount: 0 }];
  const sampleCodes = ['201', '250', '301', '308', '339', '350'];
  const allowedForIstisna: InvoiceTypeCode[] = [
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.IADE, InvoiceTypeCode.IHRACKAYITLI,
    InvoiceTypeCode.SGK, InvoiceTypeCode.YTBISTISNA, InvoiceTypeCode.YTBIADE,
  ];

  sampleCodes.forEach(code => {
    it(`${code} + ISTISNA → kabul`, () => {
      expect(validateExemptionCode(code, InvoiceTypeCode.ISTISNA, kdv, path)).toBeNull();
    });
    it(`${code} + SATIS → INVALID_EXEMPTION_FOR_TYPE`, () => {
      const err = validateExemptionCode(code, InvoiceTypeCode.SATIS, kdv, path);
      expect(err?.code).toBe('INVALID_EXEMPTION_FOR_TYPE');
    });
  });

  allowedForIstisna.forEach(type => {
    it(`301 + ${type} → kabul`, () => {
      expect(validateExemptionCode('301', type, kdv, path)).toBeNull();
    });
  });
});

// ============================================================
// 701-704 İhraç Kayıtlı
// ============================================================

describe('701-704 ihraç kayıtlı grubu (Schematron satır 322)', () => {
  const path = 'test.path';
  const kdv = [{ amount: 0 }];
  const codes = ['701', '702', '703', '704'];

  codes.forEach(code => {
    it(`${code} + IHRACKAYITLI → kabul`, () => {
      expect(validateExemptionCode(code, InvoiceTypeCode.IHRACKAYITLI, kdv, path)).toBeNull();
    });
    it(`${code} + IADE → kabul`, () => {
      expect(validateExemptionCode(code, InvoiceTypeCode.IADE, kdv, path)).toBeNull();
    });
    it(`${code} + SATIS → INVALID_EXEMPTION_FOR_TYPE`, () => {
      const err = validateExemptionCode(code, InvoiceTypeCode.SATIS, kdv, path);
      expect(err?.code).toBe('INVALID_EXEMPTION_FOR_TYPE');
    });
    it(`${code} + OZELMATRAH → INVALID_EXEMPTION_FOR_TYPE`, () => {
      const err = validateExemptionCode(code, InvoiceTypeCode.OZELMATRAH, kdv, path);
      expect(err?.code).toBe('INVALID_EXEMPTION_FOR_TYPE');
    });
  });
});

// ============================================================
// 801-812 Özel Matrah
// ============================================================

describe('801-812 özel matrah grubu', () => {
  const path = 'test.path';
  const kdv = [{ amount: 0 }];

  it('801 + OZELMATRAH → kabul', () => {
    expect(validateExemptionCode('801', InvoiceTypeCode.OZELMATRAH, kdv, path)).toBeNull();
  });
  it('812 + IADE → kabul', () => {
    expect(validateExemptionCode('812', InvoiceTypeCode.IADE, kdv, path)).toBeNull();
  });
  it('805 + SGK → kabul', () => {
    expect(validateExemptionCode('805', InvoiceTypeCode.SGK, kdv, path)).toBeNull();
  });
  it('801 + SATIS → INVALID_EXEMPTION_FOR_TYPE', () => {
    const err = validateExemptionCode('801', InvoiceTypeCode.SATIS, kdv, path);
    expect(err?.code).toBe('INVALID_EXEMPTION_FOR_TYPE');
  });
  it('812 + ISTISNA → INVALID_EXEMPTION_FOR_TYPE', () => {
    const err = validateExemptionCode('812', InvoiceTypeCode.ISTISNA, kdv, path);
    expect(err?.code).toBe('INVALID_EXEMPTION_FOR_TYPE');
  });
});

// ============================================================
// SGK Sembolik
// ============================================================

describe('SGK sembolik kodları', () => {
  const path = 'test.path';
  const kdv = [{ amount: 0 }];

  ['SAGLIK_ECZ', 'SAGLIK_HAS', 'ABONELIK', 'MAL_HIZMET', 'DIGER'].forEach(code => {
    it(`${code} + SGK → kabul`, () => {
      expect(validateExemptionCode(code, InvoiceTypeCode.SGK, kdv, path)).toBeNull();
    });
    it(`${code} + SATIS → INVALID_EXEMPTION_FOR_TYPE`, () => {
      const err = validateExemptionCode(code, InvoiceTypeCode.SATIS, kdv, path);
      expect(err?.code).toBe('INVALID_EXEMPTION_FOR_TYPE');
    });
  });
});

// ============================================================
// 151 OTV SATIS
// ============================================================

describe('151 OTV SATIS', () => {
  const path = 'test.path';
  const kdv = [{ amount: 0 }];

  it('151 + SATIS → kabul', () => {
    expect(validateExemptionCode('151', InvoiceTypeCode.SATIS, kdv, path)).toBeNull();
  });
  it('151 + TEVKIFAT → kabul', () => {
    expect(validateExemptionCode('151', InvoiceTypeCode.TEVKIFAT, kdv, path)).toBeNull();
  });
  it('151 + KOMISYONCU → kabul', () => {
    expect(validateExemptionCode('151', InvoiceTypeCode.KOMISYONCU, kdv, path)).toBeNull();
  });
  it('151 + ISTISNA → INVALID_EXEMPTION_FOR_TYPE', () => {
    const err = validateExemptionCode('151', InvoiceTypeCode.ISTISNA, kdv, path);
    expect(err?.code).toBe('INVALID_EXEMPTION_FOR_TYPE');
  });
  it('151 + IHRACKAYITLI → INVALID_EXEMPTION_FOR_TYPE', () => {
    const err = validateExemptionCode('151', InvoiceTypeCode.IHRACKAYITLI, kdv, path);
    expect(err?.code).toBe('INVALID_EXEMPTION_FOR_TYPE');
  });
});

// ============================================================
// Bilinmeyen / Matris Dışı Kodlar
// ============================================================

describe('Bilinmeyen kodlar → UNKNOWN_EXEMPTION_CODE', () => {
  const path = 'test.path';
  const kdv = [{ amount: 0 }];

  it('555 (matris dışı, M4 flag ile ayrı gate) → UNKNOWN_EXEMPTION_CODE', () => {
    const err = validateExemptionCode('555', InvoiceTypeCode.SATIS, kdv, path);
    expect(err?.code).toBe('UNKNOWN_EXEMPTION_CODE');
  });
  it('999 → UNKNOWN_EXEMPTION_CODE', () => {
    const err = validateExemptionCode('999', InvoiceTypeCode.SATIS, kdv, path);
    expect(err?.code).toBe('UNKNOWN_EXEMPTION_CODE');
    expect(err?.actual).toBe('999');
  });
});

// ============================================================
// validateTaxExemptionMatrix — entegrasyon
// ============================================================

function makeInvoiceInput(overrides: Partial<InvoiceInput>): InvoiceInput {
  return {
    id: 'ABC202500000001',
    uuid: '11111111-2222-3333-4444-555555555555',
    profileId: InvoiceProfileId.TEMELFATURA,
    invoiceTypeCode: InvoiceTypeCode.SATIS,
    issueDate: '2026-01-01',
    currencyCode: 'TRY',
    supplier: {} as any,
    customer: {} as any,
    taxTotals: [],
    legalMonetaryTotal: {} as any,
    lines: [],
    ...overrides,
  };
}

describe('validateTaxExemptionMatrix — entegrasyon', () => {
  it('belge taxSubtotals içindeki 351 + ISTISNA → FORBIDDEN (tek hata)', () => {
    const input = makeInvoiceInput({
      invoiceTypeCode: InvoiceTypeCode.ISTISNA,
      taxTotals: [{
        taxAmount: 0,
        taxSubtotals: [{
          taxableAmount: 100,
          taxAmount: 0,
          taxTypeCode: '0015',
          taxExemptionReasonCode: '351',
        }],
      }],
    });
    const errors = validateTaxExemptionMatrix(input);
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe('FORBIDDEN_EXEMPTION_FOR_TYPE');
    expect(errors[0].path).toBe('taxTotals[0].taxSubtotals[0].taxExemptionReasonCode');
  });

  it('satır taxSubtotals içindeki 702 + SATIS → INVALID_EXEMPTION_FOR_TYPE', () => {
    const input = makeInvoiceInput({
      invoiceTypeCode: InvoiceTypeCode.SATIS,
      taxTotals: [],
      lines: [{
        id: '1',
        invoicedQuantity: 1,
        unitCode: 'C62',
        lineExtensionAmount: 100,
        taxTotal: {
          taxAmount: 0,
          taxSubtotals: [{
            taxableAmount: 100,
            taxAmount: 0,
            taxTypeCode: '0015',
            taxExemptionReasonCode: '702',
          }],
        },
        item: {} as any,
        price: {} as any,
      }],
    });
    const errors = validateTaxExemptionMatrix(input);
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe('INVALID_EXEMPTION_FOR_TYPE');
    expect(errors[0].path).toBe('lines[0].taxTotal.taxSubtotals[0].taxExemptionReasonCode');
  });

  it("kodu olmayan subtotal'lar sessizce atlanır (istisna kodu yok = hata yok)", () => {
    const input = makeInvoiceInput({
      invoiceTypeCode: InvoiceTypeCode.SATIS,
      taxTotals: [{
        taxAmount: 18,
        taxSubtotals: [{
          taxableAmount: 100,
          taxAmount: 18,
          taxTypeCode: '0015',
          percent: 18,
          // taxExemptionReasonCode yok
        }],
      }],
    });
    expect(validateTaxExemptionMatrix(input)).toEqual([]);
  });

  it('351 + SATIS + KDV=0 satır (satır seviyesi havuz dahil) → kabul', () => {
    const input = makeInvoiceInput({
      invoiceTypeCode: InvoiceTypeCode.SATIS,
      taxTotals: [{
        taxAmount: 0,
        taxSubtotals: [{
          taxableAmount: 100,
          taxAmount: 0,
          taxTypeCode: '0015',
          taxExemptionReasonCode: '351',
        }],
      }],
      lines: [{
        id: '1',
        invoicedQuantity: 1,
        unitCode: 'C62',
        lineExtensionAmount: 100,
        taxTotal: {
          taxAmount: 0,
          taxSubtotals: [{
            taxableAmount: 100,
            taxAmount: 0, // KDV=0 — requiresZeroKdvLine satisfy eder
            taxTypeCode: '0015',
          }],
        },
        item: {} as any,
        price: {} as any,
      }],
    });
    expect(validateTaxExemptionMatrix(input)).toEqual([]);
  });

  it('351 + SATIS + hiçbir satırda KDV=0 yok → EXEMPTION_REQUIRES_ZERO_KDV_LINE', () => {
    const input = makeInvoiceInput({
      invoiceTypeCode: InvoiceTypeCode.SATIS,
      taxTotals: [{
        taxAmount: 18,
        taxSubtotals: [{
          taxableAmount: 100,
          taxAmount: 18, // KDV>0
          taxTypeCode: '0015',
          taxExemptionReasonCode: '351',
        }],
      }],
    });
    const errors = validateTaxExemptionMatrix(input);
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe('EXEMPTION_REQUIRES_ZERO_KDV_LINE');
  });
});
