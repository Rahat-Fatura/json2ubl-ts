/**
 * Examples-matrix tam session parity testi (Sprint 8i.11 / AR-10 Faz 2).
 *
 * Tüm valid senaryolar (123 input.json — plan'da 162 idi, gerçek sayı 123) için
 * `InvoiceSession.buildXml() === output.xml` parity testi. Sprint 8h.9'da
 * sample 10 senaryo + Sprint 8i.10 examples 34 senaryo kapsamı GENİŞLETİLDİ.
 *
 * İrsaliye dizinleri (hksirsaliye, idisirsaliye, temelirsaliye) skip edildi —
 * DespatchBuilder kullanır, InvoiceSession kapsamı dışı.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

const VALID_BASE = join(__dirname, '..', '..', 'examples-matrix', 'valid');

const IRSALIYE_PROFILES = new Set(['hksirsaliye', 'idisirsaliye', 'temelirsaliye']);

interface Scenario {
  profile: string;
  slug: string;
  dir: string;
}

function listScenarios(): Scenario[] {
  const out: Scenario[] = [];
  const profiles = readdirSync(VALID_BASE).filter(p => {
    if (IRSALIYE_PROFILES.has(p)) return false;
    return statSync(join(VALID_BASE, p)).isDirectory();
  });

  for (const profile of profiles) {
    const profileDir = join(VALID_BASE, profile);
    const slugs = readdirSync(profileDir).filter(s =>
      statSync(join(profileDir, s)).isDirectory()
    );
    for (const slug of slugs) {
      const dir = join(profileDir, slug);
      if (existsSync(join(dir, 'input.json')) && existsSync(join(dir, 'output.xml'))) {
        out.push({ profile, slug, dir });
      }
    }
  }
  return out;
}

function buildSessionFromInput(input: SimpleInvoiceInput): InvoiceSession {
  return new InvoiceSession({
    initialInput: { ...input },
    isExport: input.profile === 'IHRACAT',
    allowReducedKdvRate: true,
  });
}

describe('Sprint 8i.11 — Examples-matrix tam session parity (123 invoice senaryo)', () => {
  const scenarios = listScenarios();

  it('Invoice senaryolar bulundu (irsaliye skip edildi)', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(80); // 123 toplam, 30+ kabul
  });

  for (const scenario of scenarios) {
    it(`${scenario.profile}/${scenario.slug}: session.buildXml === output.xml`, () => {
      const inputJson = JSON.parse(readFileSync(join(scenario.dir, 'input.json'), 'utf-8')) as SimpleInvoiceInput;
      const expectedXml = readFileSync(join(scenario.dir, 'output.xml'), 'utf-8');

      const session = buildSessionFromInput(inputJson);
      const sessionXml = session.buildXml({ validationLevel: 'none' });

      const normalize = (s: string) => s.replace(/\r\n/g, '\n').trimEnd();
      expect(normalize(sessionXml)).toBe(normalize(expectedXml));
    });
  }
});
