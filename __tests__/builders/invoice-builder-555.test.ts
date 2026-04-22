import { describe, it, expect } from 'vitest';
import { InvoiceBuilder } from '../../src/builders/invoice-builder';
import { UblBuildError } from '../../src/errors/ubl-build-error';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';

/** 555 (Demirbaş KDV) kodu ile SATIS tipi fatura input'u oluşturur. */
function createInputWith555(): InvoiceInput {
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
      streetName: 'Atatürk Caddesi',
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
      streetName: 'İstiklal',
      citySubdivisionName: 'Beyoğlu',
      cityName: 'İstanbul',
      postalZone: '34430',
      country: 'Türkiye',
    },
    taxTotals: [{
      taxAmount: 10,
      taxSubtotals: [{
        taxableAmount: 100,
        taxAmount: 10,
        percent: 10,
        taxTypeCode: '0015',
        taxTypeName: 'KDV',
        taxExemptionReasonCode: '555',
        taxExemptionReason: 'Demirbaş KDV',
      }],
    }],
    legalMonetaryTotal: {
      lineExtensionAmount: 100,
      taxExclusiveAmount: 100,
      taxInclusiveAmount: 110,
      payableAmount: 110,
    },
    lines: [{
      id: '1',
      invoicedQuantity: 1,
      unitCode: 'C62',
      lineExtensionAmount: 100,
      taxTotal: {
        taxAmount: 10,
        taxSubtotals: [{
          taxableAmount: 100,
          taxAmount: 10,
          percent: 10,
          taxTypeCode: '0015',
          taxTypeName: 'KDV',
        }],
      },
      item: { name: 'Demirbaş' },
      price: { priceAmount: 100 },
    }],
  };
}

describe('InvoiceBuilder — M4 555 (Demirbaş KDV) flag', () => {
  it('default (flag=false): 555 kodu UblBuildError ile reddedilir', () => {
    const builder = new InvoiceBuilder();
    expect(() => builder.build(createInputWith555())).toThrow(UblBuildError);

    try {
      builder.build(createInputWith555());
    } catch (e) {
      const err = e as UblBuildError;
      expect(err.errors[0].code).toBe('REDUCED_KDV_RATE_NOT_ALLOWED');
      expect(err.errors[0].actual).toBe('555');
    }
  });

  it('allowReducedKdvRate=true: 555 kodu kabul edilir', () => {
    const builder = new InvoiceBuilder({ allowReducedKdvRate: true, validationLevel: 'none' });
    const xml = builder.build(createInputWith555());
    expect(xml).toContain('555');
  });

  it('flag=false + validationLevel=none: pre-check yine gate açar', () => {
    const builder = new InvoiceBuilder({ validationLevel: 'none' });
    expect(() => builder.build(createInputWith555())).toThrow(UblBuildError);
  });

  it('flag=false: line seviyesi 555 de reddedilir', () => {
    const input = createInputWith555();
    // TaxTotals'tan 555'i kaldır, line'a ekle
    input.taxTotals![0].taxSubtotals[0].taxExemptionReasonCode = undefined;
    input.lines[0].taxTotal!.taxSubtotals[0].taxExemptionReasonCode = '555';

    const builder = new InvoiceBuilder({ validationLevel: 'none' });
    expect(() => builder.build(input)).toThrow(UblBuildError);
  });
});
