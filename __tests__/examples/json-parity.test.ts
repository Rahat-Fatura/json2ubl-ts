/**
 * Sprint 8b.9 — input.ts ≡ input.json paritesi.
 *
 * Her senaryo için `input.ts` default export'u `JSON.parse(input.json)` ile
 * deep-equal olmalı. run.ts input.json'u input.ts'den üretiyor; bu test
 * elle düzenleme ile divergence'ı yakalar.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const EXAMPLES_DIR = path.join(__dirname, '..', '..', 'examples');

const slugs = fs
  .readdirSync(EXAMPLES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^(\d{2}|99)-/.test(d.name))
  .map((d) => d.name)
  .sort();

describe('examples/ input.ts ≡ input.json parity', () => {
  for (const slug of slugs) {
    it(`${slug}`, async () => {
      const jsonPath = path.join(EXAMPLES_DIR, slug, 'input.json');
      if (!fs.existsSync(jsonPath)) return; // input.json henüz üretilmemişse atla

      const jsonStr = fs.readFileSync(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonStr);

      const mod = await import(`../../examples/${slug}/input`);
      const tsData = mod.default ?? mod.input;

      expect(jsonData).toEqual(JSON.parse(JSON.stringify(tsData)));
    });
  }
});
