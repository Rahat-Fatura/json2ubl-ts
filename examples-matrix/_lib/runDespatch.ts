/**
 * Sprint 8e — examples-matrix/ despatch senaryo runner.
 *
 * `examples/_lib/runDespatch.ts`'in matrix klonu. Side-effect:
 * - `input.json` yazılır
 * - `output.xml` yazılır (DespatchBuilder çıktısı)
 */

import * as fs from 'fs';
import * as path from 'path';
import { DespatchBuilder } from '../../src';
import type { DespatchInput } from '../../src';

export function runDespatch(dir: string, input: DespatchInput): void {
  const builder = new DespatchBuilder({
    prettyPrint: true,
    validationLevel: 'strict',
  });

  try {
    fs.writeFileSync(
      path.join(dir, 'input.json'),
      JSON.stringify(input, null, 2) + '\n',
      'utf-8',
    );
    const xml = builder.build(input);
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
