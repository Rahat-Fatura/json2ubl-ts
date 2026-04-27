import type { SuggestionRule, Suggestion } from '../suggestion-types';

/**
 * Sprint 8i.6 / AR-10 Faz 2 — Misc grubu suggestion kuralları (2 kural).
 *
 *  1. currency/exchange-rate-required — currencyCode≠TRY + exchangeRate boş → kur girilmeli
 *  2. paymentmeans/iban-format-tr — paymentMeans.accountNumber TR ile başlamıyor / 26 hane değil
 *
 * Plan'da 3 misc kuralı önerilmişti; `paymentmeans/payment-means-code-default`
 * SimplePaymentMeansInput.meansCode required olduğu için tetiklenmez ve atlandı.
 * Toplam Faz 2 kural sayısı: 24 → 23 (sapma plan §3.6).
 */

const CURRENCY_EXCHANGE_RATE_REQUIRED: SuggestionRule = {
  id: 'currency/exchange-rate-required',
  applies: (input) => {
    const cc = input.currencyCode;
    if (!cc || cc === 'TRY') return false;
    return !input.exchangeRate || input.exchangeRate <= 0;
  },
  produce: () => [
    {
      path: 'exchangeRate',
      value: undefined,
      reason: 'TRY dışı para birimlerinde döviz kuru (TRY karşılığı) girilmeli.',
      severity: 'recommended',
      ruleId: 'currency/exchange-rate-required',
    },
  ],
};

const PAYMENTMEANS_IBAN_FORMAT_TR: SuggestionRule = {
  id: 'paymentmeans/iban-format-tr',
  applies: (input) => {
    const acct = input.paymentMeans?.accountNumber;
    if (!acct) return false;
    const cleaned = acct.replace(/\s/g, '');
    return !/^TR\d{24}$/.test(cleaned);
  },
  produce: (input) => {
    const acct = input.paymentMeans?.accountNumber ?? '';
    const cleaned = acct.replace(/\s/g, '');
    return [
      {
        path: 'paymentMeans.accountNumber',
        value: undefined,
        reason: `IBAN TR ile başlamalı ve 26 hane olmalı (girilen: ${cleaned.length} karakter).`,
        severity: 'recommended',
        ruleId: 'paymentmeans/iban-format-tr',
      },
    ];
  },
};

export const MISC_SUGGESTIONS: SuggestionRule[] = [
  CURRENCY_EXCHANGE_RATE_REQUIRED,
  PAYMENTMEANS_IBAN_FORMAT_TR,
];
