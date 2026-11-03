/**
 * IHRACKAYITLI grubu suggestion kural testleri (Sprint 8i.4 / AR-10 Faz 2).
 *
 * 3 kural × ~3 test:
 *  1. ihrackayitli/702-default-suggestion
 *  2. ihrackayitli/702-gtip-required
 *  3. ihrackayitli/702-alicidib-required
 */

import { describe, it, expect } from 'vitest';
import { IHRACKAYITLI_SUGGESTIONS } from '../../../src/calculator/suggestion-rules/ihrackayitli-suggestions';
import { deriveUIState } from '../../../src/calculator/invoice-rules';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../../src/calculator/simple-types';

function makeLine(overrides: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return { name: 'X', quantity: 1, price: 100, kdvPercent: 18, ...overrides };
}
function makeInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return { type: 'IHRACKAYITLI', profile: 'TICARIFATURA', currencyCode: 'TRY', lines: [], ...overrides };
}
const findRule = (id: string) => {
  const r = IHRACKAYITLI_SUGGESTIONS.find(x => x.id === id);
  if (!r) throw new Error(`Rule not found: ${id}`);
  return r;
};

describe('ihrackayitli/702-default-suggestion', () => {
  const rule = findRule('ihrackayitli/702-default-suggestion');

  it('IHRACKAYITLI + boş kdvExemptionCode → 702 öner', () => {
    const input = makeInput({ lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ value: '702', severity: 'recommended' });
  });

  it('IHRACKAYITLI + dolu kdvExemptionCode → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ kdvExemptionCode: '702' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('SATIS tipi → applies=false', () => {
    const input = makeInput({ type: 'SATIS', profile: 'TEMELFATURA', lines: [makeLine()] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('ihrackayitli/702-gtip-required', () => {
  const rule = findRule('ihrackayitli/702-gtip-required');

  it('IHRACKAYITLI + 702 + gtipNo boş → hatırlatma', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 0, kdvExemptionCode: '702' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ path: 'lines[0].delivery.gtipNo', severity: 'recommended' });
  });

  it('IHRACKAYITLI + 702 + gtipNo dolu → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ kdvExemptionCode: '702', delivery: { gtipNo: '123456789012' } })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('IHRACKAYITLI + 702 olmayan kod → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ kdvExemptionCode: '351' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  /* 5.2.0 — tek kapsam (`isIhracKayitli702Invoice`). Hatırlatma 702 KAPSAMINDAKİ
   * belgenin BÜTÜN satırlarına yapılır; GİB `TaxExemptionReasonCodeCheck` özette 702
   * varsa her satırda GTİP ister. */
  it('karışık 702 + 701 → İKİ satıra da hatırlatma (701 satırı da GTİP ister)', () => {
    const input = makeInput({ lines: [
      makeLine({ kdvPercent: 0, kdvExemptionCode: '702' }),
      makeLine({ kdvPercent: 0, kdvExemptionCode: '701' }),
    ] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    expect(rule.produce(input, ui).map(s => s.path)).toEqual([
      'lines[0].delivery.gtipNo',
      'lines[1].delivery.gtipNo',
    ]);
  });

  it('belge kodu 702, satırlar kodsuz → hatırlatma (eskiden susuyordu)', () => {
    const input = makeInput({ kdvExemptionCode: '702', lines: [makeLine({ kdvPercent: 0 })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
  });

  it('belge kodu 702 ama bütün satırlar 701 → applies=false (702 XML\'e yazılmaz)', () => {
    const input = makeInput({ kdvExemptionCode: '702', lines: [makeLine({ kdvPercent: 0, kdvExemptionCode: '701' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('KDV\'li satırın kendi 702 kodu kapsamı AÇMAZ (kod XML\'e yazılmaz, portalda seçici gizli)', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 18, kdvExemptionCode: '702' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});

describe('ihrackayitli/702-alicidib-required', () => {
  const rule = findRule('ihrackayitli/702-alicidib-required');

  it('IHRACKAYITLI + 702 + alicidibsatirkod boş → hatırlatma', () => {
    const input = makeInput({ lines: [makeLine({ kdvPercent: 0, kdvExemptionCode: '702' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(true);
    const result = rule.produce(input, ui);
    expect(result[0]).toMatchObject({ path: 'lines[0].delivery.alicidibsatirkod' });
  });

  it('IHRACKAYITLI + 702 + alicidibsatirkod dolu → applies=false', () => {
    const input = makeInput({ lines: [makeLine({ kdvExemptionCode: '702', delivery: { alicidibsatirkod: 'AK001' } })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('SATIS + 702 (var ama tip değil) → applies=false', () => {
    const input = makeInput({ type: 'SATIS', profile: 'TEMELFATURA', lines: [makeLine({ kdvExemptionCode: '702' })] });
    const ui = deriveUIState(input.type!, input.profile!);
    expect(rule.applies(input, ui)).toBe(false);
  });
});
