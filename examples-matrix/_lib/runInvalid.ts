/**
 * Sprint 8e — examples-matrix/ invalid senaryo runner.
 *
 * Her `examples-matrix/invalid/<code>/<slug>/run.ts` bu helper'ı çağırır.
 *
 * Side-effect:
 * - `input.json` yazılır (input.ts'nin JSON eşleniği)
 * - `actual-error.json` yazılır (yakalanan UblBuildError veya ValidationError listesi)
 *
 * Eğer build hata üretmezse, `actual-error.json` `{ errors: [] }` olur ve
 * `invalid-parity.test.ts` expected ⊆ actual kontrolünü fail eder.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SimpleInvoiceBuilder } from '../../src';
import type { SimpleInvoiceInput } from '../../src';

interface ExpectedErrorDoc {
  errors: Array<{ code: string; path?: string; messageIncludes?: string }>;
}

export function runInvalid(
  dir: string,
  input: SimpleInvoiceInput,
  _expected: ExpectedErrorDoc,
): void {
  // validationLevel meta.json'dan okunmuyor — tüm invalid'ler default strict
  const builder = new SimpleInvoiceBuilder({
    prettyPrint: true,
    validationLevel: 'strict',
  });

  fs.writeFileSync(
    path.join(dir, 'input.json'),
    JSON.stringify(input, null, 2) + '\n',
    'utf-8',
  );

  let actual: { errors: Array<{ code: string; path?: string; message: string }> } = { errors: [] };

  try {
    builder.build(input);
    // Build başarılıysa — beklenen hata üretilmedi
    console.log(`    ↳ BUILD BAŞARILI (beklenen hata üretilmedi)`);
  } catch (err) {
    if (err instanceof Error && 'errors' in err) {
      const errs = (err as { errors: Array<{ code: string; path?: string; message: string }> }).errors;
      actual = { errors: errs.map((e) => ({ code: e.code, path: e.path, message: e.message })) };
      console.log(`    ↳ actual-error.json (${errs.length} hata yakalandı)`);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      actual = { errors: [{ code: 'UNKNOWN', message: msg }] };
      console.log(`    ↳ actual-error.json (non-UblBuildError)`);
    }
  }

  fs.writeFileSync(
    path.join(dir, 'actual-error.json'),
    JSON.stringify(actual, null, 2) + '\n',
    'utf-8',
  );
}
