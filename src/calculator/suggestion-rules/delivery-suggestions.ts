import type { SuggestionRule, Suggestion } from '../suggestion-types';

/**
 * Sprint 8i.6 / AR-10 Faz 2 — Delivery grubu suggestion kuralları (3 kural).
 *
 *  1. delivery/ihracat-incoterms-required — IHRACAT profili + line.delivery.deliveryTermCode boş → CIF
 *  2. delivery/gtip-format-12-digit — gtipNo girildi ama 12 hane değil → format düzeltme
 *  3. delivery/transport-mode-suggest-ihracat — IHRACAT + line.delivery.transportModeCode boş → 4 (Hava)
 *
 * Tasarım dokümanı plan'ında doc-level delivery varsayılmıştı; yapı incelendi —
 * SimpleInvoiceInput'ta doc-level delivery yok, sadece line-level (lines[i].delivery).
 * Kurallar line-level olarak adapte edildi.
 */

const DELIVERY_IHRACAT_INCOTERMS_REQUIRED: SuggestionRule = {
  id: 'delivery/ihracat-incoterms-required',
  applies: (input) =>
    input.profile === 'IHRACAT' &&
    input.lines.some(l => !l.delivery?.deliveryTermCode),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      if (!input.lines[i].delivery?.deliveryTermCode) {
        out.push({
          path: `lines[${i}].delivery.deliveryTermCode`,
          value: 'CIF',
          reason: 'İhracat satırlarında INCOTERMS kodu zorunlu (CIF, FOB, EXW vb.).',
          severity: 'recommended',
          ruleId: 'delivery/ihracat-incoterms-required',
          displayLabel: 'CIF — Cost Insurance Freight',
          displayValue: 'CIF',
        });
      }
    }
    return out;
  },
};

const DELIVERY_GTIP_FORMAT_12_DIGIT: SuggestionRule = {
  id: 'delivery/gtip-format-12-digit',
  applies: (input) =>
    input.lines.some(l => {
      const gtip = l.delivery?.gtipNo;
      if (!gtip) return false;
      const digits = gtip.replace(/\D/g, '');
      return digits.length !== 12;
    }),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const gtip = input.lines[i].delivery?.gtipNo;
      if (!gtip) continue;
      const digits = gtip.replace(/\D/g, '');
      if (digits.length !== 12) {
        out.push({
          path: `lines[${i}].delivery.gtipNo`,
          value: undefined,
          reason: `GTİP No 12 hane olmalı (girilen: ${digits.length} hane). Düzeltiniz.`,
          severity: 'recommended',
          ruleId: 'delivery/gtip-format-12-digit',
        });
      }
    }
    return out;
  },
};

const DELIVERY_TRANSPORT_MODE_SUGGEST_IHRACAT: SuggestionRule = {
  id: 'delivery/transport-mode-suggest-ihracat',
  applies: (input) =>
    input.profile === 'IHRACAT' &&
    input.lines.some(l => !l.delivery?.transportModeCode),
  produce: (input) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      if (!input.lines[i].delivery?.transportModeCode) {
        out.push({
          path: `lines[${i}].delivery.transportModeCode`,
          value: '4',
          reason: 'İhracatta ulaşım modu önerilir (1=Deniz, 3=Karayolu, 4=Havayolu).',
          severity: 'optional',
          ruleId: 'delivery/transport-mode-suggest-ihracat',
          displayLabel: '4 — Havayolu',
          displayValue: '4',
        });
      }
    }
    return out;
  },
};

export const DELIVERY_SUGGESTIONS: SuggestionRule[] = [
  DELIVERY_IHRACAT_INCOTERMS_REQUIRED,
  DELIVERY_GTIP_FORMAT_12_DIGIT,
  DELIVERY_TRANSPORT_MODE_SUGGEST_IHRACAT,
];
