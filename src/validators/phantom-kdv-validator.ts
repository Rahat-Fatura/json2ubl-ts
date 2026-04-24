/**
 * Phantom KDV (Vazgeçilen KDV Tutarı) validator — M12 (Sprint 8d.5).
 *
 * YATIRIMTESVIK+ISTISNA ve EARSIVFATURA+YTBISTISNA kombinasyonlarında
 * aşağıdaki girişi zorunlular:
 *
 *  - Her satırda `0 < kdvPercent ≤ 100`. `kdvPercent=0` yasak —
 *    phantom durumu "Vazgeçilen KDV Tutarı" gösterimi demektir;
 *    KDV matematiği fiilen hesaplanmalı (dip'e eklenmeyecek olsa bile).
 *  - Her satırda exemption code zorunlu: ItemClassificationCode=01 → 308,
 *    =02 → 339. 03/04 kategorilerinde phantom (ve dolayısıyla ISTISNA tipi)
 *    yasak (GİB YATIRIMTESVIK Fatura Teknik Kılavuzu v1.1 §4).
 *  - Satır bazlı exemption code yoksa belge seviyesi `kdvExemptionCode`
 *    fallback kullanılır.
 *
 * Bu validator `SimpleInvoiceInput` üzerinde çalışır; `SimpleInvoiceBuilder`
 * pipeline'ında calculator'dan önce tetiklenir.
 */

import type { SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationError } from '../errors/ubl-build-error';
import {
  isPhantomKdvCombination,
  phantomKdvExemptionCodeFor,
  PHANTOM_KDV_EXEMPTION_CODES,
  PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES,
} from '../calculator/phantom-kdv-rules';

export function validatePhantomKdv(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const profile = input.profile ?? '';
  const type = input.type ?? '';

  if (!isPhantomKdvCombination(profile, type)) {
    return errors;
  }

  const docExemptionCode = input.kdvExemptionCode;

  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
    const lineExemptionCode = line.kdvExemptionCode ?? docExemptionCode;
    const itemCls = line.itemClassificationCode;

    // R1 — kdvPercent > 0 zorunlu (phantom için KDV matematiği hesaplanmalı)
    if (typeof line.kdvPercent !== 'number' || line.kdvPercent <= 0 || line.kdvPercent > 100) {
      errors.push({
        code: 'YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT',
        message: `${profile}+${type} kombinasyonunda her satırda 0 < kdvPercent ≤ 100 zorunlu; kdvPercent=0 phantom KDV için yasak (lines[${i}])`,
        path: `lines[${i}].kdvPercent`,
        actual: String(line.kdvPercent),
        expected: '0 < kdvPercent <= 100',
      });
    }

    // R2 — exemption code zorunlu (308 veya 339)
    if (!lineExemptionCode) {
      errors.push({
        code: 'YTB_ISTISNA_REQUIRES_EXEMPTION_CODE',
        message: `${profile}+${type} kombinasyonunda her satırda exemption code (308/339) zorunlu (lines[${i}])`,
        path: `lines[${i}].kdvExemptionCode`,
        expected: '308 veya 339',
      });
    } else if (!PHANTOM_KDV_EXEMPTION_CODES.has(lineExemptionCode)) {
      errors.push({
        code: 'YTB_ISTISNA_REQUIRES_EXEMPTION_CODE',
        message: `${profile}+${type} kombinasyonunda exemption code yalnız 308 (Makine/01) veya 339 (İnşaat/02) olabilir (lines[${i}])`,
        path: `lines[${i}].kdvExemptionCode`,
        actual: lineExemptionCode,
        expected: '308 veya 339',
      });
    }

    // R3 — ItemClassificationCode 03 (Arsa/Arazi) ve 04 (Diğer) phantom'da yasak
    if (itemCls && !PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES.has(itemCls)) {
      errors.push({
        code: 'YTB_ISTISNA_FORBIDDEN_ITEM_CLASSIFICATION',
        message: `${profile}+${type} yalnız ItemClassificationCode=01 (Makine) veya 02 (İnşaat) ile düzenlenebilir; 03 ve 04 yasak (PDF §4) (lines[${i}])`,
        path: `lines[${i}].itemClassificationCode`,
        actual: itemCls,
        expected: '01 veya 02',
      });
    }

    // R4 — ItemClassificationCode ↔ exemption code eşleşmesi (01→308, 02→339)
    if (itemCls && lineExemptionCode && PHANTOM_KDV_EXEMPTION_CODES.has(lineExemptionCode)) {
      const expectedCode = phantomKdvExemptionCodeFor(itemCls);
      if (expectedCode && expectedCode !== lineExemptionCode) {
        errors.push({
          code: 'YTB_ISTISNA_EXEMPTION_CODE_MISMATCH',
          message: `ItemClassificationCode=${itemCls} için exemption code ${expectedCode} beklenir, ${lineExemptionCode} verilmiş (lines[${i}])`,
          path: `lines[${i}].kdvExemptionCode`,
          actual: lineExemptionCode,
          expected: expectedCode,
        });
      }
    }
  }

  return errors;
}
