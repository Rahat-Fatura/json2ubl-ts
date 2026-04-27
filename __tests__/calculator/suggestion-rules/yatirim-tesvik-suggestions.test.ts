/**
 * YATIRIMTESVIK grubu suggestion kural testleri (Sprint 8i.5 / AR-10 Faz 2).
 *
 * 4 kural × ~3 test:
 *  1. yatirim-tesvik/itemclass-default
 *  2. yatirim-tesvik/makine-traceid-required
 *  3. yatirim-tesvik/makine-serialid-required
 *  4. yatirim-tesvik/insaat-suggest-itemclass-02 (heuristic, R5 false positive izleme)
 */

import { describe, it, expect } from 'vitest';
import { YATIRIM_TESVIK_SUGGESTIONS } from '../../../src/calculator/suggestion-rules/yatirim-tesvik-suggestions';
import { deriveUIState } from '../../../src/calculator/invoice-rules';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../../src/calculator/simple-types';

function makeLine(overrides: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return { name: 'CNC Tezgahı', quantity: 1, price: 100000, kdvPercent: 0, ...overrides };
}
function makeInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return { type: 'ISTISNA', profile: 'YATIRIMTESVIK', currencyCode: 'TRY', lines: [], ...overrides };
}
const findRule = (id: string) => {
  const r = YATIRIM_TESVIK_SUGGESTIONS.find(x => x.id === id);
  if (!r) throw new Error(`Rule not found: ${id}`);
  return r;
};

describe('yatirim-tesvik/itemclass-default', () => {
  const rule = findRule('yatirim-tesvik/itemclass-default');

  it('YATIRIMTESVIK + boş itemClass + insaat hint YOK → 01 öner', () => {
    const input = makeInput({ lines: [makeLine({ name: 'CNC Tezgahı' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ value: '01', severity: 'recommended' });
  });

  it('YATIRIMTESVIK + itemClass=01 → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ itemClassificationCode: '01' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('YATIRIMTESVIK + boş itemClass + name="İnşaat malzemesi" → applies=false (Kural 4 alanı)', () => {
    const input = makeInput({ lines: [makeLine({ name: 'İnşaat malzemesi' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('Profile≠YATIRIMTESVIK → applies=false', () => {
    const input = makeInput({ profile: 'TEMELFATURA', lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('yatirim-tesvik/makine-traceid-required', () => {
  const rule = findRule('yatirim-tesvik/makine-traceid-required');

  it('itemClass=01 + traceId boş → uyarı', () => {
    const input = makeInput({ lines: [makeLine({ itemClassificationCode: '01' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ path: 'lines[0].productTraceId', severity: 'recommended' });
  });

  it('itemClass=01 + traceId dolu → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ itemClassificationCode: '01', productTraceId: 'TRC001' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('itemClass=02 → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ itemClassificationCode: '02' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('yatirim-tesvik/makine-serialid-required', () => {
  const rule = findRule('yatirim-tesvik/makine-serialid-required');

  it('itemClass=01 + serialId boş → uyarı', () => {
    const input = makeInput({ lines: [makeLine({ itemClassificationCode: '01' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ path: 'lines[0].serialId' });
  });

  it('itemClass=01 + serialId dolu → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ itemClassificationCode: '01', serialId: 'SN001' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('itemClass=02 → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ itemClassificationCode: '02' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('yatirim-tesvik/insaat-suggest-itemclass-02 (heuristic)', () => {
  const rule = findRule('yatirim-tesvik/insaat-suggest-itemclass-02');

  it('name="İnşaat malzemesi" + boş itemClass → 02 (optional)', () => {
    const input = makeInput({ lines: [makeLine({ name: 'İnşaat malzemesi' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ value: '02', severity: 'optional' });
  });

  it('description="yapı kimyasalları" + boş itemClass → 02', () => {
    const input = makeInput({ lines: [makeLine({ name: 'Boya', description: 'yapı kimyasalları' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
  });

  it('name="Makine" + boş itemClass → applies=false (Kural 1 alanı)', () => {
    const input = makeInput({ lines: [makeLine({ name: 'Makine' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('itemClass dolu → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ name: 'İnşaat', itemClassificationCode: '02' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});
