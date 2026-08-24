import { describe, it, expect } from 'vitest';
import {
  EXEMPTION_DEFINITIONS,
  EXEMPTION_MAP,
  getExemptionsByDocumentType,
  isValidExemptionCode,
} from '../../src/calculator/exemption-config';
import {
  ISTISNA_TAX_EXEMPTION_REASON_CODES,
  IHRAC_EXEMPTION_REASON_CODES,
  OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES,
  NON_ISTISNA_REASON_CODES,
  DEMIRBAS_KDV_EXEMPTION_CODES,
} from '../../src/config/constants';

describe('exemption-config', () => {
  describe('B-03 — geçersiz kodlar config\'de yok', () => {
    // NOT: 233 bu listeden Sprint 9'da çıkarıldı — Kod Listeleri v1.43 (2026-07-27)
    // ile Kısmi İstisna listesine eklendi. Aşağıdaki "v1.43" bloğuna bakınız.
    const invalidCodes = ['203', '210', '222', '224', '243', '244', '245', '246', '247', '248', '249'];
    for (const code of invalidCodes) {
      it(`${code} kodu tanımsız`, () => {
        expect(EXEMPTION_MAP.has(code)).toBe(false);
        expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.has(code)).toBe(false);
      });
    }
  });

  describe('Sprint 9 — UBL-TR Kod Listeleri v1.43 (2026-07-27)', () => {
    it('233 Kısmi İstisna kodu ISTISNA tipinde tanımlı', () => {
      const def = EXEMPTION_MAP.get('233');
      expect(def).toBeDefined();
      expect(def?.type).toBe('KDV');
      expect(def?.documentType).toBe('ISTISNA');
      expect(def?.name).toBe(
        '2942 Sayılı Kamulaştırma Kanunu Kapsamında Taşınmazların Kamulaştırmayı Yapan Devlet ve Kamu Tüzel Kişilerine Devri',
      );
    });

    it('233 ISTISNA kod havuzuna türetiliyor', () => {
      expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.has('233')).toBe(true);
      expect(isValidExemptionCode('233')).toBe(true);
    });

    it('229 metni v1.43 ile eşitlendi — Darülacezeye eklendi, 17/2-b öneki kalktı', () => {
      const def = EXEMPTION_MAP.get('229');
      expect(def?.name).toBe(
        'Gıda Bankacılığı Faaliyetinde Bulunan Darülacezeye, Dernek ve Vakıflara Bağışlanan, Gıda, Temizlik, Giyecek ve Yakacak Maddeleri',
      );
      expect(def?.name).not.toContain('17/2-b');
    });

    it('233 kod sırasında 232 ile 234 arasında duruyor', () => {
      const codes = EXEMPTION_DEFINITIONS.map(d => d.code);
      expect(codes.indexOf('233')).toBe(codes.indexOf('232') + 1);
      expect(codes.indexOf('234')).toBe(codes.indexOf('233') + 1);
    });
  });

  describe('B-57 + M7 — Yeni ISTISNA kodları eklendi', () => {
    const newIstisnaCodes = ['218', '241', '242', '250', '326', '327', '328', '329', '330', '331', '333', '334', '336', '337', '338', '340', '341', '342', '343', '344'];
    for (const code of newIstisnaCodes) {
      it(`${code} ISTISNA tipinde tanımlı`, () => {
        const def = EXEMPTION_MAP.get(code);
        expect(def).toBeDefined();
        expect(def?.documentType).toBe('ISTISNA');
      });
    }
  });

  describe('704 ihraç kayıtlı', () => {
    it('704 IHRACKAYITLI tanımlı', () => {
      const def = EXEMPTION_MAP.get('704');
      expect(def?.documentType).toBe('IHRACKAYITLI');
      expect(IHRAC_EXEMPTION_REASON_CODES.has('704')).toBe(true);
    });
  });

  describe('B-24 — 151 ÖTV İstisna Olmayan', () => {
    it('151 OTV tipi SATIS documentType', () => {
      const def = EXEMPTION_MAP.get('151');
      expect(def?.type).toBe('OTV');
      expect(def?.documentType).toBe('SATIS');
    });
  });

  describe('351 non-ISTISNA ayrı', () => {
    it('351 documentType SATIS (ISTISNA değil)', () => {
      expect(EXEMPTION_MAP.get('351')?.documentType).toBe('SATIS');
      expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.has('351')).toBe(false);
      expect(NON_ISTISNA_REASON_CODES.has('351')).toBe(true);
    });
  });

  describe('M4 + Sprint 8c.1 — 555 EXEMPTION_DEFINITIONS ve DEMIRBAS set', () => {
    it('555 EXEMPTION_DEFINITIONS\'ta var (Sprint 8c.1 — B-NEW-11)', () => {
      expect(EXEMPTION_MAP.has('555')).toBe(true);
      expect(EXEMPTION_MAP.get('555')?.name).toContain('KDV Oran Kontrolüne Tabi Olmayan');
      expect(EXEMPTION_MAP.get('555')?.documentType).toBe('SATIS');
    });

    it('555 DEMIRBAS_KDV_EXEMPTION_CODES içinde (M4 gate için ayrı set korundu)', () => {
      expect(DEMIRBAS_KDV_EXEMPTION_CODES.has('555')).toBe(true);
    });

    it('555 ISTISNA whitelist\'te değil (SATIS documentType)', () => {
      expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.has('555')).toBe(false);
    });
  });

  describe('M7 türev Set — documentType filter', () => {
    it('ISTISNA Set = config ISTISNA subset', () => {
      const istisnaCodes = EXEMPTION_DEFINITIONS
        .filter(e => e.documentType === 'ISTISNA')
        .map(e => e.code);
      expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.size).toBe(istisnaCodes.length);
      for (const c of istisnaCodes) {
        expect(ISTISNA_TAX_EXEMPTION_REASON_CODES.has(c)).toBe(true);
      }
    });

    it('OZELMATRAH Set 801-812', () => {
      expect(OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES.size).toBe(12);
      for (let i = 801; i <= 812; i++) {
        expect(OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES.has(String(i))).toBe(true);
      }
    });
  });

  describe('N1 — Placeholder yasak (isim kontrolü)', () => {
    it('Hiçbir name TODO içermiyor', () => {
      for (const def of EXEMPTION_DEFINITIONS) {
        expect(def.name.includes('TODO')).toBe(false);
      }
    });

    it('Hiçbir name "Kod XXX" formatında değil', () => {
      for (const def of EXEMPTION_DEFINITIONS) {
        expect(/^Kod \d+/.test(def.name)).toBe(false);
      }
    });

    it('Hiçbir name boş değil', () => {
      for (const def of EXEMPTION_DEFINITIONS) {
        expect(def.name.trim().length).toBeGreaterThan(0);
      }
    });

    it('Hiçbir name "Bilinmiyor"/"Unknown" değil', () => {
      for (const def of EXEMPTION_DEFINITIONS) {
        expect(def.name).not.toBe('Bilinmiyor');
        expect(def.name).not.toBe('Unknown');
      }
    });
  });

  describe('helper fonksiyonları', () => {
    it('getExemptionsByDocumentType(IHRACKAYITLI) 4 kod', () => {
      expect(getExemptionsByDocumentType('IHRACKAYITLI')).toHaveLength(4);
    });

    it('isValidExemptionCode(250) true', () => {
      expect(isValidExemptionCode('250')).toBe(true);
    });

    it('isValidExemptionCode(203) false (çıkarıldı)', () => {
      expect(isValidExemptionCode('203')).toBe(false);
    });
  });
});
