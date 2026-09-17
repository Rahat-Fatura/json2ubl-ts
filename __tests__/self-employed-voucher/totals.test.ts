/**
 * e-SMM `TaxInclusiveAmount` — KARAR ÇİVİSİ.
 *
 * Bu dosya bir davranışı doğrulamaktan çok bir KARARI görünür tutar.
 *
 * Karar kullanıcıya aittir (2026-09-17): stopaj/tevkifat fatura düzlemindeki
 * gibi uygulanır — `TIA = brüt + hesaplanan KDV`, kesinti yalnız
 * `PayableAmount`tan düşer. Dayanağı kullanıcının üretim şablonunun kendi
 * çıktısıdır (2.000 · KDV 400 · tevkifat 160 → TIA 2.400 · Ödenecek 2.240) ve
 * o çıktı aşağıda ayrı bir vaka olarak çivilidir.
 *
 * Eskiden burada bir `SELF_EMPLOYED_VOUCHER_TAX_INCLUSIVE_CONVENTION` anahtarı
 * vardı; UBL-TR formülünün harfi harfine okunuşu (`TIA = TaxExclusive +
 * Σ TaxTotal`) üretim çıktısıyla ÇELİŞTİĞİ için o dal koddan kaldırıldı.
 * Formülün ne derdiği yine de ölçülüp kayda geçiriliyor (aşağıdaki
 * `taxExclusiveAmount + taxTotalAmount` beklentileri) — geri dönülürse fark
 * görünsün diye.
 *
 * Fatura düzlemiyle şekil eşitliği AYRI dosyada:
 * `__tests__/self-employed-voucher/invoice-parity.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { selfEmployedVoucherTotals } from '../../src/documents/self-employed-voucher';
import { SimpleSelfEmployedVoucherBuilder } from '../../src/documents/self-employed-voucher';
import { SELF_EMPLOYED_VOUCHER_SCENARIOS } from './scenarios';

/** Plandaki kanonik örnek: 10.000 brüt · %20 stopaj · %20 KDV · %50 tevkifat. */
const CANONICAL = {
  grossFee: 10_000,
  incomeTaxWithholding: 2_000,
  calculatedVat: 2_000,
  vatWithholding: 1_000,
  allowanceTotal: 0,
};

describe('e-SMM toplam zinciri', () => {
  it('zincir baştan sona çözülür (brüt → stopaj → net → KDV → tevkifat → tahsilat)', () => {
    const t = selfEmployedVoucherTotals(CANONICAL);
    expect(t.lineExtensionAmount).toBe(10_000); // Brüt ücret
    expect(t.netFee).toBe(8_000); //              Net ücret (UBL karşılığı YOK)
    expect(t.payableAmount).toBe(9_000); //       Tahsil edilen
  });

  it('SADECE STOPAJLI belgede TIA = 12.000 — UBL-TR formülü 14.000 derdi', () => {
    /* Kanonik çelişki örneği: 10.000 brüt · %20 stopaj · %20 KDV.
     * Formül (`TIA = TaxExclusive + Σ TaxTotal.TaxAmount`) stopajı da "vergi
     * dahil tutara" ekler → 14.000. Bizim okumamız 12.000. */
    const t = selfEmployedVoucherTotals({ ...CANONICAL, vatWithholding: 0 });
    expect(t.taxInclusiveAmount).toBe(12_000);
    expect(t.taxExclusiveAmount + t.taxTotalAmount).toBe(14_000);
    expect(t.payableAmount).toBe(10_000); // 10.000 − 2.000 + 2.000
  });

  it('STOPAJ + KDV TEVKİFATLI belgede fark BÜYÜR — 12.000 ↔ 15.000', () => {
    // 9015 de TaxTotal düzleminde olduğu için formül onu da TIA'ya ekler.
    const t = selfEmployedVoucherTotals(CANONICAL);
    expect(t.taxInclusiveAmount).toBe(12_000);
    expect(t.taxExclusiveAmount + t.taxTotalAmount).toBe(15_000);
  });

  it('`TaxTotal/TaxAmount` konvansiyon DIŞIDIR — alt toplamların toplamıdır', () => {
    // Bu UBL'in yapısal kuralıdır, bir tercih değil: 2000 + 2000 + 1000.
    expect(selfEmployedVoucherTotals(CANONICAL).taxTotalAmount).toBe(5_000);
  });

  it('stopajsız belgede iki okuma ÇAKIŞIR — 12/12 prod belgenin dalı bu', () => {
    /* 12/12 prod belge stopajsız ve tevkifatsız; orada `brüt + KDV` ile
     * `TaxExclusive + Σ TaxTotal` AYNI sayıdır. Sorunun uzun süre kanıtsız
     * kalmasının sebebi tam olarak budur — ölçülen veri iki okumayı AYIRT
     * ETMİYORDU; ayırt eden kanıt kullanıcının üretim çıktısından geldi. */
    const t = selfEmployedVoucherTotals({
      grossFee: 10_000,
      incomeTaxWithholding: 0,
      calculatedVat: 2_000,
      vatWithholding: 0,
      allowanceTotal: 0,
    });
    expect(t.taxInclusiveAmount).toBe(12_000);
    expect(t.taxExclusiveAmount + t.taxTotalAmount).toBe(12_000);
    expect(t.payableAmount).toBe(12_000);
  });

  it('karar ÜRETİLEN BELGEYE kadar gider (golden senaryosu üzerinden)', () => {
    const scenario = SELF_EMPLOYED_VOUCHER_SCENARIOS.find(
      s => s.slug === 'c-stopajli-kdv-tevkifatli',
    )!;
    const { xml } = new SimpleSelfEmployedVoucherBuilder({
      prettyPrint: true,
      validationLevel: 'strict',
    }).build(scenario.input);

    expect(xml).toContain('<cbc:TaxInclusiveAmount currencyID="TRY">12000.00</cbc:TaxInclusiveAmount>');
    expect(xml).toContain('<cbc:PayableAmount currencyID="TRY">9000.00</cbc:PayableAmount>');
    // 14.000 çıkarsa karar sessizce değişmiş demektir.
    expect(xml).not.toContain('14000.00');
  });
});
