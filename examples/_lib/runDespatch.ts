/**
 * İrsaliye (e-Despatch) senaryolarının ortak runner'ı. low-level `DespatchInput`
 * alır, `DespatchBuilder` ile XML üretir, input.json + output.xml yazar.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DespatchBuilder } from '../../src';
import type { DespatchInput } from '../../src';
import type { BuilderOptions } from '../../src/types/builder-options';

export function runDespatch(
  dir: string,
  input: DespatchInput,
  options?: Partial<BuilderOptions>,
): void {
  const builder = new DespatchBuilder({
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
