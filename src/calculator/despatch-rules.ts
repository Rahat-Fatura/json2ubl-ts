/**
 * Reaktif kurallar motoru — e-İrsaliye tipi/profili ve UI state derivation.
 *
 * `invoice-rules.ts`in irsaliye karşılığıdır ve AYNI sözleşmeyi taşır: SAF
 * türetim, emit YOK, durum YOK. Ekran bu bilgilerle hangi alanı göstereceğine ve
 * hangisini zorunlu işaretleyeceğine karar verir.
 *
 * ── FATURADA OLUP BURADA OLMAYANLAR ─────────────────────────────────────────
 * Faturanın kurallar motoru profil↔tip UZLAŞMA MATRİSİ (`PROFILE_TYPE_MATRIX`),
 * mükellefiyet (`liability`) süzgeci, ihracat kilidi ve istisna/tevkifat kod
 * listeleri taşır. İrsaliyede bunların HİÇBİRİNİN karşılığı yoktur:
 *   · Tip kümesi ikili ve profilden BAĞIMSIZDIR (SEVK | MATBUDAN) — her profil
 *     her tiple kurulabilir, uzlaştırılacak bir çakışma yoktur.
 *   · Belgede tutar/vergi olmadığı için istisna, tevkifat ve döviz kavramı yoktur.
 *   · Alıcının e-belge mükellefiyeti irsaliyede profil seçmez.
 * "Faturada var diye" boş bir matris taşımak, olmayan bir kuralı varmış gibi
 * göstermek olurdu — 🔴 irsaliyede olmayan TAŞINMAZ.
 */

import type { ValidationWarning } from '../session/validation-warning';
import { DespatchProfileId, DespatchTypeCode } from '../types/enums';

// ─── Alan Görünürlüğü ────────────────────────────────────────────────────────

/**
 * Belge düzeyinde türetilen alan görünürlükleri.
 *
 * Her bayrağın kaynağı NORMATİFTİR (şematron kuralı ya da kılavuz maddesi);
 * "ekran böyle daha güzel durur" gerekçeli bayrak YOKTUR.
 */
export interface DespatchFieldVisibility {
  /**
   * Ek belge (matbu irsaliye) referansı gösterilsin mi?
   * MATBUDAN'da ZORUNLU, SEVK'te serbesttir.
   */
  showAdditionalDocuments: boolean;
  /**
   * Ek belge ZORUNLU mu? — `DespatchAdviceTypeCodeCheck`: MATBUDAN iken `cbc:ID`
   * ve `cbc:IssueDate` alanları dolu EN AZ BİR `AdditionalDocumentReference`.
   */
  requireAdditionalDocuments: boolean;
  /**
   * Satırda ek ürün kimliği bloğu (KUNYENO / ETIKETNO) gösterilsin mi?
   * HKS ve İDİS profillerinde zorunlu, TEMELIRSALIYE'de serbest bırakılır.
   */
  showAdditionalItemIdentifications: boolean;
  /**
   * Her satırda 19 karakterlik KUNYENO ZORUNLU mu?
   * `DespatchAdviceHKSKunyeCheck` — yalnız HKSIRSALIYE.
   */
  requireItemKunyeNo: boolean;
  /**
   * Her satırda 9 karakterlik ETIKETNO ZORUNLU mu?
   * `DespatchIdisEtiketNoCheck` — yalnız IDISIRSALIYE.
   */
  requireItemEtiketNo: boolean;
  /**
   * Göndericide SEVKIYATNO (SE-/ES- + 7 rakam) ZORUNLU mu?
   * `DespatchIdisSevkiyatNoCheck` — yalnız IDISIRSALIYE.
   */
  requireSevkiyatNo: boolean;
  /**
   * Plaka ZORUNLU mu? — `LicensePlateIDCheck`. HER İRSALİYEDE, taşıyıcı firma
   * verilse BİLE. Sabit `true`'dur ve bayrak olarak durması bilinçlidir:
   * ekranın "kargoya verdim, plaka yok" dalına kaçmasını kodda engeller.
   */
  requireLicensePlate: boolean;
  /**
   * Şoför VEYA taşıyıcıdan en az biri ZORUNLU mu? — `DespatchCarrierDriverCheck`.
   * Bu da sabit `true`'dur; ikisinden hangisinin doldurulacağı kullanıcıya aittir.
   */
  requireDriverOrCarrier: boolean;
  /**
   * Fiili sevk anı GERİYE dönük olabilir mi? — Uygulama Kılavuzu §10'un
   * "istisnai haller"i. Yalnız MATBUDAN'da `true`.
   */
  allowBackdatedDespatch: boolean;
}

// ─── UI State ────────────────────────────────────────────────────────────────

/** `DespatchSession.uiState` anlık görüntüsü (fatura `InvoiceUIState` muadili). */
export interface DespatchUIState {
  /** Mevcut seçimlere göre alan görünürlükleri (belge düzeyi) */
  fields: DespatchFieldVisibility;
  /** Doğrulama uyarıları */
  warnings: ValidationWarning[];
}

// ─── Kural Fonksiyonları ─────────────────────────────────────────────────────

/** `SimpleDespatchInput.type` verilmediğinde geçerli sayılan tip. */
export const DEFAULT_DESPATCH_TYPE = DespatchTypeCode.SEVK;
/** `SimpleDespatchInput.profile` verilmediğinde geçerli sayılan profil. */
export const DEFAULT_DESPATCH_PROFILE = DespatchProfileId.TEMELIRSALIYE;

/**
 * Tip ve profilden alan görünürlüklerini türetir — SAF.
 *
 * Fatura emsali `deriveFieldVisibility(type, profile, …)`; imza aynı sırayı
 * korur (önce tip, sonra profil).
 */
export function deriveDespatchFieldVisibility(
  type: string,
  profile: string,
): DespatchFieldVisibility {
  const isMatbudan = type === DespatchTypeCode.MATBUDAN;
  const isHks = profile === DespatchProfileId.HKSIRSALIYE;
  const isIdis = profile === DespatchProfileId.IDISIRSALIYE;

  return {
    showAdditionalDocuments: true,
    requireAdditionalDocuments: isMatbudan,
    showAdditionalItemIdentifications: true,
    requireItemKunyeNo: isHks,
    requireItemEtiketNo: isIdis,
    requireSevkiyatNo: isIdis,
    requireLicensePlate: true,
    requireDriverOrCarrier: true,
    allowBackdatedDespatch: isMatbudan,
  };
}

/**
 * Tam UI state türetir — SAF.
 *
 * 🔴 `warnings` BURADA DOLDURULMAZ; `deriveUIState` faturada da saf bir kapsam
 * hesabıdır ve uyarıları oturum TAŞIR. Boş dizi dönmesi bilinçlidir: çağıran
 * mevcut anlık görüntüden uyarıları aktarır, yoksa her türetim uyarıları silerdi
 * (faturada tam bu kusur yaşandı, bkz. `InvoiceSession.updateUIState`).
 */
export function deriveDespatchUIState(type: string, profile: string): DespatchUIState {
  return {
    fields: deriveDespatchFieldVisibility(type, profile),
    warnings: [],
  };
}
