import { describe, it, expect } from 'vitest';
import {
  UNIT_DEFINITIONS,
  resolveUnitCode,
  isValidUnitCode,
} from '../../src/calculator/unit-config';
import { UNIT_CODES } from '../../src/config/constants';

describe('unit-config', () => {
  describe('B-58 — TWH etiketi düzeltildi', () => {
    it('TWH ismi "Terawatt Saat" (eski "Bin Kilowatt Saat" değil)', () => {
      const twh = UNIT_DEFINITIONS.find(u => u.code === 'TWH');
      expect(twh?.name).toBe('Terawatt Saat');
    });

    it('isValidUnitCode(TWH) true (backward compat)', () => {
      expect(isValidUnitCode('TWH')).toBe(true);
    });
  });

  describe('N5 — D32 canonical, TWH legacy alias', () => {
    it('D32 tanımlı', () => {
      expect(isValidUnitCode('D32')).toBe(true);
      const d32 = UNIT_DEFINITIONS.find(u => u.code === 'D32');
      expect(d32?.name).toBe('Terawatt Saat');
    });

    it('resolveUnitCode("Terawatt Saat") canonical D32 döner', () => {
      expect(resolveUnitCode('Terawatt Saat')).toBe('D32');
    });

    it('resolveUnitCode("TWH") geri TWH döner (kod girişi korunur)', () => {
      expect(resolveUnitCode('TWH')).toBe('TWH');
    });

    it('resolveUnitCode("D32") D32 döner', () => {
      expect(resolveUnitCode('D32')).toBe('D32');
    });
  });

  describe('B-59 — GWH/MWH/SM3 eklendi', () => {
    it('GWH Gigawatt Saat', () => {
      const gwh = UNIT_DEFINITIONS.find(u => u.code === 'GWH');
      expect(gwh?.name).toBe('Gigawatt Saat');
      expect(isValidUnitCode('GWH')).toBe(true);
    });

    it('MWH Megawatt Saat', () => {
      const mwh = UNIT_DEFINITIONS.find(u => u.code === 'MWH');
      expect(mwh?.name).toBe('Megawatt Saat');
      expect(isValidUnitCode('MWH')).toBe(true);
    });

    it('SM3 Standart Metre Küp', () => {
      const sm3 = UNIT_DEFINITIONS.find(u => u.code === 'SM3');
      expect(sm3?.name).toBe('Standart Metre Küp');
      expect(isValidUnitCode('SM3')).toBe(true);
    });
  });

  describe('M7 — UNIT_CODES türev', () => {
    it('Her config kodu UNIT_CODES içinde', () => {
      for (const def of UNIT_DEFINITIONS) {
        expect(UNIT_CODES.has(def.code)).toBe(true);
      }
    });

    it('UNIT_CODES boyutu = UNIT_DEFINITIONS boyutu', () => {
      expect(UNIT_CODES.size).toBe(UNIT_DEFINITIONS.length);
    });
  });
});
