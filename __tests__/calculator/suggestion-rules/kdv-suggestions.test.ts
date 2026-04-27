/**
 * KDV grubu suggestion kural testleri (Sprint 8i.2 / AR-10 Faz 2).
 *
 * 7 kural × ~3 test ortalaması:
 *  1. kdv/zero-suggest-351
 *  2. kdv/ytb-istisna-suggest-308
 *  3. kdv/ytb-istisna-suggest-339
 *  4. kdv/exemption-mismatch-tax-type
 *  5. kdv/manual-exemption-suggest-line-distribution
 *  6. kdv/reduced-rate-suggest-1
 *  7. kdv/reduced-rate-suggest-8-10
 *
 * Plan'daki Kural 4 (transition state) Sprint 8j'ye ertelendi.
 */

import { describe, it, expect } from 'vitest';
import { KDV_SUGGESTIONS } from '../../../src/calculator/suggestion-rules/kdv-suggestions';
import { deriveUIState } from '../../../src/calculator/invoice-rules';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../../src/calculator/simple-types';

function makeLine(overrides: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return {
    name: 'Test ürün',
    quantity: 1,
    price: 100,
    kdvPercent: 18,
    ...overrides,
  };
}

function makeInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    type: 'SATIS',
    profile: 'TEMELFATURA',
    currencyCode: 'TRY',
    lines: [],
    ...overrides,
  };
}

const findRule = (id: string) => {
  const rule = KDV_SUGGESTIONS.find(r => r.id === id);
  if (!rule) throw new Error(`KDV rule not found: ${id}`);
  return rule;
};

describe('kdv/zero-suggest-351', () => {
  const rule = findRule('kdv/zero-suggest-351');

  it('TEMELFATURA + kdv=0 + kod boş → applies=true, 351 öner', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 0 })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ path: 'lines[0].kdvExemptionCode', value: '351', severity: 'recommended' });
  });

  it('ISTISNA tipi (self-exemption) → applies=false', () => {
    const input = makeInput({ type: 'ISTISNA', lines: [makeLine({ kdvPercent: 0 })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('Kdv=0 + kod=702 (dolu) → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 0, kdvExemptionCode: '702' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('3 satır 2 boş + 1 dolu → 2 öneri (sadece boş olanlar)', () => {
    const input = makeInput({
      lines: [
        makeLine({ kdvPercent: 0 }),
        makeLine({ kdvPercent: 0, kdvExemptionCode: '351' }),
        makeLine({ kdvPercent: 0 }),
      ],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    const result = rule.produce(input, ui);
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('lines[0].kdvExemptionCode');
    expect(result[1].path).toBe('lines[2].kdvExemptionCode');
  });
});

describe('kdv/ytb-istisna-suggest-308', () => {
  const rule = findRule('kdv/ytb-istisna-suggest-308');

  it('YATIRIMTESVIK+ISTISNA + kdv=0 + itemClass=01 → 308 öner', () => {
    const input = makeInput({
      type: 'ISTISNA',
      profile: 'YATIRIMTESVIK',
      lines: [makeLine({ kdvPercent: 0, itemClassificationCode: '01' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ value: '308', severity: 'recommended' });
  });

  it('itemClass=02 → applies=false (Kural 3 alanına girer)', () => {
    const input = makeInput({
      type: 'ISTISNA',
      profile: 'YATIRIMTESVIK',
      lines: [makeLine({ kdvPercent: 0, itemClassificationCode: '02' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('Profile≠YATIRIMTESVIK → applies=false', () => {
    const input = makeInput({
      type: 'ISTISNA',
      profile: 'TEMELFATURA',
      lines: [makeLine({ kdvPercent: 0, itemClassificationCode: '01' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('kdv/ytb-istisna-suggest-339', () => {
  const rule = findRule('kdv/ytb-istisna-suggest-339');

  it('YATIRIMTESVIK+ISTISNA + kdv=0 + itemClass=02 → 339 öner', () => {
    const input = makeInput({
      type: 'ISTISNA',
      profile: 'YATIRIMTESVIK',
      lines: [makeLine({ kdvPercent: 0, itemClassificationCode: '02' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ value: '339', severity: 'recommended' });
  });

  it('itemClass=01 → applies=false', () => {
    const input = makeInput({
      type: 'ISTISNA',
      profile: 'YATIRIMTESVIK',
      lines: [makeLine({ kdvPercent: 0, itemClassificationCode: '01' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('exemptionCode dolu → applies=false', () => {
    const input = makeInput({
      type: 'ISTISNA',
      profile: 'YATIRIMTESVIK',
      lines: [makeLine({ kdvPercent: 0, itemClassificationCode: '02', kdvExemptionCode: '339' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('kdv/exemption-mismatch-tax-type', () => {
  const rule = findRule('kdv/exemption-mismatch-tax-type');

  it('TEVKIFAT + withholding + exemption aynı satır → fix öneri (kaldır)', () => {
    const input = makeInput({
      type: 'TEVKIFAT',
      profile: 'TEMELFATURA',
      lines: [makeLine({ withholdingTaxCode: '602', kdvExemptionCode: '351' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ path: 'lines[0].kdvExemptionCode', value: undefined, severity: 'recommended' });
  });

  it('SATIS tipi → applies=false (sadece TEVKIFAT/YTBTEVKIFAT)', () => {
    const input = makeInput({
      type: 'SATIS',
      lines: [makeLine({ withholdingTaxCode: '602', kdvExemptionCode: '351' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('TEVKIFAT + sadece withholding → applies=false', () => {
    const input = makeInput({
      type: 'TEVKIFAT',
      lines: [makeLine({ withholdingTaxCode: '602' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('kdv/manual-exemption-suggest-line-distribution', () => {
  const rule = findRule('kdv/manual-exemption-suggest-line-distribution');

  it('Satır kdv>0 + kod=351 paradoksu → kdv=0 öner (optional)', () => {
    const input = makeInput({
      lines: [makeLine({ kdvPercent: 18, kdvExemptionCode: '351' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ path: 'lines[0].kdvPercent', value: 0, severity: 'optional' });
  });

  it('Tutarlı: satır kdv=0 + kod=351 → applies=false', () => {
    const input = makeInput({
      lines: [makeLine({ kdvPercent: 0, kdvExemptionCode: '351' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('Satır kdv=18 + kod=702 (351 değil) → applies=false', () => {
    const input = makeInput({
      lines: [makeLine({ kdvPercent: 18, kdvExemptionCode: '702' })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('kdv/reduced-rate-suggest-1', () => {
  const rule = findRule('kdv/reduced-rate-suggest-1');

  it('kdv=1 reduced rate → optional öneri', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 1 })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ severity: 'optional' });
    expect(result[0].reason).toContain('M4');
  });

  it('kdv=18 → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 18 })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('kdv=0 → applies=false (kdv=1 değil)', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 0 })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('kdv/reduced-rate-suggest-8-10', () => {
  const rule = findRule('kdv/reduced-rate-suggest-8-10');

  it('kdv=8 → 20 öneri (kanun değişikliği)', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 8 })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ value: 20, severity: 'optional' });
    expect(result[0].reason).toContain('%8');
  });

  it('kdv=10 → 20 öneri', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 10 })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0].value).toBe(20);
  });

  it('kdv=20 → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 20 })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});
