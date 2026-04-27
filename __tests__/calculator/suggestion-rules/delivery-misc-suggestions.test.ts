/**
 * Delivery + Misc grubu suggestion kural testleri (Sprint 8i.6 / AR-10 Faz 2).
 *
 * Delivery (3 kural):
 *  1. delivery/ihracat-incoterms-required
 *  2. delivery/gtip-format-12-digit
 *  3. delivery/transport-mode-suggest-ihracat
 *
 * Misc (2 kural):
 *  1. currency/exchange-rate-required
 *  2. paymentmeans/iban-format-tr
 *
 * (Plan'daki paymentmeans/payment-means-code-default meansCode required olduğu için atlandı.)
 */

import { describe, it, expect } from 'vitest';
import { DELIVERY_SUGGESTIONS } from '../../../src/calculator/suggestion-rules/delivery-suggestions';
import { MISC_SUGGESTIONS } from '../../../src/calculator/suggestion-rules/misc-suggestions';
import { deriveUIState } from '../../../src/calculator/invoice-rules';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../../src/calculator/simple-types';

function makeLine(overrides: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return { name: 'X', quantity: 1, price: 100, kdvPercent: 18, ...overrides };
}
function makeInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return { type: 'SATIS', profile: 'IHRACAT', currencyCode: 'USD', exchangeRate: 30, lines: [], ...overrides };
}
const findDel = (id: string) => DELIVERY_SUGGESTIONS.find(x => x.id === id)!;
const findMisc = (id: string) => MISC_SUGGESTIONS.find(x => x.id === id)!;

describe('delivery/ihracat-incoterms-required', () => {
  const rule = findDel('delivery/ihracat-incoterms-required');

  it('IHRACAT + boş deliveryTermCode → CIF öner', () => {
    const input = makeInput({ profile: 'IHRACAT', lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ value: 'CIF', severity: 'recommended' });
  });

  it('IHRACAT + dolu deliveryTermCode → applies=false', () => {
    const input = makeInput({
      profile: 'IHRACAT',
      lines: [makeLine({ delivery: { deliveryAddress: { address: 'A', district: 'D', city: 'C', postalCode: '00', country: 'X' }, deliveryTermCode: 'FOB' } })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('TEMELFATURA → applies=false', () => {
    const input = makeInput({ profile: 'TEMELFATURA', lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('delivery/gtip-format-12-digit', () => {
  const rule = findDel('delivery/gtip-format-12-digit');

  it('12 hane GTİP → applies=false', () => {
    const input = makeInput({
      lines: [makeLine({ delivery: { deliveryAddress: { address: 'A', district: 'D', city: 'C', postalCode: '00', country: 'X' }, gtipNo: '123456789012' } })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('10 hane GTİP → fix önerisi', () => {
    const input = makeInput({
      lines: [makeLine({ delivery: { deliveryAddress: { address: 'A', district: 'D', city: 'C', postalCode: '00', country: 'X' }, gtipNo: '1234567890' } })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0].reason).toContain('10');
  });

  it('14 hane GTİP → fix önerisi', () => {
    const input = makeInput({
      lines: [makeLine({ delivery: { deliveryAddress: { address: 'A', district: 'D', city: 'C', postalCode: '00', country: 'X' }, gtipNo: '12345678901234' } })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
  });

  it('Boş gtipNo → applies=false', () => {
    const input = makeInput({ lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('delivery/transport-mode-suggest-ihracat', () => {
  const rule = findDel('delivery/transport-mode-suggest-ihracat');

  it('IHRACAT + boş transportModeCode → 4 öneri (optional)', () => {
    const input = makeInput({ profile: 'IHRACAT', lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ value: '4', severity: 'optional' });
  });

  it('IHRACAT + dolu transportModeCode → applies=false', () => {
    const input = makeInput({
      profile: 'IHRACAT',
      lines: [makeLine({ delivery: { deliveryAddress: { address: 'A', district: 'D', city: 'C', postalCode: '00', country: 'X' }, transportModeCode: '1' } })],
    });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('TEMELFATURA → applies=false', () => {
    const input = makeInput({ profile: 'TEMELFATURA', lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('currency/exchange-rate-required', () => {
  const rule = findMisc('currency/exchange-rate-required');

  it('USD + exchangeRate boş → öneri', () => {
    const input = makeInput({ currencyCode: 'USD', exchangeRate: undefined });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
  });

  it('USD + exchangeRate=30 → applies=false', () => {
    const input = makeInput({ currencyCode: 'USD', exchangeRate: 30 });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('TRY → applies=false (irrelevant)', () => {
    const input = makeInput({ currencyCode: 'TRY' });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('paymentmeans/iban-format-tr', () => {
  const rule = findMisc('paymentmeans/iban-format-tr');

  it('Geçerli TR IBAN → applies=false', () => {
    const input = makeInput({ paymentMeans: { meansCode: '42', accountNumber: 'TR320010000000000000000123' } });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('TR ile başlıyor ama 26 hane değil → öneri', () => {
    const input = makeInput({ paymentMeans: { meansCode: '42', accountNumber: 'TR12345' } });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ path: 'paymentMeans.accountNumber', severity: 'recommended' });
  });

  it('DE IBAN (TR ile başlamıyor) → öneri', () => {
    const input = makeInput({ paymentMeans: { meansCode: '42', accountNumber: 'DE89370400440532013000' } });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
  });

  it('paymentMeans yok → applies=false', () => {
    const input = makeInput({ paymentMeans: undefined });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});
