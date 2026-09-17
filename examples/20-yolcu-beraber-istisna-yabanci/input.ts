import type { SimpleInvoiceInput } from '../../src';

/**
 * YOLCUBERABERFATURA profili — "bavul ticareti" olarak bilinen bu profil
 * turistin Türkiye'den aldığı malı ülkesine götürürken KDV iadesi için kullanılır.
 *
 * Sprint 8c.4 / B-NEW-13: SimpleBuyerCustomerInput'a `nationalityId` + `passportId`
 * alanları eklendi. `taxRepresentativeParty` ayrı alan olarak tanımlandı
 * (aracı kurum — KDV iadesi işlemini yürüten firma).
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000020',
  uuid: 'e1a2b3c4-0020-4000-8020-000000000020',
  datetime: '2026-04-23T10:00:00',
  profile: 'YOLCUBERABERFATURA',
  type: 'ISTISNA',
  currencyCode: 'TRY',

  kdvExemptionCode: '322', // YolcuBeraber İstisna

  sender: {
    taxNumber: '1460415308', // YOLCU profilinde özel cross-check VKN
    name: 'Bavul Ticaret Butik A.Ş.',
    taxOffice: 'Beyoğlu',
    address: 'İstiklal Caddesi No:321',
    district: 'Beyoğlu',
    city: 'İstanbul',
    zipCode: '34430',
  },

  customer: {
    taxNumber: '9876543210',
    name: 'Mimsoft Turizm Aracı A.Ş.',
    taxOffice: 'Fatih',
    address: 'Cağaloğlu Yokuşu No:42',
    district: 'Fatih',
    city: 'İstanbul',
    zipCode: '34110',
  },

  buyerCustomer: {
    name: 'Michael Schneider (Tourist)',
    taxNumber: '99999999999', // Yurtdışı turist için 11 hane dolgu (TCKN olmadığı için)
    address: 'Hauptstrasse 15',
    district: 'Berlin',
    city: 'Berlin',
    country: 'Germany',
    zipCode: '10115',
    // Kılavuz §4.2.1: turistin adı ve soyadı ZORUNLU (`cac:Person` XSD'de 1..1).
    // `name` serbest unvandır, ondan BÖLÜNMEZ — pasaporttaki ayrım ayrı verilir.
    firstName: 'Michael',
    familyName: 'Schneider',
    nationalityId: 'DE', // ISO 3166-1 alpha-2 Almanya
    passportId: 'N12345678',
    // Pasaportun VERİLDİĞİ tarih (ibraz değil). Yazılamıyorsa kılavuz
    // `2005-01-01` sabitine izin verir; burada örnek bir tarih verilmiştir.
    passportIssueDate: '2021-06-15',
  },

  taxRepresentativeParty: {
    vknTckn: '9876543210',
    label: 'MIMSOFT_TAXFREE_INTERMEDIARY',
    name: 'Mimsoft Turizm KDV İade Aracı',
    // `cac:TaxRepresentativeParty` bir `PartyType`tır → `cac:PostalAddress` 1..1.
    address: 'Cağaloğlu Yokuşu No:42',
    district: 'Fatih',
    city: 'İstanbul',
    zipCode: '34110',
  },

  lines: [
    {
      name: 'El Yapımı Seramik Vazo',
      quantity: 1,
      price: 800,
      unitCode: 'Adet',
      kdvPercent: 0,
    },
  ],
};

export default input;
