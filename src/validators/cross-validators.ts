import type { ValidationError } from '../errors/ubl-build-error';
import type { InvoiceInput } from '../types/invoice-input';
import { PROFILE_TYPE_MATRIX } from '../config/constants';
import { crossMatrixError } from './validation-result';
import { validateExemptionCode } from './cross-check-matrix';
import { validateIhrackayitli702 } from './ihrackayitli-validator';
import {
  validateYatirimTesvikKdvDocument,
  validateYatirimTesvikKdvLine,
} from './yatirim-tesvik-validator';

/**
 * §4 Profil × Tip + TaxExemption kod × Tip çapraz matris kontrolü.
 *
 * 1. `PROFILE_TYPE_MATRIX` (Sprint 1): ProfileID × InvoiceTypeCode kombinasyon whitelist
 * 2. `TAX_EXEMPTION_MATRIX` (Sprint 5 M5/B-06): TaxExemptionReasonCode × InvoiceTypeCode
 *    - Normatif: Schematron TaxExemptionReasonCodeCheck (satır 316, 318, 320)
 *    - 351 özel: ACIK-SORULAR.md #12 — requiresZeroKdvLine
 */
export function validateCrossMatrix(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // §1 — Profil × Tip matrisi (Sprint 1)
  const allowedTypes = PROFILE_TYPE_MATRIX[input.profileId];
  if (!allowedTypes) {
    errors.push({
      code: 'INVALID_PROFILE',
      message: `Bilinmeyen ProfileID: ${input.profileId}`,
      path: 'profileId',
    });
    return errors; // Erken dön — profile bilinmeyen ise exemption matris anlamsız
  }

  if (!allowedTypes.has(input.invoiceTypeCode)) {
    errors.push(crossMatrixError(input.profileId, input.invoiceTypeCode));
  }

  // §2 — TaxExemption kod × Tip matrisi (Sprint 5 M5 + B-06)
  errors.push(...validateTaxExemptionMatrix(input));

  // §3 — IHRACKAYITLI + 702 özel kontrol (Sprint 5 B-07)
  errors.push(...validateIhrackayitli702(input));

  // §4 — YatirimTesvikKDVCheck + LineKDVCheck (Sprint 5 B-08)
  errors.push(...validateYatirimTesvikKdvDocument(input));
  errors.push(...validateYatirimTesvikKdvLine(input));

  return errors;
}

/**
 * TaxExemptionReasonCode ↔ InvoiceTypeCode cross-check.
 *
 * Hem belge seviyesi (`input.taxTotals[].taxSubtotals[]`) hem satır seviyesi
 * (`input.lines[].taxTotal.taxSubtotals[]`) içindeki `taxExemptionReasonCode`'ları
 * `TAX_EXEMPTION_MATRIX` kurallarına göre doğrular.
 *
 * `requiresZeroKdvLine: true` olan kodlar (ör: 351) için hem belge hem satır
 * seviyesindeki KDV (0015) subtotal'ları havuzu kontrol edilir — en az bir
 * subtotal'da `taxAmount = 0` olmalı.
 */
export function validateTaxExemptionMatrix(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // Tüm KDV (0015) subtotal havuzu — belge + satır seviyesi birleşik
  // (requiresZeroKdvLine kontrolü için en az bir 0 tutar yeterli)
  const kdvSubtotals: Array<{ amount: number }> = [];

  for (const tt of input.taxTotals) {
    for (const ts of tt.taxSubtotals) {
      if (ts.taxTypeCode === '0015') {
        kdvSubtotals.push({ amount: ts.taxAmount });
      }
    }
  }
  for (const line of input.lines) {
    for (const ts of line.taxTotal.taxSubtotals) {
      if (ts.taxTypeCode === '0015') {
        kdvSubtotals.push({ amount: ts.taxAmount });
      }
    }
  }

  // Belge seviyesi taxSubtotals
  input.taxTotals.forEach((tt, ttIdx) => {
    tt.taxSubtotals.forEach((ts, tsIdx) => {
      if (!ts.taxExemptionReasonCode) return;
      const path = `taxTotals[${ttIdx}].taxSubtotals[${tsIdx}].taxExemptionReasonCode`;
      const err = validateExemptionCode(
        ts.taxExemptionReasonCode,
        input.invoiceTypeCode,
        kdvSubtotals,
        path,
      );
      if (err) errors.push(err);
    });
  });

  // Satır seviyesi taxSubtotals
  input.lines.forEach((line, lineIdx) => {
    line.taxTotal.taxSubtotals.forEach((ts, tsIdx) => {
      if (!ts.taxExemptionReasonCode) return;
      const path = `lines[${lineIdx}].taxTotal.taxSubtotals[${tsIdx}].taxExemptionReasonCode`;
      const err = validateExemptionCode(
        ts.taxExemptionReasonCode,
        input.invoiceTypeCode,
        kdvSubtotals,
        path,
      );
      if (err) errors.push(err);
    });
  });

  return errors;
}
