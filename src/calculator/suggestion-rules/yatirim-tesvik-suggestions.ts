import type { SuggestionRule, Suggestion } from '../suggestion-types';
import type { SimpleLineInput } from '../simple-types';

/**
 * Sprint 8i.5 / AR-10 Faz 2 — YATIRIMTESVIK grubu suggestion kuralları (4 kural).
 *
 *  1. yatirim-tesvik/itemclass-default — YATIRIMTESVIK + itemClassificationCode boş → 01 (Makine)
 *  2. yatirim-tesvik/makine-traceid-required — itemClass=01 + productTraceId boş → uyarı
 *  3. yatirim-tesvik/makine-serialid-required — itemClass=01 + serialId boş → uyarı
 *  4. yatirim-tesvik/insaat-suggest-itemclass-02 — name/description "inşaat" → 02 (heuristic, optional)
 *
 * Kural 1 ile Kural 4 mutually exclusive: Kural 1'in applies'ı `!hasInsaatHint(line)`
 * koşuluyla daraltılır (R5 false positive mitigation — Kural 4 önce, Kural 1 fallback).
 */

const INSAAT_PATTERN = /(inşaat|insaat|yapı|yapi|construction)/;

function hasInsaatHint(line: SimpleLineInput): boolean {
  // Türkçe locale lower-case: 'İnşaat' → 'inşaat'. JS /i flag Türkçe İ↔i case folding'i
  // standart yapmaz, dolayısıyla manuel toLocaleLowerCase('tr-TR') gerekiyor.
  const text = `${line.name} ${line.description ?? ''}`.toLocaleLowerCase('tr-TR');
  return INSAAT_PATTERN.test(text);
}

const YATIRIM_TESVIK_ITEMCLASS_DEFAULT: SuggestionRule = {
  id: 'yatirim-tesvik/itemclass-default',
  applies: (input) =>
    input.profile === 'YATIRIMTESVIK' &&
    input.lines.some(l => !l.itemClassificationCode && !hasInsaatHint(l)),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (!line.itemClassificationCode && !hasInsaatHint(line)) {
        out.push({
          path: `lines[${i}].itemClassificationCode`,
          value: '01',
          reason: 'YATIRIMTESVIK için Makine/Teçhizat (01) yaygın varsayılan ItemClassificationCode.',
          severity: 'recommended',
          ruleId: 'yatirim-tesvik/itemclass-default',
          displayLabel: '01 — Makine/Teçhizat',
          displayValue: '01',
        });
      }
    }
    return out;
  },
};

const YATIRIM_TESVIK_MAKINE_TRACEID_REQUIRED: SuggestionRule = {
  id: 'yatirim-tesvik/makine-traceid-required',
  applies: (input) =>
    input.profile === 'YATIRIMTESVIK' &&
    input.lines.some(l => l.itemClassificationCode === '01' && !l.productTraceId),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.itemClassificationCode === '01' && !line.productTraceId) {
        out.push({
          path: `lines[${i}].productTraceId`,
          value: undefined,
          reason: 'YTB Makine için Ürün Takip ID (productTraceId) gereklidir.',
          severity: 'recommended',
          ruleId: 'yatirim-tesvik/makine-traceid-required',
        });
      }
    }
    return out;
  },
};

const YATIRIM_TESVIK_MAKINE_SERIALID_REQUIRED: SuggestionRule = {
  id: 'yatirim-tesvik/makine-serialid-required',
  applies: (input) =>
    input.profile === 'YATIRIMTESVIK' &&
    input.lines.some(l => l.itemClassificationCode === '01' && !l.serialId),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.itemClassificationCode === '01' && !line.serialId) {
        out.push({
          path: `lines[${i}].serialId`,
          value: undefined,
          reason: 'YTB Makine için Seri No (serialId) gereklidir.',
          severity: 'recommended',
          ruleId: 'yatirim-tesvik/makine-serialid-required',
        });
      }
    }
    return out;
  },
};

const YATIRIM_TESVIK_INSAAT_SUGGEST_ITEMCLASS_02: SuggestionRule = {
  id: 'yatirim-tesvik/insaat-suggest-itemclass-02',
  applies: (input) =>
    input.profile === 'YATIRIMTESVIK' &&
    input.lines.some(l => !l.itemClassificationCode && hasInsaatHint(l)),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (!line.itemClassificationCode && hasInsaatHint(line)) {
        out.push({
          path: `lines[${i}].itemClassificationCode`,
          value: '02',
          reason: 'Açıklamada inşaat/yapı geçiyor — İnşaat İşleri (02) heuristik öneri.',
          severity: 'optional',
          ruleId: 'yatirim-tesvik/insaat-suggest-itemclass-02',
          displayLabel: '02 — İnşaat İşleri',
          displayValue: '02',
        });
      }
    }
    return out;
  },
};

export const YATIRIM_TESVIK_SUGGESTIONS: SuggestionRule[] = [
  YATIRIM_TESVIK_ITEMCLASS_DEFAULT,
  YATIRIM_TESVIK_MAKINE_TRACEID_REQUIRED,
  YATIRIM_TESVIK_MAKINE_SERIALID_REQUIRED,
  YATIRIM_TESVIK_INSAAT_SUGGEST_ITEMCLASS_02,
];
