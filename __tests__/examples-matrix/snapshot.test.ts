/**
 * Sprint 8e — examples-matrix/ snapshot regression.
 *
 * `examples-matrix/valid/<profile>/<slug>/` her biri için:
 * - input.ts import edilir
 * - SimpleInvoiceBuilder / DespatchBuilder ile XML üretilir
 * - Üretilen XML diskteki `output.xml` ile exact-match edilmelidir
 *
 * Regenerate için: `npx tsx examples-matrix/run-all.ts`
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SimpleInvoiceBuilder, DespatchBuilder } from '../../src';
import type { SimpleInvoiceInput, DespatchInput } from '../../src';

const MATRIX_DIR = path.join(__dirname, '..', '..', 'examples-matrix', 'valid');

interface ScenarioConfig {
  relPath: string; // <profile>/<slug>
  kind: 'invoice' | 'despatch';
  options: { validationLevel?: 'basic' | 'strict' | 'none'; allowReducedKdvRate?: boolean };
}

function discoverScenarios(): ScenarioConfig[] {
  const out: ScenarioConfig[] = [];
  if (!fs.existsSync(MATRIX_DIR)) return out;

  for (const profileDir of fs.readdirSync(MATRIX_DIR, { withFileTypes: true })) {
    if (!profileDir.isDirectory()) continue;
    const profile = profileDir.name;
    const profilePath = path.join(MATRIX_DIR, profile);

    for (const slugDir of fs.readdirSync(profilePath, { withFileTypes: true })) {
      if (!slugDir.isDirectory()) continue;
      const slug = slugDir.name;
      const scenarioDir = path.join(profilePath, slug);

      // output.xml yoksa atla (scaffold'lanmış ama henüz run-all'lanmamış)
      if (!fs.existsSync(path.join(scenarioDir, 'output.xml'))) continue;

      // meta.json'dan kind + reducedKdvGate çıkar
      const metaPath = path.join(scenarioDir, 'meta.json');
      let kind: 'invoice' | 'despatch' = 'invoice';
      let allowReducedKdvRate = false;
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          if (meta.kind === 'despatch') kind = 'despatch';
          if (meta.dimensions?.reducedKdvGate) allowReducedKdvRate = true;
        } catch {
          // fall through
        }
      }

      const options: ScenarioConfig['options'] = {};
      if (allowReducedKdvRate) options.allowReducedKdvRate = true;

      out.push({ relPath: `${profile}/${slug}`, kind, options });
    }
  }

  return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

const scenarios = discoverScenarios();

describe('examples-matrix/valid snapshot regression', () => {
  if (scenarios.length === 0) {
    it.skip('(no scenarios scaffolded yet)', () => {});
    return;
  }

  for (const { relPath, kind, options } of scenarios) {
    it(`${relPath} — output.xml diskteki ile eşleşir`, async () => {
      const mod = await import(`../../examples-matrix/valid/${relPath}/input`);
      const input = (mod.default ?? mod.input) as SimpleInvoiceInput | DespatchInput;

      const expectedXml = fs.readFileSync(
        path.join(MATRIX_DIR, relPath, 'output.xml'),
        'utf-8',
      );

      let actualXml: string;
      if (kind === 'despatch') {
        const builder = new DespatchBuilder({
          prettyPrint: true,
          validationLevel: 'strict',
          ...options,
        });
        actualXml = builder.build(input as DespatchInput);
      } else {
        const builder = new SimpleInvoiceBuilder({
          prettyPrint: true,
          validationLevel: 'strict',
          ...options,
        });
        actualXml = builder.build(input as SimpleInvoiceInput).xml;
      }

      expect(actualXml).toBe(expectedXml);
    });
  }
});
