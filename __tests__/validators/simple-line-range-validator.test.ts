/**
 * simple-line-range-validator — B-NEW-01, B-NEW-02, B-NEW-03 testleri.
 * Sprint 8c.8.
 */

import { describe, it, expect } from 'vitest';
import { validateSimpleLineRanges } from '../../src/validators/simple-line-range-validator';
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
    lines: [{ name: 'Demo', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20 }],
    ...overrides,
  };
}

describe('simple-line-range-validator (B-NEW-01, 02, 03)', () => {
  describe('B-NEW-01 — kdvPercent [0, 100]', () => {
    it('kdvPercent=-10 → INVALID_VALUE', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{ name: 'D', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: -10 }],
      }));
      expect(errs.some(e => e.code === 'INVALID_VALUE' && e.path === 'lines[0].kdvPercent')).toBe(true);
    });

    it('kdvPercent=150 → INVALID_VALUE', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{ name: 'D', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 150 }],
      }));
      expect(errs.some(e => e.code === 'INVALID_VALUE' && e.path === 'lines[0].kdvPercent')).toBe(true);
    });

    it('kdvPercent=0, 20, 100 → pas', () => {
      for (const pct of [0, 20, 100]) {
        const errs = validateSimpleLineRanges(baseInput({
          lines: [{ name: 'D', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: pct }],
        }));
        expect(errs.filter(e => e.path?.includes('kdvPercent'))).toHaveLength(0);
      }
    });
  });

  describe('B-NEW-02 — quantity > 0', () => {
    it('quantity=0 → INVALID_VALUE', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{ name: 'D', quantity: 0, price: 100, unitCode: 'Adet', kdvPercent: 20 }],
      }));
      expect(errs.some(e => e.code === 'INVALID_VALUE' && e.path === 'lines[0].quantity')).toBe(true);
    });

    it('quantity=-5 → INVALID_VALUE', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{ name: 'D', quantity: -5, price: 100, unitCode: 'Adet', kdvPercent: 20 }],
      }));
      expect(errs.some(e => e.code === 'INVALID_VALUE' && e.path === 'lines[0].quantity')).toBe(true);
    });

    it('quantity=0.001 (küsürat) → pas', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{ name: 'D', quantity: 0.001, price: 100, unitCode: 'Adet', kdvPercent: 20 }],
      }));
      expect(errs.filter(e => e.path?.includes('quantity'))).toHaveLength(0);
    });
  });

  describe('B-NEW-03 — taxes[].percent [0, 100]', () => {
    it('tax.percent=150 → INVALID_VALUE', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{
          name: 'D', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20,
          taxes: [{ code: '0071', percent: 150 }],
        }],
      }));
      expect(errs.some(e => e.code === 'INVALID_VALUE' && e.path === 'lines[0].taxes[0].percent')).toBe(true);
    });

    it('tax.percent=-5 → INVALID_VALUE', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{
          name: 'D', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20,
          taxes: [{ code: '0071', percent: -5 }],
        }],
      }));
      expect(errs.some(e => e.code === 'INVALID_VALUE' && e.path === 'lines[0].taxes[0].percent')).toBe(true);
    });

    it('tax.percent=50 → pas', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{
          name: 'D', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20,
          taxes: [{ code: '0071', percent: 50 }],
        }],
      }));
      expect(errs).toHaveLength(0);
    });
  });

  describe('Normal senaryo', () => {
    it('Geçerli satırlar → hata yok', () => {
      const errs = validateSimpleLineRanges(baseInput());
      expect(errs).toHaveLength(0);
    });
  });

  // Sprint 8g.1 — B-NEW-v2-04 withholding kod/oran tutarlılığı
  describe('B-NEW-v2-04 — withholding kod/oran ValidationError (Sprint 8g.1)', () => {
    it('Bilinmeyen withholding kod (999) → INVALID_VALUE', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{ name: 'X', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
          withholdingTaxCode: '999' }],
      }));
      const err = errs.find(e => e.path === 'lines[0].withholdingTaxCode');
      expect(err?.code).toBe('INVALID_VALUE');
      expect(err?.actual).toBe('999');
    });

    it('650 dinamik kod + percent eksik → MISSING_FIELD', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{ name: 'X', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
          withholdingTaxCode: '650' /* withholdingTaxPercent yok */ }],
      }));
      const err = errs.find(e => e.path === 'lines[0].withholdingTaxPercent');
      expect(err?.code).toBe('MISSING_FIELD');
      expect(err?.message).toContain('650');
    });

    it('650 dinamik + percent=150 → INVALID_VALUE (range)', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{ name: 'X', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
          withholdingTaxCode: '650', withholdingTaxPercent: 150 }],
      }));
      const err = errs.find(e => e.path === 'lines[0].withholdingTaxPercent');
      expect(err?.code).toBe('INVALID_VALUE');
      expect(err?.actual).toBe('150');
    });

    it('603 sabit kod + percent verilmiş → INVALID_VALUE (sadece 650 için)', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{ name: 'X', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
          withholdingTaxCode: '603', withholdingTaxPercent: 99 }],
      }));
      const err = errs.find(e => e.path === 'lines[0].withholdingTaxPercent');
      expect(err?.code).toBe('INVALID_VALUE');
      expect(err?.message).toContain('sabit oranlıdır');
    });

    it('603 sabit + percent yok → pas (mevcut davranış korundu)', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{ name: 'X', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
          withholdingTaxCode: '603' }],
      }));
      expect(errs.filter(e => e.path?.includes('withholding'))).toHaveLength(0);
    });

    it('650 + percent=50 → pas (geçerli dinamik)', () => {
      const errs = validateSimpleLineRanges(baseInput({
        lines: [{ name: 'X', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
          withholdingTaxCode: '650', withholdingTaxPercent: 50 }],
      }));
      expect(errs.filter(e => e.path?.includes('withholding'))).toHaveLength(0);
    });
  });

  // Sprint 8g.1 — UblBuildError instance kontrolü (E2E builder)
  describe('B-NEW-v2-04 — SimpleInvoiceBuilder UblBuildError instance (Sprint 8g.1)', () => {
    it('999 kod build() çağrısı UblBuildError fırlatır (raw Error değil)', async () => {
      const { SimpleInvoiceBuilder } = await import('../../src/calculator/simple-invoice-builder');
      const { UblBuildError } = await import('../../src/errors/ubl-build-error');
      const builder = new SimpleInvoiceBuilder({ validationLevel: 'strict' });
      const input = baseInput({
        lines: [{ name: 'X', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
          withholdingTaxCode: '999' }],
      });
      expect(() => builder.build(input)).toThrow(UblBuildError);
    });
  });
});
