/**
 * e-MM TOPLAM ZİNCİRİ — PROD ÖLÇÜMÜNÜN ÇİVİSİ.
 *
 * e-SMM'in aynı adlı test dosyası bir KONVANSİYONU görünür tutuyor: orada
 * `TaxInclusiveAmount` kararının GİB metni YOK ve hangi okumanın doğru olduğunu
 * ayırt eden prod örneği de yok. Burada durum farklı — bu dosya bir kararı
 * değil bir ÖLÇÜMÜ çiviliyor.
 *
 * 27 gerçek prod e-MM belgesinin 25'inde (kalan 2'si belge seviyesi indirim/ek
 * yük taşıyan ayrı bir üreticiye ait) şu dört eşitlik BİRDEN tutuyor:
 *
 *     TaxExclusiveAmount  ==  LineExtensionAmount
 *     TaxInclusiveAmount  ==  TaxExclusiveAmount − Σ TaxSubtotal.TaxAmount
 *     PayableAmount       ==  TaxInclusiveAmount
 *     TaxTotal.TaxAmount  ==  Σ TaxSubtotal.TaxAmount
 *
 * 🔴 UBL-TR'nin genel formülü (`TIA = TEA + Σ TaxTotal.TaxAmount`) e-MM'de
 * HARFİYEN UYGULANMAZ. Bu testler formülün ÇIKARMA yönünde koştuğunu kilitler;
 * biri bir gün "UBL-TR böyle diyor" deyip toplamaya çevirirse belge müstahsile
 * ödenenden fazlasını beyan eder ve test kırmızı olur.
 */

import { describe, it, expect } from 'vitest';
import {
  producerReceiptTotals,
  SimpleProducerReceiptBuilder,
  calculateProducerReceipt,
} from '../../src/documents/producer-receipt';
import { PRODUCER_RECEIPT_SCENARIOS } from './scenarios';

/** Kanonik örnek: 10.000 brüt · %2 stopaj. */
const CANONICAL = {
  grossAmount: 10_000,
  deductionTotal: 200,
  allowanceTotal: 0,
};

describe('e-MM toplam zinciri', () => {
  it('zincir baştan sona çözülür (brüt → kesinti → ödenecek)', () => {
    const t = producerReceiptTotals(CANONICAL);
    expect(t.lineExtensionAmount).toBe(10_000);
    expect(t.taxExclusiveAmount).toBe(10_000);
    expect(t.payableAmount).toBe(9_800);
  });

  it('🔴 TaxInclusiveAmount ÇIKARIR — UBL-TR formülü 10.200 derdi', () => {
    const t = producerReceiptTotals(CANONICAL);
    expect(t.taxInclusiveAmount).toBe(9_800);
    // Formül harfiyen uygulansaydı:
    expect(t.taxExclusiveAmount + t.taxTotalAmount).toBe(10_200);
    // ...ve belge müstahsile ödenenden 400 TL fazlasını beyan ederdi.
    expect(t.taxInclusiveAmount).not.toBe(t.taxExclusiveAmount + t.taxTotalAmount);
  });

  it('TaxInclusiveAmount ile PayableAmount AYNI sayıdır (prod`da 25/25)', () => {
    for (const deductionTotal of [0, 200, 1_234.56, 10_000]) {
      const t = producerReceiptTotals({ grossAmount: 10_000, deductionTotal, allowanceTotal: 0 });
      expect(t.taxInclusiveAmount).toBe(t.payableAmount);
    }
  });

  it('kesinti YOKKEN üç tutar da brüte eşittir', () => {
    const t = producerReceiptTotals({ grossAmount: 5_000, deductionTotal: 0, allowanceTotal: 0 });
    expect(t.taxExclusiveAmount).toBe(5_000);
    expect(t.taxInclusiveAmount).toBe(5_000);
    expect(t.payableAmount).toBe(5_000);
  });

  it('`TaxTotal/TaxAmount` alt toplamların toplamıdır (UBL yapısal kuralı)', () => {
    expect(producerReceiptTotals(CANONICAL).taxTotalAmount).toBe(200);
  });

  it('iskonto satır tutarını DÜŞÜRÜR, TaxExclusive ona EŞİT kalır', () => {
    // Belge seviyesi AllowanceCharge üretilmez → TaxExclusive ≡ LineExtension.
    const t = producerReceiptTotals({ grossAmount: 1_080, deductionTotal: 21.6, allowanceTotal: 120 });
    expect(t.lineExtensionAmount).toBe(1_080);
    expect(t.taxExclusiveAmount).toBe(1_080);
    expect(t.allowanceTotalAmount).toBe(120);
    expect(t.payableAmount).toBeCloseTo(1_058.4, 2);
  });
});

describe('e-MM zinciri ÜRETİLEN BELGEYE kadar gider', () => {
  it('düz stopajlı golden: 10.000 brüt · %2 → 9.800 ödenecek', () => {
    const scenario = PRODUCER_RECEIPT_SCENARIOS.find(s => s.slug === 'a-duz-stopaj')!;
    const { xml } = new SimpleProducerReceiptBuilder({
      prettyPrint: true,
      validationLevel: 'strict',
    }).build(scenario.input);

    expect(xml).toContain('<cbc:TaxExclusiveAmount currencyID="TRY">10000.00</cbc:TaxExclusiveAmount>');
    expect(xml).toContain('<cbc:TaxInclusiveAmount currencyID="TRY">9800.00</cbc:TaxInclusiveAmount>');
    expect(xml).toContain('<cbc:PayableAmount currencyID="TRY">9800.00</cbc:PayableAmount>');
    // 10.200 çıkarsa formül sessizce toplamaya dönmüş demektir.
    expect(xml).not.toContain('10200.00');
  });

  it('üç kesintili belgede hepsi TOPLANIP düşülür', () => {
    const scenario = PRODUCER_RECEIPT_SCENARIOS.find(s => s.slug === 'c-ek-kesintili')!;
    const calc = calculateProducerReceipt(scenario.input);

    // 400 × 45 = 18.000 brüt · %2 + %0.2 + %1 = %3.2 → 576 kesinti.
    expect(calc.totals.lineExtensionAmount).toBeCloseTo(18_000, 2);
    expect(calc.totals.taxTotalAmount).toBeCloseTo(576, 2);
    expect(calc.totals.payableAmount).toBeCloseTo(17_424, 2);
  });

  it('kalem oranı belge oranını EZER (çok kalemli dal)', () => {
    const scenario = PRODUCER_RECEIPT_SCENARIOS.find(s => s.slug === 'b-cok-kalemli')!;
    const calc = calculateProducerReceipt(scenario.input);

    // Marul 500×8 = 4.000 @ %2 = 80 · Kivi 250×24,5 = 6.125 @ %4 = 245
    // Karnabahar 120×12 = 1.440 @ %2 = 28,8
    expect(calc.lines[0].deductions[0].percent).toBe(2);
    expect(calc.lines[1].deductions[0].percent).toBe(4);
    expect(calc.lines[2].deductions[0].percent).toBe(2);
    expect(calc.totals.taxTotalAmount).toBeCloseTo(353.8, 2);
  });

  it('sıfır oranlı stopaj SATIRI üretir ama tutarı 0`dır', () => {
    const scenario = PRODUCER_RECEIPT_SCENARIOS.find(s => s.slug === 'd-sifir-oranli-stopaj')!;
    const calc = calculateProducerReceipt(scenario.input);

    expect(calc.lines[0].deductions).toHaveLength(1);
    expect(calc.lines[0].deductions[0].percent).toBe(0);
    expect(calc.lines[0].deductions[0].amount).toBe(0);
    expect(calc.totals.payableAmount).toBe(calc.totals.lineExtensionAmount);
  });

  it('oran HİÇ verilmezse kesinti satırı da YAZILMAZ — 0 ile aynı şey değil', () => {
    const calc = calculateProducerReceipt({
      issuer: PRODUCER_RECEIPT_SCENARIOS[0].input.issuer,
      producer: PRODUCER_RECEIPT_SCENARIOS[0].input.producer,
      lines: [{ name: 'Elma', quantity: 10, price: 5 }],
    });
    expect(calc.lines[0].deductions).toEqual([]);
    expect(calc.totals.taxTotalAmount).toBe(0);
  });
});
