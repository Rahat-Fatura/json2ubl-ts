import { describe, it, expect } from 'vitest';
import { DespatchBuilder } from '../../src/builders/despatch-builder';
import { UblBuildError } from '../../src/errors/ubl-build-error';
import { DespatchProfileId, DespatchTypeCode } from '../../src/types/enums';
import type { DespatchInput } from '../../src/types/despatch-input';

function createValidDespatchInput(): DespatchInput {
  return {
    id: 'ABC2024000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId: DespatchProfileId.TEMELIRSALIYE,
    despatchTypeCode: DespatchTypeCode.SEVK,
    issueDate: '2024-01-15',
    issueTime: '10:30:00',
    supplier: {
      vknTckn: '1234567890',
      taxIdType: 'VKN',
      name: 'Gönderici Firma A.Ş.',
      cityName: 'İstanbul',
      country: 'Türkiye',
    },
    customer: {
      vknTckn: '0987654321',
      taxIdType: 'VKN',
      name: 'Alıcı Firma Ltd.',
      cityName: 'Ankara',
      country: 'Türkiye',
    },
    shipment: {
      actualDespatchDate: '2024-01-16',
      actualDespatchTime: '08:00:00',
      deliveryAddress: {
        citySubdivisionName: 'Çankaya',
        cityName: 'Ankara',
        postalZone: '06100',
        country: 'Türkiye',
      },
      driverPerson: {
        firstName: 'Mehmet',
        familyName: 'Kara',
        nationalityId: 'TR',
      },
      licensePlates: [
        { plateNumber: '06ABC123', schemeId: 'PLAKA' },
      ],
    },
    lines: [{
      id: '1',
      deliveredQuantity: 10,
      unitCode: 'C62',
      item: { name: 'Test Ürün' },
    }],
  };
}

describe('DespatchBuilder', () => {
  describe('build() — TEMELIRSALIYE SEVK', () => {
    it('geçerli veriden XML oluşturur', () => {
      const builder = new DespatchBuilder();
      const xml = builder.build(createValidDespatchInput());

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<DespatchAdvice');
      expect(xml).toContain('</DespatchAdvice>');
    });

    it('UBL sabit değerlerini içerir', () => {
      const builder = new DespatchBuilder();
      const xml = builder.build(createValidDespatchInput());

      expect(xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
      expect(xml).toContain('<cbc:CustomizationID>TR1.2</cbc:CustomizationID>');
    });

    it('profil ve tip bilgilerini içerir', () => {
      const builder = new DespatchBuilder();
      const xml = builder.build(createValidDespatchInput());

      expect(xml).toContain('<cbc:ProfileID>TEMELIRSALIYE</cbc:ProfileID>');
      expect(xml).toContain('<cbc:DespatchAdviceTypeCode>SEVK</cbc:DespatchAdviceTypeCode>');
    });

    it('sevkiyat bilgilerini içerir', () => {
      const builder = new DespatchBuilder();
      const xml = builder.build(createValidDespatchInput());

      expect(xml).toContain('<cbc:ActualDespatchDate>2024-01-16</cbc:ActualDespatchDate>');
      expect(xml).toContain('<cbc:ActualDespatchTime>08:00:00</cbc:ActualDespatchTime>');
    });

    it('sürücü bilgilerini içerir', () => {
      const builder = new DespatchBuilder();
      const xml = builder.build(createValidDespatchInput());

      expect(xml).toContain('<cac:DriverPerson>');
      expect(xml).toContain('<cbc:FirstName>Mehmet</cbc:FirstName>');
      expect(xml).toContain('<cbc:FamilyName>Kara</cbc:FamilyName>');
    });

    it('plaka bilgilerini içerir', () => {
      const builder = new DespatchBuilder();
      const xml = builder.build(createValidDespatchInput());

      expect(xml).toContain('schemeID="PLAKA"');
      expect(xml).toContain('>06ABC123<');
    });

    it('DespatchLine içerir', () => {
      const builder = new DespatchBuilder();
      const xml = builder.build(createValidDespatchInput());

      expect(xml).toContain('<cac:DespatchLine>');
      expect(xml).toContain('<cbc:Name>Test Ürün</cbc:Name>');
      expect(xml).toContain('unitCode="C62"');
    });
  });

  describe('validasyon hataları', () => {
    it('eksik shipment ile hata verir', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      // @ts-expect-error test: zorunlu alanı siliyoruz
      input.shipment = undefined;
      expect(() => builder.build(input)).toThrow(UblBuildError);
    });

    it('sürücü ve taşıyıcı yoksa hata verir', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.shipment.driverPerson = undefined;
      input.shipment.carrierParty = undefined;
      expect(() => builder.build(input)).toThrow(UblBuildError);
    });

    it('MATBUDAN tipinde AdditionalDocumentReference yoksa hata verir', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.despatchTypeCode = DespatchTypeCode.MATBUDAN;
      expect(() => builder.build(input)).toThrow(UblBuildError);
    });
  });

  describe('HKSIRSALIYE profili', () => {
    it('KUNYENO olmadan hata verir', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.profileId = DespatchProfileId.HKSIRSALIYE;
      expect(() => builder.build(input)).toThrow(UblBuildError);
    });

    it('KUNYENO ile başarılı', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.profileId = DespatchProfileId.HKSIRSALIYE;
      input.lines[0].item.additionalItemIdentifications = [
        { schemeId: 'KUNYENO', value: '1234567890123456789' },
      ];
      const xml = builder.build(input);
      expect(xml).toContain('schemeID="KUNYENO"');
    });
  });

  describe('buildUnsafe()', () => {
    it('validasyon yapmadan XML oluşturur', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.id = '';
      const xml = builder.buildUnsafe(input);
      expect(xml).toContain('</DespatchAdvice>');
    });
  });
});
