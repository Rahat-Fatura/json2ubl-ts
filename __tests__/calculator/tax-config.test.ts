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

    it('9015 (KDV Tevkifatı) 4.1.0\'da eklendi — Sprint 2 TODO\'su kapandı', () => {
      // Sprint 2'de atlanmıştı (skill v1.42'de Türkçe etiketi yok —
      // audit/sprint-02-exemption-todo.md). GİB `UBL-TR_Codelist.xml` §TaxType
      // ve `EArsiv.xsd` kodu KABUL EDİYOR; MimForge ESMM ingest kapısı da
      // (packages/ubl-parse ESMM_VERGI_KODLARI) 9015'i ŞART KOŞUYOR.
      const def = TAX_MAP.get('9015');
      expect(def).toBeDefined();
      expect(def?.name).toBe('KDV Tevkifatı');
      expect(isValidTaxCode('9015')).toBe(true);
    });

    it('9015 etiketi PROVISIONAL işaretli — kod listesi belgesinden gelmiyor', () => {
      // N1 disiplini: etiket GİB'in görüntüleme XSLT'sinden okundu, kod listesi
      // belgesinde yok → uydurulmadı ama resmî de sayılmıyor.
      expect(TAX_MAP.get('9015')?.labelProvisional).toBe(true);
      // Kod listesi belgesinden gelen etiketler bu bayrağı TAŞIMAZ.
      expect(TAX_MAP.get('0021')?.labelProvisional).toBeUndefined();
    });

    it('9015 tevkifat semantiği: KDV matrahını değiştirmez, toplamdan düşer', () => {
      const def = TAX_MAP.get('9015');
      expect(def?.baseStat).toBe(false);
      expect(def?.baseCalculate).toBe(false);
      // 0003 Gelir Vergisi Stopajı ile aynı davranış sınıfı.
      expect(def?.baseStat).toBe(TAX_MAP.get('0003')?.baseStat);
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
    it('TAX_DEFINITIONS 30 kod içerir (Sprint 2: 25 + 4; 4.1.0: +9015)', () => {
      expect(TAX_DEFINITIONS).toHaveLength(30);
    });

    it('TAX_TYPE_CODES = GİB Schematron §TaxType ile BİREBİR (31 kod)', () => {
      // UBL-TR_Codelist.xml:15 `$TaxType` — KDV (0015) dahil 31 kod.
      const GIB_TAX_TYPE = [
        '0003', '0015', '0061', '0071', '0073', '0074', '0075', '0076', '0077',
        '1047', '1048', '4080', '4081', '9015', '9021', '9077', '8001', '8002',
        '8004', '8005', '8006', '8007', '8008', '9040', '0011', '4071', '4171',
        '0021', '0022', '9944', '0059',
      ];
      expect(GIB_TAX_TYPE).toHaveLength(31);
      expect(TAX_TYPE_CODES.size).toBe(31);
      for (const code of GIB_TAX_TYPE) {
        expect(TAX_TYPE_CODES.has(code), `GİB kodu eksik: ${code}`).toBe(true);
      }
      for (const code of TAX_TYPE_CODES) {
        expect(GIB_TAX_TYPE, `GİB'de olmayan kod: ${code}`).toContain(code);
      }
    });
  });
});
