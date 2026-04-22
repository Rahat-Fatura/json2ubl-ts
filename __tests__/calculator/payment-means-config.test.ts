import { describe, it, expect } from 'vitest';
import {
  PAYMENT_MEANS_DEFINITIONS,
  PAYMENT_MEANS_MAP,
  isValidPaymentMeansCode,
  getPaymentMeansDefinition,
} from '../../src/calculator/payment-means-config';
import { PAYMENT_MEANS_CODES } from '../../src/config/constants';

describe('payment-means-config (D2)', () => {
  describe('B-90 — 7 sık kod tanımlı (UI dropdown)', () => {
    it('7 kod içerir', () => {
      expect(PAYMENT_MEANS_DEFINITIONS).toHaveLength(7);
    });

    const expected: Array<[string, string]> = [
      ['1', 'Ödeme Tipi Muhtelif'],
      ['10', 'Nakit'],
      ['20', 'Çek'],
      ['23', 'Banka Çeki'],
      ['42', 'Havale/EFT'],
      ['48', 'Kredi Kartı/Banka Kartı'],
      ['ZZZ', 'Diğer'],
    ];
    for (const [code, name] of expected) {
      it(`${code} → "${name}"`, () => {
        expect(PAYMENT_MEANS_MAP.get(code)?.name).toBe(name);
      });
    }
  });

  describe('helper fonksiyonları', () => {
    it('isValidPaymentMeansCode(42) true', () => {
      expect(isValidPaymentMeansCode('42')).toBe(true);
    });

    it('isValidPaymentMeansCode(XYZ) false', () => {
      expect(isValidPaymentMeansCode('XYZ')).toBe(false);
    });

    it('getPaymentMeansDefinition(ZZZ) Diğer', () => {
      expect(getPaymentMeansDefinition('ZZZ')?.name).toBe('Diğer');
    });
  });

  describe('PAYMENT_MEANS_CODES geniş whitelist (M7 değil — UN/EDIFACT geniş set)', () => {
    it('Config sık 7 kodu Set içinde', () => {
      for (const def of PAYMENT_MEANS_DEFINITIONS) {
        expect(PAYMENT_MEANS_CODES.has(def.code)).toBe(true);
      }
    });

    it('Set daha geniş (30+, 31 vb. config\'de yok ama whitelist kabul eder)', () => {
      expect(PAYMENT_MEANS_CODES.size).toBeGreaterThan(PAYMENT_MEANS_DEFINITIONS.length);
      expect(PAYMENT_MEANS_CODES.has('30')).toBe(true);
      expect(PAYMENT_MEANS_CODES.has('31')).toBe(true);
    });
  });
});
