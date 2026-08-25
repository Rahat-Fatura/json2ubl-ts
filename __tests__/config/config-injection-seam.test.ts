/**
 * 4.1.0 — `configManager` ENJEKSİYON DİKİŞİ (yarım kalmış bağın onarımı).
 *
 * ## Onarılan kusur
 *
 * `configManager` beş listeyi runtime'da override edebiliyordu, ama
 * `constants.ts`'teki türev whitelist `Set`'leri ve `cross-check-matrix.ts`'teki
 * `TAX_EXEMPTION_MATRIX` **import anında bir kez** hesaplanıyordu. Sonuç:
 *
 * > enjekte edilen kod HESAPLANIYOR ama `InvoiceBuilder.validate()` strict modu
 * > tarafından REDDEDİLİYORDU.
 *
 * Bu dosya onarımın delilidir. Kritik test (`ENJEKSİYON KANITI`) üç adımı tek
 * koşumda gösterir: enjeksiyon ÖNCESİ RED → enjeksiyon SONRASI KABUL →
 * `reset()` SONRASI tekrar RED. Onarımdan önce ikinci adım KIRMIZIYDI.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { InvoiceBuilder } from '../../src/builders/invoice-builder';
import { configManager } from '../../src/calculator/config-manager';
import { TAX_DEFINITIONS, type TaxDefinition } from '../../src/calculator/tax-config';
import { WITHHOLDING_TAX_DEFINITIONS } from '../../src/calculator/withholding-config';
import { EXEMPTION_DEFINITIONS } from '../../src/calculator/exemption-config';
import { UNIT_DEFINITIONS } from '../../src/calculator/unit-config';
import { CURRENCY_DEFINITIONS } from '../../src/calculator/currency-config';
import {
  TAX_TYPE_CODES,
  WITHHOLDING_TAX_TYPE_CODES,
  WITHHOLDING_TAX_TYPE_WITH_PERCENT,
  ISTISNA_TAX_EXEMPTION_REASON_CODES,
  OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES,
  IHRAC_EXEMPTION_REASON_CODES,
  UNIT_CODES,
  CURRENCY_CODES,
} from '../../src/config/constants';
import { TAX_EXEMPTION_MATRIX } from '../../src/validators/cross-check-matrix';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';

// ─── Ortak fikstürler ────────────────────────────────────────────────────────

const SUPPLIER = {
  vknTckn: '1234567890',
  taxIdType: 'VKN' as const,
  name: 'Merkezî Katalog Test A.Ş.',
  streetName: 'Atatürk Caddesi',
  buildingNumber: '10',
  citySubdivisionName: 'Çankaya',
  cityName: 'Ankara',
  postalZone: '06100',
  country: 'Türkiye',
  taxOffice: 'Çankaya VD',
};

const CUSTOMER = {
  vknTckn: '9876543210',
  taxIdType: 'VKN' as const,
  name: 'Alıcı Ltd. Şti.',
  streetName: 'İstiklal Caddesi',
  citySubdivisionName: 'Beyoğlu',
  cityName: 'İstanbul',
  postalZone: '34430',
  country: 'Türkiye',
  taxOffice: 'Beyoğlu VD',
};

/** Temel SATIS faturası — 100 TL matrah, %20 KDV. */
function baseInvoice(): InvoiceInput {
  return {
    id: 'MKT2026000000001',
    uuid: 'c0000000-0001-4000-8001-000000000001',
    profileId: InvoiceProfileId.TEMELFATURA,
    invoiceTypeCode: InvoiceTypeCode.SATIS,
    issueDate: '2026-04-23',
    issueTime: '10:00:00',
    currencyCode: 'TRY',
    supplier: SUPPLIER,
    customer: CUSTOMER,
    taxTotals: [{
      taxAmount: 20,
      taxSubtotals: [
        { taxableAmount: 100, taxAmount: 20, percent: 20, taxTypeCode: '0015', taxTypeName: 'KDV' },
      ],
    }],
    legalMonetaryTotal: {
      lineExtensionAmount: 100,
      taxExclusiveAmount: 100,
      taxInclusiveAmount: 120,
      payableAmount: 120,
    },
    lines: [{
      id: '1',
      invoicedQuantity: 1,
      unitCode: 'C62',
      lineExtensionAmount: 100,
      taxTotal: {
        taxAmount: 20,
        taxSubtotals: [
          { taxableAmount: 100, taxAmount: 20, percent: 20, taxTypeCode: '0015', taxTypeName: 'KDV' },
        ],
      },
      item: { name: 'Danışmanlık Hizmeti' },
      price: { priceAmount: 100 },
    }],
  };
}

const strict = new InvoiceBuilder({ validationLevel: 'strict' });

afterEach(() => {
  // Singleton — her testten sonra fabrika değerlerine dön.
  configManager.reset();
});

// ─── 1. ONARIMIN DELİLİ ──────────────────────────────────────────────────────

describe('ENJEKSİYON KANITI — enjekte edilen kod strict validate\'ten GEÇER', () => {
  /** Merkezî katalogdan gelmiş gibi davranan, kütüphanede TANIMSIZ bir vergi kodu. */
  const INJECTED: TaxDefinition = {
    code: '0099',
    name: 'Merkezî Katalog Deneme Vergisi',
    shortName: 'MKDV',
    baseStat: true,
    baseCalculate: false,
  };

  function invoiceWithInjectedTax(): InvoiceInput {
    const input = baseInvoice();
    input.taxTotals[0].taxSubtotals.push({
      taxableAmount: 100, taxAmount: 5, percent: 5,
      taxTypeCode: INJECTED.code, taxTypeName: INJECTED.name,
    });
    input.taxTotals[0].taxAmount = 25;
    return input;
  }

  it('ÖNCE (enjeksiyon yok) → REDDEDİLİR; SONRA (enjeksiyon var) → KABUL; reset → tekrar RED', () => {
    const input = invoiceWithInjectedTax();

    // ── ADIM 1: kod tanımsız → strict validate reddeder (negatif kontrol) ──
    const before = strict.validate(input);
    expect(before.length, 'enjeksiyon öncesi hata bekleniyordu').toBeGreaterThan(0);
    expect(before.some(e => e.path === 'taxTotals[0].taxSubtotals[1].taxTypeCode')).toBe(true);
    expect(() => strict.build(input)).toThrow();

    // ── ADIM 2: merkezî katalog kodu enjekte eder ──────────────────────────
    // ONARIMDAN ÖNCE BU ADIM KIRMIZIYDI: türev `Set`'ler import anında
    // donduğu için `updateTaxes()` doğrulayıcıya hiç ulaşmıyordu.
    configManager.updateTaxes([...TAX_DEFINITIONS, INJECTED]);

    expect(TAX_TYPE_CODES.has(INJECTED.code), 'türev Set tazelenmedi').toBe(true);
    expect(strict.validate(input), 'enjeksiyondan sonra hata KALMAMALI').toEqual([]);
    expect(() => strict.build(input)).not.toThrow();
    expect(strict.build(input)).toContain(`<cbc:TaxTypeCode>${INJECTED.code}</cbc:TaxTypeCode>`);

    // ── ADIM 3: reset → whitelist fabrika değerine döner, belge tekrar RED ──
    configManager.reset();
    expect(TAX_TYPE_CODES.has(INJECTED.code)).toBe(false);
    expect(strict.validate(input).length).toBeGreaterThan(0);
  });

  it('hesaplayıcı ve doğrulayıcı AYNI kabul kümesini görür (kusurun kökü)', () => {
    // Kusur tam olarak buydu: configManager.isValidTaxCode() true derken
    // TAX_TYPE_CODES.has() false diyordu.
    configManager.updateTaxes([...TAX_DEFINITIONS, INJECTED]);
    expect(configManager.isValidTaxCode(INJECTED.code)).toBe(true);
    expect(TAX_TYPE_CODES.has(INJECTED.code)).toBe(true);

    for (const def of configManager.taxes) {
      expect(TAX_TYPE_CODES.has(def.code), `configManager'da var, Set'te yok: ${def.code}`).toBe(true);
    }
  });
});

// ─── 2. reset() sonrası varsayılana dönüş ────────────────────────────────────

describe('reset() — türev kümeler VARSAYILANA döner', () => {
  it('beş listenin tamamı override edilip reset edilince fabrika değerine döner', () => {
    const defaults = {
      tax: new Set(TAX_TYPE_CODES),
      withholding: new Set(WITHHOLDING_TAX_TYPE_CODES),
      combos: new Set(WITHHOLDING_TAX_TYPE_WITH_PERCENT),
      istisna: new Set(ISTISNA_TAX_EXEMPTION_REASON_CODES),
      ozelMatrah: new Set(OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES),
      ihrac: new Set(IHRAC_EXEMPTION_REASON_CODES),
      unit: new Set(UNIT_CODES),
      currency: new Set(CURRENCY_CODES),
      matrix: new Set(TAX_EXEMPTION_MATRIX.keys()),
    };

    configManager.updateAll({
      taxes: [{ code: 'X001', name: 'X', shortName: 'X', baseStat: true, baseCalculate: true }],
      withholdingTaxes: [{ code: '699', name: 'X', percent: 55 }],
      exemptions: [{ code: 'X900', name: 'X', type: 'KDV', documentType: 'ISTISNA' }],
      units: [{ code: 'XUN', name: 'X' }],
      currencies: [{ code: 'XCU', name: 'X', unit: 'X', subunit: 'X' }],
    });

    // Override GERÇEKTEN etkili (aksi halde reset testi anlamsız olurdu).
    expect(TAX_TYPE_CODES.has('X001')).toBe(true);
    expect(TAX_TYPE_CODES.has('0003')).toBe(false);
    expect(WITHHOLDING_TAX_TYPE_CODES.has('699')).toBe(true);
    expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('69955')).toBe(true);
    expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.has('X900')).toBe(true);
    expect(UNIT_CODES.has('XUN')).toBe(true);
    expect(CURRENCY_CODES.has('XCU')).toBe(true);
    expect(TAX_EXEMPTION_MATRIX.has('X900')).toBe(true);

    configManager.reset();

    expect(new Set(TAX_TYPE_CODES)).toEqual(defaults.tax);
    expect(new Set(WITHHOLDING_TAX_TYPE_CODES)).toEqual(defaults.withholding);
    expect(new Set(WITHHOLDING_TAX_TYPE_WITH_PERCENT)).toEqual(defaults.combos);
    expect(new Set(ISTISNA_TAX_EXEMPTION_REASON_CODES)).toEqual(defaults.istisna);
    expect(new Set(OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES)).toEqual(defaults.ozelMatrah);
    expect(new Set(IHRAC_EXEMPTION_REASON_CODES)).toEqual(defaults.ihrac);
    expect(new Set(UNIT_CODES)).toEqual(defaults.unit);
    expect(new Set(CURRENCY_CODES)).toEqual(defaults.currency);
    expect(new Set(TAX_EXEMPTION_MATRIX.keys())).toEqual(defaults.matrix);
  });

  it('reset() sonrası varsayılan kümeler statik tanımlarla birebir', () => {
    configManager.updateTaxes([]);
    configManager.reset();
    expect(TAX_TYPE_CODES.size).toBe(TAX_DEFINITIONS.length + 1);
    expect(WITHHOLDING_TAX_TYPE_CODES.size).toBe(WITHHOLDING_TAX_DEFINITIONS.length);
    expect(UNIT_CODES.size).toBe(UNIT_DEFINITIONS.length);
    expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.size).toBe(
      EXEMPTION_DEFINITIONS.filter(e => e.documentType === 'ISTISNA').length,
    );
  });
});

// ─── 3. Her mutasyon yolu tazeler ────────────────────────────────────────────

describe('configManager\'ın TÜM mutasyon yolları türev kümeleri tazeler', () => {
  const extraTax: TaxDefinition = {
    code: '0098', name: 'Y', shortName: 'Y', baseStat: true, baseCalculate: true,
  };

  it('initialize()', () => {
    configManager.initialize({ taxes: [...TAX_DEFINITIONS, extraTax] });
    expect(TAX_TYPE_CODES.has('0098')).toBe(true);
  });

  it('updateTaxes()', () => {
    configManager.updateTaxes([...TAX_DEFINITIONS, extraTax]);
    expect(TAX_TYPE_CODES.has('0098')).toBe(true);
  });

  it('updateWithholdingTaxes()', () => {
    configManager.updateWithholdingTaxes([...WITHHOLDING_TAX_DEFINITIONS, { code: '699', name: 'Y', percent: 55 }]);
    expect(WITHHOLDING_TAX_TYPE_CODES.has('699')).toBe(true);
    expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('69955')).toBe(true);
  });

  it('updateExemptions()', () => {
    configManager.updateExemptions([...EXEMPTION_DEFINITIONS, { code: 'X901', name: 'Y', type: 'KDV', documentType: 'ISTISNA' }]);
    expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.has('X901')).toBe(true);
    expect(TAX_EXEMPTION_MATRIX.has('X901')).toBe(true);
  });

  it('updateUnits()', () => {
    configManager.updateUnits([...UNIT_DEFINITIONS, { code: 'XUN', name: 'Y' }]);
    expect(UNIT_CODES.has('XUN')).toBe(true);
  });

  it('updateCurrencies()', () => {
    configManager.updateCurrencies([...CURRENCY_DEFINITIONS, { code: 'XCU', name: 'Y', unit: 'Y', subunit: 'Y' }]);
    expect(CURRENCY_CODES.has('XCU')).toBe(true);
  });

  it('updateAll()', () => {
    configManager.updateAll({ taxes: [...TAX_DEFINITIONS, extraTax], units: [...UNIT_DEFINITIONS, { code: 'XUN', name: 'Y' }] });
    expect(TAX_TYPE_CODES.has('0098')).toBe(true);
    expect(UNIT_CODES.has('XUN')).toBe(true);
  });

  it('reset()', () => {
    configManager.updateTaxes([...TAX_DEFINITIONS, extraTax]);
    configManager.reset();
    expect(TAX_TYPE_CODES.has('0098')).toBe(false);
  });
});

// ─── 4. Geriye uyumluluk: dışa açık yüzey DEĞİŞMEDİ ──────────────────────────

describe('Geriye uyumluluk — türev kümeler hâlâ GERÇEK `Set`', () => {
  it('instanceof Set, spread, forEach, size hepsi çalışır', () => {
    expect(TAX_TYPE_CODES).toBeInstanceOf(Set);
    expect(CURRENCY_CODES).toBeInstanceOf(Set);
    expect(TAX_EXEMPTION_MATRIX).toBeInstanceOf(Map);

    const spread = [...TAX_TYPE_CODES];
    expect(spread.length).toBe(TAX_TYPE_CODES.size);
    expect(spread).toContain('0015');

    let counted = 0;
    TAX_TYPE_CODES.forEach(() => { counted++; });
    expect(counted).toBe(TAX_TYPE_CODES.size);

    expect(Array.from(TAX_TYPE_CODES.values())).toEqual(spread);
    expect(new Set(TAX_TYPE_CODES).has('0015')).toBe(true);
  });

  it('NESNE KİMLİĞİ güncellemeler arasında SABİT kalır — eski import\'lar bozulmaz', () => {
    // Tüketici kütüphaneyi import ettiğinde referansı yakalar; güncelleme
    // yeni bir nesne ÜRETMEZ, mevcut nesneyi yerinde tazeler.
    const captured = TAX_TYPE_CODES;
    configManager.updateTaxes([...TAX_DEFINITIONS, {
      code: '0097', name: 'Z', shortName: 'Z', baseStat: true, baseCalculate: true,
    }]);
    expect(captured).toBe(TAX_TYPE_CODES);
    expect(captured.has('0097'), 'yakalanmış referans güncellemeyi GÖRMELİ').toBe(true);
  });

  it('varsayılan davranış değişmedi — CURRENCY_CODES daralmadı ve TRL hâlâ dışarıda', () => {
    expect(CURRENCY_CODES.size).toBe(68);
    expect(CURRENCY_CODES.has('TRL')).toBe(false);
    expect(CURRENCY_CODES.has('TRY')).toBe(true);
    // currency-config (30 kod) taban listenin ALT KÜMESİ → varsayılan genişlemiyor.
    for (const def of CURRENCY_DEFINITIONS) {
      expect(CURRENCY_CODES.has(def.code)).toBe(true);
    }
  });
});

// ─── 5. Enjekte edilen istisna ve tevkifat kodları ───────────────────────────

describe('Enjekte edilen İSTİSNA kodu strict validate\'ten geçer', () => {
  it('yeni istisna kodu hem whitelist\'e hem çapraz matrise girer', () => {
    configManager.updateExemptions([
      ...EXEMPTION_DEFINITIONS,
      { code: '399', name: 'Merkezî Katalog İstisnası', type: 'KDV', documentType: 'ISTISNA' },
    ]);

    const input = baseInvoice();
    input.invoiceTypeCode = InvoiceTypeCode.ISTISNA;
    input.taxTotals[0].taxAmount = 0;
    input.taxTotals[0].taxSubtotals = [{
      taxableAmount: 100, taxAmount: 0, percent: 0,
      taxTypeCode: '0015', taxTypeName: 'KDV',
      taxExemptionReasonCode: '399', taxExemptionReason: 'Merkezî Katalog İstisnası',
    }];
    input.lines[0].taxTotal = {
      taxAmount: 0,
      taxSubtotals: [{
        taxableAmount: 100, taxAmount: 0, percent: 0,
        taxTypeCode: '0015', taxTypeName: 'KDV',
        taxExemptionReasonCode: '399', taxExemptionReason: 'Merkezî Katalog İstisnası',
      }],
    };
    input.legalMonetaryTotal.taxInclusiveAmount = 100;
    input.legalMonetaryTotal.payableAmount = 100;

    expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.has('399')).toBe(true);
    expect(TAX_EXEMPTION_MATRIX.has('399')).toBe(true);
    expect(strict.validate(input)).toEqual([]);
  });
});

describe('Enjekte edilen TEVKİFAT kodu strict validate\'ten geçer', () => {
  it('yeni tevkifat kodu + oranı kod/oran kombinasyon whitelist\'ine girer', () => {
    configManager.updateWithholdingTaxes([
      ...WITHHOLDING_TAX_DEFINITIONS,
      { code: '699', name: 'Merkezî Katalog Tevkifatı', percent: 55 },
    ]);

    const input = baseInvoice();
    input.invoiceTypeCode = InvoiceTypeCode.TEVKIFAT;
    input.withholdingTaxTotals = [{
      taxAmount: 11,
      taxSubtotals: [{ taxableAmount: 20, taxAmount: 11, percent: 55, taxTypeCode: '699' }],
    }];
    input.legalMonetaryTotal.payableAmount = 109;

    expect(WITHHOLDING_TAX_TYPE_CODES.has('699')).toBe(true);
    expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('69955')).toBe(true);
    expect(strict.validate(input)).toEqual([]);
  });
});

// ─── 6. 9015 — ESMM benzeri belge ────────────────────────────────────────────

describe('9015 (KDV Tevkifatı) — ESMM benzeri belge üretilir ve doğrulanır', () => {
  /**
   * MimForge ESMM ingest kapısı (`packages/ubl-parse` → `ESMM_VERGI_KODLARI`)
   * `0003` (Gelir Vergisi Stopajı), `0015` (KDV) ve `9015` (KDV Tevkifatı)
   * kodlarını ŞART KOŞAR. 4.1.0 öncesi kütüphane `9015`'i reddediyordu →
   * motor bağlandığında ESMM belgeleri patlardı.
   */
  const ESMM_VERGI_KODLARI = ['0003', '0015', '9015'];

  it('MimForge ESMM kapısının üç kodu da TAX_TYPE_CODES içinde', () => {
    for (const code of ESMM_VERGI_KODLARI) {
      expect(TAX_TYPE_CODES.has(code), `ESMM kodu reddediliyor: ${code}`).toBe(true);
    }
  });

  it('0003 + 0015 + 9015 taşıyan belge strict modda hatasız üretilir', () => {
    // Serbest meslek makbuzu deseni: 1.000 TL brüt, %20 KDV = 200,
    // %20 gelir vergisi stopajı = 200, KDV tevkifatı (5/10) = 100.
    const input = baseInvoice();
    input.taxTotals = [{
      taxAmount: 200,
      taxSubtotals: [
        { taxableAmount: 1000, taxAmount: 200, percent: 20, taxTypeCode: '0015', taxTypeName: 'KDV' },
        { taxableAmount: 1000, taxAmount: 200, percent: 20, taxTypeCode: '0003', taxTypeName: 'Gelir Vergisi Stopajı' },
        { taxableAmount: 200, taxAmount: 100, percent: 50, taxTypeCode: '9015', taxTypeName: 'KDV Tevkifatı' },
      ],
    }];
    input.legalMonetaryTotal = {
      lineExtensionAmount: 1000,
      taxExclusiveAmount: 1000,
      taxInclusiveAmount: 1200,
      payableAmount: 900,
    };
    input.lines = [{
      id: '1',
      invoicedQuantity: 1,
      unitCode: 'C62',
      lineExtensionAmount: 1000,
      taxTotal: {
        taxAmount: 200,
        taxSubtotals: [
          { taxableAmount: 1000, taxAmount: 200, percent: 20, taxTypeCode: '0015', taxTypeName: 'KDV' },
        ],
      },
      item: { name: 'Serbest Meslek Hizmeti' },
      price: { priceAmount: 1000 },
    }];

    expect(strict.validate(input)).toEqual([]);
    const xml = strict.build(input);
    expect(xml).toContain('<cbc:TaxTypeCode>9015</cbc:TaxTypeCode>');
    expect(xml).toContain('<cbc:TaxTypeCode>0003</cbc:TaxTypeCode>');
  });

  it('4.1.0 ÖNCESİ regresyon çıpası: 9015 tanımsız olsaydı belge REDDEDİLİRDİ', () => {
    // Kodu configManager'dan çıkararak eski davranışı canlandır — testin
    // gerçekten 9015 whitelist'ini denetlediğini kanıtlar.
    configManager.updateTaxes(TAX_DEFINITIONS.filter(t => t.code !== '9015'));
    const input = baseInvoice();
    input.taxTotals[0].taxSubtotals.push({
      taxableAmount: 20, taxAmount: 10, percent: 50, taxTypeCode: '9015', taxTypeName: 'KDV Tevkifatı',
    });
    const errors = strict.validate(input);
    expect(errors.some(e => e.actual === '9015')).toBe(true);
  });
});
