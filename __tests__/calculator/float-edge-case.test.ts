import { describe, it, expect } from 'vitest';
import { calculateDocument } from '../../src/calculator/document-calculator';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

// B-T07 + B-87 — Float edge case regression guard (Sprint 7.3).
// Sprint 4 M9: calculator tam float, yuvarlama XML yazım anında.
// Tüm float assertion toBeCloseTo(val, 2) ile; toBe sadece integer için.

const baseSender = {
  taxNumber: '1234567890',
  name: 'Test Firma AŞ',
  taxOffice: 'Test VD',
  address: 'Test Adres',
  district: 'Test İlçe',
  city: 'İstanbul',
};

const baseCustomer = {
  taxNumber: '9876543210',
  name: 'Müşteri Firma AŞ',
  taxOffice: 'Müşteri VD',
  address: 'Müşteri Adres',
  district: 'Müşteri İlçe',
  city: 'Ankara',
};

function makeInput(lines: SimpleLineInput[]): SimpleInvoiceInput {
  return { sender: baseSender, customer: baseCustomer, lines };
}

describe('B-T07 + B-87 — Float edge case regression', () => {
  it('0.1 + 0.2 toplamı toBeCloseTo(0.3, 2) ile doğru (IEEE754)', () => {
    // JavaScript: 0.1 + 0.2 === 0.30000000000000004. Calculator toplamını kontrol et.
    const result = calculateDocument(makeInput([
      { name: 'A', quantity: 1, price: 0.1, kdvPercent: 0 },
      { name: 'B', quantity: 1, price: 0.2, kdvPercent: 0 },
    ]));
    expect(result.monetary.lineExtensionAmount).toBeCloseTo(0.3, 2);
    expect(result.monetary.taxExclusiveAmount).toBeCloseTo(0.3, 2);
  });

  it('33.33 × 0.2 KDV floating precision — toBeCloseTo', () => {
    // 33.33 * 20% = 6.666 → XML 2-basamak 6.67; calculator tam float tutmalı.
    const result = calculateDocument(makeInput([
      { name: 'A', quantity: 1, price: 33.33, kdvPercent: 20 },
    ]));
    expect(result.monetary.lineExtensionAmount).toBeCloseTo(33.33, 2);
    // taxInclusive = 33.33 + 6.666 = 39.996 → XML 40.00
    expect(result.monetary.taxInclusiveAmount).toBeCloseTo(39.996, 2);
  });

  it('10 × 0.1 quantity×price = 1.0 (multiple float addition)', () => {
    // 10 * 0.1 tam float olmalı; floating hata 1.0000000000000002 olasılık.
    const result = calculateDocument(makeInput([
      { name: 'A', quantity: 10, price: 0.1, kdvPercent: 0 },
    ]));
    expect(result.monetary.lineExtensionAmount).toBeCloseTo(1.0, 2);
  });

  it('1/3 × 3 birim fiyatı XML 2-basamak yuvarlanır (M9)', () => {
    // 0.3333333 * 3 = 0.9999999 → XML yuvarlama 1.00 olmalı; calculator içsel değer korur.
    const result = calculateDocument(makeInput([
      { name: 'A', quantity: 3, price: 0.3333333, kdvPercent: 0 },
    ]));
    // Calculator tam float; round-trip yuvarlama XML aşamasında (M9)
    expect(result.monetary.lineExtensionAmount).toBeCloseTo(1, 2);
  });

  it('Σ satır KDV = monetary.taxInclusive − taxExclusive (floating tutarlılık)', () => {
    // 3 farklı satır, farklı KDV — toplamlar toBeCloseTo ile eşit olmalı.
    const result = calculateDocument(makeInput([
      { name: 'A', quantity: 2, price: 15.75, kdvPercent: 20 },  // 31.50 + 6.30
      { name: 'B', quantity: 1, price: 8.33, kdvPercent: 10 },   // 8.33 + 0.833
      { name: 'C', quantity: 5, price: 0.7, kdvPercent: 1 },     // 3.5 + 0.035
    ]));
    const kdvDelta = result.monetary.taxInclusiveAmount - result.monetary.taxExclusiveAmount;
    // 0015 = KDV — her oran (%20, %10, %1) ayrı TaxSubtotal; toplam = Σ
    const totalKdv = result.taxes.taxSubtotals
      .filter(t => t.code === '0015')
      .reduce((sum, t) => sum + t.amount, 0);
    expect(totalKdv).toBeCloseTo(kdvDelta, 2);
  });

  it('0.0 toleransı toBeCloseTo(0, 2) kabul — sıfır KDV satırı', () => {
    // ISTISNA satırı 0 KDV → floating 0 olmalı, NaN/Infinity olmamalı.
    const result = calculateDocument(makeInput([
      { name: 'İhraç', quantity: 1, price: 1000, kdvPercent: 0 },
    ]));
    const kdvSubtotal = result.taxes.taxSubtotals.find(t => t.code === '0015');
    if (kdvSubtotal) {
      expect(kdvSubtotal.amount).toBeCloseTo(0, 2);
    }
    expect(result.monetary.taxInclusiveAmount).toBeCloseTo(1000, 2);
  });
});
