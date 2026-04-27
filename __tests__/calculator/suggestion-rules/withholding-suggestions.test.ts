/**
 * Tevkifat grubu suggestion kural testleri (Sprint 8i.3 / AR-10 Faz 2).
 *
 * 5 kural × ~3 test:
 *  1. withholding/tevkifat-default-codes
 *  2. withholding/650-percent-required
 *  3. withholding/profile-tevkifat-suggests-ticarifatura
 *  4. withholding/exemption-conflict (paralel KDV/exemption-mismatch — farklı path)
 *  5. withholding/ytb-tevkifat-itemclass-required
 */

import { describe, it, expect } from 'vitest';
import { WITHHOLDING_SUGGESTIONS } from '../../../src/calculator/suggestion-rules/withholding-suggestions';
import { deriveUIState } from '../../../src/calculator/invoice-rules';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../../src/calculator/simple-types';

function makeLine(overrides: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return { name: 'X', quantity: 1, price: 100, kdvPercent: 18, ...overrides };
}
function makeInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return { type: 'SATIS', profile: 'TEMELFATURA', currencyCode: 'TRY', lines: [], ...overrides };
}
const findRule = (id: string) => {
  const r = WITHHOLDING_SUGGESTIONS.find(x => x.id === id);
  if (!r) throw new Error(`Rule not found: ${id}`);
  return r;
};

describe('withholding/tevkifat-default-codes', () => {
  const rule = findRule('withholding/tevkifat-default-codes');

  it('TEVKIFAT + boş withholdingTaxCode → 602 öner', () => {
    const input = makeInput({ type: 'TEVKIFAT', profile: 'TICARIFATURA', lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ value: '602', severity: 'recommended' });
  });

  it('YTBTEVKIFAT + boş → 602 öner', () => {
    const input = makeInput({ type: 'YTBTEVKIFAT', profile: 'YATIRIMTESVIK', lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
  });

  it('SATIS tipi → applies=false', () => {
    const input = makeInput({ lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('TEVKIFAT + dolu withholdingTaxCode → applies=false', () => {
    const input = makeInput({ type: 'TEVKIFAT', profile: 'TICARIFATURA', lines: [makeLine({ withholdingTaxCode: '602' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('withholding/650-percent-required', () => {
  const rule = findRule('withholding/650-percent-required');

  it('code=650 + percent boş → öneri', () => {
    const input = makeInput({ type: 'TEVKIFAT', profile: 'TICARIFATURA', lines: [makeLine({ withholdingTaxCode: '650' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ path: 'lines[0].withholdingTaxPercent', severity: 'recommended' });
  });

  it('code=650 + percent dolu → applies=false', () => {
    const input = makeInput({ type: 'TEVKIFAT', profile: 'TICARIFATURA', lines: [makeLine({ withholdingTaxCode: '650', withholdingTaxPercent: 90 })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('code=602 (650 değil) → applies=false', () => {
    const input = makeInput({ type: 'TEVKIFAT', profile: 'TICARIFATURA', lines: [makeLine({ withholdingTaxCode: '602' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('withholding/profile-tevkifat-suggests-ticarifatura', () => {
  const rule = findRule('withholding/profile-tevkifat-suggests-ticarifatura');

  it('TEVKIFAT + TEMELFATURA → TICARIFATURA öneri (optional)', () => {
    const input = makeInput({ type: 'TEVKIFAT', profile: 'TEMELFATURA' });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ path: 'profile', value: 'TICARIFATURA', severity: 'optional' });
  });

  it('TEVKIFAT + TICARIFATURA → applies=false', () => {
    const input = makeInput({ type: 'TEVKIFAT', profile: 'TICARIFATURA' });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('SATIS + TEMELFATURA → applies=false', () => {
    const input = makeInput({ type: 'SATIS', profile: 'TEMELFATURA' });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('withholding/exemption-conflict', () => {
  const rule = findRule('withholding/exemption-conflict');

  it('withholding + exemption aynı satır → withholding kaldır öneri', () => {
    const input = makeInput({ type: 'TEVKIFAT', lines: [makeLine({ withholdingTaxCode: '602', kdvExemptionCode: '351' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ path: 'lines[0].withholdingTaxCode', value: undefined });
  });

  it('Sadece withholding (exemption boş) → applies=false', () => {
    const input = makeInput({ type: 'TEVKIFAT', lines: [makeLine({ withholdingTaxCode: '602' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('Sadece exemption (withholding boş) → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 0, kdvExemptionCode: '351' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('withholding/ytb-tevkifat-itemclass-required', () => {
  const rule = findRule('withholding/ytb-tevkifat-itemclass-required');

  it('YTBTEVKIFAT + itemClass boş → 01 öner', () => {
    const input = makeInput({ type: 'YTBTEVKIFAT', profile: 'YATIRIMTESVIK', lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ value: '01', severity: 'recommended' });
  });

  it('YTBTEVKIFAT + itemClass=01 → applies=false', () => {
    const input = makeInput({ type: 'YTBTEVKIFAT', profile: 'YATIRIMTESVIK', lines: [makeLine({ itemClassificationCode: '01' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('TEVKIFAT (YTBTEVKIFAT değil) → applies=false', () => {
    const input = makeInput({ type: 'TEVKIFAT', profile: 'TICARIFATURA', lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});
