/**
 * Satır seviyesi hesaplama motoru.
 *
 * calculate-service/invoice.calculate.mixin.js → invoiceLinesCalculate metodunun
 * TypeScript karşılığı. DB'den gelen Tax tablosundaki baseStat/baseCalculate
 * flaglarına göre KDV matrahını hesaplar.
 */

import type { SimpleLineInput } from './simple-types';
import { KDV_TAX_CODE, KDV_TAX_NAME } from './tax-config';
import { configManager } from './config-manager';

// ─── Hesaplama Sonuç Tipleri ────────────────────────────────────────────────────

export interface CalculatedTaxSubtotal {
  code: string;
  name: string;
  percent: number;
  taxable: number;
  amount: number;
  taxForCalculate: number;
}

export interface CalculatedWithholdingSubtotal {
  code: string;
  name: string;
  percent: number;
  taxable: number;
  amount: number;
}

export interface CalculatedAllowance {
  percent: number;
  base: number;
  amount: number;
}

export interface CalculatedLineTaxes {
  taxForCalculate: number;
  taxTotal: number;
  taxSubtotals: CalculatedTaxSubtotal[];
}

export interface CalculatedLineWithholding {
  taxTotal: number;
  taxSubtotals: CalculatedWithholdingSubtotal[];
}

/** Tek satırın hesaplama sonucu */
export interface CalculatedLine {
  id: number;
  unitCode: string;
  currencyCode: string;
  /** Satırın otomatik tespit edilen tipi: SATIS | ISTISNA | TEVKIFAT */
  type: 'SATIS' | 'ISTISNA' | 'TEVKIFAT';
  /** price × quantity - indirim (indirim sonrası, vergi matrahı ve UBL-TR LineExtensionAmount kaynağı) */
  lineExtensionAmount: number;
  /** lineExtensionAmount + Σ taxForCalculate */
  taxInclusiveForMonetary: number;
  /** taxInclusiveForMonetary - withholdingTotal */
  payableAmountForMonetary: number;
  allowanceObject: CalculatedAllowance;
  withholdingObject: CalculatedLineWithholding;
  taxes: CalculatedLineTaxes;
}

// ─── Hesaplama Fonksiyonu ───────────────────────────────────────────────────────

/**
 * Tek bir fatura satırını hesaplar.
 *
 * Algoritma (calculate-service'den birebir port):
 * 1. grossAmount = price × quantity
 * 2. allowanceAmount = grossAmount × (allowancePercent / 100)
 * 3. lineExtensionAmount = grossAmount - allowanceAmount
 * 4. Her ek vergi için:
 *    - taxPrice = lineExtensionAmount × (tax.percent / 100)
 *    - baseStat=true, baseCalculate=true  → KDV matrahı += taxPrice
 *    - baseStat=true, baseCalculate=false → KDV matrahı -= taxPrice
 *    - baseStat=false                     → taxForCalculate *= -1
 * 5. KDV = modifiye edilmiş matrah × (kdvPercent / 100)
 * 6. Tevkifat = kdvAmount × (withholdingPercent / 100)
 */
export function calculateLine(
  line: SimpleLineInput,
  index: number,
  currencyCode: string,
): CalculatedLine {
  const grossAmount = line.price * line.quantity;

  // İskonto hesabı
  const allowanceObject: CalculatedAllowance = {
    percent: line.allowancePercent ?? 0,
    base: line.allowancePercent ? grossAmount : 0,
    amount: line.allowancePercent
      ? grossAmount * (line.allowancePercent / 100)
      : 0,
  };

  const lineExtensionAmount = grossAmount - allowanceObject.amount;
  let lineExtensionAmountForCalculation = lineExtensionAmount;

  // Ek vergiler (KDV hariç: ÖTV, Damga V., ÖİV vb.)
  const taxes: CalculatedLineTaxes = {
    taxForCalculate: 0,
    taxTotal: 0,
    taxSubtotals: [],
  };

  if (line.taxes && line.taxes.length > 0) {
    for (const tax of line.taxes) {
      const taxDef = configManager.getTax(tax.code);
      if (!taxDef) {
        throw new Error(`Geçersiz vergi kodu: ${tax.code}. Tanımlı vergi kodları için tax-config.ts dosyasına bakınız.`);
      }

      const taxPrice = lineExtensionAmount * (tax.percent / 100);
      let taxForCalculate = taxPrice;

      if (taxDef.baseStat) {
        if (taxDef.baseCalculate) {
          lineExtensionAmountForCalculation += taxPrice;
        } else {
          lineExtensionAmountForCalculation -= taxPrice;
        }
      } else {
        taxForCalculate *= -1;
      }

      taxes.taxSubtotals.push({
        taxable: lineExtensionAmount,
        amount: taxPrice,
        taxForCalculate,
        percent: tax.percent,
        code: taxDef.code,
        name: taxDef.name,
      });
    }
  }

  // KDV hesabı — modifiye edilmiş matrah üzerinden
  const kdvSubtotal: CalculatedTaxSubtotal = {
    taxable: lineExtensionAmountForCalculation,
    amount: lineExtensionAmountForCalculation * (line.kdvPercent / 100),
    taxForCalculate: lineExtensionAmountForCalculation * (line.kdvPercent / 100),
    percent: line.kdvPercent,
    code: KDV_TAX_CODE,
    name: KDV_TAX_NAME,
  };

  taxes.taxSubtotals.push(kdvSubtotal);
  taxes.taxTotal = taxes.taxSubtotals.reduce((total, t) => total + t.amount, 0);
  taxes.taxForCalculate = taxes.taxSubtotals.reduce((total, t) => total + t.taxForCalculate, 0);

  // Tevkifat hesabı
  const withholdingObject: CalculatedLineWithholding = {
    taxTotal: 0,
    taxSubtotals: [],
  };

  if (line.withholdingTaxCode) {
    const whDef = configManager.getWithholdingTax(line.withholdingTaxCode);
    if (!whDef) {
      throw new Error(`Geçersiz tevkifat kodu: ${line.withholdingTaxCode}. Tanımlı tevkifat kodları için withholding-config.ts dosyasına bakınız.`);
    }

    // M3 — 650 dinamik percent: kullanıcı line.withholdingTaxPercent ile 0-100 verir
    let effectivePercent: number;
    if (whDef.dynamicPercent) {
      if (line.withholdingTaxPercent == null) {
        throw new Error(`Tevkifat kodu ${whDef.code} için 'withholdingTaxPercent' zorunlu (0-100).`);
      }
      if (line.withholdingTaxPercent < 0 || line.withholdingTaxPercent > 100) {
        throw new Error(`Tevkifat kodu ${whDef.code} için 'withholdingTaxPercent' 0-100 aralığında olmalı (gelen: ${line.withholdingTaxPercent}).`);
      }
      effectivePercent = line.withholdingTaxPercent;
    } else {
      if (line.withholdingTaxPercent != null) {
        throw new Error(`Tevkifat kodu ${whDef.code} sabit oranlıdır; 'withholdingTaxPercent' sadece 650 kodu için kullanılır.`);
      }
      effectivePercent = whDef.percent;
    }

    const whAmount = kdvSubtotal.amount * (effectivePercent / 100);
    withholdingObject.taxTotal = whAmount;
    withholdingObject.taxSubtotals = [{
      taxable: kdvSubtotal.amount,
      amount: whAmount,
      percent: effectivePercent,
      code: whDef.code,
      name: whDef.name,
    }];
  }

  // Toplamlar
  const taxInclusiveForMonetary = lineExtensionAmount + taxes.taxForCalculate;
  const payableAmountForMonetary = taxInclusiveForMonetary - withholdingObject.taxTotal;

  // Satır tipi tespiti
  let type: 'SATIS' | 'ISTISNA' | 'TEVKIFAT';
  if (withholdingObject.taxSubtotals.length > 0) {
    type = 'TEVKIFAT';
  } else if (line.kdvPercent === 0 || kdvSubtotal.amount === 0) {
    type = 'ISTISNA';
  } else {
    type = 'SATIS';
  }

  // Birim kodu çözümleme
  const unitCode = configManager.resolveUnitCode(line.unitCode ?? 'Adet');

  return {
    id: index + 1,
    unitCode,
    currencyCode,
    type,
    lineExtensionAmount,
    taxInclusiveForMonetary,
    payableAmountForMonetary,
    allowanceObject,
    withholdingObject,
    taxes,
  };
}

/**
 * Tüm fatura satırlarını hesaplar.
 */
export function calculateAllLines(
  lines: SimpleLineInput[],
  currencyCode: string,
): CalculatedLine[] {
  return lines.map((line, index) => calculateLine(line, index, currencyCode));
}
