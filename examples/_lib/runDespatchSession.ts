/**
 * `DespatchSession` (basitleştirilmiş irsaliye girişi) senaryolarının ortak
 * runner'ı. `SimpleDespatchInput` alır, oturum üzerinden XML üretir,
 * input.json + output.xml yazar.
 *
 * `runScenario.ts` (fatura `SimpleInvoiceInput`) ve `runDespatch.ts` (ham
 * `DespatchInput`) ile AYNI sözleşme: aynı yan etkiler, aynı hata raporu.
 * Farkı girdi KATMANIDIR — bu runner `Simple*` katmanını uçtan uca kanıtlar.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DespatchSession } from '../../src';
import type { SimpleDespatchInput } from '../../src';

export function runDespatchSession(
  dir: string,
  input: SimpleDespatchInput,
  options?: { validationLevel?: 'none' | 'basic' | 'strict' },
): void {
  const session = new DespatchSession({ initialInput: input });

  try {
    fs.writeFileSync(
      path.join(dir, 'input.json'),
      JSON.stringify(input, null, 2) + '\n',
      'utf-8',
    );
    const xml = session.buildXml({ validationLevel: options?.validationLevel ?? 'strict' });
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
