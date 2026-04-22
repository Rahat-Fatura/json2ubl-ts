import { describe, it, expect } from 'vitest';
import {
  CURRENCY_DEFINITIONS,
  isValidCurrencyCode,
} from '../../src/calculator/currency-config';
import { CURRENCY_CODES } from '../../src/config/constants';

describe('currency-config', () => {
  describe('B-28 — TRL (eski Türk Lirası) kaldırıldı', () => {
    it('CURRENCY_DEFINITIONS\'ta TRL yok', () => {
      expect(CURRENCY_DEFINITIONS.find(c => c.code === 'TRL')).toBeUndefined();
    });

    it('CURRENCY_CODES whitelist\'te TRL yok', () => {
      expect(CURRENCY_CODES.has('TRL')).toBe(false);
    });

    it('isValidCurrencyCode(TRL) false', () => {
      expect(isValidCurrencyCode('TRL')).toBe(false);
    });

    it('TRY (güncel Türk Lirası) hâlâ var', () => {
      expect(CURRENCY_CODES.has('TRY')).toBe(true);
      expect(isValidCurrencyCode('TRY')).toBe(true);
    });
  });

  describe('sık para birimleri', () => {
    for (const code of ['TRY', 'USD', 'EUR', 'GBP', 'JPY']) {
      it(`${code} validator whitelist'te`, () => {
        expect(CURRENCY_CODES.has(code)).toBe(true);
      });
    }
  });
});
