import { describe, it, expect } from 'vitest';
import { validateCrossMatrix } from '../../src/validators/cross-validators';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import { UblBuildError } from '../../src/errors/ubl-build-error';
import { deriveTypeProfileFlags } from '../../src/calculator/line-field-visibility';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

/** Uçtan uca build denemesi için minimum geçerli simple-input (iade referanslı). */
function simpleTevkifatIadeInput(type: string): SimpleInvoiceInput {
  return {
    id: 'MTX2026000000901',
    uuid: 'a1000901-0001-4000-8001-000000000901',
    datetime: '2026-04-24T10:00:00',
    profile: 'TEMELFATURA',
    type,
    currencyCode: 'TRY',
    billingReference: { id: 'MTX2026000000005', issueDate: '2026-04-24' },
    sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    lines: [{ name: 'İade kalem', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
  };
}

function createMinimalInput(profileId: InvoiceProfileId, invoiceTypeCode: InvoiceTypeCode): InvoiceInput {
  // Geçerli KDV (18%) — B-08 YatirimTesvikKDVCheck kapsam içi belgelerde gerekli.
  // Test amacı yalnızca PROFILE_TYPE_MATRIX (CROSS_MATRIX) kontrolü olduğundan bu
  // ek tutarlar diğer validator'ları sessiz bırakır.
  return {
    id: 'ABC2024000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId,
    invoiceTypeCode,
    issueDate: '2024-01-15',
    currencyCode: 'TRY',
    supplier: { vknTckn: '1234567890', taxIdType: 'VKN', name: 'Test' },
    customer: { vknTckn: '12345678901', taxIdType: 'TCKN', firstName: 'A', familyName: 'B' },
    taxTotals: [{ taxAmount: 18, taxSubtotals: [{ taxableAmount: 100, taxAmount: 18, percent: 18, taxTypeCode: '0015' }] }],
    legalMonetaryTotal: { lineExtensionAmount: 100, taxExclusiveAmount: 100, taxInclusiveAmount: 118, payableAmount: 118 },
    lines: [{ id: '1', invoicedQuantity: 1, unitCode: 'C62', lineExtensionAmount: 100, taxTotal: { taxAmount: 18, taxSubtotals: [{ taxableAmount: 100, taxAmount: 18, percent: 18, taxTypeCode: '0015' }] }, item: { name: 'X' }, price: { priceAmount: 100 } }],
  };
}

describe('§4 Çapraz Matris Validasyonu', () => {
  describe('TEMELFATURA profili', () => {
    it('SATIS izin verilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.TEMELFATURA, InvoiceTypeCode.SATIS));
      expect(errors).toHaveLength(0);
    });

    it('IADE izin verilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.TEMELFATURA, InvoiceTypeCode.IADE));
      expect(errors).toHaveLength(0);
    });

    it('HKSSATIS izin verilmez', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.TEMELFATURA, InvoiceTypeCode.HKSSATIS));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
    });

    it('SARJ izin verilmez', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.TEMELFATURA, InvoiceTypeCode.SARJ));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
    });
  });

  /**
   * HKS — e-FATURA DÜZLEMİ. Şematron tip kısıtı koymuyor; ayrım GİB'in kapıyı
   * açma biçimidir: bu düzlemde tip `SATIS`/`KOMISYONCU`'dur, `HKSSATIS`/
   * `HKSKOMISYONCU` ise e-ARŞİV düzlemine aittir (aşağıdaki EARSIVFATURA bloğu).
   */
  describe('HKS profili (e-Fatura düzlemi)', () => {
    it('SATIS izin verilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.HKS, InvoiceTypeCode.SATIS));
      expect(errors).toHaveLength(0);
    });

    it('KOMISYONCU izin verilir (4.4.0: e-Fatura düzlemi boşluğu kapandı)', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.HKS, InvoiceTypeCode.KOMISYONCU));
      expect(errors).toHaveLength(0);
    });

    it('TEVKIFAT izin verilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.HKS, InvoiceTypeCode.TEVKIFAT));
      expect(errors).toHaveLength(0);
    });

    it('HKSSATIS izin VERİLMEZ (e-Arşiv düzleminin tipi)', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.HKS, InvoiceTypeCode.HKSSATIS));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
    });

    it('HKSKOMISYONCU izin VERİLMEZ (e-Arşiv düzleminin tipi)', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.HKS, InvoiceTypeCode.HKSKOMISYONCU));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
    });

    /* 🔴 IADE şematronun açıkça reddettiği tek tip (InvoiceTypeCodeCheck). */
    it('IADE izin verilmez', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.HKS, InvoiceTypeCode.IADE));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
    });
  });

  /**
   * `TEVKIFATIADE` / `YTBTEVKIFATIADE` — üretim kapısı artık REDDEDER.
   * Enum ve iade davranışı korundu (gelen belgede tanınır); burada ölçülen
   * yalnız ÜRETİM kapısıdır.
   */
  describe('4.4.0 — TEVKIFATIADE/YTBTEVKIFATIADE üretimde reddedilir', () => {
    it('TEMELFATURA + TEVKIFATIADE reddedilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.TEMELFATURA, InvoiceTypeCode.TEVKIFATIADE));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
    });

    it('EARSIVFATURA + TEVKIFATIADE reddedilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.TEVKIFATIADE));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
    });

    it('EARSIVFATURA + YTBTEVKIFATIADE reddedilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.YTBTEVKIFATIADE));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
    });

    /* Uçtan uca: kapı yalnız validator seviyesinde değil, gerçek build yolunda
     * da kapalı olmalı — aksi hâlde `SimpleInvoiceBuilder` kullanan tüketici
     * (portal önizleme dâhil) GİB'e gidemeyecek belge üretmeye devam ederdi. */
    it('SimpleInvoiceBuilder TEVKIFATIADE belgesini KURMAZ', () => {
      const builder = new SimpleInvoiceBuilder({ validationLevel: 'strict' });
      let caught: unknown;
      try {
        builder.build(simpleTevkifatIadeInput('TEVKIFATIADE'));
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(UblBuildError);
      expect((caught as UblBuildError).errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
    });

    /* OKUMA YOLU KORUNDU: tip hâlâ "iade" davranışı türetir (alan görünürlüğü,
     * BillingReference zorunluluğu). Başka entegratörden gelen belge okunmalı. */
    it('okuma yolu: iade davranışı türetilmeye devam eder', () => {
      expect(deriveTypeProfileFlags('TEVKIFATIADE', 'TEMELFATURA').isIade).toBe(true);
      expect(deriveTypeProfileFlags('YTBTEVKIFATIADE', 'EARSIVFATURA').isIade).toBe(true);
    });
  });

  describe('ENERJI profili', () => {
    it('SARJ izin verilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.ENERJI, InvoiceTypeCode.SARJ));
      expect(errors).toHaveLength(0);
    });

    it('SATIS izin verilmez', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.ENERJI, InvoiceTypeCode.SATIS));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
    });
  });

  describe('EARSIVFATURA profili', () => {
    it('TEKNOLOJIDESTEK izin verilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.TEKNOLOJIDESTEK));
      expect(errors).toHaveLength(0);
    });

    it('YTBSATIS izin verilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.YTBSATIS));
      expect(errors).toHaveLength(0);
    });

    /* 4.4.0: HKS'in e-ARŞİV düzlemi. Eskiden burada `izin verilmez` iddiası
     * vardı ve o yüzden düzlem hiç erişilemiyordu; canlı şematron (type=earchive)
     * EARSIVFATURA+HKSSATIS belgesini 0 ihlalle geçirir. */
    it('HKSSATIS izin verilir (HKS e-Arşiv düzlemi)', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.HKSSATIS));
      expect(errors).toHaveLength(0);
    });

    it('HKSKOMISYONCU izin verilir (HKS e-Arşiv düzlemi)', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.HKSKOMISYONCU));
      expect(errors).toHaveLength(0);
    });
  });

  describe('TICARIFATURA profili', () => {
    it('IADE izin verilmez', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.TICARIFATURA, InvoiceTypeCode.IADE));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
    });

    it('SATIS izin verilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.TICARIFATURA, InvoiceTypeCode.SATIS));
      expect(errors).toHaveLength(0);
    });
  });
});
