/**
 * İstisna kodları ↔ GİB kod listesi (T-KOD-2, GİB düzeltme planı Dalga 7).
 *
 * Kütüphanenin istisna tanımları GİB'in güncel `UBL-TR_Codelist.xml`
 * listeleriyle (paket 24.08.2026) KÜME OLARAK aynı olmalı. Beklenen kümeler
 * teste elle kopyalanmaz, paketteki XML'den OKUNUR (`payment-means-config`
 * testiyle aynı desen): şematron paketi güncellenip liste değişirse bu test
 * kırılır.
 *
 * 5.2.0'da eksik olan 10 kod:
 *   • 101–108 ÖTV istisna kodları (Kod Listeleri v1.43 §4.8.4),
 *   • 001 konaklama vergisi istisnası (§4.8.5),
 *   • 501 — GİB listesinde var, anlamı hiçbir GİB belgesinde tanımlı değil.
 *     Geçerli kod olarak kabul edilir; `meaningUnpublished` bayrağı taşır ki
 *     tüketen uygulama onu seçim listesinde göstermesin.
 *
 * Hangi fatura tiplerinde geçerli oldukları: GİB bu 10 kodu
 * `$istisnaTaxExemptionReasonCodeType` listesine koyar; Common şematronu
 * (`TaxExemptionReasonCodeCheck`) o listedeki kodları yalnız ISTISNA, IADE,
 * IHRACKAYITLI, SGK, YTBISTISNA, YTBIADE tiplerinde kabul eder. Kütüphanede
 * bunun karşılığı `documentType: 'ISTISNA'`dır.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  EXEMPTION_DEFINITIONS,
  EXEMPTION_MAP,
  isValidExemptionCode,
} from '../../src/calculator/exemption-config';
import {
  ISTISNA_TAX_EXEMPTION_REASON_CODES,
  OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES,
  IHRAC_EXEMPTION_REASON_CODES,
} from '../../src/ubltr/vocabulary/constants';
import { validateExemptionCode } from '../../src/documents/invoice/validators/cross-check-matrix';
import { getAvailableExemptions } from '../../src/calculator/invoice-rules';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import { InvoiceTypeCode } from '../../src/types/enums';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';
import { probeValidator, validateLive } from '../support/validator';

/** Şematron kod listesindeki `$<name>` değişkenini okur (`value ="` boşluğunu tolere eder). */
function codelist(name: string): string[] {
  const xml = readFileSync(resolve(__dirname, '../../schematrons/UBL-TR_Codelist.xml'), 'utf8');
  const match = new RegExp(`name="${name}"\\s+value\\s*=\\s*"'([^']*)'"`).exec(xml);
  if (!match) throw new Error(`$${name} şematron kod listesinde bulunamadı`);
  return match[1].split(',').filter(Boolean);
}

const sorted = (xs: Iterable<string>) => [...xs].sort();

/** SGK sembolik kodları istisna kodu değil, `$AccountingCostCodeList` değeridir. */
const libraryExemptionCodes = EXEMPTION_DEFINITIONS
  .filter(d => d.documentType !== 'SGK')
  .map(d => d.code);

describe('istisna kodları ↔ GİB UBL-TR_Codelist.xml (T-KOD-2)', () => {
  it('bütün kodlar = $TaxExemptionReasonCodeType ∪ $YatirimTesvikTaxExemptionReasonCodeType', () => {
    const gib = new Set([
      ...codelist('TaxExemptionReasonCodeType'),
      ...codelist('YatirimTesvikTaxExemptionReasonCodeType'),
    ]);
    expect(sorted(libraryExemptionCodes)).toEqual(sorted(gib));
  });

  it('ISTISNA grubu = $istisnaTaxExemptionReasonCodeType', () => {
    expect(sorted(ISTISNA_TAX_EXEMPTION_REASON_CODES)).toEqual(
      sorted(codelist('istisnaTaxExemptionReasonCodeType')),
    );
  });

  it('OZELMATRAH grubu = $ozelMatrahTaxExemptionReasonCodeType', () => {
    expect(sorted(OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES)).toEqual(
      sorted(codelist('ozelMatrahTaxExemptionReasonCodeType')),
    );
  });

  it('IHRACKAYITLI grubu = $ihracExemptionReasonCodeType', () => {
    expect(sorted(IHRAC_EXEMPTION_REASON_CODES)).toEqual(
      sorted(codelist('ihracExemptionReasonCodeType')),
    );
  });
});

describe('ÖTV istisna kodları 101–108 (Kod Listeleri v1.43 §4.8.4)', () => {
  const expected: Array<[string, string]> = [
    ['101', 'İhracat İstisnası'],
    ['102', 'Diplomatik İstisna'],
    ['103', 'Askeri Amaçlı İstisna'],
    ['104', 'Petrol Arama Faaliyetlerinde Bulunanlara Yapılan Teslimler'],
    ['105', 'Uluslararası Anlaşmadan Doğan İstisna'],
    ['106', 'Diğer İstisnalar'],
    ['107', '7/a Maddesi Kapsamında Yapılan Teslimler'],
    ['108', 'Geçici 5. Madde Kapsamında Yapılan Teslimler'],
  ];
  for (const [code, name] of expected) {
    it(`${code} → "${name}", ÖTV, istisna grubu`, () => {
      const def = EXEMPTION_MAP.get(code);
      expect(def).toEqual({ code, name, type: 'OTV', documentType: 'ISTISNA' });
      expect(isValidExemptionCode(code)).toBe(true);
    });
  }
});

describe('konaklama vergisi istisnası 001 (Kod Listeleri v1.43 §4.8.5)', () => {
  it('001 → "Diplomatik İstisna", konaklama vergisi, istisna grubu', () => {
    expect(EXEMPTION_MAP.get('001')).toEqual({
      code: '001',
      name: 'Diplomatik İstisna',
      type: 'KONAKLAMA',
      documentType: 'ISTISNA',
    });
    expect(isValidExemptionCode('001')).toBe(true);
  });

  it('KONAKLAMAVERGISI tipinde reddedilir — şematron listesi yalnız istisna tiplerine izin verir', () => {
    // Common şematronu: $istisnaTaxExemptionReasonCodeType'taki kod (555 hariç)
    // yalnız ISTISNA/IADE/IHRACKAYITLI/SGK/YTBISTISNA/YTBIADE'de kabul edilir.
    const err = validateExemptionCode('001', InvoiceTypeCode.KONAKLAMAVERGISI, [{ amount: 0 }], 'p');
    expect(err?.code).toBe('INVALID_EXEMPTION_FOR_TYPE');
  });
});

describe('501 — GİB listesinde var, anlamı yayımlanmadı', () => {
  it('geçerli kod, istisna grubu, meaningUnpublished bayrağı taşır', () => {
    const def = EXEMPTION_MAP.get('501');
    expect(def).toBeDefined();
    expect(def?.documentType).toBe('ISTISNA');
    expect(def?.meaningUnpublished).toBe(true);
    expect(isValidExemptionCode('501')).toBe(true);
  });

  it('adı yansız: belgeye TaxExemptionReason olarak yazılır, anlam iddia etmez', () => {
    // Common şematronu İSTİSNA'da KDV tutarı 0 olan 0015 alt toplamında
    // TaxExemptionReason'ı ZORUNLU ve boş olmayan ister; "yalnız kod" yazılamaz.
    // GİB adı yayımlamadığı için metin yalnız kodu adlandırır.
    expect(EXEMPTION_MAP.get('501')?.name).toBe('İstisna Kodu 501');
    const xml = new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(istisnaInvoice('501')).xml;
    expect(xml).toContain('<cbc:TaxExemptionReason>İstisna Kodu 501</cbc:TaxExemptionReason>');
  });

  it('bayrak YALNIZ 501\'de — öbür bütün kodların anlamı yayımlı', () => {
    const flagged = EXEMPTION_DEFINITIONS.filter(d => d.meaningUnpublished).map(d => d.code);
    expect(flagged).toEqual(['501']);
  });

  it('tip listesinde (availableExemptions) bayrağıyla gelir — gizlemek tüketicinin işi', () => {
    const def = getAvailableExemptions('ISTISNA').find(d => d.code === '501');
    expect(def?.meaningUnpublished).toBe(true);
  });
});

describe('yeni kodlar fatura tipi matrisinde (şematron TaxExemptionReasonCodeCheck)', () => {
  const NEW_CODES = ['001', '101', '102', '103', '104', '105', '106', '107', '108', '501'];
  const ALLOWED = [
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.IADE, InvoiceTypeCode.IHRACKAYITLI,
    InvoiceTypeCode.SGK, InvoiceTypeCode.YTBISTISNA, InvoiceTypeCode.YTBIADE,
  ];
  for (const code of NEW_CODES) {
    it(`${code}: istisna tiplerinde geçerli, SATIS'ta geçersiz`, () => {
      for (const type of ALLOWED) {
        expect(validateExemptionCode(code, type, [{ amount: 0 }], 'p')).toBeNull();
      }
      expect(validateExemptionCode(code, InvoiceTypeCode.SATIS, [{ amount: 0 }], 'p')?.code)
        .toBe('INVALID_EXEMPTION_FOR_TYPE');
    });
  }
});

// ─── Canlı GİB şematronu: yeni kodlarla kurulan İSTİSNA faturası ───────────────
//
// Her kod KENDİ vergisinin alt toplamında: ÖTV kodları ÖTV 0071 %0'da (KDV %0,
// 301), 001 konaklama vergisi 0059 %0'da (KDV %0, 310), 501 KDV'de. ÖTV ve
// konaklama kodunun KDV alt toplamına yazılması reddedilir
// (`non-kdv-tax-exemption.test.ts`).

function istisnaInvoice(code: string): SimpleInvoiceInput {
  const type = EXEMPTION_MAP.get(code)?.type;
  const line: SimpleInvoiceInput['lines'][number] =
    type === 'OTV'
      ? { name: 'İstisna Kalem', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0, kdvExemptionCode: '301',
        taxes: [{ code: '0071', percent: 0, exemptionCode: code }] }
      : type === 'KONAKLAMA'
        ? { name: 'İstisna Kalem', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0, kdvExemptionCode: '310',
          taxes: [{ code: '0059', percent: 0, exemptionCode: code }] }
        : { name: 'İstisna Kalem', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 0, kdvExemptionCode: code };
  return {
    id: 'TST2026000000101',
    uuid: 'a1b2c3d4-0101-4000-8101-000000000101',
    datetime: '2026-04-23T14:00:00',
    profile: 'TEMELFATURA',
    type: 'ISTISNA',
    currencyCode: 'TRY',
    sender: {
      taxNumber: '1234567890', name: 'Sınır Tanımaz Ticaret A.Ş.', taxOffice: 'Üsküdar',
      address: 'Barbaros Bulvarı No:123', district: 'Üsküdar', city: 'İstanbul', zipCode: '34664',
    },
    customer: {
      taxNumber: '9876543210', name: 'Yeşil Alıcı Ltd. Şti.', taxOffice: 'Kadıköy',
      address: 'Bağdat Caddesi No:456', district: 'Kadıköy', city: 'İstanbul', zipCode: '34710',
    },
    lines: [line],
  };
}

const validator = await probeValidator();
const liveIt = it.skipIf(!validator.up);

describe('yeni kodlarla katı kurulum ve canlı GİB şematronu', () => {
  for (const code of ['001', '101', '102', '103', '104', '105', '106', '107', '108', '501']) {
    liveIt(`${code}: TEMELFATURA İSTİSNA, kendi vergisinin alt toplamında, katı kurulumdan ve şematrondan geçer`, async () => {
      const xml = new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(istisnaInvoice(code)).xml;
      expect(xml).toContain(`<cbc:TaxExemptionReasonCode>${code}</cbc:TaxExemptionReasonCode>`);
      const result = await validateLive(xml, 'efatura');
      expect(result.schematronValidationErrors ?? []).toEqual([]);
      expect(result.validSchematron).toBe(true);
    });
  }
});
