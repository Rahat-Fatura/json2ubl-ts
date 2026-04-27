/**
 * SuggestionEngine + diff algoritması testleri (Sprint 8i.1 / AR-10 Faz 2).
 *
 * runSuggestionEngine: pure function, full liste döner (T-2, T-7).
 * diffSuggestions: primary key (`ruleId+path`) bazlı, added/changed/removed (T-2).
 *
 * 8i.1 skeleton — manifest boş (kurallar 8i.2'den itibaren). Bu testler:
 * - Engine boş manifest ile çağrılabilir
 * - Diff algoritması 24 kural eklendiğinde de doğru çalışır (unit-level)
 */

import { describe, it, expect } from 'vitest';
import { runSuggestionEngine, diffSuggestions } from '../../src/calculator/suggestion-engine';
import type { Suggestion } from '../../src/calculator/suggestion-types';
import { deriveUIState } from '../../src/calculator/invoice-rules';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

function makeInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    type: 'SATIS',
    profile: 'TEMELFATURA',
    currencyCode: 'TRY',
    lines: [],
    ...overrides,
  };
}

function makeSug(partial: Partial<Suggestion> & Pick<Suggestion, 'ruleId' | 'path'>): Suggestion {
  return {
    value: '351',
    reason: 'test',
    severity: 'recommended',
    ...partial,
  };
}

describe('runSuggestionEngine — skeleton (8i.1, manifest boş)', () => {
  it('boş manifest + boş input → boş array döner', () => {
    const input = makeInput();
    const ui = deriveUIState(input.type, input.profile);
    expect(runSuggestionEngine(input, ui)).toEqual([]);
  });

  it('boş manifest + 100 satır input → boş array döner (kural yok)', () => {
    const input = makeInput({
      lines: Array.from({ length: 100 }, () => ({ name: 'X', quantity: 1, price: 10, kdvPercent: 0 })),
    });
    const ui = deriveUIState(input.type, input.profile);
    expect(runSuggestionEngine(input, ui)).toEqual([]);
  });

  it('side-effect yok — aynı input 2x çağrı, sonuç aynı', () => {
    const input = makeInput();
    const ui = deriveUIState(input.type, input.profile);
    const r1 = runSuggestionEngine(input, ui);
    const r2 = runSuggestionEngine(input, ui);
    expect(r1).toEqual(r2);
  });
});

describe('diffSuggestions — added/changed/removed primary key bazlı (T-2)', () => {
  it('boş prev + boş next → tüm diff boş', () => {
    const result = diffSuggestions([], []);
    expect(result).toEqual({ added: [], changed: [], removed: [] });
  });

  it('boş prev + 1 next → added 1, changed/removed 0', () => {
    const next = [makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode' })];
    const result = diffSuggestions([], next);
    expect(result.added).toHaveLength(1);
    expect(result.changed).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });

  it('1 prev + boş next → removed 1, added/changed 0 (T-4: emit edilmez ama hesaplanır)', () => {
    const prev = [makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode' })];
    const result = diffSuggestions(prev, []);
    expect(result.removed).toHaveLength(1);
    expect(result.added).toHaveLength(0);
    expect(result.changed).toHaveLength(0);
  });

  it('aynı prev + next (key + value + reason aynı) → diff boş', () => {
    const s = makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode', value: '351' });
    const result = diffSuggestions([s], [s]);
    expect(result).toEqual({ added: [], changed: [], removed: [] });
  });

  it('aynı key + farklı value → changed', () => {
    const prev = [makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode', value: '351' })];
    const next = [makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode', value: '308' })];
    const result = diffSuggestions(prev, next);
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0].value).toBe('308');
    expect(result.added).toHaveLength(0);
  });

  it('aynı key + farklı reason → changed (R3 mitigation)', () => {
    const prev = [makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode', reason: 'A' })];
    const next = [makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode', reason: 'B' })];
    const result = diffSuggestions(prev, next);
    expect(result.changed).toHaveLength(1);
  });

  it('aynı key + farklı severity → changed', () => {
    const prev = [makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode', severity: 'recommended' })];
    const next = [makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode', severity: 'optional' })];
    const result = diffSuggestions(prev, next);
    expect(result.changed).toHaveLength(1);
  });

  it('aynı ruleId farklı path → ayrı key → 2 ayrı suggestion', () => {
    const prev: Suggestion[] = [];
    const next = [
      makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode' }),
      makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[1].kdvExemptionCode' }),
    ];
    const result = diffSuggestions(prev, next);
    expect(result.added).toHaveLength(2);
  });

  it('aynı path farklı ruleId → ayrı key (paralel kurallar)', () => {
    const prev: Suggestion[] = [];
    const next = [
      makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode' }),
      makeSug({ ruleId: 'kdv/exemption-mismatch-tax-type', path: 'lines[0].kdvExemptionCode' }),
    ];
    const result = diffSuggestions(prev, next);
    expect(result.added).toHaveLength(2);
  });

  it('karma diff: 1 added + 1 changed + 1 removed + 1 unchanged', () => {
    const unchanged = makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode', value: '351' });
    const changedPrev = makeSug({ ruleId: 'kdv/exemption-mismatch', path: 'lines[1].kdvExemptionCode', value: '702' });
    const changedNext = makeSug({ ruleId: 'kdv/exemption-mismatch', path: 'lines[1].kdvExemptionCode', value: '351' });
    const removedSug = makeSug({ ruleId: 'kdv/old-rule', path: 'lines[2].kdvExemptionCode' });
    const addedSug = makeSug({ ruleId: 'kdv/new-rule', path: 'lines[3].kdvExemptionCode' });

    const prev = [unchanged, changedPrev, removedSug];
    const next = [unchanged, changedNext, addedSug];
    const result = diffSuggestions(prev, next);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].ruleId).toBe('kdv/new-rule');
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0].value).toBe('351');
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].ruleId).toBe('kdv/old-rule');
  });

  it('object reference farklı ama value/reason/severity aynı → diff boş (R3 mitigation)', () => {
    const prev = [makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode', value: '351', reason: 'X' })];
    const next = [makeSug({ ruleId: 'kdv/zero-suggest-351', path: 'lines[0].kdvExemptionCode', value: '351', reason: 'X' })];
    expect(prev[0]).not.toBe(next[0]);
    const result = diffSuggestions(prev, next);
    expect(result).toEqual({ added: [], changed: [], removed: [] });
  });

  it('boş manifest scenario — full eval cycle prev=[] next=[] → emit edilecek bir şey yok', () => {
    const input = makeInput();
    const ui = deriveUIState(input.type, input.profile);
    const next = runSuggestionEngine(input, ui);
    const result = diffSuggestions([], next);
    expect(result.added.length + result.changed.length).toBe(0);
  });

  it('primary key formatı `ruleId::path` — bracket notation desteği', () => {
    const a = makeSug({ ruleId: 'a', path: 'lines[0].x', value: '1' });
    const b = makeSug({ ruleId: 'a', path: 'lines[0].x', value: '2' });
    const result = diffSuggestions([a], [b]);
    expect(result.changed).toHaveLength(1);
    expect(result.added).toHaveLength(0);
  });

  it('removed sayısı diff sonucunda doğru hesaplanır (T-4 internal)', () => {
    const prev = [
      makeSug({ ruleId: 'r1', path: 'p1' }),
      makeSug({ ruleId: 'r2', path: 'p2' }),
      makeSug({ ruleId: 'r3', path: 'p3' }),
    ];
    const next = [makeSug({ ruleId: 'r1', path: 'p1' })];
    const result = diffSuggestions(prev, next);
    expect(result.removed).toHaveLength(2);
    expect(result.removed.map(s => s.ruleId).sort()).toEqual(['r2', 'r3']);
  });
});
