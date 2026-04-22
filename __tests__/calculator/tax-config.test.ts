import { describe, it, expect } from 'vitest';
import { TAX_DEFINITIONS, TAX_MAP, KDV_TAX_CODE, isValidTaxCode } from '../../src/calculator/tax-config';
import { TAX_TYPE_CODES } from '../../src/config/constants';

describe('tax-config', () => {
  describe('B-26 eksik kodlar eklendi', () => {
    it('0021 (BMV) tanımlı', () => {
      const def = TAX_MAP.get('0021');
      expect(def?.name).toBe('Banka Muameleleri Vergisi');
      expect(isValidTaxCode('0021')).toBe(true);
    });

    it('0022 (SMV) tanımlı', () => {
      expect(TAX_MAP.get('0022')?.name).toBe('Sigorta Muameleleri Vergisi');
      expect(isValidTaxCode('0022')).toBe(true);
    });

    it('4171 (ÖTV Tevkifat) tanımlı', () => {
      const def = TAX_MAP.get('4171');
      expect(def?.name).toContain('ÖTV Tevkifatı');
      expect(isValidTaxCode('4171')).toBe(true);
    });

    it('9944 (Hal Rüsumu) tanımlı', () => {
      const def = TAX_MAP.get('9944');
      expect(def?.name).toBe('Belediyelere Ödenen Hal Rüsumu');
      expect(isValidTaxCode('9944')).toBe(true);
    });

    it('9015 Sprint 2\'de atlandı (skill v1.42 ismi yok — sprint-02-exemption-todo.md)', () => {
      expect(TAX_MAP.get('9015')).toBeUndefined();
      expect(isValidTaxCode('9015')).toBe(false);
    });
  });

  describe('M7 — TAX_TYPE_CODES türev (constants.ts)', () => {
    it('KDV_TAX_CODE (0015) TAX_TYPE_CODES içinde', () => {
      expect(TAX_TYPE_CODES.has(KDV_TAX_CODE)).toBe(true);
    });

    it('Her TAX_DEFINITIONS kodu TAX_TYPE_CODES içinde', () => {
      for (const def of TAX_DEFINITIONS) {
        expect(TAX_TYPE_CODES.has(def.code)).toBe(true);
      }
    });

    it('TAX_TYPE_CODES boyutu = TAX_DEFINITIONS.length + 1 (KDV özel)', () => {
      expect(TAX_TYPE_CODES.size).toBe(TAX_DEFINITIONS.length + 1);
    });

    it('KDV_TAX_CODE TAX_DEFINITIONS\'ta yok (özel case)', () => {
      expect(TAX_DEFINITIONS.find(d => d.code === KDV_TAX_CODE)).toBeUndefined();
    });
  });

  describe('toplam kod sayısı', () => {
    it('TAX_DEFINITIONS 29 kod içerir (Sprint 2: 25 + 4)', () => {
      expect(TAX_DEFINITIONS).toHaveLength(29);
    });
  });
});
