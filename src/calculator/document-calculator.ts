/**
 * Belge seviyesi hesaplama motoru.
 *
 * calculate-service/invoice.calculate.mixin.js → invoiceBodyCalculate metodunun
 * TypeScript karşılığı. Satır hesaplamalarını toplar, vergi subtotal'larını gruplar,
 * fatura tipi ve profilini otomatik tespit eder.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SimpleDocumentAllowanceChargeInput, SimpleInvoiceInput } from './simple-types';
import type { CalculatedLine, CalculatedTaxSubtotal, CalculatedWithholdingSubtotal } from './line-calculator';
import { calculateAllLines } from './line-calculator';
import { configManager } from './config-manager';
import { DEFAULT_CURRENCY_CODE } from './currency-config';
import { KDV_TAX_CODE } from './tax-config';
import {
  isPhantomKdvCombination,
  PHANTOM_KDV_CALCULATION_SEQUENCE_NUMERIC,
} from './phantom-kdv-rules';
import { isHksChargePlane } from '../ubltr/vocabulary/hks-charge-codes';
import { isNonEmpty } from '../utils/formatters';

// ─── Hesaplama Sonuç Tipleri ────────────────────────────────────────────────────

export interface DocumentMonetary {
  /** Σ line.lineExtensionAmount (indirim SONRASI; UBL-TR LegalMonetaryTotal.LineExtensionAmount kaynağı) */
  lineExtensionAmount: number;
  /**
   * Vergi hariç tutar — 5.1.0'dan beri HER ZAMAN `lineExtensionAmount` ile özdeş.
   *
   * Genel belge düzeyi iskonto/artırım 5.1.0'da kaldırıldı. HKS masraf
   * düzleminde de masraflar KDV matrahına girmez: GİB'in kendi örneğinde
   * `TaxExclusive 1000000.00 = LineExtension`, masraf toplamı 220,00 buna
   * dokunmaz.
   */
  taxExclusiveAmount: number;
  /** Σ line.taxInclusiveForMonetary */
  taxInclusiveAmount: number;
  /**
   * Σ satır iskontosu (`line.allowanceObject.amount`).
   *
   * 🔴 HKS masraf düzleminde 18 masraf kalemi buraya GİRMEZ — `ChargeIndicator`
   * `false` olmasına rağmen tamamı `chargeTotalAmount`a yazılır (bkz.
   * `calculateDocument` 3c). GİB örneğinde bu alan `0.00`dır.
   */
  allowanceTotalAmount: number;
  /**
   * HKS komisyoncu masraf toplamı → `cbc:ChargeTotalAmount`.
   *
   * `undefined` ise eleman XML'e HİÇ yazılmaz — masraf kalemi olmayan
   * belgelerin çıktısı bit-bire aynı kalsın diye.
   */
  chargeTotalAmount?: number;
  /** Σ line.payableAmountForMonetary − HKS masraf kesintileri */
  payableAmount: number;
}

/**
 * HKS komisyoncu masraf kalemi (belge düzeyi `cac:AllowanceCharge`) — tutarı
 * ve çarpanı ÇÖZÜLMÜŞ hâli.
 *
 * Girdideki `percent` XML'e yazılacak `MultiplierFactorNumeric` değeridir
 * (GİB görüntüsü YÜZDE bekler) ve `amount` her durumda doludur. 5.1.0'dan beri
 * yalnız HKS masraf düzleminde üretilir.
 */
export interface CalculatedDocumentAllowanceCharge {
  chargeIndicator: boolean;
  reason?: string;
  multiplierFactorNumeric?: number;
  amount: number;
  baseAmount?: number;
}

export interface DocumentTaxes {
  taxTotal: number;
  taxSubtotals: CalculatedTaxSubtotal[];
}

export interface DocumentWithholding {
  taxTotal: number;
  taxSubtotals: CalculatedWithholdingSubtotal[];
}

export interface DocumentAllowance {
  amount: number;
}

export interface TaxExemptionReason {
  kdv: string | null;
  kdvName: string | null;
}

/** Belge seviyesi hesaplama sonucu */
export interface CalculatedDocument {
  uuid: string;
  currencyCode: string;
  exchangeRate: number | null;
  type: string;
  profile: string;
  monetary: DocumentMonetary;
  allowance: DocumentAllowance | null;
  /**
   * HKS komisyoncu masraf kalemleri — girdi sırasında, çözülmüş tutarlarla.
   * Masraf düzlemi dışında HER ZAMAN boş dizidir (5.1.0).
   *
   * ⚠️ SIRA KORUNUR: GİB'in `general.xslt`'si `for-each` ile BELGE SIRASINI
   * izler, yani XML'deki sıra ekrandaki sıradır.
   */
  documentAllowanceCharges: CalculatedDocumentAllowanceCharge[];
  taxes: DocumentTaxes;
  withholding: DocumentWithholding | null;
  taxExemptionReason: TaxExemptionReason;
  calculatedLines: CalculatedLine[];
}

// ─── Varsayılan İstisna Kodları ─────────────────────────────────────────────────

/**
 * Self-exemption tiplerinde (ISTISNA / IHRACKAYITLI / OZELMATRAH) kullanıcı kod
 * vermediyse kullanılan fallback'ler. Non-self-exemption tipleri (SATIS, TEVKIFAT,
 * IADE vb.) için kütüphane istisna kodu atamaz — manuel input zorunlu
 * (B-NEW-11 / M11). `DEFAULT_EXEMPTIONS.satis = '351'` alanı Sprint 8c.1'de
 * kaldırıldı (TEVKIFAT+351 false-positive çakışmasının kök sebebi).
 */
const DEFAULT_EXEMPTIONS = {
  istisna: '350',
  ihracKayitli: '701',
} as const;

// ─── Belge Hesaplama ────────────────────────────────────────────────────────────

/**
 * Tüm belge seviyesi hesaplamalarını yapar:
 * 1. Satır hesaplamaları (line-calculator)
 * 2a. typesArray ön geçişi (tip tespitinden önce satır tipleri)
 * 2b. Fatura tipi + profil tespiti
 * 2c. M12 phantom KDV post-marking (YATIRIMTESVIK+ISTISNA, EARSIV+YTBISTISNA)
 * 3. Monetary + vergi/tevkifat subtotal toplama (phantom satırların KDV'si dip'e girmez)
 * 4. İstisna kodu eşleştirme
 */
export function calculateDocument(input: SimpleInvoiceInput): CalculatedDocument {
  const currencyCode = input.currencyCode ?? DEFAULT_CURRENCY_CODE;

  // 1. Satır hesaplamaları
  const calculatedLines = calculateAllLines(input.lines, currencyCode);

  // 2a. Ön geçiş — tip tespiti için yalnız typesArray
  const typesArray: string[] = [];
  for (const line of calculatedLines) {
    if (!typesArray.includes(line.type)) typesArray.push(line.type);
  }

  /* 2a-bis. TİP TESPİTİ için doldurulmamış satırları AYIKLA (C2).
   *
   * Portalda "Yeni Satır"a basıldığında adı ve fiyatı boş bir kalem oluşuyor.
   * Tutarı 0 olduğu için satır tipi ISTISNA çıkıyor ve tip tespiti faturayı
   * SATIŞ'tan İSTİSNA'ya çeviriyor, ardından istisna kodunu zorunlu kılıyordu.
   * Kullanıcı yalnızca satır eklemişti; fiyatı yazınca tip geri dönüyordu.
   *
   * Ayıklama BİLEREK dar: satır ancak HEM adı HEM fiyatı boşsa "henüz
   * doldurulmamış" sayılır. Bedelsiz (fiyat 0) ama adı olan kalem gerçek bir
   * satırdır ve tespite girmeye devam eder. Hiç dolu satır yoksa eski davranış
   * korunur — boş faturada tip değişmez.
   *
   * ⚠️ Yalnız TİP TESPİTİNİ etkiler. `typesArray` istisna-kodu çözümünde
   * (`resolveExemptionReason`) olduğu gibi kullanılır. */
  const doluIndeksler = input.lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => {
      const adBos = !l.name || String(l.name).trim() === '';
      const fiyatBos = l.price === undefined || l.price === null || Number(l.price) === 0;
      return !(adBos && fiyatBos);
    })
    .map(({ i }) => i);

  /* 🔴 HİÇ dolu satır yoksa tip tespiti satırlara HİÇ BAKMAZ.
   *
   * İlk düzeltmede bu durumda eski davranışa düşülüyordu ve tam da en sık görülen
   * hâl kırılıyordu: portalda "Yeni Satır"a basınca TEK satır oluşuyor, o da boş
   * olduğu için `doluIndeksler` boş kalıyor, tam liste kullanılıyor ve fatura
   * SATIŞ'tan İSTİSNA'ya dönüyordu. (İki kalemden biri doluyken süzgeç çalıştığı
   * için kusur "yalnız ilk kalemde oluyor" gibi görünüyordu.)
   *
   * Boş dizi verilince `resolveInvoiceType` satır ipuçlarını atlar ve varsayılan
   * SATIŞ'a düşer; kullanıcının açık tip seçimi (B-41) ve belge seviyesi istisna
   * kodu yine öncelikli kalır. */
  const tipTespitTipleri: string[] =
    doluIndeksler.length === 0
      ? []
      : doluIndeksler.length < calculatedLines.length
        ? [...new Set(doluIndeksler.map((i) => calculatedLines[i].type))]
        : typesArray;

  // 2b. Fatura tipi + profil tespiti (phantom kararı için gerekli)
  const calculatedType = resolveInvoiceType(input, tipTespitTipleri);
  const calculatedProfile = resolveProfile(input, calculatedType);

  // 2c. M12 Phantom KDV post-marking — YATIRIMTESVIK+ISTISNA veya EARSIV+YTBISTISNA ise
  // tüm satırların KDV subtotal'ına CalculationSequenceNumeric=-1 işareti vur ve
  // phantomKdv flag'ini set et. Downstream (monetary toplam, mapper) bu flag'i okur.
  const isPhantomKdv = isPhantomKdvCombination(calculatedProfile, calculatedType);
  if (isPhantomKdv) {
    for (const line of calculatedLines) {
      line.phantomKdv = true;
      for (const ts of line.taxes.taxSubtotals) {
        if (ts.code === KDV_TAX_CODE) {
          ts.calculationSequenceNumeric = PHANTOM_KDV_CALCULATION_SEQUENCE_NUMERIC;
        }
      }
    }
  }

  // 3. Monetary toplamlar (phantom satırların KDV'si dip'e girmez)
  let lineExtensionAmount = 0;
  let taxExclusiveAmount = 0;
  let taxInclusiveAmount = 0;
  let allowanceTotalAmount = 0;
  let taxTotalAmount = 0;
  let withholdingTotalAmount = 0;
  let payableAmount = 0;

  const taxSubtotals: CalculatedTaxSubtotal[] = [];
  const withholdingSubtotals: CalculatedWithholdingSubtotal[] = [];

  for (const line of calculatedLines) {
    lineExtensionAmount += line.lineExtensionAmount;
    taxExclusiveAmount += line.lineExtensionAmount;
    allowanceTotalAmount += line.allowanceObject.amount;
    withholdingTotalAmount += line.withholdingObject.taxTotal;

    if (line.phantomKdv) {
      // Phantom: KDV parasal toplamlara girmez. taxInclusive = lineExtension,
      // payable = lineExtension - withholding (tevkifat senaryosu olmaz ama kural gereği düşür).
      taxInclusiveAmount += line.lineExtensionAmount;
      payableAmount += line.lineExtensionAmount - line.withholdingObject.taxTotal;
      // taxTotalAmount ve tax subtotal gruplama bypass edilir — phantom subtotal'lar
      // XML'de satır seviyesinde taşınır, belge toplamı ayrı (mapper §2.1.4 uyarınca
      // calc.taxes.taxSubtotals'ı phantom bilgisiyle kullanır).
    } else {
      taxInclusiveAmount += line.taxInclusiveForMonetary;
      payableAmount += line.payableAmountForMonetary;
      taxTotalAmount += line.taxes.taxTotal;
    }

    // 3a. Vergi subtotal gruplama (aynı code + percent → birleştir).
    // Phantom satırlar da dahil edilir — mapper bunları §2.1.4 stili için kullanır,
    // ama calculationSequenceNumeric=-1 işareti taşırlar.
    for (const tax of line.taxes.taxSubtotals) {
      const existingIndex = taxSubtotals.findIndex(
        t => t.code === tax.code && t.percent === tax.percent,
      );
      if (existingIndex === -1) {
        taxSubtotals.push({
          taxable: tax.taxable,
          amount: tax.amount,
          taxForCalculate: tax.taxForCalculate,
          percent: tax.percent,
          code: tax.code,
          name: tax.name,
          calculationSequenceNumeric: tax.calculationSequenceNumeric,
        });
      } else {
        taxSubtotals[existingIndex].amount += tax.amount;
        taxSubtotals[existingIndex].taxable += tax.taxable;
        taxSubtotals[existingIndex].taxForCalculate += tax.taxForCalculate;
      }
    }

    // 3b. Tevkifat subtotal gruplama
    for (const tax of line.withholdingObject.taxSubtotals) {
      const existingIndex = withholdingSubtotals.findIndex(
        t => t.code === tax.code && t.percent === tax.percent,
      );
      if (existingIndex === -1) {
        withholdingSubtotals.push({
          taxable: tax.taxable,
          amount: tax.amount,
          percent: tax.percent,
          code: tax.code,
          name: tax.name,
        });
      } else {
        withholdingSubtotals[existingIndex].amount += tax.amount;
        withholdingSubtotals[existingIndex].taxable += tax.taxable;
      }
    }
  }

  /* 3c. BELGE DÜZEYİ `cac:AllowanceCharge` — 5.1.0'da YALNIZ HKS masraf düzlemi.
   *
   * Satır iskontosu (`allowanceTotalAmount`) kalemin kendi tutarını küçültür ve
   * `lineExtensionAmount`a zaten yansımıştır; KDV matrahını da doğru küçültür.
   *
   * ── 🔴 Genel belge iskontosu / artırımı KALDIRILDI (5.1.0)
   * 5.0.0'da genel düzlemde belge iskontosu TaxExclusive/TaxInclusive/Payable'ı
   * `delta` kadar kaydırıyor ama KDV'yi YENİDEN HESAPLAMIYORDU: 100 TL + %20 KDV
   * + %10 belge iskontosu → matrah 90,00, KDV 20,00 (doğrusu 18,00; KDVK
   * md.25/a). Aynı XML'de `TaxExclusiveAmount` 90,00 iken
   * `TaxSubtotal/TaxableAmount` 100,00 yazıyordu. Bu düzlem artık hesaba HİÇ
   * GİRMEZ; girdi doğrulayıcıda (`validateHksCharges`) ve XML üretiminde
   * (`mapSimpleToInvoiceInput`, doğrulama seviyesinden bağımsız) açık hatayla
   * reddedilir. İskonto kalemlere dağıtılıp satır iskontosu (`allowancePercent`)
   * olarak verilmelidir. Kütüphane dağıtım yardımcısı sunmaz.
   *
   * ── 🔴 HKS masraf düzlemi (`HKS`+`KOMISYONCU` / `EARSIVFATURA`+`HKSKOMISYONCU`)
   * Masraflar SATIŞ MATRAHINA ve KDV'ye DOKUNMAZ; yalnız müstahsile ÖDENECEK
   * tutardan düşülen kesintilerdir. GİB'in kendi `HKS-Ornek2.xml`'i ölçüldü:
   *   19 blok `ChargeIndicator=false` (iskonto) · Σ Amount = 220,00
   *   AllowanceTotalAmount = 0.00   ← iskonto toplamı BOŞ
   *   ChargeTotalAmount    = 220.00 ← "artırım" alanına yazılmış
   *   Payable = TaxInclusive − ChargeTotal = 1.080.000 − 220 = 1.079.780 ✔
   *             TaxInclusive + ChargeTotal = 1.080.220             ✘
   *   TaxExclusive = LineExtension → masraflar KDV matrahına GİRMEZ
   * Dayanak kılavuz DEĞİL, GİB'in resmî örneği + resmî görüntüleme XSLT'sidir
   * (`general.xslt:2138-2155` bu tutarı "Toplam Masraflar" diye ödenecekten
   * ÖNCE basar). Şematron bu ekseni ne zorlar ne engeller — ÜÇ paket sürümünde
   * `AllowanceCharge`/`ChargeTotalAmount` için SIFIR kural ölçüldü. Yani
   * "yeşil şematron" bu zincirin doğruluk kanıtı DEĞİLDİR.
   *
   * 🔑 Satır iskontosu HKS'te de `allowanceTotalAmount`ı besler: masraf kalemleri
   * oraya girmez, ama kullanıcının gerçekten verdiği satır iskontosunu silmek
   * veri kaybı olurdu. GİB'in örneğinde satır iskontosu yoktur, dolayısıyla o
   * belgede alan `0.00` çıkar — ölçülen değerle birebir. */
  /* Mapper'ın ÖZETLEYİCİ belge-düzeyi iskonto bloğu YALNIZ satır iskontolarını
   * anlatır. Masraf kalemleri kendi blokları olarak ayrıca yazıldığı için bu
   * özete katılamazlar — katılsalardı aynı tutar XML'de İKİ KEZ görünürdü. */
  const lineAllowanceTotal = allowanceTotalAmount;

  const isChargePlane = isHksChargePlane(calculatedProfile, calculatedType);
  const documentAllowanceCharges = isChargePlane
    ? resolveHksCharges(input.documentAllowanceCharges ?? [], lineExtensionAmount)
    : [];

  let chargeTotalAmount: number | undefined;

  if (documentAllowanceCharges.length > 0) {
    const chargeSum = documentAllowanceCharges.reduce((sum, ac) => sum + ac.amount, 0);
    chargeTotalAmount = chargeSum;
    payableAmount -= chargeSum;
    // taxExclusiveAmount ve taxInclusiveAmount BİLEREK dokunulmadı (yukarı bkz.)
  }

  const monetary: DocumentMonetary = {
    lineExtensionAmount,
    taxExclusiveAmount,
    taxInclusiveAmount,
    allowanceTotalAmount,
    payableAmount,
  };

  // `undefined` ise alan NESNEDE HİÇ BULUNMAZ → serileştirici elemanı yazmaz →
  // belge düzeyi kalemi olmayan belgelerin çıktısı bit-bire aynı kalır.
  if (chargeTotalAmount !== undefined) monetary.chargeTotalAmount = chargeTotalAmount;

  // Özel matrah ek subtotal
  if (input.type === 'OZELMATRAH' && input.ozelMatrah) {
    taxSubtotals.unshift({
      code: '0015',
      name: 'KDV',
      percent: input.ozelMatrah.percent,
      taxable: input.ozelMatrah.taxable,
      amount: input.ozelMatrah.amount,
      taxForCalculate: input.ozelMatrah.amount,
    });
  }

  // 4. İstisna kodu eşleştirme (tip + profil sabit kaldıktan sonra)
  const taxExemptionReason = resolveExemptionReason(input, calculatedType, typesArray);

  // Exchange rate
  let exchangeRate: number | null = null;
  if (currencyCode !== DEFAULT_CURRENCY_CODE) {
    exchangeRate = input.exchangeRate ?? null;
  }

  return {
    uuid: input.uuid ?? uuidv4(),
    currencyCode,
    exchangeRate,
    type: calculatedType,
    profile: calculatedProfile,
    monetary,
    allowance: lineAllowanceTotal > 0 ? { amount: lineAllowanceTotal } : null,
    documentAllowanceCharges,
    taxes: { taxTotal: taxTotalAmount, taxSubtotals },
    withholding: withholdingSubtotals.length > 0
      ? { taxTotal: withholdingTotalAmount, taxSubtotals: withholdingSubtotals }
      : null,
    taxExemptionReason,
    calculatedLines,
  };
}

// ─── Yardımcı Fonksiyonlar ──────────────────────────────────────────────────────

/**
 * Parasal tutarın yazıldığı basamağa (2 hane) yuvarlar.
 *
 * Orandan türetilen masraf tutarları için ŞART: `ChargeTotalAmount` toplamı
 * kalemlerin GÖSTERİLEN tutarlarının toplamına eşit olmalıdır. Yuvarlamadan
 * toplarsak GİB'in görüntüsünde "Toplam Masraflar" satırı kalemlerin toplamını
 * tutmaz ve bunu hiçbir kapı söylemez (§ şematronda sıfır kural).
 */
function roundToAmountPrecision(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * HKS masraf kalemlerini çözer: tutarı türetir, çarpanı yüzde olarak taşır.
 *
 * ── Tutar (K3): OTORİTE `amount`tır
 * `amount` verildiyse aynen kullanılır. Verilmediyse `percent` ve
 * `baseAmount ?? lineExtensionAmount` üzerinden türetilir. İkisi de yoksa 0.
 *
 * ── Çarpan (K2): YÜZDE
 * Kılavuz (Ortak §2.2.3, Fatura §2.3.36) `MultiplierFactorNumeric`i ORAN
 * tanımlar, ama HKS'e ÖZGÜ tek kanıt GİB'in kendi görüntüleme XSLT'sidir ve
 * değeri YÜZDE sanıp yanına `%` basar (`general.xslt:1342`, `:1353-1356`).
 * Oran yazılsaydı belge GİB'in kendi ekranında "%0,05" görünürdü.
 *
 * ── `BaseAmount`
 * Yalnız kullanıcı AÇIKÇA verdiyse XML'e yazılır. GİB'in HKS örneğinde masraf
 * kalemlerinin hiçbiri taban taşımaz.
 */
function resolveHksCharges(
  items: SimpleDocumentAllowanceChargeInput[],
  lineExtensionAmount: number,
): CalculatedDocumentAllowanceCharge[] {
  return items.map(item => {
    const base = item.baseAmount ?? lineExtensionAmount;
    const amount = item.amount !== undefined
      ? item.amount
      : item.percent !== undefined
        ? roundToAmountPrecision(base * (item.percent / 100))
        : 0;

    const resolved: CalculatedDocumentAllowanceCharge = {
      chargeIndicator: item.chargeIndicator,
      amount,
    };
    if (isNonEmpty(item.reason)) resolved.reason = item.reason;
    if (item.percent !== undefined) resolved.multiplierFactorNumeric = item.percent;
    if (item.baseAmount !== undefined) resolved.baseAmount = item.baseAmount;
    return resolved;
  });
}

/**
 * Fatura tipini tespit eder.
 * Öncelik: kullanıcı override > tevkifat varlığı > istisna kodu > satır tipleri
 */
function resolveInvoiceType(input: SimpleInvoiceInput, typesArray: string[]): string {
  // B-41: Kullanıcı manuel tip belirlediyse ÖNCELİKLE onu döndür
  // (TEVKIFATIADE gibi override'lara izin ver; önceki sürümde typesArray.TEVKIFAT mutlak öncelikti)
  if (input.type) {
    return input.type;
  }

  // Kullanıcı override vermediyse: tevkifat satırı varsa TEVKIFAT
  if (typesArray.includes('TEVKIFAT')) return 'TEVKIFAT';

  // İstisna kodu verilmişse → documentType'a göre tip tespit
  if (input.kdvExemptionCode) {
    const exemption = configManager.getExemption(input.kdvExemptionCode);
    if (exemption) {
      if (exemption.documentType === 'ISTISNA' && typesArray.includes('ISTISNA')) return 'ISTISNA';
      if (exemption.documentType === 'IHRACKAYITLI') return 'IHRACKAYITLI';
      if (exemption.documentType === 'OZELMATRAH') return 'OZELMATRAH';
    }
  }

  // Satır tiplerinden otomatik tespit
  if (typesArray.includes('ISTISNA') && typesArray.includes('SATIS')) return 'SATIS';
  if (typesArray.includes('ISTISNA') && !typesArray.includes('SATIS')) return 'ISTISNA';
  if (!typesArray.includes('ISTISNA') && typesArray.includes('SATIS')) return 'SATIS';

  return 'SATIS';
}

/**
 * Belge seviyesi istisna kodunu ve adını çözümler (B-NEW-11 / M11).
 *
 * Kural: Kütüphane self-exemption olmayan tiplerde (SATIS, TEVKIFAT, IADE vb.)
 * 351 (veya başka kod) **otomatik atamaz** — kullanıcı `kdvExemptionCode`
 * vermediyse `result.kdv = null` kalır. Self-exemption tiplerinde (ISTISNA,
 * IHRACKAYITLI) kullanıcı kodu öncelikli, verilmediyse fallback default kullanılır.
 *
 * Validator `manual-exemption-validator` KDV=0 kalem + kod eksik kombinasyonunu
 * reddeder; bu fonksiyon yalnızca aşağı akışa `calc.taxExemptionReason.kdv`'yi
 * iletir.
 */
function resolveExemptionReason(
  input: SimpleInvoiceInput,
  calculatedType: string,
  _typesArray: string[],
): TaxExemptionReason {
  const result: TaxExemptionReason = { kdv: null, kdvName: null };

  switch (calculatedType) {
    case 'ISTISNA':
      result.kdv = input.kdvExemptionCode ?? DEFAULT_EXEMPTIONS.istisna;
      break;
    case 'IHRACKAYITLI':
      result.kdv = input.kdvExemptionCode ?? DEFAULT_EXEMPTIONS.ihracKayitli;
      break;
    default:
      // SATIS, TEVKIFAT, IADE, OZELMATRAH, SGK, KOMISYONCU, TEKNOLOJIDESTEK,
      // KONAKLAMAVERGISI, SARJHIZMETI, HKS*, YTB* — hepsi için yalnızca kullanıcı input'u geçerli.
      result.kdv = input.kdvExemptionCode ?? null;
      break;
  }

  // İstisna kodunun adını çözümle
  if (result.kdv) {
    const exemption = configManager.getExemption(result.kdv);
    if (exemption) result.kdvName = exemption.name;
  }

  return result;
}

/**
 * Fatura profilini tespit eder.
 * Kullanıcı override > IADE → TEMELFATURA > verilen profil > TICARIFATURA varsayılan
 */
function resolveProfile(input: SimpleInvoiceInput, calculatedType: string): string {
  // Kullanıcı profil belirlemiş
  if (input.profile) return input.profile;

  // e-Arşiv
  if (input.eArchiveInfo || input.onlineSale) return 'EARSIVFATURA';

  // B-76: buyerCustomer tek başına IHRACAT'a zorlamasın.
  // IHRACAT yalnız ISTISNA tipi ile uyumlu (M2 identity). YOLCU/KAMU senaryoları
  // için ayrı ipucu gerekir (bkz. gelecek sprint).
  if (input.buyerCustomer && calculatedType === 'ISTISNA') return 'IHRACAT';

  // IADE → TEMELFATURA
  if (calculatedType === 'IADE') return 'TEMELFATURA';

  // SGK
  if (calculatedType === 'SGK' || input.sgk) return 'TEMELFATURA';

  // Varsayılan: TICARIFATURA
  return 'TICARIFATURA';
}
