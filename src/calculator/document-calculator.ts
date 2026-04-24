/**
 * Belge seviyesi hesaplama motoru.
 *
 * calculate-service/invoice.calculate.mixin.js → invoiceBodyCalculate metodunun
 * TypeScript karşılığı. Satır hesaplamalarını toplar, vergi subtotal'larını gruplar,
 * fatura tipi ve profilini otomatik tespit eder.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SimpleInvoiceInput } from './simple-types';
import type { CalculatedLine, CalculatedTaxSubtotal, CalculatedWithholdingSubtotal } from './line-calculator';
import { calculateAllLines } from './line-calculator';
import { configManager } from './config-manager';
import { DEFAULT_CURRENCY_CODE } from './currency-config';
import { KDV_TAX_CODE } from './tax-config';
import {
  isPhantomKdvCombination,
  PHANTOM_KDV_CALCULATION_SEQUENCE_NUMERIC,
} from './phantom-kdv-rules';

// ─── Hesaplama Sonuç Tipleri ────────────────────────────────────────────────────

export interface DocumentMonetary {
  /** Σ line.lineExtensionAmount (indirim SONRASI; UBL-TR LegalMonetaryTotal.LineExtensionAmount kaynağı) */
  lineExtensionAmount: number;
  /** = lineExtensionAmount (belge-seviyesi AllowanceCharge yok → identity) */
  taxExclusiveAmount: number;
  /** Σ line.taxInclusiveForMonetary */
  taxInclusiveAmount: number;
  /** Σ line.allowanceObject.amount */
  allowanceTotalAmount: number;
  /** Σ line.payableAmountForMonetary */
  payableAmount: number;
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

  // 2b. Fatura tipi + profil tespiti (phantom kararı için gerekli)
  const calculatedType = resolveInvoiceType(input, typesArray);
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

  const monetary: DocumentMonetary = {
    lineExtensionAmount,
    taxExclusiveAmount,
    taxInclusiveAmount,
    allowanceTotalAmount,
    payableAmount,
  };

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
    allowance: allowanceTotalAmount > 0 ? { amount: allowanceTotalAmount } : null,
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
