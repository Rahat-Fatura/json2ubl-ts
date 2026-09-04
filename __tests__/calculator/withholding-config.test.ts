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
    /* 🔴 4.2.0 — TEVKİFAT KODU '650' KALDIRILDI. Bu bloğu geri açmayın.
     *
     * '650' ("Diğer") kütüphanenin tek `dynamicPercent` kodu idi: oranı kullanıcı
     * belirliyordu. Canlı GİB paketi (şematron 2026-08-04) bunu reddediyor —
     * `WithholdingTaxTotalCheck` kodu ve oranı BİRLİKTE
     * (`concat(',',TaxTypeCode,Percent,',')`) sabit kod listesinde arar, dolayısıyla
     * serbest oranlı bir tevkifat kodu bu tasarımda mümkün DEĞİLDİR.
     *
     * Kaplama seferinde 53 kodun tamamı tek tek denendi; 52'si temiz, yalnız bu
     * düştü. Testler artık kodun YOKLUĞUNU pinliyor. */
  describe('650 KALDIRILDI (4.2.0) — GİB serbest oranlı tevkifat kodu kabul etmez', () => {
    it('650 tanımı YOK', () => {
      expect(WITHHOLDING_TAX_MAP.get('650')).toBeUndefined();
    });

    it('isValidWithholdingTaxCode(650) false', () => {
      expect(isValidWithholdingTaxCode('650')).toBe(false);
    });

    it('hiçbir kod dynamicPercent taşımaz', () => {
      expect(WITHHOLDING_TAX_DEFINITIONS.filter(d => d.dynamicPercent)).toEqual([]);
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

    it('Set boyutu = config boyutu (52 kod — 650 4.2.0’da çıkarıldı)', () => {
      expect(WITHHOLDING_TAX_TYPE_CODES.size).toBe(WITHHOLDING_TAX_DEFINITIONS.length);
      expect(WITHHOLDING_TAX_DEFINITIONS).toHaveLength(52);
    });
  });

  describe('B-04 — WITHHOLDING_TAX_TYPE_WITH_PERCENT regenerate', () => {
    it('601 kodu için %40 padded combo (60140)', () => {
      expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('60140')).toBe(true);
    });

    it('650 aralığı ARTIK ÜRETİLMİYOR (kod kaldırıldı)', () => {
      expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('65000')).toBe(false);
      expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('65050')).toBe(false);
      expect(WITHHOLDING_TAX_TYPE_WITH_PERCENT.has('65099')).toBe(false);
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
