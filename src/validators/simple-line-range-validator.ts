/**
 * Satır seviyesi sayısal aralık kontrolü (B-NEW-01, B-NEW-02, B-NEW-03).
 *
 * SimpleLineInput nümerik alanlarının pratik sınırlarını uygular.
 * Plan 8c.8 kapsamında eklendi.
 *
 * Kurallar:
 * - B-NEW-01: `kdvPercent` ∈ [0, 100]
 * - B-NEW-02: `quantity` > 0
 * - B-NEW-03: `taxes[].percent` ∈ [0, 100]
 */

import type { SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationError } from '../errors/ubl-build-error';

export function validateSimpleLineRanges(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  input.lines.forEach((line, i) => {
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
  });

  return errors;
}
