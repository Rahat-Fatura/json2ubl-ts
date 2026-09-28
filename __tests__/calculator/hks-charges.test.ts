/**
 * HKS KOMİSYONCU MASRAF BLOĞU — belge düzeyi `cac:AllowanceCharge` + TERS İŞARET.
 *
 * ## 🔴 Bu testler neden BU dikeyin tek gerçek otomatik kapısı
 *
 * Şematron bu eksen hakkında HİÇBİR ŞEY söylemiyor: üç paket sürümünde
 * `AllowanceCharge` ve `ChargeTotalAmount` için SIFIR kural ölçüldü. Zincir
 * yanlış kurulursa belge GİB'e gider, kabul edilir ve hata ancak mal sahibine
 * yanlış tutar ödendiğinde görünür. Yani "yeşil şematron" burada doğruluk
 * kanıtı DEĞİLDİR — beklenen sayılar GİB'in kendi örneğinden çivilenir.
 *
 * ## Çivilenen referans — GİB `HKS-Ornek2.xml` (ölçüldü)
 *
 *   19 belge düzeyi blok, 19'u da `ChargeIndicator=false` · Σ Amount = 220,00
 *   LineExtension 1.000.000,00 · TaxExclusive 1.000.000,00 (ÖZDEŞ)
 *   TaxInclusive  1.080.000,00 · AllowanceTotal 0,00 · ChargeTotal 220,00
 *   Payable       1.079.780,00 = TaxInclusive − ChargeTotal   ✔
 *                 1.080.220,00 = TaxInclusive + ChargeTotal   ✘
 */

import { describe, it, expect } from 'vitest';
import { SimpleInvoiceBuilder, InvoiceSession, UblBuildError } from '../../src';
import { calculateDocument } from '../../src/calculator/document-calculator';
import {
  HKS_CHARGE_CODES,
  HKS_CHARGE_LABELS,
  HKS_CHARGE_VAT_TWIN,
  HKS_CHARGE_PLANE_FORBIDDEN_TAX_CODES,
  isHksChargePlane,
} from '../../src/ubltr/vocabulary/hks-charge-codes';
import { validateHksCharges } from '../../src/documents/invoice/validators/hks-charge-validator';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

const SENDER = {
  taxNumber: '1234567890',
  name: 'Matrix Komisyoncu Hal',
  taxOffice: 'Beşiktaş',
  address: 'Levent Mah. No:42',
  district: 'Beşiktaş',
  city: 'İstanbul',
};

const CUSTOMER = {
  taxNumber: '9876543210',
  name: 'Matrix Test Alıcı Ltd.',
  taxOffice: 'Kadıköy',
  address: 'Bağdat Cad. No:100',
  district: 'Kadıköy',
  city: 'İstanbul',
};

/** Künye 19 hane olmak ZORUNDA (şematron `HKSInvioceCheck`). */
const KUNYENO = 'KUN-2026-MTXTS-BIB1';

function hksKomisyoncu(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    id: 'MTX2026000000999',
    uuid: 'a1000999-0001-4000-8001-000000000999',
    datetime: '2026-04-24T10:00:00',
    profile: 'HKS',
    type: 'KOMISYONCU',
    currencyCode: 'TRY',
    sender: { ...SENDER },
    customer: { ...CUSTOMER },
    lines: [{
      name: 'Biber — Komisyon satış',
      quantity: 200,
      price: 15,
      unitCode: 'KGM',
      kdvPercent: 10,
      additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: KUNYENO }],
    }],
    ...overrides,
  };
}

describe('HKS masraf sözlüğü — 18 kodluk KAPALI küme', () => {
  it('tam olarak 18 kod taşır ve hepsi tekildir', () => {
    expect(HKS_CHARGE_CODES).toHaveLength(18);
    expect(new Set(HKS_CHARGE_CODES).size).toBe(18);
  });

  it('GİB `general.xslt` dal sırasını birebir korur', () => {
    expect([...HKS_CHARGE_CODES]).toEqual([
      'HKSKOMISYON', 'HKSKOMISYONKDV',
      'HKSNAVLUN', 'HKSNAVLUNKDV',
      'HKSHAMMALIYE', 'HKSHAMMALIYEKDV',
      'HKSNAKLIYE', 'HKSNAKLIYEKDV',
      'HKSGVTEVKIFAT', 'HKSBAGKURTEVKIFAT',
      'HKSRUSUM', 'HKSRUSUMKDV',
      'HKSTICBORSASI', 'HKSTICBORSASIKDV',
      'HKSMILLISAVUNMAFON', 'HKSMSFONKDV',
      'HKSDIGERMASRAFLAR', 'HKSDIGERKDV',
    ]);
  });

  it('"Masraflar:" başlığını taşıyan HKSKOMISYON LİSTENİN BAŞINDA durur', () => {
    // GİB'in XSLT'sinde başlık `HKSKOMISYON` dalına gömülüdür (general.xslt:1329-1336):
    // komisyon kalemi yoksa masraf tablosunun başlığı HİÇ çıkmaz.
    expect(HKS_CHARGE_CODES[0]).toBe('HKSKOMISYON');
  });

  it('🔴 KDV ikizleri TÜRETİLEMEZ — `reason + "KDV"` üç kodda birden çöker', () => {
    // Kuralın çökmesi ÖLÇÜLÜR: türetilen ad kümede YOK, gerçek ikiz kümede VAR.
    expect(HKS_CHARGE_CODES).not.toContain('HKSMILLISAVUNMAFONKDV');
    expect(HKS_CHARGE_VAT_TWIN.HKSMILLISAVUNMAFON).toBe('HKSMSFONKDV');

    expect(HKS_CHARGE_CODES).not.toContain('HKSDIGERMASRAFLARKDV');
    expect(HKS_CHARGE_VAT_TWIN.HKSDIGERMASRAFLAR).toBe('HKSDIGERKDV');

    // İki tevkifatın KDV ikizi HİÇ yoktur — kesintidir, masraf değil.
    expect(HKS_CHARGE_VAT_TWIN.HKSGVTEVKIFAT).toBeUndefined();
    expect(HKS_CHARGE_VAT_TWIN.HKSBAGKURTEVKIFAT).toBeUndefined();
  });

  it('10 ana kalem + 8 KDV ikizi = 18', () => {
    const vatCodes = HKS_CHARGE_CODES.filter(c => Object.values(HKS_CHARGE_VAT_TWIN).includes(c));
    expect(vatCodes).toHaveLength(8);
    expect(HKS_CHARGE_CODES.length - vatCodes.length).toBe(10);
  });

  it('her kodun GİB etiketi vardır', () => {
    for (const code of HKS_CHARGE_CODES) {
      expect(HKS_CHARGE_LABELS[code]).toBeTruthy();
    }
  });
});

describe('Masraf düzlemi kapısı — `isHksChargePlane`', () => {
  it('YALNIZ GİB XSLT kapısındaki iki çift açıktır', () => {
    expect(isHksChargePlane('HKS', 'KOMISYONCU')).toBe(true);
    expect(isHksChargePlane('EARSIVFATURA', 'HKSKOMISYONCU')).toBe(true);
  });

  it('HKS+SATIS masraf düzlemi DEĞİLDİR', () => {
    // GİB'in `HKS-Ornek1.xml`inde `ChargeTotalAmount` hiç geçmez.
    expect(isHksChargePlane('HKS', 'SATIS')).toBe(false);
    expect(isHksChargePlane('EARSIVFATURA', 'HKSSATIS')).toBe(false);
  });

  it('başka profiller kapalıdır', () => {
    expect(isHksChargePlane('TEMELFATURA', 'SATIS')).toBe(false);
    expect(isHksChargePlane('TICARIFATURA', 'KOMISYONCU')).toBe(false);
    expect(isHksChargePlane('', '')).toBe(false);
  });

  it('profilsiz `HKSKOMISYONCU` emniyet ağıyla kapsanır', () => {
    expect(isHksChargePlane('', 'HKSKOMISYONCU')).toBe(true);
  });
});

describe('🔴 TERS İŞARET — HKS masraf toplamı ÖDENECEKTEN DÜŞÜLÜR', () => {
  const charges = [
    { reason: 'HKSKOMISYON', chargeIndicator: false, percent: 8 },       // 3000 × %8 = 240,00
    { reason: 'HKSNAVLUN', chargeIndicator: false, amount: 150 },
    { reason: 'HKSTICBORSASI', chargeIndicator: false, percent: 0.15 },  // 3000 × %0,15 = 4,50
  ];

  it('zincir GİB örneğinin aritmetiğini izler', () => {
    const calc = calculateDocument(hksKomisyoncu({ documentAllowanceCharges: charges }));

    expect(calc.monetary.lineExtensionAmount).toBeCloseTo(3000, 2);
    // Masraflar KDV matrahına GİRMEZ → TaxExclusive ≡ LineExtension
    expect(calc.monetary.taxExclusiveAmount).toBeCloseTo(3000, 2);
    expect(calc.monetary.taxInclusiveAmount).toBeCloseTo(3300, 2);
    // `ChargeIndicator=false` olmasına RAĞMEN iskonto toplamına girmez
    expect(calc.monetary.allowanceTotalAmount).toBeCloseTo(0, 2);
    expect(calc.monetary.chargeTotalAmount).toBeCloseTo(394.5, 2);
    // DÜŞÜLÜR: 3300 − 394,50 = 2905,50 · eklenseydi 3694,50 olurdu
    expect(calc.monetary.payableAmount).toBeCloseTo(2905.5, 2);
    expect(calc.monetary.payableAmount).not.toBeCloseTo(3694.5, 2);
  });

  it('`ChargeTotalAmount` kalemlerin GÖSTERİLEN tutarlarının toplamına EŞİTTİR', () => {
    // Orandan türetilen tutarlar 2 haneye yuvarlanır; aksi hâlde GİB'in
    // görüntüsündeki "Toplam Masraflar" satırı kalemleri tutmazdı.
    const calc = calculateDocument(hksKomisyoncu({ documentAllowanceCharges: charges }));
    const sum = calc.documentAllowanceCharges.reduce((a, c) => a + c.amount, 0);
    expect(calc.monetary.chargeTotalAmount).toBeCloseTo(sum, 6);
  });

  it('otorite TUTARdır — oran da verilse `amount` kazanır', () => {
    const calc = calculateDocument(hksKomisyoncu({
      documentAllowanceCharges: [
        { reason: 'HKSKOMISYONKDV', chargeIndicator: false, percent: 20, amount: 48 },
      ],
    }));
    expect(calc.documentAllowanceCharges[0].amount).toBe(48);
    expect(calc.monetary.chargeTotalAmount).toBeCloseTo(48, 2);
  });

  it('`MultiplierFactorNumeric` masraf düzleminde YÜZDEdir (K2)', () => {
    // GİB'in XSLT'si değeri yüzde sanıp yanına `%` basar (general.xslt:1353-1356).
    const calc = calculateDocument(hksKomisyoncu({
      documentAllowanceCharges: [{ reason: 'HKSKOMISYON', chargeIndicator: false, percent: 5 }],
    }));
    expect(calc.documentAllowanceCharges[0].multiplierFactorNumeric).toBe(5);
  });

  it('XML: 18 kalem sırasıyla yazılır ve toplam satırı ters işareti gösterir', () => {
    const allEighteen = HKS_CHARGE_CODES.map(code => ({
      reason: code, chargeIndicator: false, amount: 10,
    }));
    const { xml } = new SimpleInvoiceBuilder({ validationLevel: 'strict' })
      .build(hksKomisyoncu({ documentAllowanceCharges: allEighteen }));

    const reasons = [...xml.matchAll(/<cbc:AllowanceChargeReason>([^<]+)<\/cbc:AllowanceChargeReason>/g)]
      .map(m => m[1]);
    expect(reasons).toEqual([...HKS_CHARGE_CODES]);

    expect(xml).toContain('<cbc:ChargeTotalAmount currencyID="TRY">180.00</cbc:ChargeTotalAmount>');
    // 3300 − 180 = 3120
    expect(xml).toContain('<cbc:PayableAmount currencyID="TRY">3120.00</cbc:PayableAmount>');
    expect(xml).toContain('<cbc:TaxExclusiveAmount currencyID="TRY">3000.00</cbc:TaxExclusiveAmount>');
    expect(xml).toContain('<cbc:AllowanceTotalAmount currencyID="TRY">0.00</cbc:AllowanceTotalAmount>');
  });

  it('`BaseAmount` yalnız AÇIKÇA verildiğinde yazılır', () => {
    const builder = new SimpleInvoiceBuilder({ validationLevel: 'strict' });
    const withoutBase = builder.build(hksKomisyoncu({
      documentAllowanceCharges: [{ reason: 'HKSKOMISYON', chargeIndicator: false, percent: 8 }],
    })).xml;
    expect(withoutBase).not.toContain('<cbc:BaseAmount');

    const withBase = builder.build(hksKomisyoncu({
      documentAllowanceCharges: [
        { reason: 'HKSKOMISYON', chargeIndicator: false, percent: 8, baseAmount: 3000 },
      ],
    })).xml;
    expect(withBase).toContain('<cbc:BaseAmount currencyID="TRY">3000.00</cbc:BaseAmount>');
  });
});

describe('🔴 5.1.0 — genel belge düzeyi iskonto/artırım KALDIRILDI', () => {
  function temelFatura(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
    return {
      id: 'MTX2026000000998',
      uuid: 'a1000998-0001-4000-8001-000000000998',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
      sender: { ...SENDER, name: 'Matrix Test Satıcı A.Ş.' },
      customer: { ...CUSTOMER },
      lines: [{ name: 'Ürün', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20 }],
      ...overrides,
    };
  }

  const DISCOUNT = [{ reason: 'Toptan indirim', chargeIndicator: false, percent: 10 }];
  const SURCHARGE = [{ reason: 'Kurulum bedeli', chargeIndicator: true, amount: 10 }];

  it('5.0.0 KDV hatası ÜRETİLEMEZ: 100 TL + %20 + %10 belge iskontosu XML\'e gitmez (her seviyede)', () => {
    // 5.0.0 bu girdiden matrah 90,00 ama KDV 20,00 yazıyordu (doğrusu 18,00).
    for (const validationLevel of ['strict', 'basic', 'none'] as const) {
      const builder = new SimpleInvoiceBuilder({ validationLevel });
      let caught: unknown;
      try {
        builder.build(temelFatura({ documentAllowanceCharges: DISCOUNT }));
      } catch (err) {
        caught = err;
      }
      expect(caught, validationLevel).toBeInstanceOf(UblBuildError);
      const errors = (caught as UblBuildError).errors;
      expect(errors, validationLevel).toHaveLength(1);
      expect(errors[0].code).toBe('DOCUMENT_ALLOWANCE_CHARGE_UNSUPPORTED');
      expect(errors[0].path).toBe('documentAllowanceCharges[0]');
      expect(errors[0].message).toContain('Belge düzeyi iskonto/artırım desteklenmiyor; iskontoyu satırlara dağıtın');
    }
    // `buildUnsafe` da aynı kapıya takılır — kapı XML üretimindedir.
    expect(() => new SimpleInvoiceBuilder().buildUnsafe(temelFatura({ documentAllowanceCharges: DISCOUNT })))
      .toThrow(UblBuildError);
  });

  it('belge ARTIRIMI da reddedilir', () => {
    expect(() => new SimpleInvoiceBuilder({ validationLevel: 'strict' })
      .build(temelFatura({ documentAllowanceCharges: SURCHARGE })))
      .toThrow(/Belge düzeyi iskonto\/artırım desteklenmiyor/);
  });

  it('hesap motoru genel düzlem kalemlerini HESABA KATMAZ (matrah ve KDV kaymaz)', () => {
    const calc = calculateDocument(temelFatura({ documentAllowanceCharges: [...DISCOUNT, ...SURCHARGE] }));
    expect(calc.documentAllowanceCharges).toEqual([]);
    expect(calc.monetary.chargeTotalAmount).toBeUndefined();
    expect(calc.monetary.lineExtensionAmount).toBeCloseTo(100, 2);
    expect(calc.monetary.taxExclusiveAmount).toBeCloseTo(100, 2);
    expect(calc.monetary.taxInclusiveAmount).toBeCloseTo(120, 2);
    expect(calc.monetary.allowanceTotalAmount).toBeCloseTo(0, 2);
    expect(calc.monetary.payableAmount).toBeCloseTo(120, 2);
    expect(calc.taxes.taxTotal).toBeCloseTo(20, 2);
  });

  it('doğru yol SATIR iskontosudur: %10 satır iskontosu → matrah 90, KDV 18, ödenecek 108', () => {
    const { xml, calculation } = new SimpleInvoiceBuilder({ validationLevel: 'strict', returnCalculation: true })
      .build(temelFatura({
        lines: [{ name: 'Ürün', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20, allowancePercent: 10 }],
      }));
    expect(calculation!.monetary.taxExclusiveAmount).toBeCloseTo(90, 2);
    expect(calculation!.taxes.taxTotal).toBeCloseTo(18, 2);
    expect(calculation!.monetary.payableAmount).toBeCloseTo(108, 2);
    expect(xml).toContain('<cbc:TaxableAmount currencyID="TRY">90.00</cbc:TaxableAmount>');
    expect(xml).toContain('<cbc:PayableAmount currencyID="TRY">108.00</cbc:PayableAmount>');
  });

  it('`InvoiceSession.validate()` hatayı TEK KEZ bildirir (doğrulayıcı + XML kapısı çiftlenmez)', () => {
    const session = new InvoiceSession({ initialInput: temelFatura({ documentAllowanceCharges: DISCOUNT }) });
    const hits = session.validate().filter(w => w.code === 'DOCUMENT_ALLOWANCE_CHARGE_UNSUPPORTED');
    expect(hits).toHaveLength(1);
    expect(hits[0].severity).toBe('error');
    expect(hits[0].field).toBe('documentAllowanceCharges[0]');
  });

  it('belge düzeyi kalem YOKSA `ChargeTotalAmount` XML\'e HİÇ yazılmaz', () => {
    const { xml } = new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(temelFatura());
    expect(xml).not.toContain('ChargeTotalAmount');
  });

  it('satır iskontolarının ÖZET bloğu korunur (bilgi amaçlı, vergiye dokunmaz)', () => {
    const { xml, calculation } = new SimpleInvoiceBuilder({ validationLevel: 'strict', returnCalculation: true })
      .build(temelFatura({
        lines: [{ name: 'Ürün', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, allowancePercent: 10 }],
      }));
    expect(calculation!.allowance?.amount).toBeCloseTo(100, 2);
    expect(calculation!.monetary.allowanceTotalAmount).toBeCloseTo(100, 2);
    expect(calculation!.documentAllowanceCharges).toEqual([]);
    const head = xml.slice(0, xml.indexOf('<cac:InvoiceLine>'));
    expect(head.match(/<cac:AllowanceCharge>/g)).toHaveLength(1);
  });
});

describe('Doğrulayıcı — kapalı küme, sabit işaret, kaçak kod', () => {
  it('liste dışı sebep REDDEDİLİR', () => {
    const errors = validateHksCharges(hksKomisyoncu({
      documentAllowanceCharges: [{ reason: 'KANTAR', chargeIndicator: false, amount: 10 }],
    }));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('INVALID_VALUE');
    expect(errors[0].path).toBe('documentAllowanceCharges[0].reason');
  });

  it('sebepsiz kalem REDDEDİLİR', () => {
    const errors = validateHksCharges(hksKomisyoncu({
      documentAllowanceCharges: [{ chargeIndicator: false, amount: 10 }],
    }));
    expect(errors.map(e => e.code)).toContain('MISSING_FIELD');
  });

  it('`chargeIndicator=true` REDDEDİLİR — motor bayrağa bakmadan düşer', () => {
    const errors = validateHksCharges(hksKomisyoncu({
      documentAllowanceCharges: [{ reason: 'HKSKOMISYON', chargeIndicator: true, amount: 10 }],
    }));
    expect(errors.map(e => e.path)).toContain('documentAllowanceCharges[0].chargeIndicator');
  });

  it('negatif tutar REDDEDİLİR — toplamı ters çevirirdi', () => {
    const errors = validateHksCharges(hksKomisyoncu({
      documentAllowanceCharges: [{ reason: 'HKSKOMISYON', chargeIndicator: false, amount: -10 }],
    }));
    expect(errors.map(e => e.path)).toContain('documentAllowanceCharges[0].amount');
  });

  it('18 kodun HEPSİ kabul edilir', () => {
    const errors = validateHksCharges(hksKomisyoncu({
      documentAllowanceCharges: HKS_CHARGE_CODES.map(code => ({
        reason: code, chargeIndicator: false, amount: 1,
      })),
    }));
    expect(errors).toEqual([]);
  });

  it('🔴 KAÇAK KOD: masraf kodu düzlem DIŞINDA reddedilir (HKS+SATIS dahil)', () => {
    for (const [profile, type] of [['HKS', 'SATIS'], ['TEMELFATURA', 'SATIS']] as const) {
      const errors = validateHksCharges(hksKomisyoncu({
        profile, type,
        documentAllowanceCharges: [{ reason: 'HKSKOMISYON', chargeIndicator: false, amount: 10 }],
      }));
      expect(errors, `${profile}+${type}`).toHaveLength(1);
      expect(errors[0].path).toBe('documentAllowanceCharges[0].reason');
    }
  });

  it('🔴 5.1.0: düzlem dışında SERBEST metin sebepli kalem de reddedilir (genel belge iskontosu yok)', () => {
    const errors = validateHksCharges(hksKomisyoncu({
      profile: 'TEMELFATURA', type: 'SATIS',
      documentAllowanceCharges: [{ reason: 'Toptan indirim', chargeIndicator: false, amount: 10 }],
    }));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('DOCUMENT_ALLOWANCE_CHARGE_UNSUPPORTED');
  });
});

describe('🔴 ÇİFT SAYIM YAPISAL OLARAK İMKÂNSIZ (K6 + K7)', () => {
  it('9944 (Hal Rüsumu) masraf düzleminde satır vergisi olarak REDDEDİLİR', () => {
    const input = hksKomisyoncu();
    input.lines[0].taxes = [{ code: '9944', percent: 1 }];
    const errors = validateHksCharges(input);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('lines[0].taxes[0].code');
    expect(errors[0].expected).toContain('HKSRUSUM');
  });

  it('8001 (Borsa Tescil) masraf düzleminde satır vergisi olarak REDDEDİLİR', () => {
    const input = hksKomisyoncu();
    input.lines[0].taxes = [{ code: '8001', percent: 0.15 }];
    const errors = validateHksCharges(input);
    expect(errors).toHaveLength(1);
    expect(errors[0].expected).toContain('HKSTICBORSASI');
  });

  it('kapı, masraf kalemi VERİLMESE BİLE kapalıdır — düzlemin kendisine bağlıdır', () => {
    const input = hksKomisyoncu();          // documentAllowanceCharges YOK
    input.lines[0].taxes = [{ code: '9944', percent: 1 }];
    expect(validateHksCharges(input)).toHaveLength(1);
  });

  it('aynı kodlar BAŞKA profillerde serbesttir', () => {
    const input = hksKomisyoncu({ profile: 'TICARIFATURA', type: 'SATIS' });
    input.lines[0].taxes = [{ code: '9944', percent: 1 }];
    expect(validateHksCharges(input)).toEqual([]);
  });

  it('yasak kümesi iki düzlemli kalemlerin TAMAMINI kapsar', () => {
    expect(Object.keys(HKS_CHARGE_PLANE_FORBIDDEN_TAX_CODES).sort()).toEqual(['8001', '9944']);
  });
});

describe('Kapının atlanabildiği bir yol YOK', () => {
  const bad = hksKomisyoncu({
    documentAllowanceCharges: [{ reason: 'KANTAR', chargeIndicator: false, amount: 10 }],
  });

  it('`SimpleInvoiceBuilder` — basic seviyede de durdurur', () => {
    expect(() => new SimpleInvoiceBuilder({ validationLevel: 'basic' }).build(bad)).toThrow();
  });

  it('`SimpleInvoiceBuilder` — strict seviyede de durdurur', () => {
    expect(() => new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(bad)).toThrow();
  });

  it('`InvoiceSession.validate()` aynı ihlali `severity:error` ile bildirir', () => {
    const session = new InvoiceSession({ initialInput: { ...bad } });
    const hit = session.validate().find(w => w.field === 'documentAllowanceCharges[0].reason');
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe('error');
  });

  it('geçerli masraf bloğu her iki yolda da TEMİZ geçer', () => {
    const good = hksKomisyoncu({
      documentAllowanceCharges: [{ reason: 'HKSKOMISYON', chargeIndicator: false, percent: 8 }],
    });
    expect(() => new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(good)).not.toThrow();
    const session = new InvoiceSession({ initialInput: { ...good } });
    expect(session.validate().filter(w => w.severity === 'error')).toEqual([]);
  });
});
