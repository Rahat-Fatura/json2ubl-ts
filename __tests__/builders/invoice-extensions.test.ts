import { describe, it, expect } from 'vitest';
import { InvoiceBuilder } from '../../src/builders/invoice-builder';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';

function createValidSatisInput(): InvoiceInput {
  return {
    id: 'ABC2024000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId: InvoiceProfileId.TEMELFATURA,
    invoiceTypeCode: InvoiceTypeCode.SATIS,
    issueDate: '2024-01-15',
    issueTime: '10:30:00',
    currencyCode: 'TRY',
    supplier: {
      vknTckn: '1234567890',
      taxIdType: 'VKN',
      name: 'Test Firma A.Ş.',
      citySubdivisionName: 'Çankaya',
      cityName: 'Ankara',
      postalZone: '06100',
      country: 'Türkiye',
      taxOffice: 'Çankaya VD',
    },
    customer: {
      vknTckn: '12345678901',
      taxIdType: 'TCKN',
      firstName: 'Ahmet',
      familyName: 'Yılmaz',
      citySubdivisionName: 'Beyoğlu',
      cityName: 'İstanbul',
      postalZone: '34430',
      country: 'Türkiye',
    },
    taxTotals: [{
      taxAmount: 18,
      taxSubtotals: [{
        taxableAmount: 100,
        taxAmount: 18,
        percent: 18,
        taxTypeCode: '0015',
        taxTypeName: 'KDV',
      }],
    }],
    legalMonetaryTotal: {
      lineExtensionAmount: 100,
      taxExclusiveAmount: 100,
      taxInclusiveAmount: 118,
      payableAmount: 118,
    },
    lines: [{
      id: '1',
      invoicedQuantity: 2,
      unitCode: 'C62',
      lineExtensionAmount: 100,
      taxTotal: {
        taxAmount: 18,
        taxSubtotals: [{
          taxableAmount: 100,
          taxAmount: 18,
          percent: 18,
          taxTypeCode: '0015',
          taxTypeName: 'KDV',
        }],
      },
      item: { name: 'Bilgisayar' },
      price: { priceAmount: 50 },
    }],
  };
}

describe('InvoiceBuilder — B-74 PaymentCurrencyCode', () => {
  it('paymentCurrencyCode emit edilir (XSD sırası: PricingCurrencyCode < PaymentCurrencyCode < AccountingCost)', () => {
    const builder = new InvoiceBuilder();
    const input = createValidSatisInput();
    input.pricingCurrencyCode = 'USD';
    input.paymentCurrencyCode = 'EUR';
    const xml = builder.build(input);
    expect(xml).toContain('<cbc:PaymentCurrencyCode>EUR</cbc:PaymentCurrencyCode>');
    const pricingIdx = xml.indexOf('<cbc:PricingCurrencyCode>');
    const paymentIdx = xml.indexOf('<cbc:PaymentCurrencyCode>');
    expect(pricingIdx).toBeLessThan(paymentIdx);
  });

  it('paymentCurrencyCode undefined ise emit edilmez', () => {
    const builder = new InvoiceBuilder();
    const input = createValidSatisInput();
    const xml = builder.build(input);
    expect(xml).not.toContain('<cbc:PaymentCurrencyCode>');
  });
});

describe('InvoiceBuilder — B-71 TaxExchangeRate', () => {
  it('taxExchangeRate emit edilir (XSD sırası: TaxExchangeRate < PricingExchangeRate)', () => {
    const builder = new InvoiceBuilder();
    const input = createValidSatisInput();
    input.taxExchangeRate = {
      sourceCurrencyCode: 'USD',
      targetCurrencyCode: 'TRY',
      calculationRate: 33.5,
    };
    input.exchangeRate = {
      sourceCurrencyCode: 'USD',
      targetCurrencyCode: 'TRY',
      calculationRate: 33.5,
    };
    const xml = builder.build(input);
    expect(xml).toContain('<cac:TaxExchangeRate>');
    expect(xml).toContain('<cac:PricingExchangeRate>');
    const taxIdx = xml.indexOf('<cac:TaxExchangeRate>');
    const pricingIdx = xml.indexOf('<cac:PricingExchangeRate>');
    expect(taxIdx).toBeLessThan(pricingIdx);
  });

  it('sadece taxExchangeRate emit edilir (PricingExchangeRate yok)', () => {
    const builder = new InvoiceBuilder();
    const input = createValidSatisInput();
    input.taxExchangeRate = {
      sourceCurrencyCode: 'USD',
      targetCurrencyCode: 'TRY',
      calculationRate: 33.5,
    };
    const xml = builder.build(input);
    expect(xml).toContain('<cac:TaxExchangeRate>');
    expect(xml).not.toContain('<cac:PricingExchangeRate>');
  });
});

describe('InvoiceBuilder — B-39 OriginatorDocumentReference', () => {
  it('çoklu OriginatorDocumentReference emit edilir', () => {
    const builder = new InvoiceBuilder();
    const input = createValidSatisInput();
    input.originatorDocumentReferences = [
      { id: 'ORIG-001', issueDate: '2024-01-01' },
      { id: 'ORIG-002', issueDate: '2024-01-02' },
    ];
    const xml = builder.build(input);
    const count = (xml.match(/<cac:OriginatorDocumentReference>/g) ?? []).length;
    expect(count).toBe(2);
    expect(xml).toContain('ORIG-001');
    expect(xml).toContain('ORIG-002');
  });

  it('originatorDocumentReferences undefined ise emit edilmez', () => {
    const builder = new InvoiceBuilder();
    const input = createValidSatisInput();
    const xml = builder.build(input);
    expect(xml).not.toContain('<cac:OriginatorDocumentReference>');
  });
});
