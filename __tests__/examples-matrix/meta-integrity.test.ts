/**
 * Sprint 8e — meta.json schema doğrulama.
 *
 * Tüm `examples-matrix/valid/**` ve `examples-matrix/invalid/**` klasörlerinde
 * `meta.json`'ın zorunlu alanları ve şema tutarlılığını kontrol eder.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const MATRIX_ROOT = path.join(__dirname, '..', '..', 'examples-matrix');

interface MetaBase {
  id?: string;
  kind?: string;
  review?: string;
  generatedAt?: string;
}

function discoverMetaPaths(subdir: string): string[] {
  const base = path.join(MATRIX_ROOT, subdir);
  if (!fs.existsSync(base)) return [];
  const out: string[] = [];

  for (const cat of fs.readdirSync(base, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const catPath = path.join(base, cat.name);
    for (const scen of fs.readdirSync(catPath, { withFileTypes: true })) {
      if (!scen.isDirectory()) continue;
      const mp = path.join(catPath, scen.name, 'meta.json');
      if (fs.existsSync(mp)) out.push(mp);
    }
  }
  return out;
}

describe('examples-matrix/ meta.json integrity', () => {
  const validMetaPaths = discoverMetaPaths('valid');
  const invalidMetaPaths = discoverMetaPaths('invalid');
  const allPaths = [...validMetaPaths, ...invalidMetaPaths];

  it('scaffold üretildi (en az 1 meta.json mevcut)', () => {
    expect(allPaths.length).toBeGreaterThan(0);
  });

  it('tüm meta.json dosyaları parse edilebilir JSON', () => {
    for (const p of allPaths) {
      const content = fs.readFileSync(p, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    }
  });

  it('tüm meta.json ortak zorunlu alanları içerir', () => {
    for (const p of allPaths) {
      const meta = JSON.parse(fs.readFileSync(p, 'utf-8')) as MetaBase;
      expect(meta.id, `missing id: ${p}`).toBeTruthy();
      expect(meta.kind, `missing kind: ${p}`).toBeTruthy();
      expect(meta.review, `missing review: ${p}`).toBeTruthy();
      expect(meta.generatedAt, `missing generatedAt: ${p}`).toBeTruthy();
    }
  });

  it('valid meta.json — profile + type + dimensions zorunlu', () => {
    for (const p of validMetaPaths) {
      const meta = JSON.parse(fs.readFileSync(p, 'utf-8'));
      expect(meta.profile, `missing profile: ${p}`).toBeTruthy();
      expect(meta.type, `missing type: ${p}`).toBeTruthy();
      expect(meta.dimensions, `missing dimensions: ${p}`).toBeTruthy();
      expect(meta.variantSlug, `missing variantSlug: ${p}`).toBeTruthy();
    }
  });

  it('invalid meta.json — primaryCode + errorCodes + profileContext zorunlu', () => {
    for (const p of invalidMetaPaths) {
      const meta = JSON.parse(fs.readFileSync(p, 'utf-8'));
      expect(meta.primaryCode, `missing primaryCode: ${p}`).toBeTruthy();
      expect(Array.isArray(meta.errorCodes), `errorCodes not array: ${p}`).toBe(true);
      expect(meta.profileContext, `missing profileContext: ${p}`).toBeTruthy();
      expect(meta.typeContext, `missing typeContext: ${p}`).toBeTruthy();
      expect(['basic', 'strict'], `invalid validationLevel: ${p}`).toContain(meta.validationLevel);
      expect(typeof meta.isMultiError, `isMultiError type: ${p}`).toBe('boolean');
    }
  });

  /**
   * `review` üç değer alır ve üçü FARKLI güç seviyesidir:
   *
   *   auto-ok             — iskele üretti, kimse bakmadı. En ZAYIF sinyal.
   *   needs-manual-check  — bilinen bir şüphe var, notes'ta yazılı.
   *   schematron-verified — çıktı CANLI GİB paketine sorulmuş ve temiz dönmüştür.
   *
   * Üçüncüsü 4.1.5'te eklendi. Gerekçesi somut: 10 tevkifatlı-iade fixture'ı
   * "auto-ok" damgasıyla duruyordu ve HEPSİ GİB'in reddettiği XML üretiyordu
   * (GeneralWithholdingTaxTotalCheck). "İskele ürettiği için doğrudur" bir
   * doğrulama değildir; ayrı bir damga olmadan bu ikisi karışıyordu.
   */
  it('review alanı whitelist ("auto-ok" | "needs-manual-check" | "schematron-verified")', () => {
    for (const p of allPaths) {
      const meta = JSON.parse(fs.readFileSync(p, 'utf-8')) as MetaBase;
      expect(
        ['auto-ok', 'needs-manual-check', 'schematron-verified'],
        `invalid review: ${p}`,
      ).toContain(meta.review);
    }
  });
});
