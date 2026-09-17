/**
 * M11 — Kendi istisna kodlarını taşıyan fatura tip/profilleri.
 *
 * Bu tiplerde/profillerde kütüphane 351 atamaz, validator 351 zorunluluğu uygulamaz.
 * Dışındaki tüm tipler (SATIS, SGK, TEVKIFAT, IADE, KOMISYONCU, TEKNOLOJIDESTEK,
 * KONAKLAMAVERGISI, SARJHIZMETI, HKS varyantları, YTBSATIS/YTBTEVKIFAT vb.)
 * KDV=0 kalem için manuel istisna kodu (varsayılan 351) gerektirir.
 *
 * Sprint 8c / B-NEW-11 ile eklendi.
 */

/** Kendi istisna kodlarını taşıyan fatura tipleri */
export const SELF_EXEMPTION_INVOICE_TYPES: ReadonlySet<string> = new Set([
  'ISTISNA',
  'YTBISTISNA',
  'IHRACKAYITLI',
  'OZELMATRAH',
]);

/** Kendi istisna kodlarını taşıyan fatura profilleri */
export const SELF_EXEMPTION_INVOICE_PROFILES: ReadonlySet<string> = new Set([
  'IHRACAT',
  'YOLCUBERABERFATURA',
  'OZELFATURA',
  'YATIRIMTESVIK',
]);

/**
 * Fatura self-exemption mi kontrol eder.
 *
 * @param type Fatura tipi (SATIS, TEVKIFAT, ISTISNA, ...)
 * @param profile Fatura profili (TEMELFATURA, TICARIFATURA, IHRACAT, ...)
 * @returns true ise kütüphane manuel 351 kuralını uygulamaz
 */
export function isSelfExemptionInvoice(type: string, profile: string): boolean {
  return SELF_EXEMPTION_INVOICE_TYPES.has(type) || SELF_EXEMPTION_INVOICE_PROFILES.has(profile);
}
