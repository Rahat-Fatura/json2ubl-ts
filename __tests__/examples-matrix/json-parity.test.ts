/**
 * Sprint 8e — examples-matrix/ input.ts ≡ input.json paritesi.
 *
 * `examples-matrix/run-all.ts` input.json'u input.ts'den üretir; elle
 * düzenleme (özellikle scaffold --force sonrası kayıp) bu test ile yakalanır.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const MATRIX_DIR = path.join(__dirname, '..', '..', 'examples-matrix', 'valid');

interface ScenarioEntry {
  relPath: string;
}

function discoverScenarios(): ScenarioEntry[] {
  const out: ScenarioEntry[] = [];
  if (!fs.existsSync(MATRIX_DIR)) return out;

  for (const profileDir of fs.readdirSync(MATRIX_DIR, { withFileTypes: true })) {
    if (!profileDir.isDirectory()) continue;
    const profilePath = path.join(MATRIX_DIR, profileDir.name);

    for (const slugDir of fs.readdirSync(profilePath, { withFileTypes: true })) {
      if (!slugDir.isDirectory()) continue;
      if (!fs.existsSync(path.join(profilePath, slugDir.name, 'input.json'))) continue;
      out.push({ relPath: `${profileDir.name}/${slugDir.name}` });
    }
  }

  return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

const scenarios = discoverScenarios();

describe('examples-matrix/valid input.ts ≡ input.json parity', () => {
  if (scenarios.length === 0) {
    it.skip('(no scenarios scaffolded yet)', () => {});
    return;
  }

  for (const { relPath } of scenarios) {
    it(`${relPath}`, async () => {
      const jsonPath = path.join(MATRIX_DIR, relPath, 'input.json');
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

      const mod = await import(`../../examples-matrix/valid/${relPath}/input`);
      const tsData = mod.default ?? mod.input;

      expect(jsonData).toEqual(JSON.parse(JSON.stringify(tsData)));
    });
  }
});
