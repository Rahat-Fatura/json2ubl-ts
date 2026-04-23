import { describe, it, expect } from 'vitest';
import { InvoiceBuilder } from '../../src/builders/invoice-builder';
import { UblBuildError } from '../../src/errors/ubl-build-error';
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
    notes: ['Test faturası'],
    supplier: {
      vknTckn: '1234567890',
      taxIdType: 'VKN',
      name: 'Test Firma A.Ş.',
      streetName: 'Atatürk Caddesi',
      buildingNumber: '10',
      citySubdivisionName: 'Çankaya',
      cityName: 'Ankara',
      postalZone: '06100',
      country: 'Türkiye',
      taxOffice: 'Çankaya VD',
      telephone: '03121234567',
      email: 'info@testfirma.com',
    },
    customer: {
      vknTckn: '12345678901',
      taxIdType: 'TCKN',
      firstName: 'Ahmet',
      familyName: 'Yılmaz',
      streetName: 'İstiklal Caddesi',
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
      item: { name: 'Bilgisayar Kasası' },
      price: { priceAmount: 50 },
    }],
  };
}

describe('InvoiceBuilder', () => {
  describe('build() — TEMELFATURA SATIS', () => {
    it('geçerli veriden XML oluşturur', () => {
      const builder = new InvoiceBuilder();
      const xml = builder.build(createValidSatisInput());

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<Invoice');
      expect(xml).toContain('</Invoice>');
    });

    it('UBL sabit değerlerini içerir', () => {
      const builder = new InvoiceBuilder();
      const xml = builder.build(createValidSatisInput());

      expect(xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
      expect(xml).toContain('<cbc:CustomizationID>TR1.2</cbc:CustomizationID>');
      expect(xml).toContain('<cbc:CopyIndicator>false</cbc:CopyIndicator>');
    });

    it('profil ve tip kodlarını içerir', () => {
      const builder = new InvoiceBuilder();
      const xml = builder.build(createValidSatisInput());

      expect(xml).toContain('<cbc:ProfileID>TEMELFATURA</cbc:ProfileID>');
      expect(xml).toContain('<cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>');
    });

    it('temel bilgileri içerir', () => {
      const builder = new InvoiceBuilder();
      const xml = builder.build(createValidSatisInput());

      expect(xml).toContain('<cbc:ID>ABC2024000000001</cbc:ID>');
      expect(xml).toContain('<cbc:UUID>12345678-1234-1234-1234-123456789012</cbc:UUID>');
      expect(xml).toContain('<cbc:IssueDate>2024-01-15</cbc:IssueDate>');
      expect(xml).toContain('<cbc:IssueTime>10:30:00</cbc:IssueTime>');
      expect(xml).toContain('<cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>');
      expect(xml).toContain('<cbc:LineCountNumeric>1</cbc:LineCountNumeric>');
    });

    it('supplier party bilgilerini içerir', () => {
      const builder = new InvoiceBuilder();
      const xml = builder.build(createValidSatisInput());

      expect(xml).toContain('<cac:AccountingSupplierParty>');
      expect(xml).toContain('schemeID="VKN"');
      expect(xml).toContain('>1234567890<');
      expect(xml).toContain('<cbc:Name>Test Firma A.Ş.</cbc:Name>');
    });

    it('customer party bilgilerini içerir', () => {
      const builder = new InvoiceBuilder();
      const xml = builder.build(createValidSatisInput());

      expect(xml).toContain('<cac:AccountingCustomerParty>');
      expect(xml).toContain('schemeID="TCKN"');
      expect(xml).toContain('>12345678901<');
      expect(xml).toContain('<cbc:FirstName>Ahmet</cbc:FirstName>');
      expect(xml).toContain('<cbc:FamilyName>Yılmaz</cbc:FamilyName>');
    });

    it('TaxTotal ve TaxSubtotal içerir', () => {
      const builder = new InvoiceBuilder();
      const xml = builder.build(createValidSatisInput());

      expect(xml).toContain('<cac:TaxTotal>');
      expect(xml).toContain('<cac:TaxSubtotal>');
      expect(xml).toContain('<cbc:TaxTypeCode>0015</cbc:TaxTypeCode>');
    });

    it('LegalMonetaryTotal içerir', () => {
      const builder = new InvoiceBuilder();
      const xml = builder.build(createValidSatisInput());

      expect(xml).toContain('<cac:LegalMonetaryTotal>');
      expect(xml).toContain('currencyID="TRY"');
    });

    it('InvoiceLine içerir', () => {
      const builder = new InvoiceBuilder();
      const xml = builder.build(createValidSatisInput());

      expect(xml).toContain('<cac:InvoiceLine>');
      expect(xml).toContain('<cbc:Name>Bilgisayar Kasası</cbc:Name>');
      expect(xml).toContain('unitCode="C62"');
    });

    it('Note içerir', () => {
      const builder = new InvoiceBuilder();
      const xml = builder.build(createValidSatisInput());

      expect(xml).toContain('<cbc:Note>Test faturası</cbc:Note>');
    });
  });

  describe('build() — validation levels', () => {
    it('basic seviyede geçerli fatura oluşturur', () => {
      const builder = new InvoiceBuilder({ validationLevel: 'basic' });
      const xml = builder.build(createValidSatisInput());
      expect(xml).toContain('</Invoice>');
    });

    it('none seviyede validasyon yapılmaz', () => {
      const builder = new InvoiceBuilder({ validationLevel: 'none' });
      const input = createValidSatisInput();
      input.id = 'INVALID';
      const xml = builder.build(input);
      expect(xml).toContain('<cbc:ID>INVALID</cbc:ID>');
    });

    it('basic seviyede geçersiz veri hata verir', () => {
      const builder = new InvoiceBuilder({ validationLevel: 'basic' });
      const input = createValidSatisInput();
      input.id = '';
      expect(() => builder.build(input)).toThrow(UblBuildError);
    });

    it('strict seviyede çapraz matris kontrolü yapılır', () => {
      const builder = new InvoiceBuilder({ validationLevel: 'strict' });
      const input = createValidSatisInput();
      input.profileId = InvoiceProfileId.HKS;
      input.invoiceTypeCode = InvoiceTypeCode.SATIS;
      expect(() => builder.build(input)).toThrow(UblBuildError);
    });
  });

  describe('build() — IADE faturası', () => {
    it('strict: BillingReference olmadan hata verir', () => {
      const builder = new InvoiceBuilder({ validationLevel: 'strict' });
      const input = createValidSatisInput();
      input.invoiceTypeCode = InvoiceTypeCode.IADE;
      expect(() => builder.build(input)).toThrow(UblBuildError);
    });

    it('strict: BillingReference ile başarılı', () => {
      const builder = new InvoiceBuilder({ validationLevel: 'strict' });
      const input = createValidSatisInput();
      input.invoiceTypeCode = InvoiceTypeCode.IADE;
      input.billingReferences = [{
        invoiceDocumentReference: {
          id: 'ABC2024000000002',
          issueDate: '2024-01-10',
          documentTypeCode: 'IADE',
        },
      }];
      const xml = builder.build(input);
      expect(xml).toContain('<cac:BillingReference>');
      expect(xml).toContain('<cbc:ID>ABC2024000000002</cbc:ID>');
    });
  });

  describe('build() — dövizli fatura', () => {
    it('USD fatura ile PricingExchangeRate oluşturulur', () => {
      const builder = new InvoiceBuilder();
      const input = createValidSatisInput();
      input.currencyCode = 'USD';
      input.exchangeRate = {
        sourceCurrencyCode: 'USD',
        targetCurrencyCode: 'TRY',
        calculationRate: 32.5,
      };
      const xml = builder.build(input);
      expect(xml).toContain('<cac:PricingExchangeRate>');
      expect(xml).toContain('<cbc:SourceCurrencyCode>USD</cbc:SourceCurrencyCode>');
      expect(xml).toContain('<cbc:TargetCurrencyCode>TRY</cbc:TargetCurrencyCode>');
      expect(xml).toContain('currencyID="USD"');
    });
  });

  describe('validate()', () => {
    it('hata listesi döndürür', () => {
      const builder = new InvoiceBuilder({ validationLevel: 'strict' });
      const input = createValidSatisInput();
      const errors = builder.validate(input);
      expect(errors).toHaveLength(0);
    });
  });

  describe('buildUnsafe()', () => {
    it('validasyon yapmadan XML oluşturur', () => {
      const builder = new InvoiceBuilder();
      const input = createValidSatisInput();
      input.id = '';
      const xml = builder.buildUnsafe(input);
      expect(xml).toContain('</Invoice>');
    });
  });
});
