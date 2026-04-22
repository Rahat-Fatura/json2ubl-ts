/**
 * M4 — 555 (Demirbaş KDV) kodu tarayıcısı.
 *
 * `BuilderOptions.allowReducedKdvRate=false` iken InvoiceBuilder ve DespatchBuilder
 * `build()` çağrısının başında bu utility kullanılır; 555 kodu tespit edilirse
 * `UblBuildError` ile throw edilir. Validator pipeline'dan bağımsız çalışır
 * (validationLevel='none' olsa dahi gate).
 */

import type { InvoiceInput } from '../types/invoice-input';
import type { ValidationError } from '../errors/ubl-build-error';
import { DEMIRBAS_KDV_EXEMPTION_CODES } from '../config/constants';

/**
 * Input içinde 555 (veya DEMIRBAS_KDV_EXEMPTION_CODES içindeki herhangi bir kod)
 * tespit edilirse hata objesi döner; yoksa null.
 */
export function detectReducedKdvRate(input: InvoiceInput): ValidationError | null {
  // Fatura seviyesi taxTotals
  if (input.taxTotals) {
    for (let i = 0; i < input.taxTotals.length; i++) {
      const total = input.taxTotals[i];
      for (let j = 0; j < total.taxSubtotals.length; j++) {
        const code = total.taxSubtotals[j].taxExemptionReasonCode;
        if (code && DEMIRBAS_KDV_EXEMPTION_CODES.has(code)) {
          return {
            code: 'REDUCED_KDV_RATE_NOT_ALLOWED',
            message: `Kod '${code}' için 'allowReducedKdvRate' seçeneği etkinleştirilmelidir (BuilderOptions.allowReducedKdvRate=true).`,
            path: `taxTotals[${i}].taxSubtotals[${j}].taxExemptionReasonCode`,
            actual: code,
          };
        }
      }
    }
  }

  // Satır seviyesi taxTotal
  if (input.lines) {
    for (let li = 0; li < input.lines.length; li++) {
      const line = input.lines[li];
      if (!line.taxTotal) continue;
      for (let j = 0; j < line.taxTotal.taxSubtotals.length; j++) {
        const code = line.taxTotal.taxSubtotals[j].taxExemptionReasonCode;
        if (code && DEMIRBAS_KDV_EXEMPTION_CODES.has(code)) {
          return {
            code: 'REDUCED_KDV_RATE_NOT_ALLOWED',
            message: `Kod '${code}' için 'allowReducedKdvRate' seçeneği etkinleştirilmelidir (BuilderOptions.allowReducedKdvRate=true).`,
            path: `lines[${li}].taxTotal.taxSubtotals[${j}].taxExemptionReasonCode`,
            actual: code,
          };
        }
      }
    }
  }

  return null;
}
