/**
 * sgk-input-validator — B-NEW-08, B-NEW-09, B-NEW-10 testleri.
 * Sprint 8c.7.
 */

import { describe, it, expect } from 'vitest';
import { validateSgkInput } from '../../src/validators/sgk-input-validator';
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

describe('sgk-input-validator (B-NEW-08, 09, 10)', () => {
  describe('B-NEW-08 — type=SGK + sgk obje eksik', () => {
    it('type=SGK ama sgk undefined → TYPE_REQUIRES_SGK', () => {
      const errs = validateSgkInput(baseInput({ type: 'SGK' }));
      expect(errs.some(e => e.code === 'TYPE_REQUIRES_SGK')).toBe(true);
    });

    it('type=SATIS + sgk undefined → hata yok', () => {
      const errs = validateSgkInput(baseInput({ type: 'SATIS' }));
      expect(errs).toHaveLength(0);
    });
  });

  describe('B-NEW-09 — sgk.type whitelist', () => {
    it('Geçerli type (SAGLIK_ECZ) → hata yok', () => {
      const errs = validateSgkInput(baseInput({
        type: 'SGK',
        sgk: { type: 'SAGLIK_ECZ', documentNo: 'SGK-1', companyName: 'X', companyCode: 'Y' },
      }));
      expect(errs).toHaveLength(0);
    });

    it('Geçersiz type (FOOBAR) → INVALID_VALUE', () => {
      const errs = validateSgkInput(baseInput({
        type: 'SGK',
        // TS union'ı by-pass için any cast
        sgk: { type: 'FOOBAR' as never, documentNo: 'SGK-1', companyName: 'X', companyCode: 'Y' },
      }));
      expect(errs.some(e => e.code === 'INVALID_VALUE' && e.path === 'sgk.type')).toBe(true);
    });
  });

  describe('B-NEW-10 — sgk alt-alan boş-olmama', () => {
    it('documentNo boş → MISSING_FIELD', () => {
      const errs = validateSgkInput(baseInput({
        type: 'SGK',
        sgk: { type: 'SAGLIK_ECZ', documentNo: '', companyName: 'X', companyCode: 'Y' },
      }));
      expect(errs.some(e => e.code === 'MISSING_FIELD' && e.path === 'sgk.documentNo')).toBe(true);
    });

    it('companyName boş → MISSING_FIELD', () => {
      const errs = validateSgkInput(baseInput({
        type: 'SGK',
        sgk: { type: 'SAGLIK_ECZ', documentNo: 'SGK-1', companyName: '', companyCode: 'Y' },
      }));
      expect(errs.some(e => e.code === 'MISSING_FIELD' && e.path === 'sgk.companyName')).toBe(true);
    });

    it('companyCode boş → MISSING_FIELD', () => {
      const errs = validateSgkInput(baseInput({
        type: 'SGK',
        sgk: { type: 'SAGLIK_ECZ', documentNo: 'SGK-1', companyName: 'X', companyCode: '' },
      }));
      expect(errs.some(e => e.code === 'MISSING_FIELD' && e.path === 'sgk.companyCode')).toBe(true);
    });
  });

  describe('Normal senaryo — hata yok', () => {
    it('Tam geçerli SGK input → hata yok', () => {
      const errs = validateSgkInput(baseInput({
        type: 'SGK',
        sgk: { type: 'SAGLIK_ECZ', documentNo: 'SGK-2026-042', companyName: 'X A.Ş.', companyCode: 'COMP-01' },
      }));
      expect(errs).toHaveLength(0);
    });

    it('type=SATIS + sgk verilmiş → alt-alan kontrolleri çalışır', () => {
      const errs = validateSgkInput(baseInput({
        type: 'SATIS',
        sgk: { type: 'SAGLIK_ECZ', documentNo: 'SGK-1', companyName: 'X', companyCode: 'Y' },
      }));
      expect(errs).toHaveLength(0);
    });
  });
});
