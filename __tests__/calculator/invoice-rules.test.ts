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

  describe('B-02 — HKS iki düzlem: e-Fatura (HKS) ve e-Arşiv (EARSIVFATURA)', () => {
    /* Şematron HKS profiline tip KISITI KOYMUYOR (kısıt yalnız ENERJI,
     * ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS profillerinde ve IADE/TEKNOLOJIDESTEK
     * tiplerinde var). Ama hal faturası İKİ DÜZLEMDE kesilir ve tip adı düzleme
     * göre değişir:
     *   e-Fatura : HKS          + SATIS / KOMISYONCU
     *   e-Arşiv  : EARSIVFATURA + HKSSATIS / HKSKOMISYONCU
     * Beşi de canlı şematronla doğrulandı (paket 20260701, xslt-service :8081). */
    it('HKS e-Fatura düzleminin dört tipini sunar', () => {
      const types = getAllowedTypesForProfile('HKS');
      expect(types).toEqual(['SATIS', 'ISTISNA', 'TEVKIFAT', 'KOMISYONCU']);
    });

    it('HKS, e-Arşiv düzleminin tiplerini SUNMAZ', () => {
      const types = getAllowedTypesForProfile('HKS');
      expect(types).not.toContain('HKSSATIS');
      expect(types).not.toContain('HKSKOMISYONCU');
    });

    it('EARSIVFATURA, HKS e-Arşiv düzleminin tiplerini sunar', () => {
      const types = getAllowedTypesForProfile('EARSIVFATURA');
      expect(types).toContain('HKSSATIS');
      expect(types).toContain('HKSKOMISYONCU');
    });

    it('HKSSATIS/HKSKOMISYONCU yalnız EARSIVFATURA profiline eşlenir', () => {
      expect(getAllowedProfilesForType('HKSSATIS')).toEqual(['EARSIVFATURA']);
      expect(getAllowedProfilesForType('HKSKOMISYONCU')).toEqual(['EARSIVFATURA']);
    });

    /* KOMISYONCU 4.4.0'da HKS'e YENİ girdi: e-Fatura düzleminde komisyoncu
     * faturası hiç kesilemiyordu — GİB kısıtı değil, kütüphane boşluğuydu. */
    it('HKS + KOMISYONCU artık kesilebilir (4.4.0 boşluk kapandı)', () => {
      expect(getAllowedTypesForProfile('HKS')).toContain('KOMISYONCU');
    });

    /* 🔴 IADE, şematronun AÇIKÇA reddettiği tek tip: InvoiceTypeCodeCheck —
     * "Fatura tipi IADE iken profil sadece TEMELFATURA, EARSIVFATURA,
     * ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS veya KAMU olabilir". Ölçüldü. */
    it('HKS + IADE şematronda yasak — matrise girmemeli', () => {
      expect(getAllowedTypesForProfile('HKS')).not.toContain('IADE');
    });

    /* 🔑 Sıra sözleşmesi: `resolveTypeForProfile` boş girdide allowed[0] seçer.
     * 4.4.0'a kadar bu HKSSATIS'ti; düzlem ayrımından sonra SATIS olmalı. */
    it('HKS varsayılan tipi SATIS (sıra sözleşmesi)', () => {
      expect(getAllowedTypesForProfile('HKS')[0]).toBe('SATIS');
    });

    it('EARSIVFATURA varsayılanı SATIS kalır (HKS tipleri SONA eklendi)', () => {
      expect(getAllowedTypesForProfile('EARSIVFATURA')[0]).toBe('SATIS');
    });
  });

  /**
   * `TEVKIFATIADE` / `YTBTEVKIFATIADE` — ÜRETİMDE SUNULMAZ, GELEN BELGEDE TANINIR.
   *
   * Şematronda ayırt edici kuralları yok (`IADEInvioceCheck`,
   * `YatirimTesvikKDVCheck`, `YatirimTesvikLineKDVCheck` üçü de onları
   * IADE/YTBIADE ile aynı VEYA-grubuna koyar) ve tevkifat toplamı taşıyamazlar
   * (`GeneralWithholdingTaxTotalCheck`). Seçim listelerinden çıkarıldılar; enum
   * ve davranış (iade) türetmeleri KORUNDU.
   */
  describe('4.4.0 — TEVKIFATIADE/YTBTEVKIFATIADE üretimden çıkarıldı', () => {
    it('hiçbir profil TEVKIFATIADE sunmaz', () => {
      for (const profile of Object.keys(PROFILE_TYPE_MATRIX) as InvoiceProfileId[]) {
        expect(getAllowedTypesForProfile(profile), profile).not.toContain('TEVKIFATIADE');
        expect(PROFILE_TYPE_MATRIX[profile].has(InvoiceTypeCode.TEVKIFATIADE), profile).toBe(false);
      }
    });

    it('hiçbir profil YTBTEVKIFATIADE sunmaz', () => {
      for (const profile of Object.keys(PROFILE_TYPE_MATRIX) as InvoiceProfileId[]) {
        expect(getAllowedTypesForProfile(profile), profile).not.toContain('YTBTEVKIFATIADE');
        expect(PROFILE_TYPE_MATRIX[profile].has(InvoiceTypeCode.YTBTEVKIFATIADE), profile).toBe(false);
      }
    });

    /* ⚠️ `getAllowedProfilesForType` BOŞ DÖNMEZ: matriste karşılığı olmayan her
     * tip için jenerik `['TEMELFATURA','TICARIFATURA']` yedeğine düşer (satır
     * `TYPE_PROFILE_MAP[type] ?? [...]`). Bu yedek BU DEĞİŞİKLİKLE GELMEDİ,
     * bilinmeyen tipler için zaten vardı ve okuma yolunda işe yarar: gelen
     * TEVKIFATIADE belgesi bir profile oturtulabilsin. ÜRETİMİ AÇMAZ — kapı
     * `validateCrossMatrix`'tir ve o REDDEDER (bkz. cross-validators.test.ts). */
    it('profil önerisi jenerik yedeğe düşer, üretim kapısı yine de kapalıdır', () => {
      expect(getAllowedProfilesForType('TEVKIFATIADE')).toEqual(['TEMELFATURA', 'TICARIFATURA']);
      expect(getAllowedProfilesForType('YTBTEVKIFATIADE')).toEqual(['TEMELFATURA', 'TICARIFATURA']);
    });

    /* OKUMA YOLU: gelen belgede tip hâlâ tanınmalı — enum değeri duruyor ve
     * iade davranışı (alan görünürlüğü) türetiliyor. */
    it('enum değerleri KORUNDU (gelen belgede tanınır)', () => {
      expect(InvoiceTypeCode.TEVKIFATIADE).toBe('TEVKIFATIADE');
      expect(InvoiceTypeCode.YTBTEVKIFATIADE).toBe('YTBTEVKIFATIADE');
    });

    it('iade davranışı KORUNDU: billingReference alanı görünür', () => {
      expect(deriveFieldVisibility('TEVKIFATIADE', 'TEMELFATURA').showBillingReference).toBe(true);
      expect(deriveFieldVisibility('YTBTEVKIFATIADE', 'EARSIVFATURA').showBillingReference).toBe(true);
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

  /**
   * 🔴 B-79 KARARI 4.1.5'TE TERSİNE ÇEVRİLDİ — BU TESTLERİ ESKİ HÂLİNE ALMAYIN.
   *
   * Eski kural "sade IADE'de selector görünmez, TEVKIFATIADE'de görünür" idi.
   * Gerçeğin tam tersiydi. Canlı GİB paketi (şematron 2026-08-04) ile ölçüldü:
   *
   *   TEVKIFATIADE + WithholdingTaxTotal → RED (GeneralWithholdingTaxTotalCheck)
   *   IADE         + WithholdingTaxTotal → GEÇER
   *
   * Şematron metni birebir: "cac:WithholdingTaxTotal elamanı varken fatura tipi
   * TEVKIFAT, YTBTEVKIFAT, IADE, YTBIADE, SGK, SARJ ve SARJANLIK olabilir."
   * TEVKIFATIADE o listede YOKTUR.
   *
   * Sahadaki tevkifatlı iade = tip IADE + kalemde tevkifat kodu. Eski kural,
   * doğru senaryoyu kapatıp GİB'in reddettiğini açıyordu.
   */
  describe('B-79 (4.1.5 ters) — selector şematronun izinli tip listesinden okunur', () => {
    it('sade IADE tipinde selector GÖRÜNÜR (eski B-79 bunu gizliyordu)', () => {
      const fv = deriveFieldVisibility('IADE', 'TEMELFATURA');
      expect(fv.showWithholdingTaxSelector).toBe(true);
    });

    it('TEVKIFAT tipinde selector görünür', () => {
      const fv = deriveFieldVisibility('TEVKIFAT', 'TICARIFATURA');
      expect(fv.showWithholdingTaxSelector).toBe(true);
    });

    it('TEVKIFATIADE tipinde selector GÖRÜNMEZ (GİB o tipte stopaj kabul etmiyor)', () => {
      const fv = deriveFieldVisibility('TEVKIFATIADE', 'TEMELFATURA');
      expect(fv.showWithholdingTaxSelector).toBe(false);
    });

    it('şematronun yedi izinli tipinin TAMAMINDA görünür, dışındakilerde görünmez', () => {
      const izinli = ['TEVKIFAT', 'YTBTEVKIFAT', 'IADE', 'YTBIADE', 'SGK', 'SARJ', 'SARJANLIK'];
      const disarida = ['TEVKIFATIADE', 'YTBTEVKIFATIADE', 'SATIS', 'ISTISNA', 'IHRACAT'];
      for (const t of izinli) {
        expect(deriveFieldVisibility(t, 'TEMELFATURA').showWithholdingTaxSelector, t).toBe(true);
      }
      for (const t of disarida) {
        expect(deriveFieldVisibility(t, 'TEMELFATURA').showWithholdingTaxSelector, t).toBe(false);
      }
    });
  });
});
