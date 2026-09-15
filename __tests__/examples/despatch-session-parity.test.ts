/**
 * `examples/irsaliye-oturum-sevk` uçtan uca regresyon testi.
 *
 * Fatura emsali `__tests__/examples/session-parity.test.ts`: orada
 * `InvoiceSession.buildXml()` diskteki `output.xml` ile birebir eşleşir; burada
 * aynı çıpa `DespatchSession` için kurulur. Ek olarak `input.ts ≡ input.json`
 * paritesi de bu dosyada çünkü senaryo, numaralı senaryoların keşif kuralına
 * (`/^(\d{2}|99)-/`) BİLEREK girmez — klasör `DespatchSession` ile kurulur,
 * numaralı `33..36-irsaliye-*` senaryoları ise ham `DespatchBuilder` ile.
 *
 * Yeniden üretmek için: `npx tsx examples/irsaliye-oturum-sevk/run.ts`
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DespatchSession } from '../../src/calculator/despatch-session';
import type { SimpleDespatchInput } from '../../src/calculator/simple-despatch-types';
import scenarioInput from '../../examples/irsaliye-oturum-sevk/input';

const SCENARIO_DIR = join(__dirname, '..', '..', 'examples', 'irsaliye-oturum-sevk');

const normalize = (s: string) => s.replace(/\r\n/g, '\n').trimEnd();

describe('examples/irsaliye-oturum-sevk — DespatchSession uçtan uca', () => {
  it('input.ts ≡ input.json', () => {
    const json = JSON.parse(readFileSync(join(SCENARIO_DIR, 'input.json'), 'utf-8'));
    expect(json).toEqual(JSON.parse(JSON.stringify(scenarioInput)));
  });

  it('session.buildXml() === diskteki output.xml', () => {
    const input = JSON.parse(
      readFileSync(join(SCENARIO_DIR, 'input.json'), 'utf-8'),
    ) as SimpleDespatchInput;
    const expected = readFileSync(join(SCENARIO_DIR, 'output.xml'), 'utf-8');

    const session = new DespatchSession({ initialInput: input });
    expect(normalize(session.buildXml({ validationLevel: 'strict' }))).toBe(normalize(expected));
  });

  it('senaryo strict doğrulamadan geçer (hiç uyarı üretmez)', () => {
    const session = new DespatchSession({ initialInput: scenarioInput });
    expect(session.validate()).toEqual([]);
  });

  it('`Simple*` katmanının türettiği alanlar XML\'e ULAŞIR', () => {
    const xml = readFileSync(join(SCENARIO_DIR, 'output.xml'), 'utf-8');
    // tarih/saat bölünmesi (B-18)
    expect(xml).toContain('<cbc:IssueDate>2026-04-23</cbc:IssueDate>');
    expect(xml).toContain('<cbc:IssueTime>10:00:00</cbc:IssueTime>');
    expect(xml).toContain('<cbc:ActualDespatchTime>14:00:00</cbc:ActualDespatchTime>');
    // VKN → PartyName (ortak taraf eşleyicisi)
    expect(xml).toContain('<cbc:ID schemeID="VKN">1234567890</cbc:ID>');
    // plaka şema varsayılanı
    expect(xml).toContain('<cbc:LicensePlateID schemeID="PLAKA">34ABC123</cbc:LicensePlateID>');
    // satır numarası indeksten türetildi
    expect(xml).toContain('<cbc:ID>1</cbc:ID>');
    expect(xml).toContain('<cbc:ID>2</cbc:ID>');
    // düzleştirilmiş beyan değeri
    expect(xml).toContain('<cbc:ValueAmount currencyID="TRY">12500</cbc:ValueAmount>');
    // B-102: kalem açıklaması ve notu sessizce düşmedi
    expect(xml).toContain('<cbc:Description>Kırılacak eşya</cbc:Description>');
    expect(xml).toContain('<cbc:Note>Üst üste konmasın</cbc:Note>');
  });
});
