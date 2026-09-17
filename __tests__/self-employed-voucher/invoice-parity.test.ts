/**
 * e-SMM ↔ FATURA ŞEKİL EŞİTLİĞİ — kullanıcı kararının ÇİVİSİ.
 *
 * Karar (2026-09-17): *"stopajı aynı faturadaki ve e-MM'deki gibi
 * uygulayacaksın. tutar onlarda nasıl hesaplanıyorsa o şekilde hesaplanacak."*
 *
 * Bu dosya o kararı bir SÖZ olmaktan çıkarıp ÖLÇÜME bağlar: aynı girdiden
 * fatura hattı ile e-SMM hattının `TaxInclusiveAmount` ve `PayableAmount`
 * ürettiği ŞEKLİ karşılaştırır — yardımcı fonksiyonda değil, ÜRETİLEN XML'de.
 *
 * ── DOĞRU KARŞILAŞTIRMA DÜZLEMİ ───────────────────────────────────────────
 * Faturanın kesintiyi taşıdığı OLAĞAN düzlem `cac:WithholdingTaxTotal`tir
 * (`SimpleLineInput.withholdingTaxCode` tam olarak onu üretir). O düzlemde
 * kesinti `TaxInclusiveAmount`ı HİÇ GÖRMEZ; düşüm yalnız `PayableAmount`ta olur:
 *
 *     TIA     = TaxExclusive + hesaplanan KDV
 *     Payable = TIA − kesinti
 *
 * e-SMM bunun BİREBİR aynısını üretir. Tek fark UBL DÜZLEMİDİR: e-SMM'de
 * `cac:WithholdingTaxTotal` YAPISAL OLARAK YOKTUR (girdi tipinde
 * `withholdingTaxTotals` alanı bulunmaz; bkz. `self-employed-voucher/input.ts`
 * — GİB e-SMM'de `9015` kodunu `cac:TaxTotal` altında ister). Yani e-SMM
 * faturanın `WithholdingTaxTotal` SEMANTİĞİNİ, `TaxTotal` DÜZLEMİNDE taşır.
 *
 * ── ÖLÇÜLEN TABLO ─────────────────────────────────────────────────────────
 *
 *   Eksen 1 — KDV tevkifatı · 2.000 brüt · %20 KDV · kesinti 160
 *   ┌──────────────────────────────────────────────┬────────┬──────────┐
 *   │ fatura · `withholdingTaxCode:'601'` (%40)    │  2.400 │    2.240 │
 *   │ e-SMM  · `vatWithholdingPercent: 40`         │  2.400 │    2.240 │ ✅
 *   └──────────────────────────────────────────────┴────────┴──────────┘
 *
 *   Eksen 2 — gelir stopajı · 10.000 brüt · %20 KDV · kesinti 2.000
 *   ┌──────────────────────────────────────────────┬────────┬──────────┐
 *   │ fatura · `withholdingTaxCode:'801'` (%100)   │ 12.000 │   10.000 │
 *   │ e-SMM  · `incomeTaxWithholdingPercent: 20`   │ 12.000 │   10.000 │ ✅
 *   └──────────────────────────────────────────────┴────────┴──────────┘
 *
 * İKİ EKSENDE DE BİREBİR AYNI. `0003` ile `9015` arasındaki tek fark MATRAHTIR
 * (stopaj brüt üzerinden, KDV tevkifatı hesaplanan KDV üzerinden) — konvansiyon
 * farkı DEĞİL. Eksen 2'de faturaya `801` (tam tevkifat, %100) seçilmesinin tek
 * sebebi kesinti tutarını 2.000'e eşitleyip karşılaştırmayı BİREBİR yapmaktır;
 * `withholdingTaxCode` listesi KDV tevkifat kodlarıdır (6xx/8xx) ve matrahı
 * daima hesaplanan KDV'dir, dolayısıyla `0003`ü o düzlemde temsil edemez.
 */

import { describe, it, expect } from 'vitest';
import { SimpleInvoiceBuilder } from '../../src';
import type { SimpleInvoiceInput } from '../../src';
import {
  SimpleSelfEmployedVoucherBuilder,
  calculateSelfEmployedVoucher,
} from '../../src/documents/self-employed-voucher';
import type { SimpleSelfEmployedVoucherInput } from '../../src/documents/self-employed-voucher';
import { calculateDocument } from '../../src/calculator/document-calculator';

/** Kullanıcının üretim şablonunun çıktısı — bu dosyadaki TEK dış dayanak. */
const PRODUCTION_TEMPLATE = {
  lineExtensionAmount: 2_000, // Mal Hizmet Toplam Tutarı
  calculatedVat: 400, //        Hesaplanan KDV %20
  vatWithholding: 160, //       Hesaplanan KDV Tevkifat (%40)
  taxInclusiveAmount: 2_400, // Vergiler Dahil Toplam Tutar  = 2.000 + 400
  payableAmount: 2_240, //      Ödenecek Tutar               = 2.400 − 160
} as const;

const party = (taxNumber: string, name: string) => ({
  taxNumber,
  name,
  taxOffice: 'Kozyatagi',
  address: 'Barbaros Mah. 1. Sk. No:2',
  district: 'Atasehir',
  city: 'Istanbul',
  zipCode: '34746',
});

/** Fatura hattı — kesinti OLAĞAN düzleminde (`cac:WithholdingTaxTotal`). */
const invoiceInput = (price: number, withholdingTaxCode: string): SimpleInvoiceInput => ({
  id: 'PAR2026000000001',
  uuid: 'aaaaaaaa-1111-4222-8333-444444444444',
  datetime: '2026-09-16T14:30:00',
  profile: 'TEMELFATURA',
  type: 'TEVKIFAT',
  currencyCode: 'TRY',
  sender: party('1234567890', 'Ornek Hizmet A.S.'),
  customer: party('9876543210', 'Ornek Danismanlik A.S.'),
  lines: [
    {
      name: 'Danismanlik hizmeti',
      quantity: 1,
      price,
      unitCode: 'Adet',
      kdvPercent: 20,
      withholdingTaxCode,
    },
  ],
});

/** e-SMM hattı — aynı semantik, `cac:TaxTotal` düzleminde. */
const voucherInput = (
  price: number,
  withholding: Pick<
    SimpleSelfEmployedVoucherInput,
    'vatWithholdingPercent' | 'incomeTaxWithholdingPercent'
  >,
): SimpleSelfEmployedVoucherInput => ({
  documentNumber: 'SMM2026000000009',
  uuid: 'bbbbbbbb-1111-4222-8333-444444444444',
  datetime: '2026-09-16T14:30:00',
  supplier: { ...party('11111111110', 'Ayse Yilmaz'), phone: '+90 216 000 00 00' },
  customer: party('9876543210', 'Ornek Danismanlik A.S.'),
  sendMethod: 'ELEKTRONIK',
  ...withholding,
  lines: [{ name: 'Danismanlik hizmeti', quantity: 1, price, kdvPercent: 20 }],
});

/** `<cbc:X currencyID="TRY">N</cbc:X>` → N. Eşitlik XML düzeyinde okunur. */
const amountFromXml = (xml: string, element: string): number => {
  const hit = new RegExp(
    `<cbc:${element} currencyID="[A-Z]{3}">([0-9.]+)</cbc:${element}>`,
  ).exec(xml);
  expect(hit, `${element} XML'de bulunamadı`).not.toBeNull();
  return Number(hit![1]);
};

const invoiceXmlOf = (input: SimpleInvoiceInput): string =>
  new SimpleInvoiceBuilder({ prettyPrint: true, validationLevel: 'strict' }).build(input).xml;

const voucherXmlOf = (input: SimpleSelfEmployedVoucherInput): string =>
  new SimpleSelfEmployedVoucherBuilder({
    prettyPrint: true,
    validationLevel: 'strict',
  }).build(input).xml;

/** Dört parasal alanı iki belgede karşılaştırır — eşitliğin TANIMI budur. */
const expectSameMonetaryShape = (invoiceXml: string, voucherXml: string): void => {
  for (const element of [
    'LineExtensionAmount',
    'TaxExclusiveAmount',
    'TaxInclusiveAmount',
    'PayableAmount',
  ]) {
    expect(amountFromXml(invoiceXml, element), `${element} iki belgede AYRIŞTI`).toBe(
      amountFromXml(voucherXml, element),
    );
  }
};

describe('e-SMM ↔ fatura: TaxInclusiveAmount / PayableAmount şekil eşitliği', () => {
  it('ÜRETİM ÇIKTISI: e-SMM 2.000/400/160 → TIA 2.400 · Ödenecek 2.240', () => {
    /* Kullanıcının üretim şablonunun bastığı sayıların BİREBİR karşılığı.
     * Bu vaka kırılırsa kütüphane artık kullanıcının kendi belgesini üretmiyor
     * demektir — başka hiçbir gerekçe onu meşrulaştırmaz. */
    const { totals } = calculateSelfEmployedVoucher(
      voucherInput(2_000, { vatWithholdingPercent: 40 }),
    );

    expect(totals.lineExtensionAmount).toBe(PRODUCTION_TEMPLATE.lineExtensionAmount);
    expect(totals.taxInclusiveAmount).toBe(PRODUCTION_TEMPLATE.taxInclusiveAmount);
    expect(totals.payableAmount).toBe(PRODUCTION_TEMPLATE.payableAmount);

    // Tevkifat TIA'ya GİRMİYOR, Payable'dan DÜŞÜYOR — kararın iki yarısı.
    expect(totals.taxInclusiveAmount).toBe(2_000 + PRODUCTION_TEMPLATE.calculatedVat);
    expect(totals.taxInclusiveAmount - totals.payableAmount).toBe(
      PRODUCTION_TEMPLATE.vatWithholding,
    );
  });

  it('EKSEN 1 · KDV tevkifatı: fatura `WithholdingTaxTotal` ile BİREBİR aynı', () => {
    /* 2.000 brüt · %20 KDV · kesinti 160.
     * fatura `601` (%40 · matrah hesaplanan KDV) ↔ e-SMM `vatWithholdingPercent: 40`. */
    const invoiceXml = invoiceXmlOf(invoiceInput(2_000, '601'));
    const voucherXml = voucherXmlOf(voucherInput(2_000, { vatWithholdingPercent: 40 }));

    expectSameMonetaryShape(invoiceXml, voucherXml);

    expect(amountFromXml(voucherXml, 'TaxInclusiveAmount')).toBe(2_400);
    expect(amountFromXml(voucherXml, 'PayableAmount')).toBe(2_240);

    // Düzlemler AYRI: fatura WithholdingTaxTotal taşır, e-SMM TAŞIYAMAZ.
    expect(invoiceXml).toContain('WithholdingTaxTotal');
    expect(voucherXml).not.toContain('WithholdingTaxTotal');
  });

  it('EKSEN 2 · gelir stopajı: fatura `WithholdingTaxTotal` ile BİREBİR aynı', () => {
    /* 10.000 brüt · %20 KDV · kesinti 2.000.
     * fatura `801` (tam tevkifat %100 → 2.000 KDV'nin tamamı) ↔ e-SMM
     * `incomeTaxWithholdingPercent: 20` (brütün %20'si = 2.000). Kesinti tutarı
     * KASITLI olarak eşitlendi; amaç aynı kesintide ŞEKLİN aynı çıktığını
     * göstermek. `0003` ile `9015` arasındaki fark MATRAHTIR, konvansiyon değil —
     * `withholdingTaxCode` listesi KDV tevkifat kodlarıdır ve matrahı daima
     * hesaplanan KDV'dir, `0003`ü o düzlemde temsil edemez. */
    const invoiceXml = invoiceXmlOf(invoiceInput(10_000, '801'));
    const voucherXml = voucherXmlOf(voucherInput(10_000, { incomeTaxWithholdingPercent: 20 }));

    expectSameMonetaryShape(invoiceXml, voucherXml);

    // Kesinti TIA'ya GİRMEZ (12.000), yalnız Payable'dan düşer (10.000).
    expect(amountFromXml(voucherXml, 'TaxInclusiveAmount')).toBe(12_000);
    expect(amountFromXml(voucherXml, 'PayableAmount')).toBe(10_000);
    expect(amountFromXml(invoiceXml, 'TaxInclusiveAmount')).toBe(12_000);
    expect(amountFromXml(invoiceXml, 'PayableAmount')).toBe(10_000);
  });

  it('kesinti TIA ile Payable ARASINDAKİ fark olarak görünür — iki eksende de', () => {
    const vatAxis = calculateSelfEmployedVoucher(
      voucherInput(2_000, { vatWithholdingPercent: 40 }),
    ).totals;
    const incomeAxis = calculateSelfEmployedVoucher(
      voucherInput(10_000, { incomeTaxWithholdingPercent: 20 }),
    ).totals;

    expect(vatAxis.taxInclusiveAmount - vatAxis.payableAmount).toBe(160);
    expect(incomeAxis.taxInclusiveAmount - incomeAxis.payableAmount).toBe(2_000);

    // TIA her iki eksende de kesintiden BAĞIMSIZ: TaxExclusive + hesaplanan KDV.
    expect(vatAxis.taxInclusiveAmount).toBe(vatAxis.taxExclusiveAmount + 400);
    expect(incomeAxis.taxInclusiveAmount).toBe(incomeAxis.taxExclusiveAmount + 2_000);
  });

  it('⚠️ TUZAK: faturanın `TaxTotal` dalı BAŞKA sayı verir — ölçüt O DEĞİLDİR', () => {
    /* Faturaya kesinti `taxes:[{code}]` ile verilirse `cac:TaxTotal` düzlemine
     * düşer; motor oradaki `baseStat:false` kodlarını NEGATİF yazdığı için TIA
     * da iner ve `TIA ≡ Payable` olur. Bu, faturanın kesintiyi taşıdığı OLAĞAN
     * yol DEĞİLDİR ve e-SMM ile karşılaştırmanın ölçütü de değildir.
     *
     * Sayı burada, biri bu dala bakıp "e-SMM tutarsız" sanmasın ve e-SMM'i
     * sessizce 2.240'a çekmesin diye ÖLÇÜM olarak sabitleniyor. Ödenecek tutar
     * bu dalda da e-SMM ile AYNIDIR; ayrışan yalnız TIA'dır. */
    const asTaxTotal = calculateDocument({
      ...invoiceInput(2_000, '601'),
      type: 'SATIS',
      lines: [
        {
          name: 'Danismanlik hizmeti',
          quantity: 1,
          price: 2_000,
          unitCode: 'Adet',
          kdvPercent: 20,
          taxes: [{ code: '9015', percent: 40 }],
        },
      ],
    }).monetary;

    expect(asTaxTotal.taxInclusiveAmount).toBe(2_240);
    expect(asTaxTotal.payableAmount).toBe(2_240);

    const voucher = calculateSelfEmployedVoucher(
      voucherInput(2_000, { vatWithholdingPercent: 40 }),
    ).totals;
    expect(asTaxTotal.payableAmount).toBe(voucher.payableAmount); // ORTAK
    expect(asTaxTotal.taxInclusiveAmount).not.toBe(voucher.taxInclusiveAmount); // AYRIŞAN
  });
});
