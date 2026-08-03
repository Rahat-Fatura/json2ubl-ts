/**
 * B-102 — Satır/ürün alanlarının XML'e yazılması + sistematik "sessiz düşen alan" denetimi.
 * Sprint 8p.
 *
 * ── Regresyon gerekçesi ────────────────────────────────────────────────────────
 * B-101 (kargo alanları) tekil bir hata değil, bir SINIF hatasıydı: alan
 * `SimpleInvoiceInput` ağacında tanımlı, mapper onu HİÇ okumuyor, kullanıcı
 * doldurunca XML'e sessizce düşmüyor. Bu turda giriş tipinin 135 leaf alanı
 * mapper'ın eriştiği anahtarlarla mekanik olarak karşılaştırıldı; 9 alan bu
 * sınıfa girdi:
 *
 *   lines[].brand             → cbc:BrandName
 *   lines[].buyerCode         → cac:BuyersItemIdentification/cbc:ID
 *   lines[].sellerCode        → cac:SellersItemIdentification/cbc:ID
 *   lines[].manufacturerCode  → cac:ManufacturersItemIdentification/cbc:ID
 *   lines[].origin            → cac:OriginCountry/cbc:Name
 *   lines[].note              → cac:InvoiceLine/cbc:Note
 *   lines[].delivery.packageId→ cac:ActualPackage/cbc:ID
 *   sender.alias              → UBL Invoice'ta KARŞILIĞI YOK (zarf/SBDH seviyesi)
 *   customer.alias            → aynı
 *
 * Kanıt: kütüphanenin KENDİ `examples/12-yatirimtesvik-satis-makina` örneği
 * `brand: 'DemoMakine'` veriyordu, işlenmiş output.xml'de tek iz yoktu.
 *
 * ── Yerleşimin kaynağı (tahmin değil, şema) ───────────────────────────────────
 * GİB UBL-TR 1.2.1 pakedi `xsdrt/common/UBL-CommonAggregateComponents-2.1.xsd`:
 *   ItemType sırası: Description → Name → Keyword → **BrandName** → ModelName
 *     → **BuyersItemIdentification** → **SellersItemIdentification**
 *     → **ManufacturersItemIdentification** → AdditionalItemIdentification
 *     → **OriginCountry** → CommodityClassification → ItemInstance
 *   InvoiceLineType sırası: ID → **Note** (0..n) → InvoicedQuantity → LineExtensionAmount …
 *   PackageType sırası: **ID** → **Quantity** → ReturnableMaterialIndicator
 *     → PackageLevelCode → **PackagingTypeCode** → …
 *   CountryType: IdentificationCode (0..1) → Name (**1..1**)
 *   ItemIdentificationType: yalnız cbc:ID (1..1) — iç içe Party/Item YOK.
 *
 * B-101'de GİB, DeliveryType'ta CarrierParty/DeliveryParty sırasını OASIS'e göre
 * TERS çevirmişti. Bu turda dokunulan dört tipte (ItemType, InvoiceLineType,
 * PackageType, CountryType) GİB, OASIS UBL 2.1 göreli sırasını KORUMUŞTUR —
 * aynı tuzak burada yok. Yine de sıra testleri şemadan yazıldı, OASIS'ten değil.
 */

import { describe, it, expect } from 'vitest';
import { SimpleInvoiceBuilder } from '../../src';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';
import { InvoiceBuilder } from '../../src/builders/invoice-builder';
import type { InvoiceInput } from '../../src/types/invoice-input';

function baseInput(line: Partial<SimpleLineInput>): SimpleInvoiceInput {
  return {
    id: 'TST2026000000002',
    uuid: 'e1a2b3c4-0202-4000-8202-000000000202',
    datetime: '2026-04-23T11:00:00',
    profile: 'TEMELFATURA',
    type: 'SATIS',
    currencyCode: 'TRY',
    sender: {
      taxNumber: '1234567890',
      name: 'Demo Satıcı A.Ş.',
      taxOffice: 'Üsküdar',
      address: 'Barbaros Bulvarı No:1',
      district: 'Üsküdar',
      city: 'İstanbul',
    },
    customer: {
      taxNumber: '9876543210',
      name: 'Demo Alıcı Ltd. Şti.',
      taxOffice: 'Kadıköy',
      address: 'Bağdat Cd. No:5',
      district: 'Kadıköy',
      city: 'İstanbul',
    },
    lines: [{ name: 'Kulaklık', quantity: 1, price: 250, unitCode: 'Adet', kdvPercent: 20, ...line }],
  };
}

function buildXml(line: Partial<SimpleLineInput>, level: 'basic' | 'strict' = 'strict'): string {
  return new SimpleInvoiceBuilder({ validationLevel: level }).build(baseInput(line)).xml;
}

/** Ürün ek bilgilerinin tamamı dolu satır. */
const FULL_ITEM: Partial<SimpleLineInput> = {
  brand: 'Demo Marka',
  model: 'DM-100',
  buyerCode: 'ALICI-001',
  sellerCode: 'SATICI-001',
  manufacturerCode: 'URETICI-001',
  origin: 'Türkiye',
  note: 'Kırılacak eşya — dikkatli taşıyınız',
  description: 'Kablosuz kulaklık',
};

describe('B-102 — satır/ürün alanları → cac:Item + cbc:Note', () => {
  describe('Emisyon (önceden sessizce düşüyordu)', () => {
    it('brand → cbc:BrandName', () => {
      expect(buildXml(FULL_ITEM)).toContain('<cbc:BrandName>Demo Marka</cbc:BrandName>');
    });

    it('buyerCode → cac:BuyersItemIdentification/cbc:ID', () => {
      expect(buildXml(FULL_ITEM)).toMatch(
        /<cac:BuyersItemIdentification>\s*<cbc:ID>ALICI-001<\/cbc:ID>\s*<\/cac:BuyersItemIdentification>/,
      );
    });

    it('sellerCode → cac:SellersItemIdentification/cbc:ID', () => {
      expect(buildXml(FULL_ITEM)).toMatch(
        /<cac:SellersItemIdentification>\s*<cbc:ID>SATICI-001<\/cbc:ID>\s*<\/cac:SellersItemIdentification>/,
      );
    });

    it('manufacturerCode → cac:ManufacturersItemIdentification/cbc:ID', () => {
      expect(buildXml(FULL_ITEM)).toMatch(
        /<cac:ManufacturersItemIdentification>\s*<cbc:ID>URETICI-001<\/cbc:ID>\s*<\/cac:ManufacturersItemIdentification>/,
      );
    });

    it('origin → cac:OriginCountry/cbc:Name (CountryType\'ta Name minOccurs=1)', () => {
      expect(buildXml(FULL_ITEM)).toMatch(
        /<cac:OriginCountry>\s*<cbc:Name>Türkiye<\/cbc:Name>\s*<\/cac:OriginCountry>/,
      );
    });

    it('note → cac:InvoiceLine/cbc:Note', () => {
      expect(buildXml(FULL_ITEM)).toContain(
        '<cbc:Note>Kırılacak eşya — dikkatli taşıyınız</cbc:Note>',
      );
    });

    it('*ItemIdentification blokları iç içe cac:Item/cac:Party İÇERMEZ (XSD: ItemIdentificationType = yalnız cbc:ID)', () => {
      const block = /<cac:BuyersItemIdentification>([\s\S]*?)<\/cac:BuyersItemIdentification>/.exec(
        buildXml(FULL_ITEM),
      );
      expect(block).not.toBeNull();
      expect(block![1]).not.toContain('<cac:');
    });
  });

  describe('XSD sırası (GİB UBL-TR 1.2.1)', () => {
    it('ItemType: Name → BrandName → ModelName → Buyers → Sellers → Manufacturers → OriginCountry', () => {
      const xml = buildXml(FULL_ITEM);
      const order = [
        '<cbc:Name>Kulaklık</cbc:Name>',
        '<cbc:BrandName>',
        '<cbc:ModelName>',
        '<cac:BuyersItemIdentification>',
        '<cac:SellersItemIdentification>',
        '<cac:ManufacturersItemIdentification>',
        '<cac:OriginCountry>',
      ].map(t => xml.indexOf(t));
      expect(order.every(i => i > -1)).toBe(true);
      expect(order).toEqual([...order].sort((a, b) => a - b));
    });

    it('ItemType: Description, Name ÖNCESİNDE (B-13 korunur)', () => {
      const xml = buildXml(FULL_ITEM);
      expect(xml.indexOf('<cbc:Description>')).toBeLessThan(xml.indexOf('<cbc:Name>Kulaklık</cbc:Name>'));
    });

    it('ItemType: OriginCountry, AdditionalItemIdentification SONRASI', () => {
      const xml = buildXml({
        ...FULL_ITEM,
        additionalItemIdentifications: [{ schemeId: 'TELEFON', value: '123456789012345' }],
      });
      expect(xml.indexOf('<cac:AdditionalItemIdentification>')).toBeLessThan(xml.indexOf('<cac:OriginCountry>'));
    });

    it('InvoiceLineType: cbc:Note, cbc:ID ile cbc:InvoicedQuantity ARASINDA', () => {
      const xml = buildXml(FULL_ITEM);
      const lineBlock = /<cac:InvoiceLine>([\s\S]*?)<\/cac:InvoiceLine>/.exec(xml)![1];
      expect(lineBlock.indexOf('<cbc:ID>')).toBeLessThan(lineBlock.indexOf('<cbc:Note>'));
      expect(lineBlock.indexOf('<cbc:Note>')).toBeLessThan(lineBlock.indexOf('<cbc:InvoicedQuantity'));
    });
  });

  describe('Geriye dönük uyum — verilmeyen alan hiç emit edilmez', () => {
    // v3.0.0: belge seviyesinde KOŞULSUZ `#YAZIYLA:...#` notu var; satır notu
    // iddiaları artık yalnız cac:InvoiceLine bloğuna bakar.
    const lineBlockOf = (xml: string): string =>
      /<cac:InvoiceLine>([\s\S]*?)<\/cac:InvoiceLine>/.exec(xml)![1];

    it('alanlar boşsa hiçbir yeni element yazılmaz', () => {
      const xml = buildXml({});
      for (const t of [
        '<cbc:BrandName>',
        '<cac:BuyersItemIdentification>',
        '<cac:SellersItemIdentification>',
        '<cac:ManufacturersItemIdentification>',
        '<cac:OriginCountry>',
      ]) {
        expect(xml).not.toContain(t);
      }
      expect(lineBlockOf(xml)).not.toContain('<cbc:Note>');
    });

    it('boş string → element yazılmaz (isNonEmpty koruması)', () => {
      const xml = buildXml({ brand: '   ', buyerCode: '', origin: '', note: '  ' });
      expect(xml).not.toContain('<cbc:BrandName>');
      expect(xml).not.toContain('<cac:BuyersItemIdentification>');
      expect(xml).not.toContain('<cac:OriginCountry>');
      expect(lineBlockOf(xml)).not.toContain('<cbc:Note>');
    });

    it('basic kipi strict ile aynı çıktıyı üretir (yeni zorunluluk eklenmedi)', () => {
      expect(buildXml(FULL_ITEM, 'basic')).toBe(buildXml(FULL_ITEM, 'strict'));
    });
  });

  describe('Alt seviye InvoiceInput API — OriginCountry Name zorunluluğu', () => {
    function lowLevel(item: InvoiceInput['lines'][number]['item'], notes?: string[]): string {
      const input: InvoiceInput = {
        id: 'TST2026000000003',
        uuid: 'e1a2b3c4-0303-4000-8303-000000000303',
        profileId: 'TEMELFATURA',
        invoiceTypeCode: 'SATIS',
        issueDate: '2026-04-23',
        currencyCode: 'TRY',
        supplier: {
          vknTckn: '1234567890', taxIdType: 'VKN', name: 'S A.Ş.', streetName: 'X',
          citySubdivisionName: 'Üsküdar', cityName: 'İstanbul', country: 'Türkiye', taxOffice: 'Üsküdar',
        },
        customer: {
          vknTckn: '9876543210', taxIdType: 'VKN', name: 'A Ltd.', streetName: 'Y',
          citySubdivisionName: 'Kadıköy', cityName: 'İstanbul', country: 'Türkiye', taxOffice: 'Kadıköy',
        },
        taxTotals: [{ taxAmount: 20, taxSubtotals: [{ taxableAmount: 100, taxAmount: 20, percent: 20, taxTypeCode: '0015', taxTypeName: 'KDV' }] }],
        legalMonetaryTotal: { lineExtensionAmount: 100, taxExclusiveAmount: 100, taxInclusiveAmount: 120, payableAmount: 120 },
        lines: [{
          id: '1', notes, invoicedQuantity: 1, unitCode: 'C62', lineExtensionAmount: 100,
          taxTotal: { taxAmount: 20, taxSubtotals: [{ taxableAmount: 100, taxAmount: 20, percent: 20, taxTypeCode: '0015', taxTypeName: 'KDV' }] },
          item, price: { priceAmount: 100 },
        }],
      };
      return new InvoiceBuilder({ validationLevel: 'none' }).build(input);
    }

    const lowLevelWithNotes = (notes: string[]): string => lowLevel({ name: 'Ürün' }, notes);

    it('originCountryName + originCountryCode → IdentificationCode ÖNCE, Name SONRA', () => {
      const xml = lowLevel({ name: 'Ürün', originCountryName: 'Almanya', originCountryCode: 'DE' });
      expect(xml).toMatch(
        /<cac:OriginCountry>\s*<cbc:IdentificationCode>DE<\/cbc:IdentificationCode>\s*<cbc:Name>Almanya<\/cbc:Name>\s*<\/cac:OriginCountry>/,
      );
    });

    it('yalnız originCountryCode → blok HİÇ emit edilmez (CountryType Name minOccurs=1)', () => {
      expect(lowLevel({ name: 'Ürün', originCountryCode: 'DE' })).not.toContain('<cac:OriginCountry>');
    });

    it('InvoiceLineInput.notes çok değerli olabilir (cbc:Note maxOccurs=unbounded)', () => {
      const xml = lowLevelWithNotes(['Birinci not', 'İkinci not']);
      expect(xml).toContain('<cbc:Note>Birinci not</cbc:Note>');
      expect(xml).toContain('<cbc:Note>İkinci not</cbc:Note>');
      expect(xml.indexOf('<cbc:Note>Birinci not')).toBeLessThan(xml.indexOf('<cbc:Note>İkinci not'));
    });
  });

  describe('Paket bilgisi — cac:ActualPackage (B-102)', () => {
    const exportLine = (delivery: NonNullable<SimpleLineInput['delivery']>): Partial<SimpleLineInput> => ({
      delivery,
    });
    const addr = { address: 'Liman Cd. 1', district: 'Konak', city: 'İzmir', country: 'Türkiye' };

    it('packageId → cac:ActualPackage/cbc:ID (önceden hiç okunmuyordu)', () => {
      const xml = buildXml(exportLine({ deliveryAddress: addr, packageId: 'PKG-001' }));
      expect(xml).toMatch(/<cac:ActualPackage>\s*<cbc:ID>PKG-001<\/cbc:ID>/);
    });

    it('packageQuantity TEK BAŞINA da ActualPackage doğurur (önceden packageTypeCode olmadan düşüyordu)', () => {
      const xml = buildXml(exportLine({ deliveryAddress: addr, packageQuantity: 3 }));
      expect(xml).toContain('<cac:ActualPackage>');
      expect(xml).toContain('<cbc:Quantity>3</cbc:Quantity>');
    });

    it('PackageType sırası: ID → Quantity → PackagingTypeCode (önceki kod tersti)', () => {
      const xml = buildXml(
        exportLine({ deliveryAddress: addr, packageId: 'PKG-001', packageQuantity: 3, packageTypeCode: 'CT' }),
      );
      const pkg = /<cac:ActualPackage>([\s\S]*?)<\/cac:ActualPackage>/.exec(xml)![1];
      expect(pkg.indexOf('<cbc:ID>')).toBeLessThan(pkg.indexOf('<cbc:Quantity>'));
      expect(pkg.indexOf('<cbc:Quantity>')).toBeLessThan(pkg.indexOf('<cbc:PackagingTypeCode>'));
    });

    it('paket alanı hiç yoksa ActualPackage emit edilmez', () => {
      const xml = buildXml(exportLine({ deliveryAddress: addr, deliveryTermCode: 'FOB' }));
      expect(xml).not.toContain('<cac:ActualPackage>');
    });
  });

  describe('alias — UBL Invoice\'ta karşılığı YOK (bilinçli sözleşme)', () => {
    it('sender.alias / customer.alias XML\'e yazılmaz — etiket zarf (SBDH) seviyesindedir', () => {
      const input = baseInput(FULL_ITEM);
      input.sender.alias = 'urn:mail:defaultpk@satici.com.tr';
      input.customer.alias = 'urn:mail:defaultpk@alici.com.tr';
      const xml = new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(input).xml;
      expect(xml).not.toContain('urn:mail:');
      expect(xml).not.toContain('<cbc:EndpointID>');
    });
  });
});
