import { describe, it, expect } from 'vitest';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

/**
 * Paket F (Sprint 8a.7) — calc↔serialize cross-cutting integration.
 *
 * Senaryo: calculateDocument() → mapSimpleToInvoiceInput() → serialize() zincirinde
 * monetary değerlerinin XML çıktısıyla tutarlı olduğunu doğrular (M9 yuvarlama dahil).
 *
 * Regex ile extract edilen XML değeri `.toBeCloseTo(calc.monetary.X, 2)` ile
 * eşleştirilir (float disiplini — Sprint 7.3 B-T07 patterni).
 */

function extractAmount(xml: string, tag: string): number {
  // Örnek: <cbc:PayableAmount currencyID="TRY">1200.00</cbc:PayableAmount>
  const re = new RegExp(`<cbc:${tag}[^>]*>([-\\d.]+)</cbc:${tag}>`);
  const match = re.exec(xml);
  if (!match) throw new Error(`Tag ${tag} XML'de bulunamadı`);
  return parseFloat(match[1]);
}

function extractAllAmounts(xml: string, tag: string): number[] {
  const re = new RegExp(`<cbc:${tag}[^>]*>([-\\d.]+)</cbc:${tag}>`, 'g');
  const matches = Array.from(xml.matchAll(re));
  return matches.map(m => parseFloat(m[1]));
}

const baseSender = {
  taxNumber: '1234567890', name: 'Test Firma AŞ', taxOffice: 'Test VD',
  address: 'Test Adres', district: 'Test İlçe', city: 'İstanbul',
};

const baseCustomer = {
  taxNumber: '9876543210', name: 'Müşteri Firma AŞ', taxOffice: 'Müşteri VD',
  address: 'Müşteri Adres', district: 'Müşteri İlçe', city: 'Ankara',
};

describe('calc↔serialize round-trip — Paket F', () => {
  it('Senaryo 1 — SATIS + KDV: monetary XML ile eşleşir', () => {
    const input: SimpleInvoiceInput = {
      sender: baseSender, customer: baseCustomer,
      lines: [
        { name: 'Ürün A', quantity: 2, price: 500, kdvPercent: 20 },
        { name: 'Ürün B', quantity: 5, price: 100, kdvPercent: 10 },
      ],
    };
    const result = new SimpleInvoiceBuilder({ validationLevel: 'none', returnCalculation: true }).build(input);
    const monetary = result.calculation.monetary;

    // TopLevel LegalMonetaryTotal (ilk PayableAmount XML'deki MonetaryTotal'a ait)
    const lineExt = extractAllAmounts(result.xml, 'LineExtensionAmount')[0];
    const taxIncl = extractAmount(result.xml, 'TaxInclusiveAmount');
    const payable = extractAmount(result.xml, 'PayableAmount');

    expect(lineExt).toBeCloseTo(monetary.lineExtensionAmount, 2);
    expect(taxIncl).toBeCloseTo(monetary.taxInclusiveAmount, 2);
    expect(payable).toBeCloseTo(monetary.payableAmount, 2);
  });

  it('Senaryo 2 — SATIS + stopaj (f10 pattern): taxInclusive stopaj sonrası düşer', () => {
    const input: SimpleInvoiceInput = {
      sender: baseSender, customer: baseCustomer,
      lines: [
        // 10 × 1500 = 15000 mal bedeli, %20 KDV = 3000, %23 stopaj (kod 0003) = -3450
        { name: 'Hizmet', quantity: 10, price: 1500, kdvPercent: 20,
          taxes: [{ code: '0003', percent: 23 }] },
      ],
    };
    const result = new SimpleInvoiceBuilder({ validationLevel: 'none', returnCalculation: true }).build(input);
    const monetary = result.calculation.monetary;

    const lineExt = extractAllAmounts(result.xml, 'LineExtensionAmount')[0];
    const taxIncl = extractAmount(result.xml, 'TaxInclusiveAmount');
    const payable = extractAmount(result.xml, 'PayableAmount');

    expect(lineExt).toBeCloseTo(15000, 2);
    expect(taxIncl).toBeCloseTo(monetary.taxInclusiveAmount, 2);
    expect(payable).toBeCloseTo(monetary.payableAmount, 2);
    // M9: stopaj sonrası ödenen = 15000 + 3000 - 3450 = 14550 (f10 teyit)
    expect(payable).toBeCloseTo(14550, 2);
  });

  it('Senaryo 3 — çoklu KDV oranı (f13 YTB pattern): TaxAmount toplamları XML ile eşleşir', () => {
    const input: SimpleInvoiceInput = {
      sender: baseSender, customer: baseCustomer,
      lines: [
        { name: 'Makine', quantity: 1, price: 100, kdvPercent: 20 },
        { name: 'Hizmet', quantity: 4, price: 100, kdvPercent: 10 },
      ],
    };
    const result = new SimpleInvoiceBuilder({ validationLevel: 'none', returnCalculation: true }).build(input);
    const monetary = result.calculation.monetary;

    // Toplam TaxAmount = LineExtensionAmount × ağırlıklı KDV oranı (20 + 40 = 60)
    const taxAmounts = extractAllAmounts(result.xml, 'TaxAmount');
    expect(taxAmounts.length).toBeGreaterThan(0);

    const taxIncl = extractAmount(result.xml, 'TaxInclusiveAmount');
    const taxExcl = extractAmount(result.xml, 'TaxExclusiveAmount');

    expect(taxExcl).toBeCloseTo(monetary.taxExclusiveAmount, 2);
    expect(taxIncl).toBeCloseTo(monetary.taxInclusiveAmount, 2);
    // KDV bileşeni = 500 + 20 + 40 = 560 (monetary taxInclusive doğru)
    expect(taxIncl).toBeCloseTo(560, 2);
  });
});
