/**
 * 🔴 9015 (KDV TEVKİFATI) MATRAHI — "satır tutarı" DEĞİL "hesaplanan KDV".
 *
 * S5a'da düzeltilen kusur: `taxes: [{ code: '9015', percent: 50 }]` verildiğinde
 * motor matrahı `lineExtensionAmount` alıyordu. KDV %20'li bir satırda bu
 * **5 KAT** büyük bir tevkifat tutarı üretir ve belge GİB kapısında yanlış
 * tutarla gider (şematron toplam eşitliğini denetlemediği için SESSİZ kalır —
 * bu yüzden kapı burada, kütüphanede olmalıdır).
 *
 * KANIT — GİB'in kendi örneği (`YTB_Tevkıfat_Efatura.xml`):
 *   satır 225,00 · KDV %10 = 22,50 · tevkifat `TaxableAmount` = 22,50 · %90 → 20,25
 * İkinci kanıt: `WithholdingTaxTotalCheck` kod+oran anahtarları (`602 → 9/10`)
 * oranı KDV'nin kesri olarak tanımlar.
 *
 * ⚠️ `withholdingTaxCode` yolu (→ `cac:WithholdingTaxTotal`) matrahı ZATEN
 * KDV'den alıyordu; sapma yalnız `cac:TaxTotal` düzlemindeydi. Bu test iki
 * düzlemin AYNI tutarı verdiğini de çiviler — ayrışırlarsa biri yanlıştır.
 */

import { describe, it, expect } from 'vitest';
import { calculateLine } from '../../src/calculator/line-calculator';
import { TAX_MAP } from '../../src/calculator/tax-config';
import { configManager } from '../../src/calculator/config-manager';
import type { SimpleLineInput } from '../../src/calculator/simple-types';

const sub = (line: ReturnType<typeof calculateLine>, code: string) =>
  line.taxes.taxSubtotals.find(t => t.code === code);

describe('9015 matrahı = hesaplanan KDV', () => {
  it('tanım bayrağı taşır — davranış VERİDEN gelir, koda gömülü değil', () => {
    expect(TAX_MAP.get('9015')?.baseIsCalculatedVat).toBe(true);
    // Diğer hiçbir kod bu bayrağı taşımamalı: 29 kodun matrahı satır tutarıdır.
    const flagged = [...TAX_MAP.values()].filter(t => t.baseIsCalculatedVat).map(t => t.code);
    expect(flagged).toEqual(['9015']);
  });

  it('GİB örneğinin aritmetiği birebir çıkar (225,00 · %10 KDV · %90 tevkifat → 20,25)', () => {
    const line: SimpleLineInput = {
      name: 'Hizmet',
      quantity: 1,
      price: 225,
      kdvPercent: 10,
      taxes: [{ code: '9015', percent: 90 }],
    };
    const calc = calculateLine(line, 0, 'TRY');

    expect(sub(calc, '0015')?.amount).toBeCloseTo(22.5, 6);
    expect(sub(calc, '9015')?.taxable).toBeCloseTo(22.5, 6); // 🔴 225 DEĞİL
    expect(sub(calc, '9015')?.amount).toBeCloseTo(20.25, 6);
  });

  it('düzeltme öncesi hata boyutu ÖLÇÜLÜ kalsın: satır-tutarı matrahı 5 kat şişirirdi', () => {
    const calc = calculateLine(
      { name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 20, taxes: [{ code: '9015', percent: 50 }] },
      0,
      'TRY',
    );
    // Doğru: 1000 × %20 = 200 KDV · %50 → 100
    expect(sub(calc, '9015')?.amount).toBeCloseTo(100, 6);
    // Eski (yanlış) hesap 1000 × %50 = 500 verirdi — tam 5 kat.
    expect(sub(calc, '9015')?.amount).not.toBeCloseTo(500, 6);
  });

  it('`TaxTotal` düzlemi ile `WithholdingTaxTotal` düzlemi AYNI tutarı verir', () => {
    const base = { name: 'Danışmanlık', quantity: 1, price: 4000, kdvPercent: 20 } as const;

    // 9015 düzlemi (e-SMM / e-Arşiv gösterimi)
    const viaTaxTotal = calculateLine({ ...base, taxes: [{ code: '9015', percent: 90 }] }, 0, 'TRY');
    // WithholdingTaxTotal düzlemi (e-Fatura tevkifatı; kod 602 = %90)
    const viaWithholding = calculateLine({ ...base, withholdingTaxCode: '602' }, 0, 'TRY');

    expect(sub(viaTaxTotal, '9015')?.amount).toBeCloseTo(
      viaWithholding.withholdingObject.taxSubtotals[0].amount,
      6,
    );
    expect(sub(viaTaxTotal, '9015')?.taxable).toBeCloseTo(
      viaWithholding.withholdingObject.taxSubtotals[0].taxable,
      6,
    );
  });

  it('SIRA: ertelenen vergi KDV`den SONRA yazılır (0003 → 0015 → 9015)', () => {
    const calc = calculateLine(
      {
        name: 'Serbest meslek',
        quantity: 1,
        price: 10_000,
        kdvPercent: 20,
        taxes: [
          { code: '0003', percent: 20 },
          { code: '9015', percent: 50 },
        ],
      },
      0,
      'TRY',
    );
    expect(calc.taxes.taxSubtotals.map(t => t.code)).toEqual(['0003', '0015', '9015']);
    // Stopaj matrahı DEĞİŞMEZ: brüt tutar (KDV matrahını da etkilemez, baseStat=false).
    expect(sub(calc, '0003')?.taxable).toBeCloseTo(10_000, 6);
    expect(sub(calc, '0015')?.taxable).toBeCloseTo(10_000, 6);
    expect(sub(calc, '9015')?.taxable).toBeCloseTo(2_000, 6);
  });

  it('`taxForCalculate` negatiftir — tevkifat ödenecek tutardan DÜŞER', () => {
    const calc = calculateLine(
      { name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 20, taxes: [{ code: '9015', percent: 50 }] },
      0,
      'TRY',
    );
    expect(sub(calc, '9015')?.taxForCalculate).toBeCloseTo(-100, 6);
    // 1000 + 200 (KDV) − 100 (tevkifat) = 1100
    expect(calc.taxInclusiveForMonetary).toBeCloseTo(1100, 6);
  });

  it('tutarsız tanım (baseIsCalculatedVat + baseStat) REDDEDİLİR — döngü kurulamaz', () => {
    const original = [...configManager.taxes];
    try {
      configManager.updateTaxes([
        ...original.filter(t => t.code !== '9015'),
        { code: '9015', name: 'KDV Tevkifatı', shortName: 'KDV Tevkifatı', baseStat: true, baseCalculate: true, baseIsCalculatedVat: true },
      ]);
      expect(() =>
        calculateLine(
          { name: 'x', quantity: 1, price: 100, kdvPercent: 20, taxes: [{ code: '9015', percent: 50 }] },
          0,
          'TRY',
        ),
      ).toThrow(/baseIsCalculatedVat/);
    } finally {
      configManager.updateTaxes(original);
    }
  });
});
