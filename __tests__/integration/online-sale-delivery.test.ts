/**
 * B-101 — Online satış kargo/teslim bilgisinin XML'e yazılması.
 * Sprint 8o.
 *
 * ── Regresyon gerekçesi ────────────────────────────────────────────────────────
 * v2.2.6'ya kadar `onlineSale.carrierName` / `carrierTaxNumber` / `deliveryDate`
 * tipte tanımlıydı ama `simple-invoice-mapper` bunları HİÇ okumuyordu — kullanıcı
 * verse bile XML'e düşmüyordu (kütüphanenin kendi `examples/21-earsiv-satis-basic`
 * örneği kargo bilgisi veriyor, üretilen output.xml'de tek iz yoktu).
 *
 * ── Yerleşimin kaynağı (tahmin değil, şema) ───────────────────────────────────
 * GİB UBL-TR 1.2.1 pakedi `xsdrt/common/UBL-CommonAggregateComponents-2.1.xsd`:
 *   DeliveryType sırası: ID → Quantity → ActualDeliveryDate → ActualDeliveryTime
 *   → LatestDeliveryDate → LatestDeliveryTime → TrackingID → DeliveryAddress
 *   → AlternativeDeliveryLocation → EstimatedDeliveryPeriod → **CarrierParty**
 *   → DeliveryParty → Despatch → DeliveryTerms → Shipment
 *   (DİKKAT: OASIS UBL 2.1'de CarrierParty, DeliveryParty'den SONRA gelir — GİB ters çevirmiştir.)
 *   `<xsd:element name="CarrierParty" type="PartyType"/>` → içinde ayrıca <cac:Party> YOK.
 *   PartyType'ta `cac:PartyIdentification` ve `cac:PostalAddress` minOccurs=1 (zorunlu).
 * `xsdrt/maindoc/UBL-Invoice-2.1.xsd` InvoiceType sırası:
 *   … TaxRepresentativeParty → **Delivery** → PaymentMeans → PaymentTerms → AllowanceCharge …
 *
 * Üretilen örnek XML, imza/zarf iskeleti (UBLExtensions + cac:Signature — kütüphanenin
 * belgelenmiş sorumluluk sınırı dışı) tamamlandıktan sonra bu XSD ile
 * `xmllint --schema` doğrulamasından GEÇER.
 *
 * ── Neden önemli ──────────────────────────────────────────────────────────────
 * e-Arşiv Raporu Kılavuzu §3.3.2.17 `fatura/internetSatisBilgi`:
 *   `gonderiBilgileri/gonderimTarihi` (kardinalite 1) ← cbc:ActualDeliveryDate
 *   `gonderiBilgileri/gonderiTasiyan` (kardinalite 1) ← cac:CarrierParty
 * v1.17 (22.05.2024) ile gönderim bilgileri zorunlu hâle geldi; UBL'de yoksa
 * entegratör geçerli e-Arşiv raporu üretemez.
 */

import { describe, it, expect } from 'vitest';
import { SimpleInvoiceBuilder } from '../../src';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';
import { UblBuildError } from '../../src/errors/ubl-build-error';

function baseInput(onlineSale: SimpleInvoiceInput['onlineSale']): SimpleInvoiceInput {
  return {
    id: 'TST2026000000001',
    uuid: 'e1a2b3c4-0101-4000-8101-000000000101',
    datetime: '2026-04-23T11:00:00',
    profile: 'EARSIVFATURA',
    type: 'SATIS',
    currencyCode: 'TRY',
    eArchiveInfo: { sendType: 'ELEKTRONIK' },
    onlineSale,
    sender: {
      taxNumber: '1234567890',
      name: 'Demo Satıcı A.Ş.',
      taxOffice: 'Üsküdar',
      address: 'Barbaros Bulvarı No:1',
      district: 'Üsküdar',
      city: 'İstanbul',
    },
    customer: {
      taxNumber: '12345678901',
      name: 'Ayşe Yılmaz',
      address: 'Şakir Kesebir Cd. No:77',
      district: 'Beşiktaş',
      city: 'İstanbul',
    },
    lines: [{ name: 'Kulaklık', quantity: 1, price: 250, unitCode: 'Adet', kdvPercent: 20 }],
  };
}

const FULL_CARRIER: SimpleInvoiceInput['onlineSale'] = {
  isOnlineSale: true,
  storeUrl: 'https://demo.example.tr',
  paymentMethod: 'KREDIKARTI',
  paymentDate: '2026-04-23',
  carrierName: 'Hızlı Kargo A.Ş.',
  carrierTaxNumber: '5555555555',
  carrierDistrict: 'Sultangazi',
  carrierCity: 'İstanbul',
  deliveryDate: '2026-04-25',
};

function buildXml(
  onlineSale: SimpleInvoiceInput['onlineSale'],
  level: 'basic' | 'strict' = 'strict',
): string {
  return new SimpleInvoiceBuilder({ validationLevel: level }).build(baseInput(onlineSale)).xml;
}

describe('B-101 — onlineSale kargo/teslim bilgisi → cac:Delivery', () => {
  describe('Emisyon', () => {
    it('deliveryDate → cbc:ActualDeliveryDate', () => {
      expect(buildXml(FULL_CARRIER)).toContain('<cbc:ActualDeliveryDate>2026-04-25</cbc:ActualDeliveryDate>');
    });

    it('carrierTaxNumber → CarrierParty/PartyIdentification/ID schemeID="VKN" (10 hane)', () => {
      const xml = buildXml(FULL_CARRIER);
      expect(xml).toContain('<cac:CarrierParty>');
      expect(xml).toContain('<cbc:ID schemeID="VKN">5555555555</cbc:ID>');
    });

    it('carrierName → CarrierParty/PartyName/Name', () => {
      expect(buildXml(FULL_CARRIER)).toMatch(
        /<cac:CarrierParty>[\s\S]*?<cac:PartyName>\s*<cbc:Name>Hızlı Kargo A\.Ş\.<\/cbc:Name>/,
      );
    });

    it('carrierCity/carrierDistrict → CarrierParty/PostalAddress (PartyType\'ta zorunlu blok)', () => {
      const xml = buildXml(FULL_CARRIER);
      expect(xml).toMatch(
        /<cac:CarrierParty>[\s\S]*?<cac:PostalAddress>[\s\S]*?<cbc:CitySubdivisionName>Sultangazi<\/cbc:CitySubdivisionName>[\s\S]*?<cbc:CityName>İstanbul<\/cbc:CityName>/,
      );
    });

    it('carrierCountry verilmezse Türkiye varsayılır', () => {
      expect(buildXml(FULL_CARRIER)).toMatch(
        /<cac:CarrierParty>[\s\S]*?<cac:Country>\s*<cbc:Name>Türkiye<\/cbc:Name>/,
      );
    });

    it('CarrierParty içinde iç içe <cac:Party> OLMAMALI (XSD: CarrierParty type=PartyType)', () => {
      const carrierBlock = /<cac:CarrierParty>([\s\S]*?)<\/cac:CarrierParty>/.exec(buildXml(FULL_CARRIER));
      expect(carrierBlock).not.toBeNull();
      expect(carrierBlock![1]).not.toContain('<cac:Party>');
    });
  });

  describe('XSD sırası', () => {
    it('Delivery içinde ActualDeliveryDate → CarrierParty sırası korunur', () => {
      const xml = buildXml(FULL_CARRIER);
      expect(xml.indexOf('<cbc:ActualDeliveryDate>')).toBeLessThan(xml.indexOf('<cac:CarrierParty>'));
    });

    it('cac:Delivery, AccountingCustomerParty sonrası ve TaxTotal öncesi gelir (InvoiceType sırası)', () => {
      const xml = buildXml(FULL_CARRIER);
      expect(xml.indexOf('</cac:AccountingCustomerParty>')).toBeLessThan(xml.indexOf('<cac:Delivery>'));
      expect(xml.indexOf('<cac:Delivery>')).toBeLessThan(xml.indexOf('<cac:TaxTotal>'));
    });

    it('cac:Delivery, PaymentMeans ve AllowanceCharge ÖNCESİNDE gelir', () => {
      const input = baseInput(FULL_CARRIER);
      input.paymentMeans = { meansCode: '1' };
      const xml = new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(input).xml;
      expect(xml).toContain('<cac:PaymentMeans>');
      expect(xml.indexOf('<cac:Delivery>')).toBeLessThan(xml.indexOf('<cac:PaymentMeans>'));
    });
  });

  describe('Gerçek kişi taşıyıcı (TCKN)', () => {
    const tcknCarrier: SimpleInvoiceInput['onlineSale'] = {
      ...FULL_CARRIER!,
      carrierName: 'Mehmet Ali Demir',
      carrierTaxNumber: '12345678901',
    };

    it('11 hane → schemeID="TCKN"', () => {
      expect(buildXml(tcknCarrier)).toMatch(
        /<cac:CarrierParty>[\s\S]*?<cbc:ID schemeID="TCKN">12345678901<\/cbc:ID>/,
      );
    });

    it('Ad/soyad cac:Person\'a ayrıştırılır (rapor gercekKisi/adiSoyadi karşılığı)', () => {
      const xml = buildXml(tcknCarrier);
      expect(xml).toContain('<cbc:FirstName>Mehmet Ali</cbc:FirstName>');
      expect(xml).toContain('<cbc:FamilyName>Demir</cbc:FamilyName>');
    });
  });

  describe('Kısmi veri — basic vs strict', () => {
    const partial: SimpleInvoiceInput['onlineSale'] = {
      isOnlineSale: true,
      storeUrl: 'https://demo.example.tr',
      paymentMethod: 'KREDIKARTI',
      paymentDate: '2026-04-23',
      carrierName: 'Hızlı Kargo A.Ş.',
      carrierTaxNumber: '5555555555',
      // carrierCity / carrierDistrict eksik → şema-geçerli CarrierParty üretilemez
      deliveryDate: '2026-04-25',
    };

    it('basic: eksik adres → CarrierParty atlanır ama tarih yine de yazılır (geriye dönük uyum)', () => {
      const xml = buildXml(partial, 'basic');
      expect(xml).not.toContain('<cac:CarrierParty>');
      expect(xml).toContain('<cbc:ActualDeliveryDate>2026-04-25</cbc:ActualDeliveryDate>');
    });

    it('strict: eksik adres → MISSING_FIELD hatası (sessiz kayıp yerine gürültü)', () => {
      expect(() => buildXml(partial, 'strict')).toThrow(UblBuildError);
      try {
        buildXml(partial, 'strict');
      } catch (e) {
        const errs = (e as UblBuildError).errors;
        expect(errs.some(x => x.code === 'MISSING_FIELD' && x.path === 'onlineSale')).toBe(true);
        expect(errs.find(x => x.path === 'onlineSale')!.actual).toContain('carrierCity');
      }
    });

    it('strict: isOnlineSale + deliveryDate eksik → gonderimTarihi hatası', () => {
      const noDate = { ...FULL_CARRIER!, deliveryDate: undefined };
      try {
        buildXml(noDate, 'strict');
        throw new Error('beklenen hata atılmadı');
      } catch (e) {
        expect((e as UblBuildError).errors.some(x => x.path === 'onlineSale.deliveryDate')).toBe(true);
      }
    });

    it('strict: taşıyıcı bilgisi hiç yok → gonderiTasiyan hatası', () => {
      const noCarrier: SimpleInvoiceInput['onlineSale'] = {
        isOnlineSale: true,
        storeUrl: 'https://demo.example.tr',
        paymentMethod: 'KREDIKARTI',
        paymentDate: '2026-04-23',
        deliveryDate: '2026-04-25',
      };
      try {
        buildXml(noCarrier, 'strict');
        throw new Error('beklenen hata atılmadı');
      } catch (e) {
        expect((e as UblBuildError).errors.some(x => x.path === 'onlineSale.carrierTaxNumber')).toBe(true);
      }
    });

    it('strict: geçersiz VKN/TCKN uzunluğu → INVALID_FORMAT', () => {
      const badLen = { ...FULL_CARRIER!, carrierTaxNumber: '123' };
      try {
        buildXml(badLen, 'strict');
        throw new Error('beklenen hata atılmadı');
      } catch (e) {
        expect((e as UblBuildError).errors.some(x => x.code === 'INVALID_FORMAT')).toBe(true);
      }
    });
  });

  describe('Geriye dönük uyum', () => {
    it('onlineSale yoksa cac:Delivery hiç emit edilmez', () => {
      const input = baseInput(undefined);
      const xml = new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(input).xml;
      expect(xml).not.toContain('<cac:Delivery>');
    });

    it('isOnlineSale=false + kargo bilgisi yok → Delivery yok, profil yine EARSIVFATURA', () => {
      const xml = buildXml(
        {
          isOnlineSale: false,
          storeUrl: '',
          paymentMethod: '',
          paymentDate: '',
        },
        'strict',
      );
      expect(xml).not.toContain('<cac:Delivery>');
      expect(xml).toContain('<cbc:ProfileID>EARSIVFATURA</cbc:ProfileID>');
    });
  });
});
