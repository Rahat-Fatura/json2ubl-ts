import { describe, it, expect } from 'vitest';
import {
  getAllowedTypesForProfile,
  getAllowedProfilesForType,
  getAvailableExemptions,
  resolveProfileForType,
  deriveFieldVisibility,
} from '../../src/calculator/invoice-rules';
import { PROFILE_TYPE_MATRIX } from '../../src/config/constants';
import { UBL_CONSTANTS } from '../../src/config/namespaces';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';

describe('invoice-rules — matris tekleştirme (Sprint 1, M1/M2/M8)', () => {
  describe('M1 — matris simetri (profile → type)', () => {
    it('her profil için helper matrix ile aynı tip kümesini döndürür', () => {
      for (const profile of Object.keys(PROFILE_TYPE_MATRIX) as InvoiceProfileId[]) {
        const helperResult = getAllowedTypesForProfile(profile).slice().sort();
        const matrixResult = Array.from(PROFILE_TYPE_MATRIX[profile]).sort();
        expect(helperResult).toEqual(matrixResult);
      }
    });
  });

  describe('M1 — ters matris simetri (type → profile)', () => {
    it('her tip için döndürülen her profil matrix içinde tipi barındırır', () => {
      const allTypes = new Set<string>();
      for (const profileTypes of Object.values(PROFILE_TYPE_MATRIX)) {
        profileTypes.forEach((t) => allTypes.add(t));
      }
      for (const type of allTypes) {
        const profiles = getAllowedProfilesForType(type);
        for (const profile of profiles) {
          expect(
            PROFILE_TYPE_MATRIX[profile as InvoiceProfileId].has(type as InvoiceTypeCode),
          ).toBe(true);
        }
      }
    });
  });

  describe('M2 — IHRACAT/YOLCUBERABERFATURA/OZELFATURA sadece ISTISNA', () => {
    it('IHRACAT sadece ISTISNA kabul eder', () => {
      expect(getAllowedTypesForProfile('IHRACAT')).toEqual(['ISTISNA']);
    });

    it('YOLCUBERABERFATURA sadece ISTISNA kabul eder', () => {
      expect(getAllowedTypesForProfile('YOLCUBERABERFATURA')).toEqual(['ISTISNA']);
    });

    it('OZELFATURA sadece ISTISNA kabul eder', () => {
      expect(getAllowedTypesForProfile('OZELFATURA')).toEqual(['ISTISNA']);
    });
  });

  describe('B-02 — HKS profili HKSSATIS/HKSKOMISYONCU tipleriyle çalışır', () => {
    it('HKS için helper HKSSATIS ve HKSKOMISYONCU döndürür; SATIS/KOMISYONCU içermez', () => {
      const types = getAllowedTypesForProfile('HKS');
      expect(types).toContain('HKSSATIS');
      expect(types).toContain('HKSKOMISYONCU');
      expect(types).not.toContain('SATIS');
      expect(types).not.toContain('KOMISYONCU');
    });
  });

  describe('B-77 — YTB tipleri EARSIVFATURA profiliyle eşlenir', () => {
    it('YTBSATIS için getAllowedProfilesForType EARSIVFATURA içerir', () => {
      expect(getAllowedProfilesForType('YTBSATIS')).toContain('EARSIVFATURA');
    });
  });

  describe('M8 — CustomizationID TR1.2', () => {
    it('UBL_CONSTANTS.customizationId TR1.2 olmalı', () => {
      expect(UBL_CONSTANTS.customizationId).toBe('TR1.2');
    });
  });

  describe('B-45 — getAvailableExemptions SGK/IADE ISTISNA kodlarını içerir', () => {
    it('IADE tipinde ISTISNA kodları erişilebilir (Schematron 316/318/320)', () => {
      const result = getAvailableExemptions('IADE');
      expect(result.length).toBeGreaterThan(0);
    });

    it('TEVKIFATIADE tipinde de ISTISNA kodları erişilebilir', () => {
      const result = getAvailableExemptions('TEVKIFATIADE');
      expect(result.length).toBeGreaterThan(0);
    });

    it('SGK tipinde hem SGK hem ISTISNA kodları birleşik döndürülür', () => {
      const sgkOnly = getAvailableExemptions('SGK');
      // ISTISNA kodları eklendi → toplam > sadece SGK
      const istisnaOnly = getAvailableExemptions('ISTISNA');
      expect(sgkOnly.length).toBeGreaterThanOrEqual(istisnaOnly.length);
    });
  });

  describe('B-47 — resolveProfileForType earchive+SGK fallback', () => {
    it('earchive + SGK → EARSIVFATURA (TICARIFATURA yanlış fallback önlendi)', () => {
      const result = resolveProfileForType(undefined, 'SGK', 'earchive', false);
      expect(result).toBe('EARSIVFATURA');
    });

    it('liability yoksa SGK → TEMELFATURA (mevcut davranış korunur)', () => {
      const result = resolveProfileForType(undefined, 'SGK', undefined, false);
      expect(result).toBe('TEMELFATURA');
    });
  });

  describe('B-79 — showWithholdingTaxSelector TEVKIFATIADE\'ye daraldı', () => {
    it('sade IADE tipinde selector görünmez', () => {
      const fv = deriveFieldVisibility('IADE', 'TEMELFATURA');
      expect(fv.showWithholdingTaxSelector).toBe(false);
    });

    it('TEVKIFAT tipinde selector görünür', () => {
      const fv = deriveFieldVisibility('TEVKIFAT', 'TICARIFATURA');
      expect(fv.showWithholdingTaxSelector).toBe(true);
    });

    it('TEVKIFATIADE tipinde selector görünür', () => {
      const fv = deriveFieldVisibility('TEVKIFATIADE', 'TEMELFATURA');
      expect(fv.showWithholdingTaxSelector).toBe(true);
    });
  });
});
