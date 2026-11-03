import type { SuggestionRule, Suggestion } from '../suggestion-types';
import { isIhracKayitli702Invoice } from '../ihrackayitli-702-scope';

/**
 * Sprint 8i.4 / AR-10 Faz 2 — IHRACKAYITLI grubu suggestion kuralları (3 kural).
 *
 *  1. ihrackayitli/702-default-suggestion — IHRACKAYITLI tipi + line.kdvExemptionCode boş → 702
 *  2. ihrackayitli/702-gtip-required — 702 etkin kapsamı + gtipNo boş → hatırlatma
 *  3. ihrackayitli/702-alicidib-required — 702 etkin kapsamı + alicidibsatirkod boş → hatırlatma
 *
 * 2 ve 3 (5.2.0): kapsam satır bayrakları, oturum doğrulaması ve katı kurulumla
 * AYNI yüklemden gelir (`isIhracKayitli702Invoice`) ve hatırlatma BÜTÜN
 * satırlara yapılır. Eskiden yalnız KENDİ kodu 702 olan satır hatırlatılıyordu;
 * karışık belgede 701 satırının, belge kodu 702 olan belgede kodsuz satırların
 * eksik GTİP'i sessiz kalıyordu — oysa GİB onları da istiyor.
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
    isIhracKayitli702Invoice(input) &&
    input.lines.some(l => !l.delivery?.gtipNo),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (!line.delivery?.gtipNo) {
        out.push({
          path: `lines[${i}].delivery.gtipNo`,
          value: undefined,
          reason: 'Faturada 702 istisnası olduğu için her kalemde 12 haneli GTİP No gereklidir.',
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
    isIhracKayitli702Invoice(input) &&
    input.lines.some(l => !l.delivery?.alicidibsatirkod),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (!line.delivery?.alicidibsatirkod) {
        out.push({
          path: `lines[${i}].delivery.alicidibsatirkod`,
          value: undefined,
          reason: 'Faturada 702 istisnası olduğu için her kalemde Alıcı DİB satır kodu gereklidir.',
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
