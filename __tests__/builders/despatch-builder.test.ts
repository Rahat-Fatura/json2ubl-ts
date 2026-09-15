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
      citySubdivisionName: 'Kadıköy',
      country: 'Türkiye',
    },
    customer: {
      vknTckn: '0987654321',
      taxIdType: 'VKN',
      name: 'Alıcı Firma Ltd.',
      cityName: 'Ankara',
      citySubdivisionName: 'Çankaya',
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
      driverPersons: [{
        firstName: 'Mehmet',
        familyName: 'Kara',
        nationalityId: '12345678901',
      }],
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
      input.shipment.driverPersons = undefined;
      input.shipment.carrierParty = undefined;
      expect(() => builder.build(input)).toThrow(UblBuildError);
    });

    it('boş driverPersons array sürücü yok sayılır', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.shipment.driverPersons = [];
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

  describe('B-T10 IDISIRSALIYE profili (Sprint 7.4)', () => {
    it('SEVKIYATNO + ETIKETNO olmadan hata verir', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.profileId = DespatchProfileId.IDISIRSALIYE;
      expect(() => builder.build(input)).toThrow(UblBuildError);
    });

    it('SEVKIYATNO + ETIKETNO ile başarılı emit', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.profileId = DespatchProfileId.IDISIRSALIYE;
      // SEVKIYATNO formatı: SE-0000000 (src/config/constants.ts §289)
      input.supplier.additionalIdentifiers = [
        { schemeId: 'SEVKIYATNO', value: 'SE-0000123' },
      ];
      // ETIKETNO formatı: 2 harf + 7 rakam (§292)
      input.lines[0].item.additionalItemIdentifications = [
        { schemeId: 'ETIKETNO', value: 'AB1234567' },
      ];
      const xml = builder.build(input);
      expect(xml).toContain('<cbc:ProfileID>IDISIRSALIYE</cbc:ProfileID>');
      expect(xml).toContain('schemeID="SEVKIYATNO"');
      expect(xml).toContain('SE-0000123');
      expect(xml).toContain('schemeID="ETIKETNO"');
      expect(xml).toContain('AB1234567');
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

  describe('AR-2 çoklu DriverPerson', () => {
    it('2 sürücü emit eder', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.shipment.driverPersons = [
        { firstName: 'Mehmet', familyName: 'Kara', nationalityId: '12345678901' },
        { firstName: 'Ayşe', familyName: 'Yıldız', nationalityId: '12345678901' },
      ];
      const xml = builder.build(input);
      const driverOpenCount = (xml.match(/<cac:DriverPerson>/g) ?? []).length;
      expect(driverOpenCount).toBe(2);
      expect(xml).toContain('<cbc:FirstName>Mehmet</cbc:FirstName>');
      expect(xml).toContain('<cbc:FirstName>Ayşe</cbc:FirstName>');
    });

    /* 🔴 CANLI GİB KAPISINDA ÖLÇÜLDÜ: bu yol eskiden HER ZAMAN reddediliyordu
       ("CarrierParty elementinin içeriği eksik. Zorunlu element(ler): PostalAddress").
       Serileştirici taşıyıcıyı elle yazıyor ve adresi hiç basmıyordu; artık ortak
       `serializePartyAs`ten geçiyor. Test adresi ZORUNLU olarak taşır ve
       `PostalAddress`ın gerçekten bastığını çivilar — kapı bir daha sessizce
       kapanamaz. */
    it('carrierParty-only (driverPersons undefined) başarılı — PostalAddress DÂHİL', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.shipment.driverPersons = undefined;
      input.shipment.carrierParty = {
        vknTckn: '1234567890',
        taxIdType: 'VKN',
        name: 'Taşıyıcı A.Ş.',
        citySubdivisionName: 'Ümraniye',
        cityName: 'İstanbul',
      };
      const xml = builder.build(input);
      expect(xml).toContain('<cac:CarrierParty>');
      expect(xml).not.toContain('<cac:DriverPerson>');
      const carrier = xml.match(/<cac:CarrierParty>[\s\S]*?<\/cac:CarrierParty>/)?.[0] ?? '';
      expect(carrier).toContain('<cac:PostalAddress>');
      expect(carrier).toContain('<cbc:CityName>İstanbul</cbc:CityName>');
    });

    /* Gerçek kişi taşıyıcı: ad/soyad eskiden eşleyicide doldurulup serileştiricide
       DÜŞÜYORDU (`cac:Person` bloğu hiç yazılmıyordu). */
    it('TCKN taşıyıcıda cac:Person yazılır (ad/soyad düşmez)', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.shipment.driverPersons = undefined;
      input.shipment.carrierParty = {
        vknTckn: '12345678901',
        taxIdType: 'TCKN',
        firstName: 'Ali',
        familyName: 'Veli',
        citySubdivisionName: 'Ümraniye',
        cityName: 'İstanbul',
      };
      const carrier = builder.build(input).match(/<cac:CarrierParty>[\s\S]*?<\/cac:CarrierParty>/)?.[0] ?? '';
      expect(carrier).toContain('<cac:Person>');
      expect(carrier).toContain('<cbc:FirstName>Ali</cbc:FirstName>');
      expect(carrier).toContain('<cbc:FamilyName>Veli</cbc:FamilyName>');
    });

    it('eksik alanlı sürücülerde validation hatası indexli path üretir', () => {
      const builder = new DespatchBuilder();
      const input = createValidDespatchInput();
      input.shipment.driverPersons = [
        { firstName: 'Mehmet', familyName: 'Kara', nationalityId: '12345678901' },
        // @ts-expect-error test: eksik firstName
        { familyName: 'Yıldız', nationalityId: '12345678901' },
      ];
      let caught: unknown;
      try {
        builder.build(input);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(UblBuildError);
      const err = caught as UblBuildError;
      const paths = err.errors.map(v => v.path);
      expect(paths).toContain('shipment.driverPersons[1].firstName');
    });
  });
});
