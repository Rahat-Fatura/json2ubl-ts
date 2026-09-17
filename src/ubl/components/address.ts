import type { AddressFields } from '../../types/common';
import { cbcOptionalTag, cbcRequiredTag, joinLines } from '../primitives/xml-helpers';
import { isNonEmpty } from '../../utils/formatters';
import { ADDRESS_SEQ, COUNTRY_SEQ, emitInOrder } from '../sequences/xsd-sequence';

/**
 * `AddressType` + `CountryType` — ikisinin de TEK üreticisi.
 *
 * Kendi dosyasında durur çünkü HER İKİ yönden de çağrılır: `delivery-serializer`
 * (`cac:DeliveryAddress`), `party-serializer` (`cac:PostalAddress`) ve
 * `line-serializer` (`cac:OriginCountry`). Aynı dosyada kalsalardı
 * taraf ↔ teslimat arasında döngüsel bağımlılık doğardı.
 */

/**
 * `AddressType` → XML. TEK üretici; sıra `ADDRESS_SEQ`.
 * B-35: `CityName` + `CitySubdivisionName` emit anında ZORUNLUDUR.
 *
 * İki eleman adıyla çıkar: `cac:PostalAddress` ve `cac:DeliveryAddress`. S2b
 * öncesinde `party-serializer.serializePostalAddress` bu gövdenin İKİNCİ,
 * birebir aynı kopyasıydı — tek fark girdinin şekliydi (`PartyInput` adres
 * alanlarını düz taşır). `AddressFields` o farkı kapatır.
 */
export function serializeAddress(addr: AddressFields, tagName: string, indent: string = ''): string {
  const inner = emitInOrder(ADDRESS_SEQ, {
    Postbox: () => cbcOptionalTag('Postbox', addr.postbox),
    Room: () => cbcOptionalTag('Room', addr.room),
    StreetName: () => cbcOptionalTag('StreetName', addr.streetName),
    BlockName: () => cbcOptionalTag('BlockName', addr.blockName),
    BuildingName: () => cbcOptionalTag('BuildingName', addr.buildingName),
    BuildingNumber: () => cbcOptionalTag('BuildingNumber', addr.buildingNumber),
    CitySubdivisionName: () => cbcRequiredTag('CitySubdivisionName', addr.citySubdivisionName, tagName),
    CityName: () => cbcRequiredTag('CityName', addr.cityName, tagName),
    PostalZone: () => cbcOptionalTag('PostalZone', addr.postalZone),
    Region: () => cbcOptionalTag('Region', addr.region),
    District: () => cbcOptionalTag('District', addr.district),
    Country: () => serializeCountry(addr.countryCode, addr.country, indent + '  '),
  });
  const body = joinLines(inner.map(s => (s.startsWith(indent + '  ') ? s : indent + '  ' + s)));
  return [`${indent}<cac:${tagName}>`, body, `${indent}</cac:${tagName}>`].join('\n');
}

/**
 * `CountryType` → XML. TEK üretici; sıra `COUNTRY_SEQ`
 * (B-100: `IdentificationCode` 0..1 → `Name` **1..1**).
 *
 * İki eleman adıyla çıkar: adres altında `cac:Country`, kalem altında
 * `cac:OriginCountry`. S2b öncesinde ÜÇ kopyası vardı (`delivery-serializer`,
 * `party-serializer`, `line-serializer.originCountryBlock`) ve üçü aynı
 * davranmıyordu:
 *
 * 🔴 `cac:Country` kopyaları YALNIZ KOD verildiğinde bloğu yine de yazıyordu.
 * GİB `CountryType`'ta `cbc:Name` minOccurs=1'dir, yani o çıktı ŞEMA-GEÇERSİZDİ
 * («"Country" elementinin içeriği eksik. Zorunlu element(ler): Name»). Doğru
 * davranış `originCountryBlock`'ta zaten vardı ve buraya taşındı: isim yoksa
 * blok HİÇ yazılmaz — geçersiz belge üretmektense eksik veri görünür kalır.
 *
 * Bu bir veri uydurma değildir; eksik ülke adı uydurulmaz, yalnız geçersiz
 * düğüm yazılmaz.
 */
export function serializeCountry(
  countryCode: string | undefined,
  countryName: string | undefined,
  indent: string,
  tagName: 'Country' | 'OriginCountry' = 'Country',
): string {
  if (!isNonEmpty(countryName)) return '';
  const inner = emitInOrder(COUNTRY_SEQ, {
    IdentificationCode: () => cbcOptionalTag('IdentificationCode', countryCode),
    Name: () => cbcRequiredTag('Name', countryName, tagName),
  });
  return joinLines([
    `${indent}<cac:${tagName}>`,
    ...inner.map(s => `${indent}  ${s}`),
    `${indent}</cac:${tagName}>`,
  ]);
}
