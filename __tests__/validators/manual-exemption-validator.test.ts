/**
 * manual-exemption-validator — B-NEW-11 / M11 kapsamındaki üç kural testi.
 * Sprint 8c.3.
 */

import { describe, it, expect } from 'vitest';
import { validateManualExemption } from '../../src/validators/manual-exemption-validator';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

function baseInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    id: 'TEST',
    uuid: 'e1a2b3c4-0000-4000-8000-000000000001',
    datetime: '2026-04-24T10:00:00',
    profile: 'TEMELFATURA',
    type: 'SATIS',
    currencyCode: 'TRY',
    sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    lines: [
      { name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20 },
    ],
    ...overrides,
  };
}

describe('manual-exemption-validator (B-NEW-11 / M11)', () => {
  describe('Self-exemption tipleri → validator pas', () => {
    it('ISTISNA tip: validator hata üretmez (kendi istisna kodları)', () => {
      const errs = validateManualExemption(baseInput({
        type: 'ISTISNA',
        lines: [{ name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0 }],
      }));
      expect(errs).toHaveLength(0);
    });

    it('IHRACKAYITLI tip: validator hata üretmez', () => {
      const errs = validateManualExemption(baseInput({
        type: 'IHRACKAYITLI',
        lines: [{ name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0 }],
      }));
      expect(errs).toHaveLength(0);
    });

    it('YOLCUBERABERFATURA profili: validator hata üretmez', () => {
      const errs = validateManualExemption(baseInput({
        profile: 'YOLCUBERABERFATURA',
        type: 'ISTISNA',
        lines: [{ name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0 }],
      }));
      expect(errs).toHaveLength(0);
    });

    it('YATIRIMTESVIK profili: validator hata üretmez', () => {
      const errs = validateManualExemption(baseInput({
        profile: 'YATIRIMTESVIK',
        lines: [{ name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0 }],
      }));
      expect(errs).toHaveLength(0);
    });
  });

  describe('R1 — KDV=0 + tevkifat aynı kalemde → WITHHOLDING_INCOMPATIBLE_WITH_ZERO_KDV', () => {
    it('SATIS tip: KDV=0 + withholdingTaxCode çakışması hata', () => {
      const errs = validateManualExemption(baseInput({
        lines: [{
          name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet',
          kdvPercent: 0, withholdingTaxCode: '603',
          kdvExemptionCode: '351', // R2 tetiklenmesin diye
        }],
      }));
      expect(errs.some(e => e.code === 'WITHHOLDING_INCOMPATIBLE_WITH_ZERO_KDV')).toBe(true);
    });

    it('TEVKIFAT tip: aynı — KDV=0 kalemde tevkifat yasak', () => {
      const errs = validateManualExemption(baseInput({
        type: 'TEVKIFAT',
        lines: [{
          name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet',
          kdvPercent: 0, withholdingTaxCode: '603',
          kdvExemptionCode: '351',
        }],
      }));
      expect(errs.some(e => e.code === 'WITHHOLDING_INCOMPATIBLE_WITH_ZERO_KDV')).toBe(true);
    });
  });

  describe('R2 — KDV=0 kalem + kod eksik → MANUAL_EXEMPTION_REQUIRED_FOR_ZERO_KDV', () => {
    it('SATIS + kdvPercent=0 + kod yok → hata', () => {
      const errs = validateManualExemption(baseInput({
        lines: [{ name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0 }],
      }));
      expect(errs.some(e => e.code === 'MANUAL_EXEMPTION_REQUIRED_FOR_ZERO_KDV')).toBe(true);
    });

    it('SATIS + kdvPercent=0 + belge seviyesi kod=351 → pas', () => {
      const errs = validateManualExemption(baseInput({
        kdvExemptionCode: '351',
        lines: [{ name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0 }],
      }));
      expect(errs.filter(e => e.code === 'MANUAL_EXEMPTION_REQUIRED_FOR_ZERO_KDV')).toHaveLength(0);
    });

    it('SATIS + kdvPercent=0 + satır seviyesi kod=555 → pas', () => {
      const errs = validateManualExemption(baseInput({
        lines: [{ name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0, kdvExemptionCode: '555' }],
      }));
      expect(errs.filter(e => e.code === 'MANUAL_EXEMPTION_REQUIRED_FOR_ZERO_KDV')).toHaveLength(0);
    });
  });

  describe('R3 — KDV>0 kalem + satır kodu 351 → EXEMPTION_351_FORBIDDEN_FOR_NONZERO_KDV', () => {
    it('SATIS + kdvPercent=20 + satır kodu 351 → hata', () => {
      const errs = validateManualExemption(baseInput({
        lines: [{
          name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet',
          kdvPercent: 20, kdvExemptionCode: '351',
        }],
      }));
      expect(errs.some(e => e.code === 'EXEMPTION_351_FORBIDDEN_FOR_NONZERO_KDV')).toBe(true);
    });

    it('SATIS + kdvPercent=20 + satır kodu 555 → pas (555 her oranda geçerli)', () => {
      const errs = validateManualExemption(baseInput({
        lines: [{
          name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet',
          kdvPercent: 20, kdvExemptionCode: '555',
        }],
      }));
      expect(errs).toHaveLength(0);
    });
  });

  describe('Normal senaryo → hata yok', () => {
    it('SATIS + kdvPercent=20 + hiç kod yok → pas', () => {
      const errs = validateManualExemption(baseInput());
      expect(errs).toHaveLength(0);
    });

    it('TEVKIFAT + kdvPercent=20 + withholdingTaxCode=603 → pas (KDV>0, çakışma yok)', () => {
      const errs = validateManualExemption(baseInput({
        type: 'TEVKIFAT',
        lines: [{
          name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet',
          kdvPercent: 20, withholdingTaxCode: '603',
        }],
      }));
      expect(errs).toHaveLength(0);
    });
  });
});
