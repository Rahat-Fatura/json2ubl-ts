import type { SuggestionRule, Suggestion } from '../suggestion-types';
import { isSelfExemptionInvoice } from '../../config/self-exemption-types';

/**
 * Sprint 8i.2 / AR-10 Faz 2 — KDV grubu suggestion kuralları (7 kural).
 *
 * Plan'daki Kural 4 (`kdv/zero-clear-exemption-on-rate-change`) transition state
 * gerektirdiği için Sprint 8j'ye ertelendi (R6).
 *
 * Kurallar:
 *  1. kdv/zero-suggest-351 — KDV=0 + self-exemption DEĞİL → 351 öner
 *  2. kdv/ytb-istisna-suggest-308 — YATIRIMTESVIK+ISTISNA + kdv=0 + itemClass=01 → 308
 *  3. kdv/ytb-istisna-suggest-339 — aynı + itemClass=02 → 339
 *  4. kdv/exemption-mismatch-tax-type — exemption kodu tevkifat tipiyle uyumsuz → kaldır
 *  5. kdv/manual-exemption-suggest-line-distribution — belge 351 + satır kdv>0 paradoksu
 *  6. kdv/reduced-rate-suggest-1 — kdv=1 reduced rate (opt-in kontrolü hatırlatma)
 *  7. kdv/reduced-rate-suggest-8-10 — kdv=8/10 (kanun değişikliği rehberi)
 */

const KDV_ZERO_SUGGEST_351: SuggestionRule = {
  id: 'kdv/zero-suggest-351',
  applies: (input) => {
    if (isSelfExemptionInvoice(input.type ?? 'SATIS', input.profile ?? 'TEMELFATURA')) return false;
    return input.lines.some(line => line.kdvPercent === 0 && !line.kdvExemptionCode);
  },
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.kdvPercent === 0 && !line.kdvExemptionCode) {
        out.push({
          path: `lines[${i}].kdvExemptionCode`,
          value: '351',
          reason: 'KDV=0 satır için 351 KDV istisna kodu yaygın bir varsayılandır.',
          severity: 'recommended',
          ruleId: 'kdv/zero-suggest-351',
          displayLabel: '351 — KDV İstisna',
          displayValue: '351',
        });
      }
    }
    return out;
  },
};

const KDV_YTB_ISTISNA_SUGGEST_308: SuggestionRule = {
  id: 'kdv/ytb-istisna-suggest-308',
  applies: (input) =>
    input.profile === 'YATIRIMTESVIK' &&
    input.type === 'ISTISNA' &&
    input.lines.some(l => l.kdvPercent === 0 && l.itemClassificationCode === '01' && !l.kdvExemptionCode),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.kdvPercent === 0 && line.itemClassificationCode === '01' && !line.kdvExemptionCode) {
        out.push({
          path: `lines[${i}].kdvExemptionCode`,
          value: '308',
          reason: 'YTB Makine/Teçhizat (01) + KDV=0 için 308 istisna kodu uygundur.',
          severity: 'recommended',
          ruleId: 'kdv/ytb-istisna-suggest-308',
          displayLabel: '308 — YTB Makine',
          displayValue: '308',
        });
      }
    }
    return out;
  },
};

const KDV_YTB_ISTISNA_SUGGEST_339: SuggestionRule = {
  id: 'kdv/ytb-istisna-suggest-339',
  applies: (input) =>
    input.profile === 'YATIRIMTESVIK' &&
    input.type === 'ISTISNA' &&
    input.lines.some(l => l.kdvPercent === 0 && l.itemClassificationCode === '02' && !l.kdvExemptionCode),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.kdvPercent === 0 && line.itemClassificationCode === '02' && !line.kdvExemptionCode) {
        out.push({
          path: `lines[${i}].kdvExemptionCode`,
          value: '339',
          reason: 'YTB İnşaat İşleri (02) + KDV=0 için 339 istisna kodu uygundur.',
          severity: 'recommended',
          ruleId: 'kdv/ytb-istisna-suggest-339',
          displayLabel: '339 — YTB İnşaat',
          displayValue: '339',
        });
      }
    }
    return out;
  },
};

const KDV_EXEMPTION_MISMATCH_TAX_TYPE: SuggestionRule = {
  id: 'kdv/exemption-mismatch-tax-type',
  applies: (input) => {
    // TEVKIFAT tipinde aynı satıra hem withholding hem exemption code yazılmışsa
    // bu paradoks: tevkifat=KDV var, exemption=KDV yok. Birini kaldır.
    if (input.type !== 'TEVKIFAT' && input.type !== 'YTBTEVKIFAT') return false;
    return input.lines.some(l => l.withholdingTaxCode && l.kdvExemptionCode);
  },
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.withholdingTaxCode && line.kdvExemptionCode) {
        out.push({
          path: `lines[${i}].kdvExemptionCode`,
          value: undefined,
          reason: 'Tevkifat ve KDV istisna kodu aynı satırda uyumsuz. Birini kaldırınız.',
          severity: 'recommended',
          ruleId: 'kdv/exemption-mismatch-tax-type',
        });
      }
    }
    return out;
  },
};

const KDV_MANUAL_EXEMPTION_SUGGEST_LINE_DISTRIBUTION: SuggestionRule = {
  id: 'kdv/manual-exemption-suggest-line-distribution',
  applies: (input) =>
    input.lines.some(l => l.kdvPercent > 0 && l.kdvExemptionCode === '351'),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.kdvPercent > 0 && line.kdvExemptionCode === '351') {
        out.push({
          path: `lines[${i}].kdvPercent`,
          value: 0,
          reason: '351 kodu KDV=0 satırlar için. Bu satırın KDV oranını 0 yapmayı düşünün.',
          severity: 'optional',
          ruleId: 'kdv/manual-exemption-suggest-line-distribution',
        });
      }
    }
    return out;
  },
};

const KDV_REDUCED_RATE_SUGGEST_1: SuggestionRule = {
  id: 'kdv/reduced-rate-suggest-1',
  applies: (input) => input.lines.some(l => l.kdvPercent === 1),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      if (input.lines[i].kdvPercent === 1) {
        out.push({
          path: `lines[${i}].kdvPercent`,
          value: undefined,
          reason: '%1 KDV indirimli oran (M4/B-78.1). allowReducedKdvRate opt-in flag\'i aktif olmalı, kontrol ediniz.',
          severity: 'optional',
          ruleId: 'kdv/reduced-rate-suggest-1',
        });
      }
    }
    return out;
  },
};

const KDV_REDUCED_RATE_SUGGEST_8_10: SuggestionRule = {
  id: 'kdv/reduced-rate-suggest-8-10',
  applies: (input) => input.lines.some(l => l.kdvPercent === 8 || l.kdvPercent === 10),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const k = input.lines[i].kdvPercent;
      if (k === 8 || k === 10) {
        out.push({
          path: `lines[${i}].kdvPercent`,
          value: 20,
          reason: `Genel KDV oranı %20. %${k} eski oran — kanun değişikliği sonrası kontrol ediniz.`,
          severity: 'optional',
          ruleId: 'kdv/reduced-rate-suggest-8-10',
        });
      }
    }
    return out;
  },
};

export const KDV_SUGGESTIONS: SuggestionRule[] = [
  KDV_ZERO_SUGGEST_351,
  KDV_YTB_ISTISNA_SUGGEST_308,
  KDV_YTB_ISTISNA_SUGGEST_339,
  KDV_EXEMPTION_MISMATCH_TAX_TYPE,
  KDV_MANUAL_EXEMPTION_SUGGEST_LINE_DISTRIBUTION,
  KDV_REDUCED_RATE_SUGGEST_1,
  KDV_REDUCED_RATE_SUGGEST_8_10,
];
