import { describe, it, expect } from 'vitest';
import { validateYatirimTesvikExemptionScope } from '../../src/validators/yatirim-tesvik-validator';
import { InvoiceTypeCode, InvoiceProfileId } from '../../src/types/enums';
import {
  YATIRIM_TESVIK_ONLY_EXEMPTION_CODES,
  YATIRIM_TESVIK_SCHEMATRON_EARSIV_TYPES,
  YATIRIM_TESVIK_EARSIV_TYPES,
} from '../../src/config/constants';
import type { InvoiceInput, InvoiceLineInput } from '../../src/types/invoice-input';

/**
 * Sprint 9 — TaxExemptionReasonCodeCheck (Schematron 20260701).
 *
 * 308/339 genel $TaxExemptionReasonCodeType listesinden çıkarılıp ayrı
 * $YatirimTesvikTaxExemptionReasonCodeType değişkenine alındı. Artık yalnız
 * ProfileID=YATIRIMTESVIK veya InvoiceTypeCode ∈ $YatirimTesvikEArsivInvoiceTypeCodeList
 * olduğunda geçerli.
 */

// ============================================================
// Fixture helpers
// ============================================================

function makeLine(exemptionCode?: string): InvoiceLineInput {
  return {
    id: '1',
    invoicedQuantity: 1,
    unitCode: 'C62',
    lineExtensionAmount: 100,
    taxTotal: {
      taxAmount: 0,
      taxSubtotals: [{
        taxableAmount: 100,
        taxAmount: 0,
        percent: 0,
        taxTypeCode: '0015',
        taxExemptionReasonCode: exemptionCode,
      }],
    },
    item: { name: 'Test' } as any,
    price: { priceAmount: 100 } as any,
  };
}

function makeInput(
  profile: InvoiceProfileId,
  type: InvoiceTypeCode,
  opts: { docExemptionCode?: string; lineExemptionCode?: string } = {},
): InvoiceInput {
  return {
    id: 'ABC202500000001',
    uuid: '11111111-2222-3333-4444-555555555555',
    profileId: profile,
    invoiceTypeCode: type,
    issueDate: '2026-01-01',
    currencyCode: 'TRY',
    supplier: {} as any,
    customer: {} as any,
    taxTotals: [{
      taxAmount: 0,
      taxSubtotals: [{
        taxableAmount: 100,
        taxAmount: 0,
        percent: 0,
        taxTypeCode: '0015',
        taxExemptionReasonCode: opts.docExemptionCode,
      }],
    }],
    lines: [makeLine(opts.lineExemptionCode)],
  } as any;
}

// ============================================================
// Sabitler
// ============================================================

describe('Sprint 9 — YATIRIMTESVIK istisna kodu sabitleri', () => {
  it('308 ve 339 YATIRIM_TESVIK_ONLY_EXEMPTION_CODES içinde', () => {
    expect(YATIRIM_TESVIK_ONLY_EXEMPTION_CODES.has('308')).toBe(true);
    expect(YATIRIM_TESVIK_ONLY_EXEMPTION_CODES.has('339')).toBe(true);
    expect(YATIRIM_TESVIK_ONLY_EXEMPTION_CODES.size).toBe(2);
  });

  it('Schematron $YatirimTesvikEArsivInvoiceTypeCodeList 5 tipin tamamı', () => {
    expect(YATIRIM_TESVIK_SCHEMATRON_EARSIV_TYPES).toEqual(
      new Set([
        InvoiceTypeCode.YTBSATIS,
        InvoiceTypeCode.YTBIADE,
        InvoiceTypeCode.YTBISTISNA,
        InvoiceTypeCode.YTBTEVKIFAT,
        InvoiceTypeCode.YTBTEVKIFATIADE,
      ]),
    );
  });

  it('mevcut YATIRIM_TESVIK_EARSIV_TYPES (B-08, 3 tip) değişmedi', () => {
    // B-08 KDV kontrolü IADE türevlerini ayrı erken-return ile eliyor.
    // Bu sabiti genişletmek o validator'ı bozar — bilinçli olarak ayrı tutuluyor.
    expect(YATIRIM_TESVIK_EARSIV_TYPES.size).toBe(3);
    expect(YATIRIM_TESVIK_EARSIV_TYPES.has(InvoiceTypeCode.YTBIADE)).toBe(false);
  });
});

// ============================================================
// Kapsam İÇİ — kabul
// ============================================================

describe('Sprint 9 — 308/339 kapsam içi (kabul)', () => {
  for (const code of ['308', '339']) {
    it(`${code} + YATIRIMTESVIK profili + ISTISNA → kabul`, () => {
      const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.ISTISNA, {
        docExemptionCode: code,
        lineExemptionCode: code,
      });
      expect(validateYatirimTesvikExemptionScope(input)).toEqual([]);
    });

    for (const type of [
      InvoiceTypeCode.YTBSATIS,
      InvoiceTypeCode.YTBIADE,
      InvoiceTypeCode.YTBISTISNA,
      InvoiceTypeCode.YTBTEVKIFAT,
      InvoiceTypeCode.YTBTEVKIFATIADE,
    ]) {
      it(`${code} + EARSIVFATURA + ${type} → kabul`, () => {
        const input = makeInput(InvoiceProfileId.EARSIVFATURA, type, {
          docExemptionCode: code,
          lineExemptionCode: code,
        });
        expect(validateYatirimTesvikExemptionScope(input)).toEqual([]);
      });
    }
  }
});

// ============================================================
// Kapsam DIŞI — ret
// ============================================================

describe('Sprint 9 — 308/339 kapsam dışı (ret)', () => {
  const outOfScope: Array<[InvoiceProfileId, InvoiceTypeCode]> = [
    [InvoiceProfileId.TEMELFATURA, InvoiceTypeCode.ISTISNA],
    [InvoiceProfileId.TICARIFATURA, InvoiceTypeCode.SATIS],
    [InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.ISTISNA],
    [InvoiceProfileId.IDIS, InvoiceTypeCode.ISTISNA],
    [InvoiceProfileId.ILAC_TIBBICIHAZ, InvoiceTypeCode.ISTISNA],
  ];

  for (const code of ['308', '339']) {
    for (const [profile, type] of outOfScope) {
      it(`${code} + ${profile} + ${type} → EXEMPTION_REQUIRES_YATIRIMTESVIK_SCOPE`, () => {
        const input = makeInput(profile, type, { docExemptionCode: code });
        const errors = validateYatirimTesvikExemptionScope(input);
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe('EXEMPTION_REQUIRES_YATIRIMTESVIK_SCOPE');
        expect(errors[0].actual).toBe(code);
      });
    }
  }

  it('satır seviyesinde de yakalanıyor, path satırı gösteriyor', () => {
    const input = makeInput(InvoiceProfileId.TEMELFATURA, InvoiceTypeCode.ISTISNA, {
      lineExemptionCode: '308',
    });
    const errors = validateYatirimTesvikExemptionScope(input);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('lines[0].taxTotal.taxSubtotals[0].taxExemptionReasonCode');
  });

  it('belge + satır ikisi de kapsam dışıysa iki hata', () => {
    const input = makeInput(InvoiceProfileId.TEMELFATURA, InvoiceTypeCode.ISTISNA, {
      docExemptionCode: '308',
      lineExemptionCode: '339',
    });
    expect(validateYatirimTesvikExemptionScope(input)).toHaveLength(2);
  });
});

// ============================================================
// Regresyon — diğer kodlar etkilenmiyor
// ============================================================

describe('Sprint 9 — 308/339 dışı kodlar bu kuraldan etkilenmiyor', () => {
  for (const code of ['301', '307', '309', '338', '340', '233']) {
    it(`${code} + TEMELFATURA + ISTISNA → bu kural hata üretmiyor`, () => {
      const input = makeInput(InvoiceProfileId.TEMELFATURA, InvoiceTypeCode.ISTISNA, {
        docExemptionCode: code,
        lineExemptionCode: code,
      });
      expect(validateYatirimTesvikExemptionScope(input)).toEqual([]);
    });
  }

  it('istisna kodu hiç yoksa hata yok', () => {
    const input = makeInput(InvoiceProfileId.TEMELFATURA, InvoiceTypeCode.SATIS);
    expect(validateYatirimTesvikExemptionScope(input)).toEqual([]);
  });
});
