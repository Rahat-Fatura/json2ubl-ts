/**
 * B-08 — Yatırım Teşvik Faturası KDV kontrolleri (belge + satır).
 *
 * ## Normatif Kaynak
 * UBL-TR Common Schematron:
 * - `YatirimTesvikKDVCheck` (rule satır 483-485) — belge seviyesi
 * - `YatirimTesvikLineKDVCheck` (rule satır 487-490) — satır seviyesi
 *
 * ```xml
 * <!-- Document level (satır 483-485) -->
 * <sch:assert test="not(
 *   (ProfileID='YATIRIMTESVIK' or (ProfileID='EARSIVFATURA' and InvoiceTypeCode ∈ YtbEArsivList))
 *   and not(InvoiceTypeCode ∈ {IADE, TEVKIFATIADE, YTBIADE, YTBTEVKIFATIADE})
 * ) or (
 *   count(TaxSubtotal[KDV 0015 AND TaxAmount>0 AND Percent>0]) = count(TaxSubtotal[KDV 0015])
 *   AND count(...) > 0
 * )">Yatırım Teşvik Faturasında KDV Oranı ve Değeri girilmelidir.</sch:assert>
 *
 * <!-- Line level (satır 487-490) -->
 * <!-- Assert 1: count(line KDV subtotals with amount>0 AND percent>0) > 0 -->
 * <!-- Assert 2: ItemClassificationCode ∈ {03,04} için count(line KDV amount>0) > 0 -->
 * ```
 *
 * ## Kapsam
 * - `ProfileID === 'YATIRIMTESVIK'` **VEYA**
 * - `ProfileID === 'EARSIVFATURA'` **AND** `InvoiceTypeCode ∈ YATIRIM_TESVIK_EARSIV_TYPES`
 * - **HARİÇ:** `InvoiceTypeCode ∈ YATIRIM_TESVIK_IADE_TYPES`
 *
 * Kapsam dışındaki belgeler 0 hata döndürür.
 */

import { InvoiceTypeCode, InvoiceProfileId } from '../types/enums';
import {
  YATIRIM_TESVIK_IADE_TYPES,
  YATIRIM_TESVIK_EARSIV_TYPES,
} from '../config/constants';
import type { InvoiceInput } from '../types/invoice-input';
import type { ValidationError } from '../errors/ubl-build-error';

/** KDV vergi tipi kodu — UBL-TR TaxTypeCode */
const KDV_TAX_TYPE_CODE = '0015';

/** Harcama Tipi kodları — B-08 satır seviyesi ek kural (Schematron satır 490) */
const HARCAMA_TIPI_REQUIRES_KDV_AMOUNT: ReadonlySet<string> = new Set(['03', '04']);

/**
 * Yatırım Teşvik kontrolünün bu belge için geçerli olup olmadığını belirler.
 */
export function isYatirimTesvikScope(
  profile: InvoiceProfileId,
  type: InvoiceTypeCode,
): boolean {
  if (YATIRIM_TESVIK_IADE_TYPES.has(type)) return false;
  if (profile === InvoiceProfileId.YATIRIMTESVIK) return true;
  if (profile === InvoiceProfileId.EARSIVFATURA && YATIRIM_TESVIK_EARSIV_TYPES.has(type)) {
    return true;
  }
  return false;
}

/**
 * Belge seviyesi — YatirimTesvikKDVCheck (Schematron satır 483-485).
 *
 * Kural: Scope içinde ise, `input.taxTotals[].taxSubtotals` içindeki TÜM KDV (0015)
 * subtotal'lar `taxAmount > 0 AND percent > 0` olmalı VE en az bir KDV subtotal olmalı.
 */
export function validateYatirimTesvikKdvDocument(input: InvoiceInput): ValidationError[] {
  if (!isYatirimTesvikScope(input.profileId, input.invoiceTypeCode)) return [];

  const kdvSubtotals = input.taxTotals.flatMap(tt =>
    tt.taxSubtotals.filter(ts => ts.taxTypeCode === KDV_TAX_TYPE_CODE),
  );
  const valid = kdvSubtotals.filter(
    ts => ts.taxAmount > 0 && (ts.percent ?? 0) > 0,
  );

  // Schematron: count(valid) === count(kdv) AND count(valid) > 0
  if (valid.length === 0 || valid.length !== kdvSubtotals.length) {
    return [{
      code: 'YATIRIMTESVIK_KDV_REQUIRED_DOCUMENT',
      message: 'Yatırım Teşvik Faturasında belge seviyesinde KDV Oranı ve Değeri girilmelidir',
      path: 'taxTotals',
      expected: 'tüm KDV subtotal taxAmount>0 AND percent>0',
      actual: kdvSubtotals.length === 0 ? 'KDV subtotal yok' : `${valid.length}/${kdvSubtotals.length} geçerli`,
    }];
  }
  return [];
}

/**
 * Satır seviyesi — YatirimTesvikLineKDVCheck (Schematron satır 487-490).
 *
 * Kural 1: Her satırda `taxTotal.taxSubtotals` içinde KDV (0015)
 *          `taxAmount > 0 AND percent > 0` olmalı (en az 1 tane).
 * Kural 2: Harcama Tipi (ItemClassificationCode) 03/04 satırlar için
 *          KDV `taxAmount > 0` olmalı (percent kontrolü yok).
 */
export function validateYatirimTesvikKdvLine(input: InvoiceInput): ValidationError[] {
  if (!isYatirimTesvikScope(input.profileId, input.invoiceTypeCode)) return [];

  const errors: ValidationError[] = [];

  input.lines.forEach((line, idx) => {
    const kdvSubs = line.taxTotal.taxSubtotals.filter(
      ts => ts.taxTypeCode === KDV_TAX_TYPE_CODE,
    );

    // Kural 1: en az bir KDV taxAmount>0 AND percent>0
    const hasValidKdv = kdvSubs.some(
      ts => ts.taxAmount > 0 && (ts.percent ?? 0) > 0,
    );
    if (!hasValidKdv) {
      errors.push({
        code: 'YATIRIMTESVIK_KDV_REQUIRED_LINE',
        message: 'Yatırım Teşvik Faturasında kalem bazında KDV Oranı ve Değeri girilmelidir',
        path: `lines[${idx}].taxTotal`,
        expected: 'KDV taxAmount>0 AND percent>0',
        actual: kdvSubs.length === 0 ? 'KDV subtotal yok' : 'taxAmount=0 veya percent=0',
      });
    }

    // Kural 2: Harcama Tipi 03/04 için KDV taxAmount>0 (percent muafiyetli)
    const harcamaTipi = line.item.commodityClassification?.itemClassificationCode;
    if (harcamaTipi && HARCAMA_TIPI_REQUIRES_KDV_AMOUNT.has(harcamaTipi)) {
      const hasKdvAmount = kdvSubs.some(ts => ts.taxAmount > 0);
      if (!hasKdvAmount) {
        errors.push({
          code: 'YATIRIMTESVIK_HARCAMA_TIPI_KDV_REQUIRED',
          message: `Harcama Tipi ${harcamaTipi} için satır KDV değeri girilmelidir`,
          path: `lines[${idx}].taxTotal`,
          expected: 'KDV taxAmount>0',
          actual: 'KDV=0 veya yok',
        });
      }
    }
  });

  return errors;
}
