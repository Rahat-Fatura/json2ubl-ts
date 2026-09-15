/**
 * GTİP biçim kapısı — dört katmanın TEK ölçüme bağlandığının kanıtı.
 *
 * ## Neden bu dosya var
 *
 * Düzeltme öncesi aynı GTİP değeri dört katmanda DÖRT farklı sonuç veriyordu:
 *
 * | katman                                    | `'8471.30'` | `'8471.30.0000.00'` |
 * |-------------------------------------------|-------------|---------------------|
 * | `profile-validators` İHRACAT (`isNonEmpty`)| geçiyordu  | geçiyordu           |
 * | `ihrackayitli-validator` (`length === 12`) | kalıyordu   | KALIYORDU (15 krk.) |
 * | `delivery-suggestions` (`/\D/g` + 12)      | uyarı       | geçiyordu           |
 * | XML yazımı (`RequiredCustomsID`)           | ham geçiyor | ham geçiyor         |
 *
 * ## Normatif dayanak
 * - GİB 17.01.2017 İHRACAT entegratör test duyurusu: «GTİP **noktasız 12 hane**».
 * - `UBL-TR_Common_Schematron.xml:326` — IHRACKAYITLI+702:
 *   `string-length(normalize-space(...)) = 12` (KARAKTER sayar, noktayı elemez).
 * - `UBL-TR_Common_Schematron.xml:436` — IHRACAT: yalnız `!= 0`, hane saymaz.
 *
 * ## Beklenen sözleşme (normalizasyon tolere edici, doğrulama katı)
 * - `'847130000000'`    → KABUL
 * - `'8471.30.0000.00'` → KABUL, XML'e `847130000000` yazılır
 * - `'8471.30'`         → RED (6 hane)
 * - boş                 → RED
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeGtip,
  isValidGtip,
  describeGtipDefect,
  GTIP_DIGIT_COUNT,
} from '../../src/utils/gtip';
import { validateByProfile } from '../../src/validators/profile-validators';
import { validateIhrackayitli702 } from '../../src/validators/ihrackayitli-validator';
import { serializeLineDelivery } from '../../src/serializers/delivery-serializer';
import { DELIVERY_SUGGESTIONS } from '../../src/calculator/suggestion-rules/delivery-suggestions';
import { deriveUIState } from '../../src/calculator/invoice-rules';
import { SimpleInvoiceBuilder } from '../../src';
import { InvoiceTypeCode, InvoiceProfileId } from '../../src/types/enums';
import type { InvoiceInput, InvoiceLineInput } from '../../src/types/invoice-input';
import type { LineDeliveryInput } from '../../src/types/common';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

/** Ortak vaka kümesi — dört katmanda AYNI kararı vermeleri gereken girdiler. */
const VALID_GTIPS = [
  '847130000000',       // noktasız 12 hane — kanonik
  '8471.30.0000.00',    // GİB/BİLGE ekranlarından kopyalanan noktalı hâl
  '8471 30 0000 00',    // boşluklu
  '8471-30-0000-00',    // tireli
  ' 847130000000 ',     // kenar boşluğu (şematron `normalize-space` ile kırpar)
];

const INVALID_GTIPS: Array<[string, string]> = [
  ['8471.30', '6 hane — kısa'],
  ['847130', '6 hane — kısa (noktasız)'],
  ['8471300000', '10 hane — kısa'],
  ['84713000000000', '14 hane — uzun'],
  ['84713000000A', '12 karakter ama rakam değil'],
  ['', 'boş'],
  ['   ', 'yalnız boşluk'],
  ['....', 'yalnız ayraç'],
];

// ============================================================
// Katman 0 — saf normalizasyon/doğrulama (utils/gtip)
// ============================================================

describe('utils/gtip — normalizeGtip', () => {
  it('biçim ayraçlarını siler, rakamı korur', () => {
    expect(normalizeGtip('8471.30.0000.00')).toBe('847130000000');
    expect(normalizeGtip('8471 30 0000 00')).toBe('847130000000');
    expect(normalizeGtip('8471-30-0000-00')).toBe('847130000000');
    expect(normalizeGtip('8471/30/0000/00')).toBe('847130000000');
    expect(normalizeGtip(' 847130000000 ')).toBe('847130000000');
  });

  it('zaten temiz değeri DEĞİŞTİRMEZ', () => {
    expect(normalizeGtip('847130000000')).toBe('847130000000');
  });

  it('kısa değeri normalize eder ama TAMAMLAMAZ — hane uydurmaz', () => {
    expect(normalizeGtip('8471.30')).toBe('847130');
  });

  it('boş/ayraç-only/null/undefined → undefined', () => {
    expect(normalizeGtip('')).toBeUndefined();
    expect(normalizeGtip('   ')).toBeUndefined();
    expect(normalizeGtip('....')).toBeUndefined();
    expect(normalizeGtip(undefined)).toBeUndefined();
    expect(normalizeGtip(null)).toBeUndefined();
  });

  it('HARF SİLMEZ — `/\\D/g` yaklaşımı olsaydı sessizce 11 haneye düşerdi', () => {
    expect(normalizeGtip('84713000000A')).toBe('84713000000A');
    expect(isValidGtip('84713000000A')).toBe(false);
  });
});

describe('utils/gtip — isValidGtip', () => {
  it.each(VALID_GTIPS)('KABUL: %s', (gtip) => {
    expect(isValidGtip(gtip)).toBe(true);
    expect(describeGtipDefect(gtip)).toBeUndefined();
  });

  it.each(INVALID_GTIPS)('RED: %s (%s)', (gtip) => {
    expect(isValidGtip(gtip)).toBe(false);
    expect(describeGtipDefect(gtip)).toBeTypeOf('string');
  });

  it('GTIP_DIGIT_COUNT sabiti 12 (GİB «noktasız 12 hane»)', () => {
    expect(GTIP_DIGIT_COUNT).toBe(12);
  });

  it('hata metni girilen hane sayısını DOĞRU raporlar', () => {
    expect(describeGtipDefect('8471.30')).toContain('6 hane');
    expect(describeGtipDefect('8471300000')).toContain('10 hane');
    expect(describeGtipDefect('84713000000A')).toContain('rakam');
    expect(describeGtipDefect('')).toContain('boş');
  });
});

// ============================================================
// Katman 1 — İHRACAT profil doğrulayıcı (bloke eden hata)
// ============================================================

function makeIhracatInput(gtip: string | undefined): InvoiceInput {
  const delivery: LineDeliveryInput = {
    deliveryTerms: { id: 'FOB' },
    shipment: {
      transportModeCode: '1',
      goodsItems: gtip === undefined ? [] : [{ requiredCustomsId: gtip }],
    },
  };
  return {
    id: 'ABC202600000001',
    uuid: '11111111-2222-3333-4444-555555555555',
    profileId: InvoiceProfileId.IHRACAT,
    invoiceTypeCode: InvoiceTypeCode.ISTISNA,
    issueDate: '2026-01-01',
    currencyCode: 'TRY',
    supplier: { partyName: 'S', taxScheme: { name: 'Üsküdar' } } as never,
    customer: {} as never,
    taxTotals: [],
    legalMonetaryTotal: {} as never,
    lines: [{
      id: '1',
      invoicedQuantity: 1,
      unitCode: 'C62',
      lineExtensionAmount: 100,
      taxTotal: { taxAmount: 0, taxSubtotals: [] },
      item: { name: 'Test' },
      price: { priceAmount: 100 },
      delivery,
    } as unknown as InvoiceLineInput],
  };
}

const gtipErrorsOf = (input: InvoiceInput) =>
  validateByProfile(input).filter(e => e.path.includes('requiredCustomsId'));

describe('İHRACAT profili — GTİP 12 hane ZORUNLU (bloke eden hata)', () => {
  it.each(VALID_GTIPS)('KABUL: %s → GTİP hatası yok', (gtip) => {
    expect(gtipErrorsOf(makeIhracatInput(gtip))).toEqual([]);
  });

  it('🔴 REGRESYON KİLİDİ: `8471.30` (6 hane) REDDEDİLİR', () => {
    /* Düzeltme öncesi burada YALNIZ `isNonEmpty` vardı; bu değer sessizce
     * geçip GTB tarafında `1230` reddine dönüşüyordu. */
    const errors = gtipErrorsOf(makeIhracatInput('8471.30'));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('6 hane');
  });

  it.each(INVALID_GTIPS.filter(([g]) => g.trim() !== '' && g !== '....'))(
    'RED: %s (%s)',
    (gtip) => {
      expect(gtipErrorsOf(makeIhracatInput(gtip))).toHaveLength(1);
    },
  );

  it('GTİP hiç yok → "zorunludur" hatası (biçim hatası DEĞİL)', () => {
    const errors = gtipErrorsOf(makeIhracatInput(undefined));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('zorunludur');
  });

  it('boş string → "zorunludur" hatası', () => {
    const errors = gtipErrorsOf(makeIhracatInput(''));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('zorunludur');
  });
});

// ============================================================
// Katman 2 — IHRACKAYITLI + 702 doğrulayıcı
// ============================================================

function make702Input(gtip: string | undefined): InvoiceInput {
  return {
    id: 'ABC202600000001',
    uuid: '11111111-2222-3333-4444-555555555555',
    profileId: InvoiceProfileId.TEMELFATURA,
    invoiceTypeCode: InvoiceTypeCode.IHRACKAYITLI,
    issueDate: '2026-01-01',
    currencyCode: 'TRY',
    supplier: {} as never,
    customer: {} as never,
    taxTotals: [],
    legalMonetaryTotal: {} as never,
    lines: [{
      id: '1',
      invoicedQuantity: 1,
      unitCode: 'C62',
      lineExtensionAmount: 100,
      taxTotal: {
        taxAmount: 0,
        taxSubtotals: [{ taxableAmount: 100, taxAmount: 0, taxTypeCode: '0015', taxExemptionReasonCode: '702' }],
      },
      item: { name: 'Test' },
      price: { priceAmount: 100 },
      delivery: {
        shipment: {
          goodsItems: gtip === undefined ? [] : [{ requiredCustomsId: gtip }],
          transportHandlingUnits: [{
            customsDeclarations: [{
              id: 'DECL-001',
              issuerParty: {
                partyIdentifications: [{ id: '12345678901', schemeID: 'ALICIDIBSATIRKOD' }],
              },
            }],
          }],
        },
      } as LineDeliveryInput,
    } as unknown as InvoiceLineInput],
  };
}

const gtip702ErrorsOf = (gtip: string | undefined) =>
  validateIhrackayitli702(make702Input(gtip)).filter(e => e.code === 'IHRACKAYITLI_702_REQUIRES_GTIP');

describe('IHRACKAYITLI + 702 — GTİP ölçümü normalizasyona bağlandı', () => {
  it.each(VALID_GTIPS)('KABUL: %s', (gtip) => {
    expect(gtip702ErrorsOf(gtip)).toEqual([]);
  });

  it('🔴 DAVRANIŞ DÜZELMESİ: `8471.30.0000.00` artık KABUL (eskiden 15 karakter diye red)', () => {
    expect(gtip702ErrorsOf('8471.30.0000.00')).toEqual([]);
  });

  it('🔴 DAVRANIŞ DÜZELMESİ: `" 847130000000 "` KABUL — şematron da `normalize-space` ile kabul eder', () => {
    expect(gtip702ErrorsOf(' 847130000000 ')).toEqual([]);
  });

  it('🔴 REGRESYON KİLİDİ: `8471.30` REDDEDİLİR ve sebebi hane sayısıyla söylenir', () => {
    const errors = gtip702ErrorsOf('8471.30');
    expect(errors).toHaveLength(1);
    expect(errors[0].actual).toContain('6 hane');
  });

  it('boş goodsItems → red, actual="goodsItems boş"', () => {
    const errors = gtip702ErrorsOf(undefined);
    expect(errors).toHaveLength(1);
    expect(errors[0].actual).toBe('goodsItems boş');
  });
});

// ============================================================
// Katman 3 — öneri kuralı (advisory; GİB'in reddetmediği hâller)
// ============================================================

const gtipRule = DELIVERY_SUGGESTIONS.find(r => r.id === 'delivery/gtip-format-12-digit')!;

function makeSuggestionInput(gtipNo: string): SimpleInvoiceInput {
  return {
    type: 'SATIS',
    profile: 'TEMELFATURA',
    currencyCode: 'TRY',
    lines: [{
      name: 'X', quantity: 1, price: 100, kdvPercent: 20,
      delivery: {
        deliveryAddress: { address: 'A', district: 'D', city: 'C', country: 'Türkiye' },
        gtipNo,
      },
    }],
  } as SimpleInvoiceInput;
}

const produceFor = (gtipNo: string) => {
  const input = makeSuggestionInput(gtipNo);
  const ui = deriveUIState(input.type!, input.profile!);
  return { applies: gtipRule.applies(input, ui), out: gtipRule.produce(input, ui) };
};

describe('delivery/gtip-format-12-digit — aynı ölçüm + somut düzeltme önerisi', () => {
  it.each(VALID_GTIPS)('KABUL (öneri üretilmez): %s', (gtip) => {
    expect(produceFor(gtip).applies).toBe(false);
  });

  it('🔴 `8471.30.0000.00` artık öneri ÜRETMEZ — normalize edilince geçerli', () => {
    expect(produceFor('8471.30.0000.00').applies).toBe(false);
  });

  it('🔴 `8471.30` öneri üretir ve doğrusunu UYDURMAZ (value undefined)', () => {
    const { applies, out } = produceFor('8471.30');
    expect(applies).toBe(true);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBeUndefined();
    expect(out[0].reason).toContain('6 hane');
    expect(out[0].severity).toBe('recommended');
  });

  it('harf içeren GTİP → "rakam" gerekçesi, value yok', () => {
    const { out } = produceFor('84713000000A');
    expect(out[0].value).toBeUndefined();
    expect(out[0].reason).toContain('rakam');
  });

  /* `value` HER ZAMAN undefined olmalı — kural yalnız "hane yanlış / rakam
   * değil" için tetikleniyor, bunların doğrusu UYDURULAMAZ. Ayraç temizliğiyle
   * düzelen değerler zaten GEÇERLİ sayıldığı için kural onlara hiç çalışmaz. */
  it('öneri hiçbir zaman somut değer UYDURMAZ (value undefined)', () => {
    for (const gtip of ['8471.30', '8471.30.0000.0', '84713000000000', '84713000000A']) {
      const { out } = produceFor(gtip);
      expect(out).toHaveLength(1);
      expect(out[0].value).toBeUndefined();
    }
  });

  /* 🔴 MUTASYON KİLİDİ — eski `gtip.replace(/\D/g,'').length !== 12` ölçümüyle
   * YENİ `isValidGtip` yalnız BURADA ayrışır. Bu vaka olmadan öneri katmanının
   * ölçümünü geri almak testi KIRMIYORDU (mutasyonla ölçüldü).
   *
   * Eski sayma "rakam olmayan her şeyi at, 12 rakam kaldı mı?" diyordu; yani
   * `847130000000A` girdisinde harfi SESSİZCE atıp «12 hane, sorun yok»
   * sonucuna varıyordu. Oysa bu değer XML'e olduğu gibi (13 karakter) yazılır
   * ve GİB reddeder. Harf bir biçim ayracı DEĞİLDİR. */
  it.each(['847130000000A', 'A847130000000'])(
    '🔴 MUTASYON KİLİDİ: %s — 12 rakam + kaçak harf, eski `/\\D/g` sayması SUSUYORDU',
    (gtip) => {
      expect(gtip.replace(/\D/g, '').length).toBe(12);  // eski ölçüm "geçerli" derdi
      expect(isValidGtip(gtip)).toBe(false);            // yeni ölçüm reddeder
      const { applies, out } = produceFor(gtip);
      expect(applies).toBe(true);
      expect(out[0].reason).toContain('rakam');
      expect(out[0].value).toBeUndefined();
    },
  );
});

/* Aynı kaçak-harf vakası bloke eden katmanda da kapalı olmalı. */
describe('🔴 12 rakam + kaçak harf — bloke eden katmanlar', () => {
  it.each(['847130000000A', 'A847130000000'])('İHRACAT profili RED: %s', (gtip) => {
    expect(gtipErrorsOf(makeIhracatInput(gtip))).toHaveLength(1);
  });

  it.each(['847130000000A', 'A847130000000'])('IHRACKAYITLI+702 RED: %s', (gtip) => {
    expect(gtip702ErrorsOf(gtip)).toHaveLength(1);
  });
});

// ============================================================
// Katman 4 — XML yazımı: RequiredCustomsID NOKTASIZ gider
// ============================================================

describe('XML yazımı — RequiredCustomsID normalize edilir', () => {
  const emit = (gtip: string) =>
    serializeLineDelivery({ shipment: { goodsItems: [{ requiredCustomsId: gtip }] } } as LineDeliveryInput);

  it('🔴 `8471.30.0000.00` → XML\'e `847130000000` yazılır', () => {
    expect(emit('8471.30.0000.00'))
      .toContain('<cbc:RequiredCustomsID>847130000000</cbc:RequiredCustomsID>');
  });

  it('boşluklu/tireli hâller de noktasız 12 haneye iner', () => {
    expect(emit('8471 30 0000 00')).toContain('<cbc:RequiredCustomsID>847130000000</cbc:RequiredCustomsID>');
    expect(emit('8471-30-0000-00')).toContain('<cbc:RequiredCustomsID>847130000000</cbc:RequiredCustomsID>');
    expect(emit(' 847130000000 ')).toContain('<cbc:RequiredCustomsID>847130000000</cbc:RequiredCustomsID>');
  });

  it('zaten temiz değer AYNEN yazılır (mevcut çıktı bozulmaz)', () => {
    expect(emit('620342000010')).toContain('<cbc:RequiredCustomsID>620342000010</cbc:RequiredCustomsID>');
  });

  it('XML\'de nokta KALMAZ', () => {
    expect(emit('8471.30.0000.00')).not.toContain('8471.30');
  });
});

// ============================================================
// Uçtan uca — SimpleInvoiceBuilder (İHRACAT), kullanıcının gördüğü yol
// ============================================================

function makeIhracatSimple(gtipNo: string): SimpleInvoiceInput {
  return {
    id: 'GTP2026000000001',
    uuid: 'e1a2b3c4-0018-4000-8018-000000000018',
    datetime: '2026-04-23T13:00:00',
    profile: 'IHRACAT',
    type: 'ISTISNA',
    currencyCode: 'USD',
    exchangeRate: 32.5,
    kdvExemptionCode: '301',
    sender: {
      taxNumber: '1234567890', name: 'İhracat A.Ş.', taxOffice: 'Üsküdar',
      address: 'Barbaros Bulvarı No:123', district: 'Üsküdar', city: 'İstanbul',
    },
    customer: {
      taxNumber: '2222222222', name: 'Global Trade Holdings (Germany)',
      address: 'Bahnhofstraße 123', district: 'Munich', city: 'Bayern', country: 'Germany',
    },
    buyerCustomer: {
      name: 'Global Trade Holdings GmbH', taxNumber: 'DE123456789',
      address: 'Bahnhofstraße 123', district: 'Munich', city: 'Bayern', country: 'Germany',
    },
    lines: [{
      name: 'Premium Tekstil — İhracat', quantity: 100, price: 10, unitCode: 'Adet', kdvPercent: 0,
      delivery: {
        deliveryTermCode: 'FOB',
        transportModeCode: '1',
        gtipNo,
        deliveryAddress: { address: 'Ambarlı Liman', district: 'Avcılar', city: 'İstanbul', country: 'Türkiye' },
      },
    }],
  } as SimpleInvoiceInput;
}

describe('uçtan uca — İHRACAT faturası (SimpleInvoiceBuilder, strict)', () => {
  const builder = () => new SimpleInvoiceBuilder({ validationLevel: 'strict' });

  it('🔴 `8471.30` ile belge KURULAMAZ (eskiden kuruluyordu ve GTB reddediyordu)', () => {
    expect(() => builder().build(makeIhracatSimple('8471.30')))
      .toThrowError(/GTİP/);
  });

  it('🔴 `8471.30.0000.00` belge KURAR ve XML\'e noktasız yazar', () => {
    const result = builder().build(makeIhracatSimple('8471.30.0000.00'));
    const xml = typeof result === 'string' ? result : result.xml;
    expect(xml).toContain('<cbc:RequiredCustomsID>847130000000</cbc:RequiredCustomsID>');
    expect(xml).not.toContain('8471.30');
  });

  it('`847130000000` belge kurar (kanonik biçim)', () => {
    const result = builder().build(makeIhracatSimple('847130000000'));
    const xml = typeof result === 'string' ? result : result.xml;
    expect(xml).toContain('<cbc:RequiredCustomsID>847130000000</cbc:RequiredCustomsID>');
  });

  it('boş GTİP ile belge KURULAMAZ', () => {
    expect(() => builder().build(makeIhracatSimple('')))
      .toThrowError(/GTİP/);
  });

  /* Kullanıcının YAZDIĞI alan değişmez — normalizasyon yalnız tele yansır.
   * (Karar gerekçesi: `src/utils/gtip.ts` başlık yorumu.) */
  it('girdi nesnesi MUTASYONA UĞRAMAZ — normalizasyon yalnız XML\'e yansır', () => {
    const input = makeIhracatSimple('8471.30.0000.00');
    builder().build(input);
    expect(input.lines[0].delivery!.gtipNo).toBe('8471.30.0000.00');
  });
});

// ============================================================
// Public API — tüketici KENDİ sayma kuralını yazmak zorunda kalmamalı
// ============================================================

describe('public API — GTİP yardımcıları paket kökünden dışa açık', () => {
  it('normalizeGtip / isValidGtip / describeGtipDefect / GTIP_DIGIT_COUNT export edilir', async () => {
    const pkg = await import('../../src');
    expect(typeof pkg.normalizeGtip).toBe('function');
    expect(typeof pkg.isValidGtip).toBe('function');
    expect(typeof pkg.describeGtipDefect).toBe('function');
    expect(pkg.GTIP_DIGIT_COUNT).toBe(12);
    // Kök export ile doğrudan modül AYNI ölçümü vermeli (tek kaynak).
    expect(pkg.isValidGtip('8471.30.0000.00')).toBe(isValidGtip('8471.30.0000.00'));
    expect(pkg.isValidGtip('8471.30')).toBe(false);
  });
});
