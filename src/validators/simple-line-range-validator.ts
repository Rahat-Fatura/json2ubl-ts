/**
 * Satır seviyesi sayısal aralık kontrolü (B-NEW-01, B-NEW-02, B-NEW-03,
 * B-NEW-v2-04).
 *
 * SimpleLineInput nümerik alanlarının pratik sınırlarını uygular.
 * Plan 8c.8 + 8g.1 kapsamında eklendi.
 *
 * Kurallar:
 * - B-NEW-01: `kdvPercent` ∈ [0, 100]
 * - B-NEW-02: `quantity` > 0
 * - B-NEW-03: `taxes[].percent` ∈ [0, 100]
 * - B-NEW-v2-04 (Sprint 8g.1): withholding kod/oran tutarlılığı
 *   ValidationError formatında dönmeli (önceden calculator raw Error
 *   atıyordu — AR-1 tutarsızlığı).
 */

import type { SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationError } from '../errors/ubl-build-error';
// 4.1.0: statik `WITHHOLDING_TAX_MAP` yerine configManager — merkezî katalogdan
// enjekte edilen tevkifat kodu burada "geçersiz kod" diye reddedilmesin diye.
import { configManager } from '../calculator/config-manager';

export function validateSimpleLineRanges(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  input.lines.forEach((line, i) => {
    /* 🔴 4.2.0 — BİRİM KODU FAIL-OPEN'DI.
     *
     * `resolveUnitCode()` tanımadığı değeri OLDUĞU GİBİ döndürür ve serileştirici
     * onu XML'e yazar; `isValidUnitCode()` ise var olduğu hâlde HİÇBİR
     * doğrulayıcıdan çağrılmıyordu. Sonuç: uydurma birim sessizce belgeye
     * giriyor ve GİB kapıda reddediyor.
     *
     * Canlı kanıt (kaplama seferi): konaklama vergisi fixture'ları `'Gece'`
     * kullanıyordu — bu değer birim listesinde HİÇ YOK, `isValidUnitCode('Gece')`
     * false, buna rağmen 4 profilde belge üretiliyor ve
     * `GeneralUnitCodeCheck :: Geçersiz unitCode niteliği : 'Gece'` ile
     * reddediliyordu. Doğrusu `'DAY'` (Gün).
     *
     * Kontrol `resolveUnitCode` SONRASI yapılır: kullanıcı "Adet" gibi ad
     * yazdığında koda çözülür ve geçerli sayılır. configManager üzerinden
     * okunur ki enjekte edilen özel birimler reddedilmesin. */
    if (line.unitCode !== undefined && line.unitCode !== null && line.unitCode !== '') {
      const cozulen = configManager.resolveUnitCode(line.unitCode);
      if (!configManager.isValidUnitCode(cozulen)) {
        errors.push({
          code: 'INVALID_VALUE',
          message: `Geçersiz birim kodu '${line.unitCode}' (lines[${i}].unitCode) — GİB birim listesinde yok`,
          path: `lines[${i}].unitCode`,
          expected: 'GİB birim kod listesindeki bir değer (ör. C62, KGM, DAY)',
          actual: String(line.unitCode),
        });
      }
    }

    // B-NEW-01 — kdvPercent [0, 100]
    if (line.kdvPercent < 0 || line.kdvPercent > 100) {
      errors.push({
        code: 'INVALID_VALUE',
        message: `KDV oranı 0-100 aralığında olmalı (lines[${i}].kdvPercent=${line.kdvPercent})`,
        path: `lines[${i}].kdvPercent`,
        expected: '0..100',
        actual: String(line.kdvPercent),
      });
    }

    // B-NEW-02 — quantity > 0
    if (line.quantity <= 0) {
      errors.push({
        code: 'INVALID_VALUE',
        message: `Miktar 0'dan büyük olmalı (lines[${i}].quantity=${line.quantity})`,
        path: `lines[${i}].quantity`,
        expected: '> 0',
        actual: String(line.quantity),
      });
    }

    // B-NEW-03 — taxes[].percent [0, 100]
    line.taxes?.forEach((tax, ti) => {
      if (tax.percent < 0 || tax.percent > 100) {
        errors.push({
          code: 'INVALID_VALUE',
          message: `Vergi oranı 0-100 aralığında olmalı (lines[${i}].taxes[${ti}].percent=${tax.percent})`,
          path: `lines[${i}].taxes[${ti}].percent`,
          expected: '0..100',
          actual: String(tax.percent),
        });
      }
    });

    // B-NEW-v2-04 — withholding kod/oran tutarlılığı (Sprint 8g.1)
    if (line.withholdingTaxCode) {
      const whDef = configManager.getWithholdingTax(line.withholdingTaxCode);
      if (!whDef) {
        // Bilinmeyen kod
        errors.push({
          code: 'INVALID_VALUE',
          message: `Geçersiz tevkifat kodu: ${line.withholdingTaxCode}. Tanımlı kodlar için withholding-config.ts dosyasına bakınız.`,
          path: `lines[${i}].withholdingTaxCode`,
          expected: 'WithholdingTaxType listesinden (601-627, 801-825)',
          actual: line.withholdingTaxCode,
        });
      } else if (whDef.dynamicPercent) {
        // 650 dinamik kod — withholdingTaxPercent 0-100 zorunlu
        if (line.withholdingTaxPercent == null) {
          errors.push({
            code: 'MISSING_FIELD',
            message: `Tevkifat kodu ${whDef.code} için 'withholdingTaxPercent' zorunlu (0-100).`,
            path: `lines[${i}].withholdingTaxPercent`,
            expected: '0..100',
          });
        } else if (line.withholdingTaxPercent < 0 || line.withholdingTaxPercent > 100) {
          errors.push({
            code: 'INVALID_VALUE',
            message: `Tevkifat kodu ${whDef.code} için 'withholdingTaxPercent' 0-100 aralığında olmalı (gelen: ${line.withholdingTaxPercent}).`,
            path: `lines[${i}].withholdingTaxPercent`,
            expected: '0..100',
            actual: String(line.withholdingTaxPercent),
          });
        }
      } else {
        // Sabit kod — withholdingTaxPercent verilmemeli
        if (line.withholdingTaxPercent != null) {
          errors.push({
            code: 'INVALID_VALUE',
            message: `Tevkifat kodu ${whDef.code} sabit oranlıdır (%${whDef.percent}); 'withholdingTaxPercent' sadece 650 kodu için kullanılır.`,
            path: `lines[${i}].withholdingTaxPercent`,
            expected: 'undefined (sabit kod için boş bırak)',
            actual: String(line.withholdingTaxPercent),
          });
        }
      }
    }
  });

  return errors;
}
