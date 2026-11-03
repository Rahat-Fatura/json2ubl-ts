/**
 * Belge vergi özeti — (vergi kodu, oran, istisna kodu) üçlüsüyle gruplama (5.2.0).
 *
 * 5.1.0'a kadar `buildTaxTotals` KDV alt toplamlarını yalnız (vergi kodu, oran)
 * ikilisiyle grupluyor, istisna kodunu BELGE kodundan yazıyordu. Karışık İHRAÇ
 * KAYITLI belgede (702 + 701) özet "701" diyor, satırlar "702" diyordu; GİB'in
 * 702 kuralı (`TaxExemptionReasonCodeCheck`) özetten tetiklendiği için atlanıyordu.
 *
 * Bu dosya üç şeyi kilitler:
 *   1. Bölünme: istisnalı alt toplam, kalemlerin özete taşıdığı koda göre bölünür.
 *   2. Değişmezlik: matrah/vergi toplamları, `TaxTotal/TaxAmount`, `LegalMonetaryTotal`
 *      ve hesap motoru çıktısı (`calculation`) aynı kalır; yalnız dağılım değişir.
 *      KDV'li alt toplamlar hiç bölünmez.
 *   3. GİB: 301/302/350/2xx, 308/339 (vazgeçilen KDV), 701-704 ve 80x çok kodlu
 *      belgeler bölünmüş özetle CANLI şematrondan geçer.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import { calculateDocument } from '../../src/calculator/document-calculator';
import { mapSimpleToInvoiceInput } from '../../src/calculator/simple-invoice-mapper';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';
import { probeValidator, validateLive } from '../support/validator';
import { formatDecimal } from '../../src/utils/formatters';

const MATRIX = path.join(__dirname, '..', '..', 'examples-matrix', 'valid');
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const fixture = (rel: string): SimpleInvoiceInput =>
  JSON.parse(fs.readFileSync(path.join(MATRIX, rel, 'input.json'), 'utf8'));

/** Şablonun satırlarını verilen kodlarla çoğaltır (`undefined` = kodsuz satır). */
function withLineCodes(
  template: SimpleInvoiceInput,
  codes: Array<string | undefined>,
  docCode?: string | null,
): SimpleInvoiceInput {
  const x = clone(template);
  if (docCode === null) delete x.kdvExemptionCode;
  else if (docCode !== undefined) x.kdvExemptionCode = docCode;
  const base = x.lines[0];
  x.lines = codes.map((code, i) => {
    const l: SimpleLineInput = clone(template.lines[i] ?? base);
    if (code) l.kdvExemptionCode = code; else delete l.kdvExemptionCode;
    return l;
  });
  return x;
}

const IHRAC_DELIVERY = {
  gtipNo: '620342000010',
  alicidibsatirkod: '12345678901',
  deliveryAddress: { address: 'Gümrük', district: 'Ambarlı', city: 'İstanbul', country: 'Türkiye' },
};
function ihracKayitli(codes: Array<string | undefined>, docCode: string | null): SimpleInvoiceInput {
  const x = withLineCodes(fixture('temelfatura/temelfatura-ihrackayitli-baseline'), codes, docCode);
  x.lines.forEach(l => { l.kdvPercent = 0; l.delivery = clone(IHRAC_DELIVERY); });
  return x;
}
function phantomMix(a: string, b: string): SimpleInvoiceInput {
  const x = clone(fixture(a));
  x.lines = [clone(x.lines[0]), clone(fixture(b).lines[0])];
  return x;
}

const docSubtotals = (input: SimpleInvoiceInput) =>
  mapSimpleToInvoiceInput(input).taxTotals[0].taxSubtotals;

// ─── 1. Bölünme ──────────────────────────────────────────────────────────────

describe('istisnalı alt toplam kalem koduna göre bölünür', () => {
  it('İHRAÇ KAYITLI 702 + 701 → iki alt toplam, kalem sırasıyla, kendi adlarıyla', () => {
    const subs = docSubtotals(ihracKayitli(['702', '701'], null));
    expect(subs.map(s => [s.taxExemptionReasonCode, s.percent, s.taxableAmount, s.taxAmount])).toEqual([
      ['702', 0, 1000, 0],
      ['701', 0, 1000, 0],
    ]);
    expect(subs[0].taxExemptionReason).toBe('DİİB ve Geçici Kabul Rejimi Kapsamındaki Satışlar');
    expect(subs[1].taxExemptionReason).not.toBe(subs[0].taxExemptionReason);
  });

  it('kodsuz kalem belge kodunun alt toplamına katılır', () => {
    const subs = docSubtotals(ihracKayitli(['702', undefined, '702'], '701'));
    expect(subs.map(s => [s.taxExemptionReasonCode, s.taxableAmount])).toEqual([
      ['702', 2000],
      ['701', 1000],
    ]);
  });

  it('bütün kalemler aynı başka kodu seçmişse tek alt toplam o kodu taşır (eskiden belge kodu)', () => {
    const subs = docSubtotals(ihracKayitli(['702', '702'], null));
    expect(subs.map(s => s.taxExemptionReasonCode)).toEqual(['702']);
    const istisna = docSubtotals(withLineCodes(fixture('temelfatura/temelfatura-istisna-istisna-coklu-satir'), ['301', '301']));
    expect(istisna.map(s => s.taxExemptionReasonCode)).toEqual(['301']);
    expect(istisna[0].taxExemptionReason).toContain('İhracat');
  });

  it('vazgeçilen KDV (YTB İSTİSNA): 308 + 339 iki alt toplam, ikisi de CalculationSequenceNumeric=-1', () => {
    const subs = docSubtotals(phantomMix(
      'yatirimtesvik/yatirimtesvik-istisna-phantom-308-makine',
      'yatirimtesvik/yatirimtesvik-istisna-phantom-339-insaat',
    ));
    expect(subs.map(s => [s.taxExemptionReasonCode, s.calculationSequenceNumeric])).toEqual([
      ['308', -1],
      ['339', -1],
    ]);
  });

  it('ÖZEL MATRAH ek alt toplamı satırlardan gelmez, belge koduyla kalır; satır alt toplamı bölünür', () => {
    const subs = docSubtotals(withLineCodes(fixture('temelfatura/temelfatura-ozelmatrah-baseline'), [undefined, '802']));
    expect(subs.map(s => [s.taxExemptionReasonCode, s.percent, s.taxableAmount])).toEqual([
      ['801', 18, 500],
      ['801', 0, 1000],
      ['802', 0, 1000],
    ]);
  });
});

// ─── 2. Değişmezlik ─────────────────────────────────────────────────────────

describe('toplamlar değişmez, yalnız dağılım değişir', () => {
  const mixed = ihracKayitli(['702', '701', undefined, '703'], '701');

  it('parçaların matrah/vergi toplamı hesap motorunun alt toplamına eşit (XML değeri kuruşu kuruşuna)', () => {
    const calc = calculateDocument(mixed);
    const subs = docSubtotals(mixed);
    expect(calc.taxes.taxSubtotals).toHaveLength(1);           // hesap motoru (kod, oran) ikilisinde kalır
    const cents = (v: number) => Math.round(parseFloat(formatDecimal(v)) * 100);
    expect(subs.reduce((a, s) => a + cents(s.taxableAmount), 0)).toBe(cents(calc.taxes.taxSubtotals[0].taxable));
    expect(subs.reduce((a, s) => a + cents(s.taxAmount), 0)).toBe(cents(calc.taxes.taxSubtotals[0].amount));
  });

  it('belge TaxTotal/TaxAmount ve LegalMonetaryTotal hesap motorundan okunur', () => {
    const calc = calculateDocument(mixed);
    const mapped = mapSimpleToInvoiceInput(mixed, calc);
    expect(mapped.taxTotals).toHaveLength(1);
    expect(mapped.taxTotals[0].taxAmount).toBe(calc.taxes.taxTotal);
    expect(mapped.legalMonetaryTotal.taxExclusiveAmount).toBe(calc.monetary.taxExclusiveAmount);
    expect(mapped.legalMonetaryTotal.payableAmount).toBe(calc.monetary.payableAmount);
  });

  it('satır düzeyi XML değişmez: her satır kendi etkin kodunu taşır', () => {
    const mapped = mapSimpleToInvoiceInput(mixed);
    expect(mapped.lines.map(l => l.taxTotal.taxSubtotals[0].taxExemptionReasonCode)).toEqual(['702', '701', '701', '703']);
  });

  it('KDV\'li alt toplam bölünmez — belge kodu 555, %20 kalemin kendi kodu 151 → özet 555 (eski davranış)', () => {
    const input: SimpleInvoiceInput = clone(fixture('temelfatura/temelfatura-istisna-istisna-coklu-satir'));
    input.type = 'SATIS';
    input.kdvExemptionCode = '555';
    input.lines = [
      { name: 'A', quantity: 1, price: 100, kdvPercent: 20, kdvExemptionCode: '151' },
      { name: 'B', quantity: 1, price: 100, kdvPercent: 20 },
    ];
    const subs = docSubtotals(input);
    expect(subs.map(s => [s.taxExemptionReasonCode, s.percent, s.taxableAmount])).toEqual([['555', 20, 200]]);
  });

  it('belge kodu yokken kodsuz kalem ilk kodlu kalemin alt toplamına katılır (eski geri-dönüş)', () => {
    const input: SimpleInvoiceInput = clone(fixture('temelfatura/temelfatura-istisna-istisna-coklu-satir'));
    input.type = 'SATIS';
    delete input.kdvExemptionCode;
    input.lines = [
      { name: 'A', quantity: 1, price: 100, kdvPercent: 0, kdvExemptionCode: '351' },
      { name: 'B', quantity: 1, price: 100, kdvPercent: 0 },
    ];
    expect(docSubtotals(input).map(s => [s.taxExemptionReasonCode, s.taxableAmount])).toEqual([['351', 200]]);
  });

  it('tek kodlu belge bit bit aynı: matristeki İHRAÇ KAYITLI örneğinin XML\'i diskteki çıktıyla eşleşir', () => {
    const dir = path.join(MATRIX, 'temelfatura', 'temelfatura-ihrackayitli-baseline');
    const xml = new SimpleInvoiceBuilder({ prettyPrint: true, validationLevel: 'strict' })
      .build(JSON.parse(fs.readFileSync(path.join(dir, 'input.json'), 'utf8'))).xml;
    expect(xml).toBe(fs.readFileSync(path.join(dir, 'output.xml'), 'utf8'));
  });
});

// ─── 3. GİB şematronu ───────────────────────────────────────────────────────

const validator = await probeValidator();
const liveIt = it.skipIf(!validator.up);

const istisnaCoklu = fixture('temelfatura/temelfatura-istisna-istisna-coklu-satir');
const LIVE: Array<{ id: string; label: string; input: SimpleInvoiceInput; type: string; valid: boolean; summary: string[] }> = [
  { id: 'V01', label: 'İSTİSNA belge 213, satırlar 301 + 302 + kodsuz', type: 'efatura', valid: true,
    input: withLineCodes(istisnaCoklu, ['301', '302', undefined]), summary: ['301', '302', '213'] },
  { id: 'V02', label: 'İSTİSNA belge kodu yok (350), satırlar 301 + kodsuz', type: 'efatura', valid: true,
    input: withLineCodes(istisnaCoklu, ['301', undefined], null), summary: ['301', '350'] },
  { id: 'V03', label: 'İSTİSNA belge 213, satırlar 201 + 301', type: 'efatura', valid: true,
    input: withLineCodes(istisnaCoklu, ['201', '301']), summary: ['201', '301'] },
  { id: 'V04', label: 'İHRACAT İSTİSNA belge 301, satırlar kodsuz + 302', type: 'efatura', valid: true,
    input: withLineCodes(fixture('ihracat/ihracat-istisna-coklu-satir'), [undefined, '302']), summary: ['301', '302'] },
  { id: 'V05', label: 'KAMU İSTİSNA belge 301, satırlar 301 + 350', type: 'efatura', valid: true,
    input: withLineCodes(fixture('kamu/kamu-istisna-istisna-kod-301'), ['301', '350']), summary: ['301', '350'] },
  { id: 'V06', label: 'e-Arşiv YTBİSTİSNA 308 + 339 (vazgeçilen KDV)', type: 'earchive', valid: true,
    input: phantomMix('earsivfatura/earsivfatura-ytbistisna-phantom-308-makine', 'earsivfatura/earsivfatura-ytbistisna-phantom-339-insaat'),
    summary: ['308', '339'] },
  { id: 'V07', label: 'YATIRIMTESVİK İSTİSNA 308 + 339 (vazgeçilen KDV)', type: 'efatura', valid: true,
    input: phantomMix('yatirimtesvik/yatirimtesvik-istisna-phantom-308-makine', 'yatirimtesvik/yatirimtesvik-istisna-phantom-339-insaat'),
    summary: ['308', '339'] },
  { id: 'V08', label: 'İHRAÇ KAYITLI 701 + 703 (702 yok)', type: 'efatura', valid: true,
    input: ihracKayitli(['701', '703'], null), summary: ['701', '703'] },
  { id: 'V09', label: 'İHRAÇ KAYITLI belge 702, satırlar kodsuz + 703 + 704, hepsi dolu', type: 'efatura', valid: true,
    input: ihracKayitli([undefined, '703', '704'], '702'), summary: ['702', '703', '704'] },
  { id: 'V10', label: 'ÖZEL MATRAH belge 801, satırlar kodsuz + 802', type: 'efatura', valid: true,
    input: withLineCodes(fixture('temelfatura/temelfatura-ozelmatrah-baseline'), [undefined, '802']), summary: ['801', '801', '802'] },
  { id: 'V11', label: 'e-Arşiv İHRAÇ KAYITLI 702 + 701, hepsi dolu', type: 'earchive', valid: true,
    input: (() => { const x = ihracKayitli(['702', '701'], null); x.profile = 'EARSIVFATURA'; return x; })(),
    summary: ['702', '701'] },
  { id: 'V12', label: 'e-Arşiv İHRAÇ KAYITLI 702 + 701, 701 satırında GTİP yok → GİB reddi', type: 'earchive', valid: false,
    input: (() => { const x = ihracKayitli(['702', '701'], null); x.profile = 'EARSIVFATURA'; delete x.lines[1].delivery!.gtipNo; return x; })(),
    summary: ['702', '701'] },
];

describe('çok kodlu belgeler — bölünmüş özet GİB şematronundan geçer', () => {
  describe.each(LIVE)('$id — $label', (c) => {
    it(`özet: ${c.summary.join(' + ')}`, () => {
      expect(docSubtotals(c.input).map(s => s.taxExemptionReasonCode)).toEqual(c.summary);
    });

    liveIt(`şematron: ${c.valid ? 'geçerli' : 'TaxExemptionReasonCodeCheck'}`, async () => {
      const xml = new SimpleInvoiceBuilder({ validationLevel: 'none', prettyPrint: true, includeUblExtensions: true })
        .build(c.input).xml;
      const result = await validateLive(xml, c.type);
      const rules = (result.schematronValidationErrors ?? []).map(e => e.ruleId);
      expect(rules).toEqual(c.valid ? [] : ['TaxExemptionReasonCodeCheck']);
      expect(result.validSchematron).toBe(c.valid);
    }, 30_000);
  });
});

// ─── KÜÇÜK-1: parçalar kuruşa en büyük kalanla dağıtılır ─────────────────────

describe('bölünen parçaların XML toplamı, bölünmemiş alt toplamın XML değerine BİREBİR eşit', () => {
  /** mulberry32 — sabit tohumlu, tekrarlanabilir. */
  function prng(seed: number) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = prng(20261103);
  const pick = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)];
  const price = () => { const d = pick([2, 3, 4]); return Math.round((rnd() * 500 + 0.001) * 10 ** d) / 10 ** d; };
  const qty = () => (rnd() < 0.5 ? 1 + Math.floor(rnd() * 9) : Math.round((rnd() * 7 + 0.1) * 1000) / 1000);

  function randomDoc(i: number): SimpleInvoiceInput {
    const family = i % 3;
    let doc: SimpleInvoiceInput;
    let codes: Array<string | undefined>;
    if (family === 0) {
      codes = [undefined, '701', '702', '703', '704'];
      doc = ihracKayitli(['702'], null);
    } else if (family === 1) {
      codes = [undefined, '301', '302', '350', '201', '213'];
      doc = clone(istisnaCoklu);
    } else {
      doc = phantomMix('yatirimtesvik/yatirimtesvik-istisna-phantom-308-makine', 'yatirimtesvik/yatirimtesvik-istisna-phantom-339-insaat');
      codes = ['308', '339'];
    }
    const templates = clone(doc.lines);
    doc.lines = Array.from({ length: 2 + Math.floor(rnd() * 4) }, (_, k) => {
      const l: SimpleLineInput = clone(templates[k % templates.length]);
      l.price = price();
      l.quantity = qty();
      const c = family === 2 ? (l.itemClassificationCode === '02' ? '339' : '308') : pick(codes);
      if (c) l.kdvExemptionCode = c; else delete l.kdvExemptionCode;
      if (rnd() < 0.2) l.allowancePercent = 1 + Math.floor(rnd() * 30);
      return l;
    });
    return doc;
  }

  const cents = (v: number) => Math.round(parseFloat(formatDecimal(v)) * 100);

  it('600 rastgele belge: (vergi kodu, oran) başına Σ matrah ve Σ vergi kuruşu kuruşuna aynı', () => {
    let split = 0;
    const drift: string[] = [];
    for (let i = 0; i < 600; i++) {
      const doc = randomDoc(i);
      const calc = calculateDocument(doc);
      const subs = mapSimpleToInvoiceInput(doc, calc).taxTotals[0].taxSubtotals;
      if (subs.length > calc.taxes.taxSubtotals.length) split++;
      for (const ts of calc.taxes.taxSubtotals) {
        const parts = subs.filter(s => s.taxTypeCode === ts.code && s.percent === ts.percent);
        const sumTaxable = parts.reduce((a, p) => a + cents(p.taxableAmount), 0);
        const sumTax = parts.reduce((a, p) => a + cents(p.taxAmount), 0);
        if (sumTaxable !== cents(ts.taxable) || sumTax !== cents(ts.amount)) {
          drift.push(`#${i} ${ts.code}/${ts.percent}: ${sumTaxable}≠${cents(ts.taxable)} · ${sumTax}≠${cents(ts.amount)}`);
        }
        // her parça 2 ondalıklı yazılabilir bir değerdir
        for (const p of parts) expect(cents(p.taxableAmount) / 100).toBe(parseFloat(formatDecimal(p.taxableAmount)));
      }
    }
    expect(drift).toEqual([]);
    expect(split).toBeGreaterThan(300);   // örneklem gerçekten bölünen belge içeriyor
  });

  it('elle seçilmiş durum: üç kalem 1,005 TL (702, 701, 702) — parçalar 2,01 + 1,00, toplam 3,01', () => {
    const doc = ihracKayitli(['702', '701', '702'], null);
    doc.lines.forEach(l => { l.price = 1.005; l.quantity = 1; });
    const calc = calculateDocument(doc);
    const subs = mapSimpleToInvoiceInput(doc, calc).taxTotals[0].taxSubtotals;
    expect(subs.map(s => [s.taxExemptionReasonCode, formatDecimal(s.taxableAmount)])).toEqual([
      ['702', '2.01'],
      ['701', '1.00'],
    ]);
    expect(formatDecimal(calc.taxes.taxSubtotals[0].taxable)).toBe('3.01');
  });
});
