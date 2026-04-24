/**
 * Sprint 8d.5 — phantom-kdv-validator testleri.
 *
 * YATIRIMTESVIK+ISTISNA ve EARSIV+YTBISTISNA kombinasyonlarında:
 *   R1 — kdvPercent > 0 ve <= 100 (phantom KDV hesaplanmalı)
 *   R2 — exemption code 308 veya 339 zorunlu (satır bazlı veya belge fallback)
 *   R3 — ItemClassificationCode 03/04 phantom'da yasak (PDF §4)
 *   R4 — 01 ↔ 308, 02 ↔ 339 eşleşmesi zorunlu
 */

import { describe, it, expect } from 'vitest';
import { validatePhantomKdv } from '../../src/validators/phantom-kdv-validator';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

const sender = {
  taxNumber: '1234567890',
  name: 'Test Satıcı A.Ş.',
  taxOffice: 'Üsküdar',
  address: 'Barbaros',
  district: 'Üsküdar',
  city: 'İstanbul',
  zipCode: '34000',
};

const customer = {
  taxNumber: '9876543210',
  name: 'Test Alıcı Ltd.',
  taxOffice: 'Kadıköy',
  address: 'OSB No:1',
  district: 'Tuzla',
  city: 'İstanbul',
  zipCode: '34000',
};

function validInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    id: 'EXA2026000000900',
    uuid: 'aaaaaaaa-bbbb-cccc-dddd-000000000000',
    datetime: '2026-04-24T10:00:00',
    profile: 'YATIRIMTESVIK',
    type: 'ISTISNA',
    currencyCode: 'TRY',
    ytbNo: '123456',
    ytbIssueDate: '2025-01-01',
    kdvExemptionCode: '308',
    sender,
    customer,
    lines: [
      {
        name: 'Kompresör',
        quantity: 1,
        price: 1500,
        unitCode: 'Adet',
        kdvPercent: 20,
        kdvExemptionCode: '308',
        itemClassificationCode: '01',
      },
    ],
    ...overrides,
  };
}

describe('validatePhantomKdv (M12) — phantom-kombinasyon yok', () => {
  it('YATIRIMTESVIK+SATIS → pas (phantom değil)', () => {
    const errors = validatePhantomKdv(validInput({
      type: 'SATIS',
      lines: [{ name: 'X', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20 }],
    }));
    expect(errors).toHaveLength(0);
  });

  it('TEMELFATURA+ISTISNA → pas (normal istisna, phantom değil)', () => {
    const errors = validatePhantomKdv(validInput({
      profile: 'TEMELFATURA',
      type: 'ISTISNA',
      lines: [{ name: 'X', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0, kdvExemptionCode: '350' }],
    }));
    expect(errors).toHaveLength(0);
  });

  it('EARSIV+YTBSATIS → pas (phantom değil)', () => {
    const errors = validatePhantomKdv(validInput({
      profile: 'EARSIVFATURA',
      type: 'YTBSATIS',
      lines: [{ name: 'X', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20 }],
    }));
    expect(errors).toHaveLength(0);
  });
});

describe('validatePhantomKdv — YATIRIMTESVIK+ISTISNA', () => {
  it('geçerli input → hata yok', () => {
    const errors = validatePhantomKdv(validInput());
    expect(errors).toHaveLength(0);
  });

  it('R1 — kdvPercent=0 → YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT', () => {
    const errors = validatePhantomKdv(validInput({
      lines: [{
        name: 'X', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 0, kdvExemptionCode: '308', itemClassificationCode: '01',
      }],
    }));
    expect(errors.some(e => e.code === 'YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT')).toBe(true);
  });

  it('R1 — kdvPercent=101 → YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT', () => {
    const errors = validatePhantomKdv(validInput({
      lines: [{
        name: 'X', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 101, kdvExemptionCode: '308', itemClassificationCode: '01',
      }],
    }));
    expect(errors.some(e => e.code === 'YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT')).toBe(true);
  });

  it('R2 — satır ve belge exemption code yok → YTB_ISTISNA_REQUIRES_EXEMPTION_CODE', () => {
    const errors = validatePhantomKdv(validInput({
      kdvExemptionCode: undefined,
      lines: [{
        name: 'X', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 20, itemClassificationCode: '01',
      }],
    }));
    expect(errors.some(e => e.code === 'YTB_ISTISNA_REQUIRES_EXEMPTION_CODE')).toBe(true);
  });

  it('R2 — exemption code 351 (whitelist dışı) → YTB_ISTISNA_REQUIRES_EXEMPTION_CODE', () => {
    const errors = validatePhantomKdv(validInput({
      kdvExemptionCode: '351',
      lines: [{
        name: 'X', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 20, kdvExemptionCode: '351', itemClassificationCode: '01',
      }],
    }));
    expect(errors.some(e => e.code === 'YTB_ISTISNA_REQUIRES_EXEMPTION_CODE')).toBe(true);
  });

  it('R2 — belge-level kdvExemptionCode fallback olarak kabul edilir', () => {
    // Satırda exemption code yok, belge seviyesinde 308 var → hata yok
    const errors = validatePhantomKdv(validInput({
      kdvExemptionCode: '308',
      lines: [{
        name: 'X', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 20, itemClassificationCode: '01',
      }],
    }));
    expect(errors.filter(e => e.code === 'YTB_ISTISNA_REQUIRES_EXEMPTION_CODE')).toHaveLength(0);
  });

  it('R3 — ItemClassificationCode=03 (Arsa/Arazi) → YTB_ISTISNA_FORBIDDEN_ITEM_CLASSIFICATION', () => {
    const errors = validatePhantomKdv(validInput({
      lines: [{
        name: 'Arsa', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 20, kdvExemptionCode: '308', itemClassificationCode: '03',
      }],
    }));
    expect(errors.some(e => e.code === 'YTB_ISTISNA_FORBIDDEN_ITEM_CLASSIFICATION')).toBe(true);
  });

  it('R3 — ItemClassificationCode=04 (Diğer) → YTB_ISTISNA_FORBIDDEN_ITEM_CLASSIFICATION', () => {
    const errors = validatePhantomKdv(validInput({
      lines: [{
        name: 'Diğer', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 20, kdvExemptionCode: '308', itemClassificationCode: '04',
      }],
    }));
    expect(errors.some(e => e.code === 'YTB_ISTISNA_FORBIDDEN_ITEM_CLASSIFICATION')).toBe(true);
  });

  it('R4 — ItemClassificationCode=01 + code=339 → YTB_ISTISNA_EXEMPTION_CODE_MISMATCH', () => {
    const errors = validatePhantomKdv(validInput({
      kdvExemptionCode: '339',
      lines: [{
        name: 'Makine', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 20, kdvExemptionCode: '339', itemClassificationCode: '01',
      }],
    }));
    expect(errors.some(e => e.code === 'YTB_ISTISNA_EXEMPTION_CODE_MISMATCH')).toBe(true);
  });

  it('R4 — ItemClassificationCode=02 + code=308 → YTB_ISTISNA_EXEMPTION_CODE_MISMATCH', () => {
    const errors = validatePhantomKdv(validInput({
      lines: [{
        name: 'İnşaat', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 20, kdvExemptionCode: '308', itemClassificationCode: '02',
      }],
    }));
    expect(errors.some(e => e.code === 'YTB_ISTISNA_EXEMPTION_CODE_MISMATCH')).toBe(true);
  });
});

describe('validatePhantomKdv — EARSIVFATURA+YTBISTISNA', () => {
  it('geçerli İnşaat (02+339) → hata yok', () => {
    const errors = validatePhantomKdv(validInput({
      profile: 'EARSIVFATURA',
      type: 'YTBISTISNA',
      kdvExemptionCode: '339',
      lines: [{
        name: 'İnşaat', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 18, kdvExemptionCode: '339', itemClassificationCode: '02',
      }],
    }));
    expect(errors).toHaveLength(0);
  });

  it('kdvPercent=0 → hata (E-Arşiv phantom için de geçerli)', () => {
    const errors = validatePhantomKdv(validInput({
      profile: 'EARSIVFATURA',
      type: 'YTBISTISNA',
      kdvExemptionCode: '339',
      lines: [{
        name: 'İnşaat', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 0, kdvExemptionCode: '339', itemClassificationCode: '02',
      }],
    }));
    expect(errors.some(e => e.code === 'YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT')).toBe(true);
  });
});

describe('validatePhantomKdv — Çoklu hata', () => {
  it('aynı satırda 3 hata birden yakalar (kdvPercent=0 + code yok + cls=03)', () => {
    const errors = validatePhantomKdv(validInput({
      kdvExemptionCode: undefined,
      lines: [{
        name: 'X', quantity: 1, price: 1500, unitCode: 'Adet',
        kdvPercent: 0, itemClassificationCode: '03',
      }],
    }));
    expect(errors.length).toBeGreaterThanOrEqual(3);
    expect(errors.some(e => e.code === 'YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT')).toBe(true);
    expect(errors.some(e => e.code === 'YTB_ISTISNA_REQUIRES_EXEMPTION_CODE')).toBe(true);
    expect(errors.some(e => e.code === 'YTB_ISTISNA_FORBIDDEN_ITEM_CLASSIFICATION')).toBe(true);
  });
});
