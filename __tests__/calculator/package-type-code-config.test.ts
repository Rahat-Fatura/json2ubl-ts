import { describe, it, expect } from 'vitest';
import {
  PACKAGING_TYPE_CODE_DEFINITIONS,
  PACKAGING_TYPE_CODE_MAP,
  isValidPackagingTypeCode,
  getPackagingTypeCodeDefinition,
} from '../../src/calculator/package-type-code-config';
import { PACKAGING_TYPE_CODES } from '../../src/config/constants';

describe('package-type-code-config (D1)', () => {
  describe('B-60 — 27 sık kod tanımlı', () => {
    it('27 kod içerir', () => {
      expect(PACKAGING_TYPE_CODE_DEFINITIONS).toHaveLength(27);
    });

    it('BX (Kutu), BG (Torba), NE (Ambalajsız) Türkçe isimli', () => {
      expect(PACKAGING_TYPE_CODE_MAP.get('BX')?.name).toBe('Kutu');
      expect(PACKAGING_TYPE_CODE_MAP.get('BG')?.name).toBe('Torba');
      expect(PACKAGING_TYPE_CODE_MAP.get('NE')?.name).toBe('Ambalajsız');
    });

    const expectedCodes = ['BA', 'BE', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BX', 'CB', 'CH', 'CI', 'CK', 'CN', 'CR', 'DK', 'DR', 'EC', 'FC', 'JR', 'LV', 'NE', 'SA', 'SU', 'TN', 'VG', 'VL', 'VO'];
    for (const code of expectedCodes) {
      it(`${code} kodu whitelist'te`, () => {
        expect(isValidPackagingTypeCode(code)).toBe(true);
      });
    }
  });

  describe('helper fonksiyonları', () => {
    it('getPackagingTypeCodeDefinition(CN) "Konteyner"', () => {
      expect(getPackagingTypeCodeDefinition('CN')?.name).toBe('Konteyner');
    });

    it('isValidPackagingTypeCode(XYZ) false', () => {
      expect(isValidPackagingTypeCode('XYZ')).toBe(false);
    });
  });

  describe('M7 — PACKAGING_TYPE_CODES türev', () => {
    it('Her config kodu Set içinde', () => {
      for (const def of PACKAGING_TYPE_CODE_DEFINITIONS) {
        expect(PACKAGING_TYPE_CODES.has(def.code)).toBe(true);
      }
    });

    it('Set boyutu = config boyutu (27)', () => {
      expect(PACKAGING_TYPE_CODES.size).toBe(27);
    });
  });
});
