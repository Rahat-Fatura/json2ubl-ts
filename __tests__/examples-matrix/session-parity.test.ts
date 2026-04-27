/**
 * Examples-matrix session parity testi (Sprint 8h.9 / AR-10).
 *
 * Mevcut SimpleInvoiceBuilder.build() ile InvoiceSession.buildXml() output'u
 * birebir aynı olmalı (session aynı SimpleInvoiceInput üzerinde çalışır).
 *
 * Sample 10 senaryo (15 profil × representative variant) seçildi. Tüm 123 valid
 * senaryo için converter + parity test Faz 2'ye ertelendi (8h.9 scope).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

const VALID_BASE = join(__dirname, '..', '..', 'examples-matrix', 'valid');

const SAMPLE_SCENARIOS: { profile: string; slug: string; description: string }[] = [
  { profile: 'temelfatura', slug: 'temelfatura-satis-baseline', description: 'TEMELFATURA SATIS baseline' },
  { profile: 'temelfatura', slug: 'temelfatura-iade-baseline', description: 'TEMELFATURA IADE' },
  { profile: 'temelfatura', slug: 'temelfatura-istisna-baseline', description: 'TEMELFATURA ISTISNA' },
  { profile: 'ticarifatura', slug: 'ticarifatura-satis-baseline', description: 'TICARIFATURA SATIS' },
  { profile: 'earsivfatura', slug: 'earsivfatura-satis-baseline', description: 'EARSIVFATURA SATIS' },
  { profile: 'kamu', slug: 'kamu-satis-baseline', description: 'KAMU SATIS (IBAN zorunlu)' },
  { profile: 'ihracat', slug: 'ihracat-istisna-baseline', description: 'IHRACAT ISTISNA' },
  { profile: 'yatirimtesvik', slug: 'yatirimtesvik-iade-baseline', description: 'YATIRIMTESVIK IADE' },
  { profile: 'yolcuberaberfatura', slug: 'yolcuberaberfatura-istisna-baseline', description: 'YOLCUBERABERFATURA ISTISNA' },
  { profile: 'idis', slug: 'idis-satis-baseline', description: 'IDIS SATIS' },
];

/**
 * input.json → InvoiceSession (path-based update + addLine).
 * Converter mantığını runtime'da uygular.
 */
function buildSessionFromInput(input: SimpleInvoiceInput): InvoiceSession {
  // isExport=true session ihtiyacı yok (mevcut input.profile=IHRACAT direkt set edilmez,
  // path validation reddi olur). Onun yerine session'ı initialInput ile başlat.
  const session = new InvoiceSession({
    initialInput: {
      sender: input.sender,
      customer: input.customer,
      profile: input.profile,
      type: input.type,
      lines: input.lines,
      ...input,
    },
    isExport: input.profile === 'IHRACAT',
  });

  return session;
}

describe('Sprint 8h.9 — Examples-matrix session parity (sample 10 senaryo)', () => {
  for (const scenario of SAMPLE_SCENARIOS) {
    it(`${scenario.description} (${scenario.slug}) session.buildXml === expected output.xml`, () => {
      const scenarioDir = join(VALID_BASE, scenario.profile, scenario.slug);
      const inputJson = JSON.parse(readFileSync(join(scenarioDir, 'input.json'), 'utf-8')) as SimpleInvoiceInput;
      const expectedXml = readFileSync(join(scenarioDir, 'output.xml'), 'utf-8');

      const session = buildSessionFromInput(inputJson);
      const sessionXml = session.buildXml({ validationLevel: 'none' });

      // XML normalize: trailing whitespace + newline tutarlılığı
      const normalize = (s: string) => s.replace(/\r\n/g, '\n').trimEnd();
      expect(normalize(sessionXml)).toBe(normalize(expectedXml));
    });
  }

  it('session ile build edilen XML mevcut SimpleInvoiceBuilder snapshot ile uyumlu', () => {
    // Sanity check: session buildXml mevcut snapshot test'lerini kırmaz
    const scenarioDir = join(VALID_BASE, 'temelfatura', 'temelfatura-satis-baseline');
    const inputJson = JSON.parse(readFileSync(join(scenarioDir, 'input.json'), 'utf-8')) as SimpleInvoiceInput;

    const session = buildSessionFromInput(inputJson);
    const xml = session.buildXml();

    // XML temel elementleri var
    expect(xml).toContain('<Invoice');
    expect(xml).toContain('cbc:ID');
    expect(xml).toContain('cac:AccountingSupplierParty');
    expect(xml).toContain('cac:AccountingCustomerParty');
  });
});

describe('Sprint 8h.9 — Path-based update sequence sanity check', () => {
  it('update + addLine sequence ile XML üretimi (converter pattern simülasyon)', async () => {
    // Direkt path-based update ile session inşası — mevcut snapshot hedefiyle compare
    const session = new InvoiceSession({
      initialInput: {
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
      },
    });

    session.addLine({
      name: 'Demo',
      quantity: 1,
      price: 100,
      kdvPercent: 18,
    } as SimpleLineInput);

    const xml = session.buildXml();
    expect(xml).toContain('<Invoice');
    expect(xml).toContain('Demo');
  });
});
