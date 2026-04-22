import { describe, it, expect } from 'vitest';
import {
  WITHHOLDING_TAX_DEFINITIONS,
  WITHHOLDING_TAX_MAP,
  isValidWithholdingTaxCode,
} from '../../src/calculator/withholding-config';
import {
  WITHHOLDING_TAX_TYPE_CODES,
  WITHHOLDING_TAX_TYPE_WITH_PERCENT,
} from '../../src/config/constants';

describe('withholding-config', () => {
  describe('M3 — 650 dinamik tevkifat', () => {
    it('650 entry tanımlı', () => {
      const def = WITHHOLDING_TAX_MAP.get('650');
      expect(def).toBeDefined();
      expect(def?.name).toBe('Diğer');
      expect(def?.percent).toBe(0);
      expect(def?.dynamicPercent).toBe(true);
    });

    it('isValidWithholdingTaxCode(650) true', () => {
      expect(isValidWithholdingTaxCode('650')).toBe(true);
    });

    it('diğer 6xx/8xx kodlar sabit (dynamicPercent yok)', () => {
      expect(WITHHOLDING_TAX_MAP.get('601')?.dynamicPercent).toBeUndefined();
      expect(WITHHOLDING_TAX_MAP.get('801')?.dynamicPercent).toBeUndefined();
    });
  });

  describe('B-101 — 616 adı güncellendi', () => {
    it('616 KDVGUT referansı ile yeni isim', () => {
      expect(WITHHOLDING_TAX_MAP.get('616')?.name).toBe('Diğer Hizmetler [KDVGUT-(I/C-2.1.3.2.13)]');
    });
  });

  describe('M7 — WITHHOLDING_TAX_TYPE_CODES türev', () => {
    it('Her config kodu Set içinde', () => {
      for (const def of WITHHOLDING_TAX_DEFINITIONS) {
        expect(WITHHOLDING_TAX_TYPE_CODES.has(def.code)).toBe(true);
      }
    });

    it('Set boyutu = config boyutu (53 kod, 650 dahil)', () => {
      expect(WITHHOLDING_TAX_TYPE_CODES.size).toBe(WITHHOLDING_TAX_DEFINITIONS.length);
      expect(WITHHOLDING_TAX_DEFINITIONS).toHaveLength(53);
    });
  });

  describe('B-04 — WITHHOLDING_TAX_TYPE_WITH_PERCENT regenerate', () => {
    it('601 kodu için %40 padded combo (60140)', () => {
      expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('60140')).toBe(true);
    });

    it('650 için 65000-65099 tam aralık', () => {
      expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('65000')).toBe(true);
      expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('65025')).toBe(true);
      expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('65099')).toBe(true);
    });

    it('8xx tam tevkifat için code+100 formatı', () => {
      expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('801100')).toBe(true);
      expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('825100')).toBe(true);
    });

    it('Geçersiz kombinasyon Set\'te yok', () => {
      // Codelist'te 60120, 60150, 60160, 60170 yoktu (B-04 problemi);
      // 601 sabit %40, helper 60140 üretir, 60120 üretmez.
      expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('60120')).toBe(false);
    });
  });
});
