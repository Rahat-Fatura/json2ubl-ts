/**
 * Manuel istisna kodu validator (B-NEW-11).
 *
 * Self-exemption tip/profili olmayan fatura tiplerinde (SATIS, TEVKIFAT, SGK,
 * KOMISYONCU vs.) KDV=0 kalem için kullanıcının manuel istisna sebep kodu
 * (ör. 351) vermesi zorunludur. Kütüphane bu kodu otomatik atamaz (B-NEW-11 ile
 * calculator'dan kaldırıldı).
 *
 * Ek kontroller:
 * - Aynı kalemde KDV=0 ile tevkifat kodu birlikte kullanılamaz.
 * - KDV>0 kalem için satır bazı 351 kodu kullanılamaz.
 *
 * Bu validator `SimpleInvoiceInput` üzerinde çalışır; `SimpleInvoiceBuilder`
 * pipeline'ında calculator'dan önce tetiklenir. InvoiceInput tabanlı
 * `InvoiceBuilder` doğrudan kullanıldığında devreye girmez (expert mod).
 */

import type { SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationError } from '../errors/ubl-build-error';
import { isSelfExemptionInvoice } from '../config/self-exemption-types';

export function validateManualExemption(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const type = input.type ?? '';
  const profile = input.profile ?? '';

  // Self-exemption tip/profili: validator pas — bu tipler kendi istisna kodlarını
  // tanımlar, kütüphane ayrı bir manuel 351 kuralı uygulamaz.
  if (isSelfExemptionInvoice(type, profile)) {
    return errors;
  }

  const docExemptionCode = input.kdvExemptionCode;

  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
    const lineExemptionCode = line.kdvExemptionCode ?? docExemptionCode;

    // R1 — Aynı kalemde KDV=0 + tevkifat kodu çakışması
    if (line.kdvPercent === 0 && line.withholdingTaxCode) {
      errors.push({
        code: 'WITHHOLDING_INCOMPATIBLE_WITH_ZERO_KDV',
        message: `Aynı kalemde KDV=0 ile tevkifat kodu birlikte kullanılamaz (lines[${i}])`,
        path: `lines[${i}].withholdingTaxCode`,
        actual: String(line.withholdingTaxCode),
      });
    }

    // R2 — KDV=0 kalem için istisna sebep kodu manuel zorunlu (satır veya belge seviyesi)
    if (line.kdvPercent === 0 && !lineExemptionCode) {
      errors.push({
        code: 'MANUAL_EXEMPTION_REQUIRED_FOR_ZERO_KDV',
        message: `KDV=0 kalem için istisna sebep kodu (ör. 351) manuel verilmeli (lines[${i}])`,
        path: `lines[${i}].kdvExemptionCode`,
        expected: 'Geçerli KDV istisna kodu (ör. 351)',
      });
    }

    // R3 — KDV>0 kalem için satır bazı 351 kodu yasak (şüphe uyandırıcı self-contradiction)
    if (line.kdvPercent > 0 && line.kdvExemptionCode === '351') {
      errors.push({
        code: 'EXEMPTION_351_FORBIDDEN_FOR_NONZERO_KDV',
        message: `'351' kodu KDV>0 kalemde kullanılamaz (lines[${i}])`,
        path: `lines[${i}].kdvExemptionCode`,
        actual: '351',
      });
    }
  }

  return errors;
}
