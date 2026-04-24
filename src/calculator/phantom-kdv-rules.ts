/**
 * Phantom KDV (Vazgeçilen KDV Tutarı) kombinasyon kuralları — M12 (Sprint 8d).
 *
 * GİB "Yatırım Teşvik Kapsamında Yapılan Teslimlere İlişkin Fatura Teknik
 * Kılavuzu v1.1" (Aralık 2025) §2.1.4 + §2.1.5.
 *
 * Yalnız iki kombinasyonda phantom KDV davranışı devreye girer:
 *   - profileId=YATIRIMTESVIK + invoiceTypeCode=ISTISNA (e-Fatura)
 *   - profileId=EARSIVFATURA + invoiceTypeCode=YTBISTISNA (e-Arşiv)
 *
 * Davranış: Satır KDV matematiği hesaplanır, TaxSubtotal XML'e yazılır
 * (TaxAmount, Percent dolu + CalculationSequenceNumeric=-1 + exemption code),
 * fakat LegalMonetaryTotal ve parent TaxTotal/TaxAmount'a dahil edilmez.
 */

/** Kütüphane otomatik olarak set eder — kullanıcıdan alınmaz. */
export const PHANTOM_KDV_CALCULATION_SEQUENCE_NUMERIC = -1;

/** PDF §4: Makine/Teçhizat (01) → 308, İnşaat (02) → 339. */
export const PHANTOM_KDV_EXEMPTION_CODES = new Set<string>(['308', '339']);

/** PDF §4: ItemClassificationCode 03 (Arsa/Arazi) ve 04 (Diğer) ISTISNA tipinde yasak. */
export const PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES = new Set<string>(['01', '02']);

/**
 * 308 ↔ 01 (Makine/Teçhizat), 339 ↔ 02 (İnşaat) eşlemesi.
 * Belirtilen ItemClassificationCode için beklenen istisna kodunu döner.
 */
export function phantomKdvExemptionCodeFor(itemClassificationCode: string): string | null {
  if (itemClassificationCode === '01') return '308';
  if (itemClassificationCode === '02') return '339';
  return null;
}

/**
 * YATIRIMTESVIK+ISTISNA veya EARSIVFATURA+YTBISTISNA kombinasyonunda `true`.
 * Profile ve type string'leri `CalculatedDocument.profile` ve `.type` ile
 * eşleşir (tespit edilmiş final değerler).
 */
export function isPhantomKdvCombination(profile: string, type: string): boolean {
  if (profile === 'YATIRIMTESVIK' && type === 'ISTISNA') return true;
  if (profile === 'EARSIVFATURA' && type === 'YTBISTISNA') return true;
  return false;
}
