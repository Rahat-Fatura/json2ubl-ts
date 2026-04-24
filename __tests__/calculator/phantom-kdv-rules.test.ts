import { describe, it, expect } from 'vitest';
import {
  isPhantomKdvCombination,
  phantomKdvExemptionCodeFor,
  PHANTOM_KDV_CALCULATION_SEQUENCE_NUMERIC,
  PHANTOM_KDV_EXEMPTION_CODES,
  PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES,
} from '../../src/calculator/phantom-kdv-rules';

describe('phantom-kdv-rules (M12)', () => {
  describe('isPhantomKdvCombination', () => {
    it('YATIRIMTESVIK+ISTISNA → true', () => {
      expect(isPhantomKdvCombination('YATIRIMTESVIK', 'ISTISNA')).toBe(true);
    });

    it('EARSIVFATURA+YTBISTISNA → true', () => {
      expect(isPhantomKdvCombination('EARSIVFATURA', 'YTBISTISNA')).toBe(true);
    });

    it('YATIRIMTESVIK+SATIS → false (senaryo 12/13)', () => {
      expect(isPhantomKdvCombination('YATIRIMTESVIK', 'SATIS')).toBe(false);
    });

    it('YATIRIMTESVIK+IADE → false (senaryo 14)', () => {
      expect(isPhantomKdvCombination('YATIRIMTESVIK', 'IADE')).toBe(false);
    });

    it('EARSIVFATURA+YTBSATIS → false', () => {
      expect(isPhantomKdvCombination('EARSIVFATURA', 'YTBSATIS')).toBe(false);
    });

    it('EARSIVFATURA+YTBIADE → false', () => {
      expect(isPhantomKdvCombination('EARSIVFATURA', 'YTBIADE')).toBe(false);
    });

    it('TEMELFATURA+ISTISNA → false (normal istisna, phantom değil)', () => {
      expect(isPhantomKdvCombination('TEMELFATURA', 'ISTISNA')).toBe(false);
    });

    it('TICARIFATURA+ISTISNA → false', () => {
      expect(isPhantomKdvCombination('TICARIFATURA', 'ISTISNA')).toBe(false);
    });
  });

  describe('phantomKdvExemptionCodeFor', () => {
    it('Makine/Teçhizat (01) → 308', () => {
      expect(phantomKdvExemptionCodeFor('01')).toBe('308');
    });

    it('İnşaat (02) → 339', () => {
      expect(phantomKdvExemptionCodeFor('02')).toBe('339');
    });

    it('Arsa/Arazi (03) → null (phantom yasak)', () => {
      expect(phantomKdvExemptionCodeFor('03')).toBeNull();
    });

    it('Diğer (04) → null (phantom yasak)', () => {
      expect(phantomKdvExemptionCodeFor('04')).toBeNull();
    });

    it('Bilinmeyen kod → null', () => {
      expect(phantomKdvExemptionCodeFor('99')).toBeNull();
    });
  });

  describe('sabitler', () => {
    it('CalculationSequenceNumeric sabiti -1', () => {
      expect(PHANTOM_KDV_CALCULATION_SEQUENCE_NUMERIC).toBe(-1);
    });

    it('Exemption codes = {308, 339}', () => {
      expect(PHANTOM_KDV_EXEMPTION_CODES.has('308')).toBe(true);
      expect(PHANTOM_KDV_EXEMPTION_CODES.has('339')).toBe(true);
      expect(PHANTOM_KDV_EXEMPTION_CODES.size).toBe(2);
    });

    it('Allowed ItemClassificationCodes = {01, 02}', () => {
      expect(PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES.has('01')).toBe(true);
      expect(PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES.has('02')).toBe(true);
      expect(PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES.has('03')).toBe(false);
      expect(PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES.has('04')).toBe(false);
      expect(PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES.size).toBe(2);
    });
  });
});
