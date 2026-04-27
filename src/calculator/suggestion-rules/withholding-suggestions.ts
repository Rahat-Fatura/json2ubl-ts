import type { SuggestionRule, Suggestion } from '../suggestion-types';

/**
 * Sprint 8i.3 / AR-10 Faz 2 — Tevkifat grubu suggestion kuralları (5 kural).
 *
 *  1. withholding/tevkifat-default-codes — TEVKIFAT/YTBTEVKIFAT + line.withholdingTaxCode boş → 602 öner
 *  2. withholding/650-percent-required — code=650 + percent boş → uyarı (recommended)
 *  3. withholding/profile-tevkifat-suggests-ticarifatura — TEVKIFAT+TEMELFATURA → TICARIFATURA (optional)
 *  4. withholding/exemption-conflict — withholding+exemption aynı satır → withholding kaldır (paralel KDV/exemption-mismatch)
 *  5. withholding/ytb-tevkifat-itemclass-required — YTBTEVKIFAT + itemClass boş → 01 öner
 *
 * Kural 4 KDV grubundaki kdv/exemption-mismatch-tax-type ile paralel — aynı çakışma,
 * farklı path (withholdingTaxCode vs kdvExemptionCode). Kullanıcı UI'da hangisini
 * kaldıracağını seçer (T-3 dikhotomi).
 */

const WITHHOLDING_TEVKIFAT_DEFAULT_CODES: SuggestionRule = {
  id: 'withholding/tevkifat-default-codes',
  applies: (input) => {
    if (input.type !== 'TEVKIFAT' && input.type !== 'YTBTEVKIFAT') return false;
    return input.lines.some(l => !l.withholdingTaxCode);
  },
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      if (!input.lines[i].withholdingTaxCode) {
        out.push({
          path: `lines[${i}].withholdingTaxCode`,
          value: '602',
          reason: 'Tevkifat tipinde her satıra tevkifat kodu zorunlu. 602 (4/10) yaygın varsayılan.',
          severity: 'recommended',
          ruleId: 'withholding/tevkifat-default-codes',
          displayLabel: '602 — 4/10',
          displayValue: '602',
        });
      }
    }
    return out;
  },
};

const WITHHOLDING_650_PERCENT_REQUIRED: SuggestionRule = {
  id: 'withholding/650-percent-required',
  applies: (input) =>
    input.lines.some(l => l.withholdingTaxCode === '650' && (l.withholdingTaxPercent === undefined || l.withholdingTaxPercent === null)),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.withholdingTaxCode === '650' && (line.withholdingTaxPercent === undefined || line.withholdingTaxPercent === null)) {
        out.push({
          path: `lines[${i}].withholdingTaxPercent`,
          value: undefined,
          reason: '650 dinamik tevkifat kodu — yüzde değeri girilmeli (XML üretiminde kullanılır).',
          severity: 'recommended',
          ruleId: 'withholding/650-percent-required',
        });
      }
    }
    return out;
  },
};

const WITHHOLDING_PROFILE_TEVKIFAT_SUGGESTS_TICARIFATURA: SuggestionRule = {
  id: 'withholding/profile-tevkifat-suggests-ticarifatura',
  applies: (input) => input.type === 'TEVKIFAT' && input.profile === 'TEMELFATURA',
  produce: () => [
    {
      path: 'profile',
      value: 'TICARIFATURA',
      reason: 'TEVKIFAT genelde TİCARİFATURA profiliyle kullanılır. Profili kontrol ediniz.',
      severity: 'optional',
      ruleId: 'withholding/profile-tevkifat-suggests-ticarifatura',
      displayLabel: 'TİCARİFATURA',
      displayValue: 'TICARIFATURA',
    },
  ],
};

const WITHHOLDING_EXEMPTION_CONFLICT: SuggestionRule = {
  id: 'withholding/exemption-conflict',
  applies: (input) =>
    input.lines.some(l => l.withholdingTaxCode && l.kdvExemptionCode),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.withholdingTaxCode && line.kdvExemptionCode) {
        out.push({
          path: `lines[${i}].withholdingTaxCode`,
          value: undefined,
          reason: 'Tevkifat ve KDV istisna kodu aynı satırda uyumsuz. Tevkifat kodunu kaldırmayı düşünün (alternatif: kdv/exemption-mismatch-tax-type).',
          severity: 'recommended',
          ruleId: 'withholding/exemption-conflict',
        });
      }
    }
    return out;
  },
};

const WITHHOLDING_YTB_TEVKIFAT_ITEMCLASS_REQUIRED: SuggestionRule = {
  id: 'withholding/ytb-tevkifat-itemclass-required',
  applies: (input) =>
    input.type === 'YTBTEVKIFAT' &&
    input.lines.some(l => !l.itemClassificationCode),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      if (!input.lines[i].itemClassificationCode) {
        out.push({
          path: `lines[${i}].itemClassificationCode`,
          value: '01',
          reason: 'YTBTEVKIFAT için Makine/Teçhizat (01) varsayılan ItemClassificationCode.',
          severity: 'recommended',
          ruleId: 'withholding/ytb-tevkifat-itemclass-required',
          displayLabel: '01 — Makine/Teçhizat',
          displayValue: '01',
        });
      }
    }
    return out;
  },
};

export const WITHHOLDING_SUGGESTIONS: SuggestionRule[] = [
  WITHHOLDING_TEVKIFAT_DEFAULT_CODES,
  WITHHOLDING_650_PERCENT_REQUIRED,
  WITHHOLDING_PROFILE_TEVKIFAT_SUGGESTS_TICARIFATURA,
  WITHHOLDING_EXEMPTION_CONFLICT,
  WITHHOLDING_YTB_TEVKIFAT_ITEMCLASS_REQUIRED,
];
