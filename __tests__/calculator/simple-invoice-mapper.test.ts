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

describe('B-83 — mapper buyerCustomer.identifications → additionalIdentifiers eşlemesi', () => {
  it('identifications verilmezse additionalIdentifiers undefined', () => {
    const invoiceInput = mapSimpleToInvoiceInput(makeInput({
      profile: 'KAMU',
      buyerCustomer: {
        name: 'Devlet Kurumu', taxNumber: '1111111110',
        address: 'Gov. Addr', district: 'Çankaya', city: 'Ankara', country: 'Türkiye',
      },
    }));
    expect(invoiceInput.buyerCustomer?.party?.additionalIdentifiers).toBeUndefined();
  });

  it('KAMU + identifications verilirse additionalIdentifiers dolu', () => {
    const invoiceInput = mapSimpleToInvoiceInput(makeInput({
      profile: 'KAMU',
      buyerCustomer: {
        name: 'Devlet Kurumu', taxNumber: '1111111110',
        address: 'Gov. Addr', district: 'Çankaya', city: 'Ankara', country: 'Türkiye',
        identifications: [
          { schemeId: 'MUSTERINO', value: 'M-12345' },
          { schemeId: 'MERSISNO', value: '0001234567891011' },
        ],
      },
    }));
    const ids = invoiceInput.buyerCustomer?.party?.additionalIdentifiers;
    expect(ids).toHaveLength(2);
    expect(ids?.[0]).toEqual({ schemeId: 'MUSTERINO', value: 'M-12345' });
    expect(ids?.[1]).toEqual({ schemeId: 'MERSISNO', value: '0001234567891011' });
  });

  it('identifications XML çıktısına yansır (PartyIdentification element)', () => {
    const builder = new SimpleInvoiceBuilder({ validationLevel: 'none' });
    const result = builder.build(makeInput({
      profile: 'KAMU',
      paymentMeans: { meansCode: '42', accountNumber: 'TR330006100519786457841326' },
      buyerCustomer: {
        name: 'Devlet Kurumu', taxNumber: '1111111110',
        address: 'Gov. Addr', district: 'Çankaya', city: 'Ankara', country: 'Türkiye',
        identifications: [{ schemeId: 'MUSTERINO', value: 'M-12345' }],
      },
    }));
    expect(result.xml).toContain('<cac:BuyerCustomerParty>');
    expect(result.xml).toContain('schemeID="MUSTERINO"');
    expect(result.xml).toContain('M-12345');
  });
});
