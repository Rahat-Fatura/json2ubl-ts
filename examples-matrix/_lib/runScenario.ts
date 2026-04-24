/**
 * Sprint 8e — examples-matrix/ valid senaryo runner.
 *
 * Her `examples-matrix/valid/<profile>/<slug>/run.ts` bu helper'ı çağırır.
 *
 * Side-effect:
 * - `input.json` yazılır (input.ts'nin JSON eşleniği)
 * - `output.xml` yazılır (SimpleInvoiceBuilder çıktısı)
 *
 * `examples/_lib/runScenario.ts` ile aynı pattern; tek fark: buradan
 * `../../src` yerine `../../../src` relative (bir seviye daha derinde).
 *
 * Hata durumunda detayları console'a basar ve yeniden `throw` eder.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SimpleInvoiceBuilder } from '../../src';
import type { SimpleInvoiceInput } from '../../src';
import type { SimpleBuilderOptions } from '../../src/calculator/simple-invoice-builder';

export function runScenario(
  dir: string,
  input: SimpleInvoiceInput,
  options?: Partial<SimpleBuilderOptions>,
): void {
  const builder = new SimpleInvoiceBuilder({
    prettyPrint: true,
    validationLevel: 'strict',
    ...options,
  });

  try {
    fs.writeFileSync(
      path.join(dir, 'input.json'),
      JSON.stringify(input, null, 2) + '\n',
      'utf-8',
    );
    const { xml } = builder.build(input);
    fs.writeFileSync(path.join(dir, 'output.xml'), xml, 'utf-8');
    console.log(`    ↳ input.json + output.xml (${xml.length} byte)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`    ↳ HATA: ${msg}`);
    if (err instanceof Error && 'errors' in err) {
      const errors = (err as { errors: Array<{ code: string; message: string; path?: string }> }).errors;
      for (const e of errors) console.error(`      - [${e.code}] ${e.path ?? ''}: ${e.message}`);
    }
    throw err;
  }
}
