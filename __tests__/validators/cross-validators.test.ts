import { describe, it, expect } from 'vitest';
import { validateCrossMatrix } from '../../src/validators/cross-validators';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';

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

  describe('HKS profili', () => {
    it('HKSSATIS izin verilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.HKS, InvoiceTypeCode.HKSSATIS));
      expect(errors).toHaveLength(0);
    });

    it('HKSKOMISYONCU izin verilir', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.HKS, InvoiceTypeCode.HKSKOMISYONCU));
      expect(errors).toHaveLength(0);
    });

    it('SATIS izin verilmez', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.HKS, InvoiceTypeCode.SATIS));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
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

    it('HKSSATIS izin verilmez', () => {
      const errors = validateCrossMatrix(createMinimalInput(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.HKSSATIS));
      expect(errors.some(e => e.code === 'CROSS_MATRIX')).toBe(true);
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
