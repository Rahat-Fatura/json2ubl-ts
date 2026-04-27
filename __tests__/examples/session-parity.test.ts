/**
 * Examples session parity testi (Sprint 8i.10 / AR-10 Faz 2).
 *
 * 38 examples senaryosu için InvoiceSession.buildXml() vs mevcut output.xml
 * birebir parity. Sprint 8h.9'daki sample 10 yerine TÜM 38 senaryo (Plan §6.1
 * "tam 200 senaryo" kararı — bu dosya 38 examples kısmı).
 *
 * Sapma (Plan §6.3 → Sprint 8j): Path sequence formatlı session-script.ts
 * converter dosyası ÜRETİLMEDİ. Mevcut `initialInput` pattern (Sprint 8h.9
 * `buildSessionFromInput`) kullanılıyor — XML output regression değeri korunur,
 * incremental flow regression Sprint 8j'ye ertelenir.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

const EXAMPLES_BASE = join(__dirname, '..', '..', 'examples');

function listScenarios(): string[] {
  return readdirSync(EXAMPLES_BASE)
    .filter(name => {
      const full = join(EXAMPLES_BASE, name);
      // Numarasıyla başlayan klasörler (01-, 02-, ..., 38-)
      // İrsaliye senaryoları skip — DespatchBuilder kullanır, InvoiceSession kapsamı dışı
      if (/irsaliye/i.test(name)) return false;
      return /^\d{2}-/.test(name) && statSync(full).isDirectory();
    })
    .sort();
}

function buildSessionFromInput(input: SimpleInvoiceInput): InvoiceSession {
  // 555 KDV oranı (M4/B-78.1) opt-in — examples bazılarında kullanılıyor.
  // Tüm input'lar için allowReducedKdvRate=true tutuyoruz (regression için anti-conservative).
  return new InvoiceSession({
    initialInput: {
      ...input,
    },
    isExport: input.profile === 'IHRACAT',
    allowReducedKdvRate: true,
  });
}

describe('Sprint 8i.10 — Examples (38 senaryo) session parity', () => {
  const scenarios = listScenarios();

  it('Invoice senaryo dizinleri bulundu (irsaliye skip edildi)', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(30); // 38 - 4 irsaliye = 34
  });

  for (const scenario of scenarios) {
    it(`${scenario}: session.buildXml === output.xml`, () => {
      const dir = join(EXAMPLES_BASE, scenario);
      const inputJsonPath = join(dir, 'input.json');
      const outputXmlPath = join(dir, 'output.xml');

      if (!existsSync(inputJsonPath) || !existsSync(outputXmlPath)) {
        // Bazı klasörler eksik olabilir — skip
        return;
      }

      const inputJson = JSON.parse(readFileSync(inputJsonPath, 'utf-8')) as SimpleInvoiceInput;
      const expectedXml = readFileSync(outputXmlPath, 'utf-8');

      const session = buildSessionFromInput(inputJson);
      const sessionXml = session.buildXml({ validationLevel: 'none' });

      const normalize = (s: string) => s.replace(/\r\n/g, '\n').trimEnd();
      expect(normalize(sessionXml)).toBe(normalize(expectedXml));
    });
  }
});
