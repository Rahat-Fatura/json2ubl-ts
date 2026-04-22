import { describe, it, expect } from 'vitest';
import {
  TAX_TYPE_CODES,
  WITHHOLDING_TAX_TYPE_CODES,
  WITHHOLDING_TAX_TYPE_WITH_PERCENT,
  ISTISNA_TAX_EXEMPTION_REASON_CODES,
  OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES,
  IHRAC_EXEMPTION_REASON_CODES,
  UNIT_CODES,
  PACKAGING_TYPE_CODES,
  DEMIRBAS_KDV_EXEMPTION_CODES,
  NON_ISTISNA_REASON_CODES,
  ADDITIONAL_ITEM_ID_SCHEME_IDS,
} from '../../src/config/constants';
import { TAX_DEFINITIONS, KDV_TAX_CODE } from '../../src/calculator/tax-config';
import { WITHHOLDING_TAX_DEFINITIONS } from '../../src/calculator/withholding-config';
import { EXEMPTION_DEFINITIONS } from '../../src/calculator/exemption-config';
import { UNIT_DEFINITIONS } from '../../src/calculator/unit-config';
import { PACKAGING_TYPE_CODE_DEFINITIONS } from '../../src/calculator/package-type-code-config';

describe('M7 — constants.ts config türetme simetrisi', () => {
  describe('TAX_TYPE_CODES ↔ TAX_DEFINITIONS (+KDV)', () => {
    it('Set boyutu = DEFINITIONS boyutu + 1 (KDV özel)', () => {
      expect(TAX_TYPE_CODES.size).toBe(TAX_DEFINITIONS.length + 1);
    });

    it('KDV_TAX_CODE Set\'te', () => {
      expect(TAX_TYPE_CODES.has(KDV_TAX_CODE)).toBe(true);
    });

    it('Her DEFINITIONS kodu Set\'te', () => {
      for (const def of TAX_DEFINITIONS) {
        expect(TAX_TYPE_CODES.has(def.code)).toBe(true);
      }
    });
  });

  describe('WITHHOLDING_TAX_TYPE_CODES ↔ WITHHOLDING_TAX_DEFINITIONS', () => {
    it('Set boyutu = DEFINITIONS boyutu', () => {
      expect(WITHHOLDING_TAX_TYPE_CODES.size).toBe(WITHHOLDING_TAX_DEFINITIONS.length);
    });

    it('650 (dinamik) dahil', () => {
      expect(WITHHOLDING_TAX_TYPE_CODES.has('650')).toBe(true);
    });
  });

  describe('ISTISNA/OZELMATRAH/IHRAC ↔ EXEMPTION_DEFINITIONS (documentType filter)', () => {
    it('ISTISNA Set ↔ documentType=ISTISNA filter', () => {
      const filtered = EXEMPTION_DEFINITIONS.filter(e => e.documentType === 'ISTISNA');
      expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.size).toBe(filtered.length);
    });

    it('OZELMATRAH Set ↔ documentType=OZELMATRAH filter', () => {
      const filtered = EXEMPTION_DEFINITIONS.filter(e => e.documentType === 'OZELMATRAH');
      expect(OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES.size).toBe(filtered.length);
    });

    it('IHRAC Set ↔ documentType=IHRACKAYITLI filter', () => {
      const filtered = EXEMPTION_DEFINITIONS.filter(e => e.documentType === 'IHRACKAYITLI');
      expect(IHRAC_EXEMPTION_REASON_CODES.size).toBe(filtered.length);
    });
  });

  describe('UNIT_CODES, PACKAGING_TYPE_CODES ↔ config türev (yeni)', () => {
    it('UNIT_CODES ↔ UNIT_DEFINITIONS', () => {
      expect(UNIT_CODES.size).toBe(UNIT_DEFINITIONS.length);
    });

    it('PACKAGING_TYPE_CODES ↔ PACKAGING_TYPE_CODE_DEFINITIONS', () => {
      expect(PACKAGING_TYPE_CODES.size).toBe(PACKAGING_TYPE_CODE_DEFINITIONS.length);
    });
  });

  describe('Özel Set\'ler (kasıtlı ayrı, M7 dışı)', () => {
    it('DEMIRBAS_KDV_EXEMPTION_CODES = {555}', () => {
      expect(DEMIRBAS_KDV_EXEMPTION_CODES.size).toBe(1);
      expect(DEMIRBAS_KDV_EXEMPTION_CODES.has('555')).toBe(true);
    });

    it('NON_ISTISNA_REASON_CODES = {351}', () => {
      expect(NON_ISTISNA_REASON_CODES.size).toBe(1);
      expect(NON_ISTISNA_REASON_CODES.has('351')).toBe(true);
    });

    it('555 ISTISNA whitelist\'te yok', () => {
      expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.has('555')).toBe(false);
    });

    it('351 ISTISNA whitelist\'te yok (M5 Sprint 5 hazırlık)', () => {
      expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.has('351')).toBe(false);
    });
  });

  describe('B-88 — ADDITIONAL_ITEM_ID_SCHEME_IDS BILGISAYAR çıkarıldı', () => {
    it('BILGISAYAR Set\'te yok', () => {
      expect(ADDITIONAL_ITEM_ID_SCHEME_IDS.has('BILGISAYAR')).toBe(false);
    });

    it('Diğer şemalar hâlâ var', () => {
      expect(ADDITIONAL_ITEM_ID_SCHEME_IDS.has('TELEFON')).toBe(true);
      expect(ADDITIONAL_ITEM_ID_SCHEME_IDS.has('TABLET_PC')).toBe(true);
    });
  });

  describe('WITHHOLDING_TAX_TYPE_WITH_PERCENT — B-04 regenerate', () => {
    it('650 dinamik range 65000-65099 tam', () => {
      for (let p = 0; p < 100; p++) {
        const combo = `650${String(p).padStart(2, '0')}`;
        expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has(combo)).toBe(true);
      }
    });

    it('8xx için code+100 formatı (25 kod)', () => {
      for (let c = 801; c <= 825; c++) {
        expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has(`${c}100`)).toBe(true);
      }
    });
  });
});
