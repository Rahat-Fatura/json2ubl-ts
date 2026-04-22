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

const DEFAULT_EXEMPTIONS = {
  satis: '351',
  istisna: '350',
  ihracKayitli: '701',
} as const;

// ─── Belge Hesaplama ────────────────────────────────────────────────────────────

/**
 * Tüm belge seviyesi hesaplamalarını yapar:
 * 1. Satır hesaplamaları
 * 2. Monetary toplamlar
 * 3. Vergi subtotal gruplama
 * 4. Tevkifat subtotal gruplama
 * 5. Fatura tipi otomatik tespiti
 * 6. Profil otomatik tespiti
 * 7. İstisna kodu eşleştirme
 */
export function calculateDocument(input: SimpleInvoiceInput): CalculatedDocument {
  const currencyCode = input.currencyCode ?? DEFAULT_CURRENCY_CODE;

  // 1. Satır hesaplamaları
  const calculatedLines = calculateAllLines(input.lines, currencyCode);

  // 2. Monetary toplamlar
  let lineExtensionAmount = 0;
  let taxExclusiveAmount = 0;
  let taxInclusiveAmount = 0;
  let allowanceTotalAmount = 0;
  let taxTotalAmount = 0;
  let withholdingTotalAmount = 0;
  let payableAmount = 0;

  const taxSubtotals: CalculatedTaxSubtotal[] = [];
  const withholdingSubtotals: CalculatedWithholdingSubtotal[] = [];
  const typesArray: string[] = [];

  for (const line of calculatedLines) {
    if (!typesArray.includes(line.type)) typesArray.push(line.type);

    lineExtensionAmount += line.lineExtensionAmount;
    taxExclusiveAmount += line.lineExtensionAmount;
    taxInclusiveAmount += line.taxInclusiveForMonetary;
    allowanceTotalAmount += line.allowanceObject.amount;
    payableAmount += line.payableAmountForMonetary;
    taxTotalAmount += line.taxes.taxTotal;
    withholdingTotalAmount += line.withholdingObject.taxTotal;

    // 3. Vergi subtotal gruplama (aynı code + percent → birleştir)
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
        });
      } else {
        taxSubtotals[existingIndex].amount += tax.amount;
        taxSubtotals[existingIndex].taxable += tax.taxable;
        taxSubtotals[existingIndex].taxForCalculate += tax.taxForCalculate;
      }
    }

    // 4. Tevkifat subtotal gruplama
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

  // 5. Fatura tipi otomatik tespiti
  const calculatedType = resolveInvoiceType(input, typesArray);

  // 6. İstisna kodu eşleştirme
  const taxExemptionReason = resolveExemptionReason(input, calculatedType, typesArray);

  // 7. Profil otomatik tespiti
  const calculatedProfile = resolveProfile(input, calculatedType);

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
 * İstisna kodunu ve adını çözümler.
 */
function resolveExemptionReason(
  input: SimpleInvoiceInput,
  calculatedType: string,
  typesArray: string[],
): TaxExemptionReason {
  const result: TaxExemptionReason = { kdv: null, kdvName: null };

  switch (calculatedType) {
    case 'TEVKIFAT':
      result.kdv = DEFAULT_EXEMPTIONS.satis;
      break;
    case 'IADE':
      if (typesArray.includes('ISTISNA')) result.kdv = DEFAULT_EXEMPTIONS.satis;
      break;
    case 'ISTISNA':
      result.kdv = input.kdvExemptionCode ?? DEFAULT_EXEMPTIONS.istisna;
      break;
    case 'IHRACKAYITLI':
      result.kdv = input.kdvExemptionCode ?? DEFAULT_EXEMPTIONS.ihracKayitli;
      break;
    case 'OZELMATRAH':
      result.kdv = input.kdvExemptionCode ?? null;
      break;
    case 'SATIS':
      if (typesArray.includes('ISTISNA')) result.kdv = DEFAULT_EXEMPTIONS.satis;
      break;
    default:
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
