/**
 * e-SMM ↔ FATURA ŞEKİL EŞİTLİĞİ — kullanıcı kararının ÇİVİSİ.
 *
 * Karar (2026-09-17): *"stopajı aynı faturadaki ve e-MM'deki gibi
 * uygulayacaksın. tutar onlarda nasıl hesaplanıyorsa o şekilde hesaplanacak."*
 *
 * Bu dosya o kararı bir SÖZ olmaktan çıkarıp ÖLÇÜME bağlar: aynı girdiden
 * (brüt · KDV oranı · tevkifat oranı) fatura hattı ile e-SMM hattının
 * `TaxInclusiveAmount` ve `PayableAmount` ürettiği ŞEKLİ karşılaştırır.
 * Karşılaştırma iki hattın da GERÇEK giriş noktalarından geçer — yardımcı
 * fonksiyon değil, üretilen XML.
 *
 * ── ÖLÇÜLEN TABLO (bu dosyanın tamamı buradan çıkar) ───────────────────────
 *
 *   Girdi: 2.000 brüt · %20 KDV · %40 KDV tevkifatı
 *   ┌────────────────────────────────────────────┬────────┬──────────┐
 *   │ Hat                                        │   TIA  │ Ödenecek │
 *   ├────────────────────────────────────────────┼────────┼──────────┤
 *   │ fatura · tevkifat `WithholdingTaxTotal`da  │  2.400 │    2.240 │
 *   │ e-SMM  · tevkifat `TaxTotal[9015]`te       │  2.400 │    2.240 │  ✅ AYNI
 *   │ fatura · tevkifat `TaxTotal[9015]`te       │  2.240 │    2.240 │  ⚠️ TIA ayrı
 *   └────────────────────────────────────────────┴────────┴──────────┘
 *
 * `PayableAmount` ÜÇ okumada da AYNI. Ayrışan tek şey `TaxInclusiveAmount` ve
 * ayrışmanın sebebi tevkifatın hangi UBL düzleminde durduğudur: fatura motoru
 * `cac:TaxTotal` altındaki `baseStat:false` kodlarını (`0003`, `9015`) NEGATİF
 * yazar ve böylece `TIA`yı da düşürür; `cac:WithholdingTaxTotal` düzleminde ise
 * `TIA`ya dokunmaz. e-SMM yapısal olarak `TaxTotal` düzlemindedir (`9015`in
 * `WithholdingTaxTotal`da yazılması YASAK) ama kullanıcının ÜRETİM çıktısı
 * `TIA = 2.400` diyor — yani e-SMM, düzlemi `TaxTotal` olsa bile faturanın
 * `WithholdingTaxTotal` dalıyla aynı şekli üretir. Karar budur.
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

/* ── Ortak girdi: kullanıcının üretim şablonundaki sayılar ─────────────────
 * 2.000 TL hizmet · KDV %20 (= 400) · KDV tevkifatı %40 (= 160).
 * Tevkifat oranı `601` koduyla geliyor çünkü fatura tarafında %40 sabit oranlı
 * TEK kod odur; e-SMM tarafında oran doğrudan yazılır (`9015` matrahı KDV'dir). */
const GROSS = 2_000;
const KDV_PERCENT = 20;
const WITHHOLDING_PERCENT = 40;

/** Kullanıcının üretim şablonunun çıktısı — bu dosyadaki TEK dayanak. */
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

/** Fatura hattı — tevkifat `cac:WithholdingTaxTotal` düzleminde (kod `601`, %40). */
const invoiceInput = (): SimpleInvoiceInput => ({
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
      price: GROSS,
      unitCode: 'Adet',
      kdvPercent: KDV_PERCENT,
      withholdingTaxCode: '601', // Yapım İşleri / Mühendislik-Mimarlık — %40
    },
  ],
});

/** e-SMM hattı — tevkifat `cac:TaxTotal[9015]` düzleminde, oran doğrudan. */
const voucherInput = (): SimpleSelfEmployedVoucherInput => ({
  documentNumber: 'SMM2026000000009',
  uuid: 'bbbbbbbb-1111-4222-8333-444444444444',
  datetime: '2026-09-16T14:30:00',
  supplier: { ...party('11111111110', 'Ayse Yilmaz'), phone: '+90 216 000 00 00' },
  customer: party('9876543210', 'Ornek Danismanlik A.S.'),
  sendMethod: 'ELEKTRONIK',
  vatWithholdingPercent: WITHHOLDING_PERCENT,
  lines: [
    { name: 'Danismanlik hizmeti', quantity: 1, price: GROSS, kdvPercent: KDV_PERCENT },
  ],
});

/** `<cbc:X currencyID="TRY">N</cbc:X>` → N. Eşitlik XML düzeyinde okunur. */
const amountFromXml = (xml: string, element: string): number => {
  const hit = new RegExp(
    `<cbc:${element} currencyID="[A-Z]{3}">([0-9.]+)</cbc:${element}>`,
  ).exec(xml);
  expect(hit, `${element} XML'de bulunamadı`).not.toBeNull();
  return Number(hit![1]);
};

describe('e-SMM ↔ fatura: TaxInclusiveAmount / PayableAmount şekil eşitliği', () => {
  it('ÜRETİM ÇIKTISI: e-SMM 2.000/400/160 → TIA 2.400 · Ödenecek 2.240', () => {
    /* Kullanıcının üretim şablonunun bastığı sayıların BİREBİR karşılığı.
     * Bu vaka kırılırsa kütüphane artık kullanıcının kendi belgesini üretmiyor
     * demektir — başka hiçbir gerekçe onu meşrulaştırmaz. */
    const { totals } = calculateSelfEmployedVoucher(voucherInput());

    expect(totals.lineExtensionAmount).toBe(PRODUCTION_TEMPLATE.lineExtensionAmount);
    expect(totals.taxInclusiveAmount).toBe(PRODUCTION_TEMPLATE.taxInclusiveAmount);
    expect(totals.payableAmount).toBe(PRODUCTION_TEMPLATE.payableAmount);

    // Tevkifat TIA'ya GİRMİYOR, Payable'dan DÜŞÜYOR — kararın iki yarısı.
    expect(totals.taxInclusiveAmount).toBe(GROSS + PRODUCTION_TEMPLATE.calculatedVat);
    expect(totals.taxInclusiveAmount - totals.payableAmount).toBe(
      PRODUCTION_TEMPLATE.vatWithholding,
    );
  });

  it('AYNI GİRDİ · fatura hattı da 2.400 / 2.240 verir — şekil BİREBİR aynı', () => {
    const invoice = calculateDocument(invoiceInput()).monetary;
    const voucher = calculateSelfEmployedVoucher(voucherInput()).totals;

    expect(invoice.taxInclusiveAmount).toBe(voucher.taxInclusiveAmount);
    expect(invoice.payableAmount).toBe(voucher.payableAmount);
    expect(invoice.lineExtensionAmount).toBe(voucher.lineExtensionAmount);
    expect(invoice.taxExclusiveAmount).toBe(voucher.taxExclusiveAmount);

    // Ve ikisi de üretim şablonunun sayılarına oturur.
    expect(invoice.taxInclusiveAmount).toBe(PRODUCTION_TEMPLATE.taxInclusiveAmount);
    expect(invoice.payableAmount).toBe(PRODUCTION_TEMPLATE.payableAmount);
  });

  it('eşitlik ÜRETİLEN XML düzeyinde de tutar — hesap değil, BELGE karşılaştırılır', () => {
    /* Yardımcı fonksiyonların eşit çıkması yetmez: serileştirme yolları ayrı
     * (`invoice/serializer.ts` ↔ `self-employed-voucher/shape.ts`). Eşitlik
     * ancak iki belgenin BASILI tutarları aynıysa vardır. */
    const { xml: invoiceXml } = new SimpleInvoiceBuilder({
      prettyPrint: true,
      validationLevel: 'strict',
    }).build(invoiceInput());

    const { xml: voucherXml } = new SimpleSelfEmployedVoucherBuilder({
      prettyPrint: true,
      validationLevel: 'strict',
    }).build(voucherInput());

    for (const element of ['TaxExclusiveAmount', 'TaxInclusiveAmount', 'PayableAmount']) {
      expect(
        amountFromXml(invoiceXml, element),
        `${element} iki belgede AYRIŞTI`,
      ).toBe(amountFromXml(voucherXml, element));
    }

    expect(amountFromXml(voucherXml, 'TaxInclusiveAmount')).toBe(2_400);
    expect(amountFromXml(voucherXml, 'PayableAmount')).toBe(2_240);
  });

  it('⚠️ AÇIK EKSEN: tevkifat fatura tarafında `TaxTotal`a yazılırsa TIA AYRIŞIR', () => {
    /* Fatura motoru `baseStat:false` kodlarını `TaxTotal` düzleminde NEGATİF
     * yazar; orada tevkifat `TIA`yı da düşürür (2.240) ve `TIA ≡ Payable` olur.
     * e-SMM yapısal olarak bu düzlemdedir ama üretim çıktısı 2.400 diyor —
     * yani e-SMM bu kuralı İZLEMEZ. Fark BİLİNÇLİDİR; bu test onu görünür
     * tutar ki biri "tutarsızlık" sanıp e-SMM'i sessizce 2.240'a çekmesin. */
    const asTaxTotal = calculateDocument({
      ...invoiceInput(),
      type: 'SATIS',
      lines: [
        {
          name: 'Danismanlik hizmeti',
          quantity: 1,
          price: GROSS,
          unitCode: 'Adet',
          kdvPercent: KDV_PERCENT,
          taxes: [{ code: '9015', percent: WITHHOLDING_PERCENT }],
        },
      ],
    }).monetary;

    expect(asTaxTotal.taxInclusiveAmount).toBe(2_240);
    expect(asTaxTotal.payableAmount).toBe(2_240);

    // Ayrışan YALNIZ TIA; ödenecek tutar e-SMM ile yine AYNI.
    const voucher = calculateSelfEmployedVoucher(voucherInput()).totals;
    expect(asTaxTotal.payableAmount).toBe(voucher.payableAmount);
    expect(asTaxTotal.taxInclusiveAmount).not.toBe(voucher.taxInclusiveAmount);
  });

  it('⚠️ AÇIK EKSEN: `0003` gelir stopajında da ayrışan TIA, ORTAK olan Ödenecek', () => {
    /* 10.000 brüt · %20 KDV · %20 gelir stopajı.
     *   fatura : TIA 10.000 ≡ Payable 10.000   (`0003` TaxTotal'a negatif girer)
     *   e-SMM  : TIA 12.000 · Payable 10.000   (stopaj yalnız Payable'dan düşer)
     * Üretim çıktısında STOPAJ SATIRI YOK — kapanan eksen `9015`ti. Bu yüzden
     * `0003` ekseni hâlâ AÇIK ve burada ÖLÇÜM olarak duruyor, iddia olarak değil.
     * Stopajlı bir üretim çıktısı geldiğinde kapanacak tek yer
     * `self-employed-voucher/totals.ts` gövdesidir. */
    const STOPAJ_GROSS = 10_000;

    const invoice = calculateDocument({
      ...invoiceInput(),
      type: 'SATIS',
      lines: [
        {
          name: 'Danismanlik hizmeti',
          quantity: 1,
          price: STOPAJ_GROSS,
          unitCode: 'Adet',
          kdvPercent: KDV_PERCENT,
          taxes: [{ code: '0003', percent: 20 }],
        },
      ],
    }).monetary;

    const voucher = calculateSelfEmployedVoucher({
      ...voucherInput(),
      vatWithholdingPercent: undefined,
      incomeTaxWithholdingPercent: 20,
      lines: [
        { name: 'Danismanlik hizmeti', quantity: 1, price: STOPAJ_GROSS, kdvPercent: KDV_PERCENT },
      ],
    }).totals;

    expect(invoice.taxInclusiveAmount).toBe(10_000);
    expect(voucher.taxInclusiveAmount).toBe(12_000);

    // ORTAK OLAN: ödenecek tutar kesinti düşülerek bulunur — ikisinde de 10.000.
    expect(invoice.payableAmount).toBe(10_000);
    expect(voucher.payableAmount).toBe(10_000);
    expect(invoice.payableAmount).toBe(voucher.payableAmount);
  });
});
