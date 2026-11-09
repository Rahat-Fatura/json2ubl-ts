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
 * fakat vazgeçilen KDV LegalMonetaryTotal ve parent TaxTotal/TaxAmount'a dahil
 * edilmez. Kalemin öbür vergileri (ÖTV, stopaj …) olağan etkisiyle girer; bkz.
 * `phantomLineCountedTaxes`.
 */

import { isYatirimTesvikIstisnaScope } from '../ubltr/vocabulary/schematron-scopes';
import { KDV_TAX_CODE } from './tax-config';
import { configManager } from './config-manager';

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
 *
 * 4.5.2: koşul artık `config/schematron-scopes`ten okunur — KOPYA DEĞİL.
 * Phantom-KDV tetikleyicisi ile şematronun ISTİSNA dörtlüsünün
 * (`YatirimTesvikItemClassificationCodeIstisnaCheck`,
 * `...IstisnaCalculationSequenceNumericCheck`, `...TaxExemptionReasonCode308Check`,
 * `...339Check`) kapsamı AYNI koşuldur; ikisini ayrı yerlerde tutmak bu paketi
 * üç kez vuran ayrışma sınıfını üretiyordu.
 */
export function isPhantomKdvCombination(profile: string, type: string): boolean {
  return isYatirimTesvikIstisnaScope(profile, type);
}

/**
 * Vazgeçilen KDV (fantom) kaleminde belge ve satır toplamlarına GİREN vergiler
 * (KN-092).
 *
 * GİB yalnız vazgeçilen KDV'yi fatura tutarı hesabının dışında bırakır
 * (kılavuz §2.1.4; şematron -1'i yalnız 0015 alt toplamında arar). Dışarıda
 * kalanlar:
 *   • KDV (0015);
 *   • matrahı hesaplanan KDV olan vergiler (`baseIsCalculatedVat`, bugün
 *     yalnız 9015) — matrahları vazgeçilen KDV'dir.
 * Öbür bütün vergiler (ÖTV, stopaj …) fantomsuz yoldaki işaretleriyle toplama
 * girer. 5.2.0'a kadar fantom kalemin BÜTÜN vergileri toplamdan düşülüyordu.
 *
 * Hesap motoru (`calculateDocument`) ve XML eşleyicisi (satır `TaxTotal`)
 * bu tek yüklemi okur.
 */
export function phantomLineCountedTaxes<T extends { code: string }>(subtotals: readonly T[]): T[] {
  return subtotals.filter(
    t => t.code !== KDV_TAX_CODE && !configManager.getTax(t.code)?.baseIsCalculatedVat,
  );
}
