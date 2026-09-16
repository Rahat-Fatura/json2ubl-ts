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
  it('🔴 pasaportlu turist REDDEDİLİR — tarih alanı GİRDİDE YOK', () => {
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

  it('tarih verilebilseydi kural SUSARDI (yüklem doğru, girdi yüzeyi eksik)', () => {
    expect(documentReferenceCardinalityRule(
      { id: 'N12345678', issueDate: '2020-01-01' },
      'p',
      'IdentityDocumentReference',
    )).toHaveLength(0);
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
