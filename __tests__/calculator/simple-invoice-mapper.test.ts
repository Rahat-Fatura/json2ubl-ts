import { describe, it, expect, vi } from 'vitest';
import { mapSimpleToInvoiceInput } from '../../src/calculator/simple-invoice-mapper';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import * as documentCalculator from '../../src/calculator/document-calculator';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

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

function makeInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    sender: baseSender,
    customer: baseCustomer,
    lines: [{ name: 'Ürün', quantity: 1, price: 1000, kdvPercent: 20 }],
    ...overrides,
  };
}

describe('B-80 — SimpleInvoiceBuilder tek calculateDocument çağrısı', () => {
  it('builder.build() calculateDocument\'ı yalnız bir kez çağırır', () => {
    const spy = vi.spyOn(documentCalculator, 'calculateDocument');
    const builder = new SimpleInvoiceBuilder({ validationLevel: 'none' });
    builder.build(makeInput());
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('mapSimpleToInvoiceInput precomputed verilirse calculateDocument çağırmaz', () => {
    const spy = vi.spyOn(documentCalculator, 'calculateDocument');
    const input = makeInput();
    const precomputed = documentCalculator.calculateDocument(input);
    spy.mockClear(); // yukarıdaki direkt çağrı sayılmasın
    mapSimpleToInvoiceInput(input, precomputed);
    expect(spy).toHaveBeenCalledTimes(0);
    spy.mockRestore();
  });
});

describe('B-81 — mapper TEVKIFAT+351 istisna kodunu korur', () => {
  it('TEVKIFAT tipinde TaxExemptionReasonCode=351 XML\'e yazılır', () => {
    const builder = new SimpleInvoiceBuilder({ validationLevel: 'none' });
    const result = builder.build(makeInput({
      lines: [
        { name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 20, withholdingTaxCode: '602' },
      ],
    }));
    // 351 = "Gelir Vergisi Stopajı" default istisna kodu (SATIS/TEVKIFAT için)
    expect(result.xml).toContain('<cbc:TaxExemptionReasonCode>351</cbc:TaxExemptionReasonCode>');
  });

  it('mapper direkt çıktısı: TEVKIFAT tipinde KDV subtotal\'a istisna kodu eklenmiş', () => {
    const invoiceInput = mapSimpleToInvoiceInput(makeInput({
      lines: [
        { name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 20, withholdingTaxCode: '602' },
      ],
    }));
    const kdvSubtotal = invoiceInput.taxTotals?.[0]?.taxSubtotals.find(ts => ts.taxTypeCode === '0015');
    expect(kdvSubtotal?.taxExemptionReasonCode).toBe('351');
  });
});
