import type { SuggestionRule, Suggestion } from '../suggestion-types';

/**
 * Sprint 8i.4 / AR-10 Faz 2 — IHRACKAYITLI grubu suggestion kuralları (3 kural).
 *
 *  1. ihrackayitli/702-default-suggestion — IHRACKAYITLI tipi + line.kdvExemptionCode boş → 702
 *  2. ihrackayitli/702-gtip-required — IHRACKAYITLI + 702 + gtipNo boş → hatırlatma
 *  3. ihrackayitli/702-alicidib-required — IHRACKAYITLI + 702 + alicidibsatirkod boş → hatırlatma
 */

const IHRACKAYITLI_702_DEFAULT_SUGGESTION: SuggestionRule = {
  id: 'ihrackayitli/702-default-suggestion',
  applies: (input) =>
    input.type === 'IHRACKAYITLI' &&
    input.lines.some(l => !l.kdvExemptionCode),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      if (!input.lines[i].kdvExemptionCode) {
        out.push({
          path: `lines[${i}].kdvExemptionCode`,
          value: '702',
          reason: 'İhraç Kayıtlı satışlarda 702 standart KDV istisna kodudur.',
          severity: 'recommended',
          ruleId: 'ihrackayitli/702-default-suggestion',
          displayLabel: '702 — İhraç Kayıtlı',
          displayValue: '702',
        });
      }
    }
    return out;
  },
};

const IHRACKAYITLI_702_GTIP_REQUIRED: SuggestionRule = {
  id: 'ihrackayitli/702-gtip-required',
  applies: (input) =>
    input.type === 'IHRACKAYITLI' &&
    input.lines.some(l => l.kdvExemptionCode === '702' && !l.delivery?.gtipNo),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.kdvExemptionCode === '702' && !line.delivery?.gtipNo) {
        out.push({
          path: `lines[${i}].delivery.gtipNo`,
          value: undefined,
          reason: '702 kodu için 12 haneli GTİP No gereklidir.',
          severity: 'recommended',
          ruleId: 'ihrackayitli/702-gtip-required',
        });
      }
    }
    return out;
  },
};

const IHRACKAYITLI_702_ALICIDIB_REQUIRED: SuggestionRule = {
  id: 'ihrackayitli/702-alicidib-required',
  applies: (input) =>
    input.type === 'IHRACKAYITLI' &&
    input.lines.some(l => l.kdvExemptionCode === '702' && !l.delivery?.alicidibsatirkod),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.kdvExemptionCode === '702' && !line.delivery?.alicidibsatirkod) {
        out.push({
          path: `lines[${i}].delivery.alicidibsatirkod`,
          value: undefined,
          reason: '702 kodu için Alıcı DİB satır kodu gereklidir.',
          severity: 'recommended',
          ruleId: 'ihrackayitli/702-alicidib-required',
        });
      }
    }
    return out;
  },
};

export const IHRACKAYITLI_SUGGESTIONS: SuggestionRule[] = [
  IHRACKAYITLI_702_DEFAULT_SUGGESTION,
  IHRACKAYITLI_702_GTIP_REQUIRED,
  IHRACKAYITLI_702_ALICIDIB_REQUIRED,
];
