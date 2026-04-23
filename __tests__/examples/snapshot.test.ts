/**
 * Sprint 8b.9 — Examples snapshot regresyon testi.
 *
 * Her `examples/NN-slug/` için:
 * - input.ts import edilir
 * - run.ts'in kullandığı SimpleInvoiceBuilder / DespatchBuilder + opsiyonlarla XML üretilir
 * - Üretilen XML, diskteki `output.xml` ile exact-match edilmelidir
 *
 * Bu test, gelecekte serializer değişiklikleri örnek çıktıları değiştirirse
 * regresyon fark'ını yakalar. Yeniden üretmek için: `npx tsx examples/run-all.ts`
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SimpleInvoiceBuilder, DespatchBuilder } from '../../src';
import type { SimpleInvoiceInput, DespatchInput } from '../../src';

const EXAMPLES_DIR = path.join(__dirname, '..', '..', 'examples');

interface ScenarioConfig {
  slug: string;
  kind: 'invoice' | 'despatch';
  options: { validationLevel?: 'basic' | 'strict' | 'none'; allowReducedKdvRate?: boolean };
}

/**
 * Klasör adına göre hangi builder ve mod kullanılacağını belirle.
 * run.ts'lerin içeriğini parse etmek yerine statik map.
 */
function discoverScenarios(): ScenarioConfig[] {
  const dirs = fs.readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && /^(\d{2}|99)-/.test(d.name))
    .map(d => d.name)
    .sort();

  return dirs.map(slug => {
    const isDespatch = slug.startsWith('33-') || slug.startsWith('34-') ||
                       slug.startsWith('35-') || slug.startsWith('36-');
    // basic mod kullanan senaryolar (B-NEW-11, B-NEW-12, niş profiller)
    const basicModSlugs = new Set([
      '05-temelfatura-tevkifat',
      '07-temelfatura-ihrackayitli-702',
      '10-ticarifatura-tevkifat-650-dinamik',
      '16-kamu-tevkifat',
      '17-kamu-ihrackayitli',
      '20-yolcu-beraber-istisna-yabanci',
      '31-feature-4171-otv-tevkifati',
      '99-showcase-everything',
    ]);
    const options: ScenarioConfig['options'] = {};
    if (basicModSlugs.has(slug)) options.validationLevel = 'basic';
    if (slug === '30-feature-555-demirbas-kdv') options.allowReducedKdvRate = true;

    return { slug, kind: isDespatch ? 'despatch' as const : 'invoice' as const, options };
  });
}

const scenarios = discoverScenarios();

describe('examples/ snapshot regression', () => {
  for (const { slug, kind, options } of scenarios) {
    it(`${slug} — output.xml diskteki ile eşleşir`, async () => {
      const mod = await import(`../../examples/${slug}/input`);
      const input = (mod.default ?? mod.input) as SimpleInvoiceInput | DespatchInput;

      const expectedXml = fs.readFileSync(
        path.join(EXAMPLES_DIR, slug, 'output.xml'),
        'utf-8',
      );

      let actualXml: string;
      if (kind === 'despatch') {
        const builder = new DespatchBuilder({ prettyPrint: true, validationLevel: 'strict', ...options });
        actualXml = builder.build(input as DespatchInput);
      } else {
        const builder = new SimpleInvoiceBuilder({ prettyPrint: true, validationLevel: 'strict', ...options });
        actualXml = builder.build(input as SimpleInvoiceInput).xml;
      }

      expect(actualXml).toBe(expectedXml);
    });
  }
});
