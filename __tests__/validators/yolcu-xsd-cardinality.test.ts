/**
 * S3 — YOLCUBERABERFATURA'nın ÜÇ XSD kusuru artık SESSİZ geçmiyor.
 *
 * Üçü de aynı sınıftır: serileştirici düğümü yazıyor, zorunlu çocuğunu
 * yazamıyor, doğrulayıcı susuyor. Şematron ÜÇÜNÜ DE temiz geçirdiği için
 * (`validSchematron: true`) şematron-güdümlü kural setimiz kör kalıyordu.
 *
 * Canlı ölçüm (xslt-service, şema paketi 2026-08-05 — ÜÇ örnekte birden):
 *   Satır 94 : "NationalityID" elementi bu konumda geçersiz. Beklenen: FirstName.
 *   Satır 97 : "IdentityDocumentReference" içeriği eksik. Zorunlu: IssueDate.
 *   Satır 111: "TaxRepresentativeParty" içeriği eksik. Zorunlu: PostalAddress.
 *
 * S4 — GİRDİ YÜZEYİ genişletildi: üç kusurun İKİSİ "kural doğru ama
 * kapatılamıyor" durumundaydı (kullanıcının verecek ALANI yoktu). Dosyanın
 * sonundaki blok alanların HAM tipten XML'e kadar aktığını kanıtlar.
 */

import { describe, it, expect } from 'vitest';
import {
  personNameCardinalityRule,
  documentReferenceCardinalityRule,
  partyPostalAddressCardinalityRule,
} from '../../src/validators/rules/xsd-cardinality-rules';
import { validateCommon } from '../../src/validators/common-validators';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';
import { SimpleInvoiceBuilder } from '../../src';

/** Kardinalite kuralları DIŞINDA hata üretmeyen en küçük fatura. */
function baseInvoice(overrides: Partial<InvoiceInput> = {}): InvoiceInput {
  return {
    id: 'ABC2026000000001',
    uuid: '11111111-2222-4333-8444-555555555555',
    profileId: InvoiceProfileId.YOLCUBERABERFATURA,
    invoiceTypeCode: InvoiceTypeCode.ISTISNA,
    issueDate: '2026-04-23',
    currencyCode: 'TRY',
    supplier: {
      vknTckn: '1460415308', taxIdType: 'VKN', name: 'Satıcı A.Ş.',
      cityName: 'İstanbul', citySubdivisionName: 'Beyoğlu',
    },
    customer: {
      vknTckn: '9876543210', taxIdType: 'VKN', name: 'Alıcı A.Ş.',
      cityName: 'İstanbul', citySubdivisionName: 'Fatih',
    },
    taxTotals: [{ taxAmount: 0, taxSubtotals: [{ taxableAmount: 800, taxAmount: 0, taxTypeCode: '0015' }] }],
    lines: [{ id: '1', quantity: 1, unitCode: 'C62', item: { name: 'Vazo' } }],
    legalMonetaryTotal: { lineExtensionAmount: 800, taxExclusiveAmount: 800, taxInclusiveAmount: 800, payableAmount: 800 },
    ...overrides,
  } as InvoiceInput;
}

const cardinality = (input: InvoiceInput) =>
  validateCommon(input).filter(e => e.code === 'XSD_CARDINALITY');

describe('S3 · `cac:Person` — FirstName + FamilyName 1..1', () => {
  it('🔴 yalnız uyruk verilmiş turist REDDEDİLİR (S3 öncesi sessizce geçiyordu)', () => {
    const errors = cardinality(baseInvoice({
      buyerCustomer: {
        partyType: 'TAXFREE',
        party: {
          vknTckn: '99999999999', taxIdType: 'TCKN', name: 'Michael Schneider',
          cityName: 'Berlin', citySubdivisionName: 'Berlin',
          nationalityId: 'DE',
        },
      },
    }));
    const personError = errors.find(e => e.path === 'buyerCustomer.party');
    expect(personError).toBeDefined();
    expect(personError!.actual).toContain('firstName');
    expect(personError!.actual).toContain('familyName');
  });

  it('ad + soyad verilince kural SUSAR', () => {
    expect(personNameCardinalityRule(
      { firstName: 'Michael', familyName: 'Schneider', nationalityId: 'DE' },
      'p',
    )).toHaveLength(0);
  });

  it('hiçbir kişi alanı yoksa `cac:Person` yazılmaz → ihlal YOK', () => {
    expect(personNameCardinalityRule({}, 'p')).toHaveLength(0);
    expect(personNameCardinalityRule(undefined, 'p')).toHaveLength(0);
  });

  it('yalnız pasaport verilse bile Person yazılacağı için ad/soyad istenir', () => {
    expect(personNameCardinalityRule({ passportId: 'N12345678' }, 'p')).toHaveLength(1);
  });

  it('ad var soyad yoksa YİNE ihlal (XSD ikisini de 1..1 tutar)', () => {
    const [error] = personNameCardinalityRule({ firstName: 'Michael', nationalityId: 'DE' }, 'p');
    expect(error.actual).toContain('familyName');
    expect(error.actual).not.toContain('firstName (');
  });
});

describe('S3 · `cac:IdentityDocumentReference` — IssueDate 1..1', () => {
  it('🔴 pasaport verilip TARİH verilmeyen turist REDDEDİLİR', () => {
    const errors = cardinality(baseInvoice({
      buyerCustomer: {
        partyType: 'TAXFREE',
        party: {
          vknTckn: '99999999999', taxIdType: 'TCKN',
          firstName: 'Michael', familyName: 'Schneider',
          cityName: 'Berlin', citySubdivisionName: 'Berlin',
          nationalityId: 'DE', passportId: 'N12345678',
        },
      },
    }));
    expect(errors.some(e => e.path === 'buyerCustomer.party.passportId')).toBe(true);
  });

  it('pasaport yoksa düğüm hiç yazılmaz → ihlal YOK', () => {
    expect(documentReferenceCardinalityRule({ id: undefined }, 'p', 'IdentityDocumentReference'))
      .toHaveLength(0);
  });

  it('tarih verilince yüklem SUSAR', () => {
    expect(documentReferenceCardinalityRule(
      { id: 'N12345678', issueDate: '2020-01-01' },
      'p',
      'IdentityDocumentReference',
    )).toHaveLength(0);
  });

  it('girdi yüzeyi artık VAR — `passportIssueDate` dolu belge temiz geçer', () => {
    const errors = cardinality(baseInvoice({
      buyerCustomer: {
        partyType: 'TAXFREE',
        party: {
          vknTckn: '99999999999', taxIdType: 'TCKN',
          firstName: 'Michael', familyName: 'Schneider',
          cityName: 'Berlin', citySubdivisionName: 'Berlin',
          nationalityId: 'DE', passportId: 'N12345678',
          passportIssueDate: '2021-06-15',
        },
      },
    }));
    expect(errors.filter(e => e.path?.startsWith('buyerCustomer'))).toHaveLength(0);
  });
});

describe('S3 · `cac:TaxRepresentativeParty` — PostalAddress 1..1', () => {
  it('🔴 adressiz aracı kurum REDDEDİLİR', () => {
    const errors = cardinality(baseInvoice({
      taxRepresentativeParty: {
        intermediaryVknTckn: '9876543210',
        intermediaryLabel: 'TAXFREE_ARACI',
        name: 'Aracı A.Ş.',
      },
    }));
    expect(errors.some(e => e.path === 'taxRepresentativeParty.postalAddress')).toBe(true);
  });

  it('adres verilince kural SUSAR', () => {
    const errors = cardinality(baseInvoice({
      taxRepresentativeParty: {
        intermediaryVknTckn: '9876543210',
        intermediaryLabel: 'TAXFREE_ARACI',
        postalAddress: { cityName: 'İstanbul', citySubdivisionName: 'Fatih' },
      },
    }));
    expect(errors.filter(e => e.path === 'taxRepresentativeParty.postalAddress')).toHaveLength(0);
  });

  it('aracı kurum hiç yoksa kardinalite sorusu DOĞMAZ', () => {
    expect(cardinality(baseInvoice()).filter(e => e.path?.startsWith('taxRepresentativeParty')))
      .toHaveLength(0);
  });

  it('yüklem saftır — eleman adı dışarıdan gelir', () => {
    const [error] = partyPostalAddressCardinalityRule(undefined, 'yol', 'CarrierParty');
    expect(error.message).toContain('CarrierParty');
    expect(error.path).toBe('yol');
  });
});

describe('S3 · kardinalite kapısı `basic` seviyede de açıktır', () => {
  it('kurallar `validateCommon`dadır — `strict` beklemez', () => {
    // `validateByProfile` yalnız strict'te koşar; bu kurallar orada OLSAYDI
    // `basic` kullanan tüketici geçersiz XML üretmeye devam ederdi.
    const errors = cardinality(baseInvoice({
      taxRepresentativeParty: { intermediaryVknTckn: '9876543210', intermediaryLabel: 'X' },
    }));
    expect(errors.length).toBeGreaterThan(0);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * S4 — GİRDİ YÜZEYİ: dört katman birden
 *
 * S3'te üç kural da DOĞRUYDU ama İKİSİ KAPATILAMIYORDU: kullanıcının verecek
 * alanı yoktu (`passportIssueDate` hiç yok, aracı kurum adresi Simple katmanda
 * yok, ad/soyad `SimpleBuyerCustomerInput`ta yok). Buradaki testler alanın
 * HAM tipten XML'e kadar GERÇEKTEN aktığını kanıtlar — bir katmanda kalırsa
 * alan yarı yolda kaybolur ve kusur sessizce geri döner.
 * ══════════════════════════════════════════════════════════════════════════ */

describe('S4 · girdi yüzeyi dört katmanda da AKIYOR', () => {
  /** Simple katman → XML (tam boru hattı: mapper + serileştirici). */
  function buildYolcuXml(overrides: Record<string, unknown> = {}): string {
    const builder = new SimpleInvoiceBuilder({ prettyPrint: true, validationLevel: 'strict' });
    return builder.build({
      id: 'EXA2026000000020',
      uuid: 'e1a2b3c4-0020-4000-8020-000000000020',
      datetime: '2026-04-23T10:00:00',
      profile: 'YOLCUBERABERFATURA',
      type: 'ISTISNA',
      currencyCode: 'TRY',
      kdvExemptionCode: '322',
      sender: {
        taxNumber: '1460415308', name: 'Bavul Ticaret Butik A.Ş.', taxOffice: 'Beyoğlu',
        address: 'İstiklal Caddesi No:321', district: 'Beyoğlu', city: 'İstanbul',
      },
      customer: {
        taxNumber: '9876543210', name: 'Mimsoft Turizm Aracı A.Ş.', taxOffice: 'Fatih',
        address: 'Cağaloğlu Yokuşu No:42', district: 'Fatih', city: 'İstanbul',
      },
      buyerCustomer: {
        name: 'Michael Schneider (Tourist)', taxNumber: '99999999999',
        address: 'Hauptstrasse 15', district: 'Berlin', city: 'Berlin', country: 'Germany',
        firstName: 'Michael', familyName: 'Schneider',
        nationalityId: 'DE', passportId: 'N12345678', passportIssueDate: '2021-06-15',
      },
      taxRepresentativeParty: {
        vknTckn: '9876543210', label: 'MIMSOFT_TAXFREE_INTERMEDIARY',
        name: 'Mimsoft Turizm KDV İade Aracı',
        address: 'Cağaloğlu Yokuşu No:42', district: 'Fatih', city: 'İstanbul',
      },
      lines: [{ name: 'El Yapımı Seramik Vazo', quantity: 1, price: 800, unitCode: 'Adet', kdvPercent: 0 }],
      ...overrides,
    } as never).xml;
  }

  it('turistin ad/soyadı `cac:Person`a yazılır (kılavuz §4.2.1 — XSD 1..1)', () => {
    const xml = buildYolcuXml();
    expect(xml).toContain('<cbc:FirstName>Michael</cbc:FirstName>');
    expect(xml).toContain('<cbc:FamilyName>Schneider</cbc:FamilyName>');
  });

  it('`cbc:FirstName` `NationalityID`den ÖNCE gelir (PERSON_SEQ)', () => {
    const xml = buildYolcuXml();
    expect(xml.indexOf('<cbc:FirstName>')).toBeLessThan(xml.indexOf('<cbc:NationalityID>'));
  });

  it('pasaport tarihi `IdentityDocumentReference/IssueDate`e yazılır', () => {
    const xml = buildYolcuXml();
    expect(xml).toContain('<cac:IdentityDocumentReference>');
    expect(xml).toMatch(
      /<cac:IdentityDocumentReference>\s*<cbc:ID>N12345678<\/cbc:ID>\s*<cbc:IssueDate>2021-06-15<\/cbc:IssueDate>/,
    );
  });

  it('aracı kurumun adresi `TaxRepresentativeParty/PostalAddress`e yazılır (PartyType 1..1)', () => {
    const xml = buildYolcuXml();
    const block = /<cac:TaxRepresentativeParty>[\s\S]*?<\/cac:TaxRepresentativeParty>/.exec(xml)?.[0] ?? '';
    expect(block).toContain('<cac:PostalAddress>');
    expect(block).toContain('<cbc:CitySubdivisionName>Fatih</cbc:CitySubdivisionName>');
    expect(block).toContain('<cbc:CityName>İstanbul</cbc:CityName>');
    // `country` verilmediğinde `mapSimpleParty` ile AYNI varsayılan.
    expect(block).toContain('<cbc:Name>Türkiye</cbc:Name>');
  });

  it('🔴 aracı kurumun İLİ eksikse adres HİÇ kurulmaz — yarım adres yazılmaz', () => {
    expect(() => buildYolcuXml({
      taxRepresentativeParty: {
        vknTckn: '9876543210', label: 'MIMSOFT_TAXFREE_INTERMEDIARY',
        name: 'Mimsoft Turizm KDV İade Aracı',
        address: 'Cağaloğlu Yokuşu No:42', district: 'Fatih',   // `city` YOK
      },
    })).toThrow(/PostalAddress/);
  });

  it('🔴 ad/soyad `name`den TÜRETİLMEZ — verilmezse kapı AÇIK hata verir', () => {
    expect(() => buildYolcuXml({
      buyerCustomer: {
        name: 'Michael Schneider (Tourist)', taxNumber: '99999999999',
        address: 'Hauptstrasse 15', district: 'Berlin', city: 'Berlin', country: 'Germany',
        nationalityId: 'DE', passportId: 'N12345678', passportIssueDate: '2021-06-15',
      },
    })).toThrow(/FirstName/);
  });
});
