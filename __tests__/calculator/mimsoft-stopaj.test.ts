import { describe, it, expect } from 'vitest';
import { calculateDocument } from '../../src/calculator/document-calculator';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

/**
 * Sprint 4 / Mimsoft F10-F11 — Gerçek üretilmiş faturaların stopaj regresyon fixture'ı.
 *
 * Kaynak: `__tests__/fixtures/mimsoft-real-invoices/f10-satis-gelir-stopaji.xml`
 *         `__tests__/fixtures/mimsoft-real-invoices/f11-satis-kurumlar-stopaji.xml`
 *
 * AMAÇ (R1 / B-17 iptal kararı kanıtı):
 * - Stopaj aritmetiği (baseStat=false → taxForCalculate *= -1) KASITLI ve DOĞRU.
 * - Mimsoft'un ürettiği pre-validation'dan geçen faturalar bu formülü bekler:
 *     TaxInclusive = TaxExclusive + KDV − Stopaj
 * - Sprint 4 ve sonrasında bu test KIRILIRSA stopaj koduna dokunulmuş demektir;
 *   fix geri alınmalı.
 *
 * line-calculator.ts:128-130,181 — DOKUNULMAZ BÖLGE.
 */

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

function makeInput(lines: SimpleInvoiceInput['lines']): SimpleInvoiceInput {
  return {
    sender: baseSender,
    customer: baseCustomer,
    lines,
  };
}

describe('Mimsoft F10 — SATIS + Gelir Vergisi Stopajı (0003 %23)', () => {
  const lines = [
    {
      name: 'Hizmet',
      quantity: 10,
      price: 1500,
      kdvPercent: 20,
      taxes: [{ code: '0003', percent: 23 }],
    },
  ];

  it('LineExtensionAmount = 15000 (iskonto yok)', () => {
    const result = calculateDocument(makeInput(lines));
    expect(result.monetary.lineExtensionAmount).toBeCloseTo(15000, 2);
  });

  it('TaxExclusiveAmount = 15000', () => {
    const result = calculateDocument(makeInput(lines));
    expect(result.monetary.taxExclusiveAmount).toBeCloseTo(15000, 2);
  });

  it('TaxInclusiveAmount = 14550 (15000 + 3000 KDV − 3450 stopaj)', () => {
    const result = calculateDocument(makeInput(lines));
    expect(result.monetary.taxInclusiveAmount).toBeCloseTo(14550, 2);
  });

  it('PayableAmount = 14550', () => {
    const result = calculateDocument(makeInput(lines));
    expect(result.monetary.payableAmount).toBeCloseTo(14550, 2);
  });

  it('taxes.taxTotal = 6450 (pozitif XML değeri: 3450 + 3000)', () => {
    const result = calculateDocument(makeInput(lines));
    expect(result.taxes.taxTotal).toBeCloseTo(6450, 2);
  });

  it('stopaj subtotal (0003): amount=3450 (pozitif XML), taxForCalculate=-3450 (negatif iç hesap)', () => {
    const result = calculateDocument(makeInput(lines));
    const stopaj = result.taxes.taxSubtotals.find(t => t.code === '0003');
    expect(stopaj).toBeDefined();
    expect(stopaj!.amount).toBeCloseTo(3450, 2);
    expect(stopaj!.taxForCalculate).toBeCloseTo(-3450, 2);
    expect(stopaj!.percent).toBe(23);
  });

  it('KDV subtotal (0015): amount=3000, taxForCalculate=3000', () => {
    const result = calculateDocument(makeInput(lines));
    const kdv = result.taxes.taxSubtotals.find(t => t.code === '0015');
    expect(kdv).toBeDefined();
    expect(kdv!.amount).toBeCloseTo(3000, 2);
    expect(kdv!.taxForCalculate).toBeCloseTo(3000, 2);
  });
});

describe('Mimsoft F11 — SATIS + Kurumlar Vergisi Stopajı (0011 %32)', () => {
  const lines = [
    {
      name: 'Hizmet',
      quantity: 10,
      price: 1500,
      kdvPercent: 20,
      taxes: [{ code: '0011', percent: 32 }],
    },
  ];

  it('LineExtensionAmount = 15000', () => {
    const result = calculateDocument(makeInput(lines));
    expect(result.monetary.lineExtensionAmount).toBeCloseTo(15000, 2);
  });

  it('TaxInclusiveAmount = 13200 (15000 + 3000 KDV − 4800 stopaj)', () => {
    const result = calculateDocument(makeInput(lines));
    expect(result.monetary.taxInclusiveAmount).toBeCloseTo(13200, 2);
  });

  it('PayableAmount = 13200', () => {
    const result = calculateDocument(makeInput(lines));
    expect(result.monetary.payableAmount).toBeCloseTo(13200, 2);
  });

  it('taxes.taxTotal = 7800 (pozitif XML değeri: 4800 + 3000)', () => {
    const result = calculateDocument(makeInput(lines));
    expect(result.taxes.taxTotal).toBeCloseTo(7800, 2);
  });

  it('stopaj subtotal (0011): amount=4800, taxForCalculate=-4800', () => {
    const result = calculateDocument(makeInput(lines));
    const stopaj = result.taxes.taxSubtotals.find(t => t.code === '0011');
    expect(stopaj).toBeDefined();
    expect(stopaj!.amount).toBeCloseTo(4800, 2);
    expect(stopaj!.taxForCalculate).toBeCloseTo(-4800, 2);
    expect(stopaj!.percent).toBe(32);
  });
});
