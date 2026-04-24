/**
 * Sprint 8e — examples-matrix/ invalid parity.
 *
 * Her invalid senaryoda expected-error.json ⊆ actual-error.json.
 *
 * - Her expected.error için actual.errors içinde code eşleşen bir hata bulunmalı
 * - `path` belirtilmişse eşleşmeli
 * - `messageIncludes` belirtilmişse actual message bu substring'i içermeli
 *
 * Regenerate için: `npx tsx examples-matrix/run-all.ts --invalid-only`
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const MATRIX_DIR = path.join(__dirname, '..', '..', 'examples-matrix', 'invalid');

interface ExpectedError {
  code: string;
  path?: string;
  messageIncludes?: string;
}
interface ActualError {
  code: string;
  path?: string;
  message: string;
}

interface ScenarioEntry {
  relPath: string;
}

function discoverScenarios(): ScenarioEntry[] {
  const out: ScenarioEntry[] = [];
  if (!fs.existsSync(MATRIX_DIR)) return out;

  for (const codeDir of fs.readdirSync(MATRIX_DIR, { withFileTypes: true })) {
    if (!codeDir.isDirectory()) continue;
    const codePath = path.join(MATRIX_DIR, codeDir.name);
    for (const slugDir of fs.readdirSync(codePath, { withFileTypes: true })) {
      if (!slugDir.isDirectory()) continue;
      const actualPath = path.join(codePath, slugDir.name, 'actual-error.json');
      if (!fs.existsSync(actualPath)) continue;
      out.push({ relPath: `${codeDir.name}/${slugDir.name}` });
    }
  }

  return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

const scenarios = discoverScenarios();

describe('examples-matrix/invalid expected ⊆ actual', () => {
  if (scenarios.length === 0) {
    it.skip('(no invalid scenarios scaffolded yet)', () => {});
    return;
  }

  for (const { relPath } of scenarios) {
    it(`${relPath}`, () => {
      const expectedPath = path.join(MATRIX_DIR, relPath, 'expected-error.json');
      const actualPath = path.join(MATRIX_DIR, relPath, 'actual-error.json');

      const expectedDoc = JSON.parse(fs.readFileSync(expectedPath, 'utf-8')) as { errors: ExpectedError[] };
      const actualDoc = JSON.parse(fs.readFileSync(actualPath, 'utf-8')) as { errors: ActualError[] };

      // Her expected error için actual'da eşleşen var mı?
      for (const exp of expectedDoc.errors) {
        const match = actualDoc.errors.find((a) => {
          if (a.code !== exp.code) return false;
          if (exp.path && a.path !== exp.path) return false;
          if (exp.messageIncludes && !a.message.includes(exp.messageIncludes)) return false;
          return true;
        });
        expect(match, `Expected error not found: ${JSON.stringify(exp)} — actual: ${JSON.stringify(actualDoc.errors)}`).toBeDefined();
      }
    });
  }
});
