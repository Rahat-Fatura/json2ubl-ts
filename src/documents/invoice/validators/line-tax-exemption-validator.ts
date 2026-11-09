/**
 * Kalem vergisinde istisna kodu (`lines[].taxes[].exemptionCode`) — basit girdi
 * düzeyi doğrulama.
 *
 * Alan yenidir; kuralları önceden geçerli hiçbir girdiyi kırmaz. Builder'da
 * `basic` ve `strict`te, oturumda `validate()`te koşar.
 *
 *   • `TAX_EXEMPTION_REQUIRES_ZERO_PERCENT` — istisna kodu yalnız oranı 0 olan
 *     vergide ("ÖTV 0 geçilir ve ilgili ÖTV istisna kodu seçilir").
 *   • `EXEMPTION_TAX_TYPE_MISMATCH` — KDV türü kod (301 …) ya da 151 vergi türüne
 *     uymayan alt toplamda; istisna kodu alamayan vergide (1047 …). ÖTV ve
 *     konaklama türü kodların yanlış yerleşimi InvoiceInput düzeyinde
 *     raporlanır (`validateExemptionPlacement`); aynı durum iki kez çıkmaz.
 *
 * Bilinmeyen kod burada değil, `validateTaxExemptionMatrix`te
 * `UNKNOWN_EXEMPTION_CODE` alır.
 */

import type { SimpleInvoiceInput } from '../../../calculator/simple-types';
import type { ValidationError } from '../../../errors/ubl-build-error';
import { configManager } from '../../../calculator/config-manager';
import { isExemptionAllowedOnTax } from '../../../calculator/exemption-config';
import { isNonEmpty } from '../../../utils/formatters';
import {
  exemptionTaxTypeMismatch,
  isExemptionPlacementCheckedOnInvoiceInput,
} from './cross-check-matrix';

export function validateLineTaxExemptions(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  (input.lines ?? []).forEach((line, i) => {
    (line.taxes ?? []).forEach((tax, j) => {
      const code = tax.exemptionCode;
      if (!isNonEmpty(code)) return;
      const path = `lines[${i}].taxes[${j}].exemptionCode`;

      if (tax.percent !== 0) {
        errors.push({
          code: 'TAX_EXEMPTION_REQUIRES_ZERO_PERCENT',
          message: `İstisna kodu '${code}' yalnız oranı 0 olan vergide kullanılır (lines[${i}].taxes[${j}], oran ${tax.percent})`,
          path,
          expected: '0',
          actual: String(tax.percent),
        });
      }

      const def = configManager.getExemption(code);
      if (!def || isExemptionPlacementCheckedOnInvoiceInput(def)) return;
      if (!isExemptionAllowedOnTax(def, tax.code)) {
        errors.push(exemptionTaxTypeMismatch(def, tax.code, path));
      }
    });
  });
  return errors;
}
