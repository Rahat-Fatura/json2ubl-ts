/**
 * KDV istisna seçicisi 5.2.0 listelerini DARALTMAZ (ikinci inceleme bulgusu).
 *
 * `getAvailableExemptions(tip)` ve `uiState.availableExemptions` 20 fatura
 * tipinin hepsinde 5.2.0 ile aynı kodları aynı sırada döndürmeli; tek fark
 * 501'in eklenmesidir. 151 (SATIŞ grubu) ve SGK sembolik kodları KDV alt
 * toplamında kabul edilmeye devam ettiği için seçicide kalır. 101–108 ve 001
 * KDV seçicisine girmez; kendi vergi türleriyle istenir.
 *
 * Beklenen listeler 5.2.0 kaynağından (main 374ce6b) dondurulmuştur:
 * `__tests__/fixtures/available-exemptions/5.2.0.json`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { getAvailableExemptions } from '../../src/calculator/invoice-rules';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { InvoiceTypeCode } from '../../src/types/enums';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

interface Frozen {
  tipler: Record<string, { getAvailableExemptions: string[]; uiState: string[] }>;
}

const FROZEN = JSON.parse(
  readFileSync(resolve(__dirname, '../fixtures/available-exemptions/5.2.0.json'), 'utf8'),
) as Frozen;

const TYPES = Object.values(InvoiceTypeCode).filter((v): v is InvoiceTypeCode => typeof v === 'string');
const ADDED = new Set(['501']);

const codes = (xs: Array<{ code: string }>) => xs.map(x => x.code);

describe('KDV istisna seçicisi — 5.2.0 ile aynı, yalnız 501 eklendi', () => {
  it('20 fatura tipinin hepsi dondurulmuş dosyada', () => {
    expect(TYPES).toHaveLength(20);
    expect(Object.keys(FROZEN.tipler).sort()).toEqual([...TYPES].sort());
  });

  for (const type of TYPES) {
    it(`${type}: getAvailableExemptions ve uiState.availableExemptions`, () => {
      const frozen = FROZEN.tipler[type];
      const fn = codes(getAvailableExemptions(type));
      const ui = codes(new InvoiceSession({
        initialInput: {
          id: 'TST2026000000101', uuid: 'a1b2c3d4-0101-4000-8101-000000000101',
          datetime: '2026-04-23T14:00:00', profile: 'TEMELFATURA', currencyCode: 'TRY',
          type: type as SimpleInvoiceInput['type'], lines: [],
        } as Partial<SimpleInvoiceInput>,
      }).uiState.availableExemptions);

      for (const [current, before] of [[fn, frozen.getAvailableExemptions], [ui, frozen.uiState]]) {
        // Çıkan kod yok, sıra korunur; eklenen yalnız 501.
        expect(current.filter(c => !ADDED.has(c))).toEqual(before);
        expect(current.filter(c => !before.includes(c)).every(c => ADDED.has(c))).toBe(true);
      }
      expect(getAvailableExemptions(type, 'KDV')).toEqual(getAvailableExemptions(type));
    });
  }
});
