/**
 * TaxExemption cross-check matrisi — kod ↔ fatura tipi kombinasyon kuralları (M5 + B-06).
 *
 * ## Normatif Kaynak
 * - UBL-TR Common Schematron — `TaxExemptionReasonCodeCheck` (rule satır 316, 318, 320, 322, 451)
 * - UBL-TR Codelist.xml — `TaxExemptionReasonCodeType`, `istisnaTaxExemptionReasonCodeType`,
 *   `ihracExemptionReasonCodeType`, `ozelMatrahTaxExemptionReasonCodeType`
 * - `kod-listeleri-ubl-tr-v1.42.md` §4.8
 *
 * ## Semantik
 * - **351** ("KDV İstisna Olmayan Diğer"): ISTISNA olmayan tiplerde + KDV=0 kalem varsa
 *   ZORUNLU. Kullanıcı semantiği — ACIK-SORULAR.md #12.
 *   - Allowed: SATIS, TEVKIFAT, KOMISYONCU, HKS*, KONAKLAMAVERGISI, TEKNOLOJIDESTEK,
 *     YTBSATIS, YTBTEVKIFAT, SGK
 *   - Forbidden: ISTISNA, IADE, YTBISTISNA, YTBIADE, TEVKIFATIADE, YTBTEVKIFATIADE, IHRACKAYITLI
 * - **555** ("KDV Oran Kontrolüne Tabi Olmayan Satışlar"): Alıcının yetkisi dışı KDV
 *   oranında kesim. KDV oranından bağımsız — KDV=0 VE KDV>0 kalemlerinde de geçerli.
 *   - Allowed: SATIS, TEVKIFAT, KOMISYONCU
 * - **151** (OTV SATIS): SATIS grubu — `exemption-config` documentType semantiği korunur.
 * - **201-250, 301-350**: İstisna serisi — ISTISNA/IADE/IHRACKAYITLI/SGK/YTBISTISNA/YTBIADE
 * - **701-704**: İhraç kayıtlı — IHRACKAYITLI/IADE
 * - **801-812**: Özel matrah — OZELMATRAH/IADE/SGK
 * - **SGK sembolik** (SAGLIK_*, ABONELIK, MAL_HIZMET, DIGER): SGK grubu
 * - **555**: "KDV Oran Kontrolüne Tabi Olmayan Satışlar" — SATIS/TEVKIFAT/KOMISYONCU.
 *   KDV oranından bağımsız kullanılabilir (KDV=0 zorunlu değil). M4 `allowReducedKdvRate`
 *   opt-in flag gate'i `reduced-kdv-detector.ts`'te korunur.
 * - **501**: Schematron özel — `exemption-config`'de tanımlı değil (validator UNKNOWN döner)
 *
 * ## Türetme (M7 pattern)
 * `EXEMPTION_DEFINITIONS.documentType` → `allowedInvoiceTypes` mapping otomatik.
 * 151 ve 351 özel kurallar `buildMatrix` içinde manuel override olarak eklenir.
 */

import { InvoiceTypeCode } from '../types/enums';
import { EXEMPTION_DEFINITIONS } from '../calculator/exemption-config';
import type { ValidationError } from '../errors/ubl-build-error';

/** Bir istisna kodunun fatura tipi kısıtları + ek koşullar */
export interface TaxExemptionRule {
  /** İstisna kodu (TaxExemptionReasonCode — ör: '351', '702', '801') */
  code: string;
  /** İzin verilen InvoiceTypeCode'lar — kod bu tiplerde kullanılabilir */
  allowedInvoiceTypes: ReadonlySet<InvoiceTypeCode>;
  /**
   * Kesin yasaklı InvoiceTypeCode'lar — kod bu tiplerde kullanılırsa FORBIDDEN hatası.
   * İşaret: `forbiddenInvoiceTypes` seti `allowedInvoiceTypes` ile kesişmemelidir.
   */
  forbiddenInvoiceTypes?: ReadonlySet<InvoiceTypeCode>;
  /**
   * true ise: bu kod kullanıldığında belge/satır seviyesinde en az bir KDV (0015)
   * tutarı=0 olan subtotal bulunmalıdır. Örn: 351 kodu semantiği
   * (ACIK-SORULAR.md #12 — "kalemde KDV 0 varsa şart").
   */
  requiresZeroKdvLine?: boolean;
}

// ============================================================
// DocumentType → allowedInvoiceTypes grupları
// (Schematron satır 316 + §4.8 kod-listeleri dokumanı)
// ============================================================

/** 201-250, 301-350 istisna grubu — Schematron satır 316 */
const ISTISNA_GROUP_ALLOWED_TYPES: ReadonlySet<InvoiceTypeCode> = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.ISTISNA, InvoiceTypeCode.IADE, InvoiceTypeCode.IHRACKAYITLI,
  InvoiceTypeCode.SGK, InvoiceTypeCode.YTBISTISNA, InvoiceTypeCode.YTBIADE,
]);

/** 701-704 ihraç kayıtlı grubu — Schematron satır 322 + §4.8 */
const IHRAC_GROUP_ALLOWED_TYPES: ReadonlySet<InvoiceTypeCode> = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.IHRACKAYITLI, InvoiceTypeCode.IADE,
]);

/** 801-812 özel matrah grubu — §4.8 */
const OZELMATRAH_GROUP_ALLOWED_TYPES: ReadonlySet<InvoiceTypeCode> = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.OZELMATRAH, InvoiceTypeCode.IADE, InvoiceTypeCode.SGK,
]);

/** SGK sembolik kodları — §4.8 SGK */
const SGK_GROUP_ALLOWED_TYPES: ReadonlySet<InvoiceTypeCode> = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.SGK,
]);

// ============================================================
// 151 — OTV İstisna Olmayan (SATIS grubu)
// ============================================================

/** 151 OTV kodu — ÖTV matrah olabilecek tipler. SATIS + TEVKIFAT + KOMISYONCU. */
const CODE_151_ALLOWED_TYPES: ReadonlySet<InvoiceTypeCode> = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.SATIS, InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.KOMISYONCU,
]);

// ============================================================
// 555 — KDV Oran Kontrolüne Tabi Olmayan Satışlar (M4 + Sprint 8c)
// Alıcının yetkisi dışı KDV oranında kesim durumunda kullanılır; KDV=0 VE
// KDV>0 kalemlerinde de verilebilir (B-NEW-11 açıklaması). `requiresZeroKdvLine`
// yok — 351'den ayrılan temel semantik budur.
// ============================================================

const CODE_555_ALLOWED_TYPES: ReadonlySet<InvoiceTypeCode> = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.SATIS,
  InvoiceTypeCode.TEVKIFAT,
  InvoiceTypeCode.KOMISYONCU,
]);

// ============================================================
// 351 — KDV İstisna Olmayan Diğer (M5 full cross-check)
// ACIK-SORULAR.md #12 + Soru 2 cevabı
// ============================================================

/** 351 için izinli tipler — ISTISNA olmayan tüm ana tipler + SGK */
const CODE_351_ALLOWED_TYPES: ReadonlySet<InvoiceTypeCode> = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.SATIS,
  InvoiceTypeCode.TEVKIFAT,
  InvoiceTypeCode.KOMISYONCU,
  InvoiceTypeCode.HKSSATIS,
  InvoiceTypeCode.HKSKOMISYONCU,
  InvoiceTypeCode.KONAKLAMAVERGISI,
  InvoiceTypeCode.TEKNOLOJIDESTEK,
  InvoiceTypeCode.YTBSATIS,
  InvoiceTypeCode.YTBTEVKIFAT,
  InvoiceTypeCode.SGK,
]);

/**
 * 351 için kesin yasak tipler.
 * - ISTISNA, YTBISTISNA: istisna türevli tipler zaten kendi kodlarını taşır
 * - IADE, YTBIADE, TEVKIFATIADE, YTBTEVKIFATIADE: iade türevleri (kendi kodları)
 * - IHRACKAYITLI: 701-704 kullanmalı, 351 semantiğine ters
 */
const CODE_351_FORBIDDEN_TYPES: ReadonlySet<InvoiceTypeCode> = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.ISTISNA,
  InvoiceTypeCode.IADE,
  InvoiceTypeCode.YTBISTISNA,
  InvoiceTypeCode.YTBIADE,
  InvoiceTypeCode.TEVKIFATIADE,
  InvoiceTypeCode.YTBTEVKIFATIADE,
  InvoiceTypeCode.IHRACKAYITLI,
]);

// ============================================================
// Matris oluşturma (M7 türetme pattern)
// ============================================================

/**
 * `EXEMPTION_DEFINITIONS.documentType` alanından matris'i türetir.
 * 151 (OTV SATIS) ve 351 (M5 full) manuel override ile eklenir.
 *
 * `SATIS` documentType'ı olan config kodları (151, 351) bu fonksiyon içinde
 * atlanır — özel kuralları aşağıda ayrıca uygulanır.
 */
function buildMatrix(): Map<string, TaxExemptionRule> {
  const matrix = new Map<string, TaxExemptionRule>();

  for (const def of EXEMPTION_DEFINITIONS) {
    // SATIS özel durumlar (151, 351, 555) aşağıda manuel override
    if (def.documentType === 'SATIS') continue;

    let allowed: ReadonlySet<InvoiceTypeCode>;
    switch (def.documentType) {
      case 'ISTISNA':
        allowed = ISTISNA_GROUP_ALLOWED_TYPES;
        break;
      case 'IHRACKAYITLI':
        allowed = IHRAC_GROUP_ALLOWED_TYPES;
        break;
      case 'OZELMATRAH':
        allowed = OZELMATRAH_GROUP_ALLOWED_TYPES;
        break;
      case 'SGK':
        allowed = SGK_GROUP_ALLOWED_TYPES;
        break;
      default:
        // Beklenmeyen documentType — atla (exemption-config type guard zaten kısıtlar)
        continue;
    }
    matrix.set(def.code, { code: def.code, allowedInvoiceTypes: allowed });
  }

  // 151 — OTV SATIS (manuel override)
  matrix.set('151', {
    code: '151',
    allowedInvoiceTypes: CODE_151_ALLOWED_TYPES,
  });

  // 351 — KDV İstisna Olmayan Diğer (M5 full cross-check, manuel override)
  matrix.set('351', {
    code: '351',
    allowedInvoiceTypes: CODE_351_ALLOWED_TYPES,
    forbiddenInvoiceTypes: CODE_351_FORBIDDEN_TYPES,
    requiresZeroKdvLine: true,
  });

  // 555 — KDV Oran Kontrolüne Tabi Olmayan Satışlar (Sprint 8c / B-NEW-11)
  // KDV oranından bağımsız — `requiresZeroKdvLine` bilinçli olarak ayarlanmadı.
  matrix.set('555', {
    code: '555',
    allowedInvoiceTypes: CODE_555_ALLOWED_TYPES,
  });

  // 701-704 — IHRACKAYITLI grubu (Sprint 8c.6 / B-NEW-07)
  // IHRACKAYITLI satırında KDV tutarı 0 olmalı (erteletilmiş KDV semantiği).
  // buildMatrix üstünde IHRAC_GROUP_ALLOWED_TYPES zaten set edildi; burada
  // requiresZeroKdvLine bayrağı üzerine yazılır.
  for (const code of ['701', '702', '703', '704']) {
    const existing = matrix.get(code);
    if (existing) {
      matrix.set(code, { ...existing, requiresZeroKdvLine: true });
    }
  }

  return matrix;
}

/**
 * İstisna kodu → kural Map'i (O(1) lookup).
 *
 * `EXEMPTION_DEFINITIONS` değişirse matris otomatik senkron olur (M7 pattern).
 * 151/351 özel kurallar `buildMatrix` içinde manuel eklenir.
 *
 * **Matris dışı kodlar (bilinçli):**
 * - `555` (Demirbaş KDV) — M4 flag ile bypass; matris'te YOK ki validator UNKNOWN dönmesin diye ayrı gate
 * - `501` — Schematron özel; `exemption-config` eksik (Sprint 6+ analizi gerekebilir)
 */
export const TAX_EXEMPTION_MATRIX: ReadonlyMap<string, TaxExemptionRule> = buildMatrix();

/**
 * İstisna kodu × fatura tipi × KDV satır durumu kontrolü.
 *
 * Schematron normatif:
 * - Kod matris'te yoksa → `UNKNOWN_EXEMPTION_CODE`
 * - Kod tipe YASAK → `FORBIDDEN_EXEMPTION_FOR_TYPE`
 * - Kod tipe İZİNSİZ (whitelist dışı) → `INVALID_EXEMPTION_FOR_TYPE`
 * - `requiresZeroKdvLine` + KDV=0 yok → `EXEMPTION_REQUIRES_ZERO_KDV_LINE`
 *
 * @param code           TaxExemptionReasonCode (ör: '351')
 * @param type           InvoiceTypeCode (ör: 'SATIS')
 * @param kdvSubtotals   Belge/satır KDV (0015) subtotal'ları — requiresZeroKdvLine için
 * @param pathPrefix     Hata yolu prefix'i (ör: `lines[0].taxTotal.taxSubtotals[0].taxExemptionReasonCode`)
 * @returns              ValidationError veya null (geçerli)
 */
export function validateExemptionCode(
  code: string,
  type: InvoiceTypeCode,
  kdvSubtotals: ReadonlyArray<{ amount: number }>,
  pathPrefix: string,
): ValidationError | null {
  const rule = TAX_EXEMPTION_MATRIX.get(code);
  if (!rule) {
    return {
      code: 'UNKNOWN_EXEMPTION_CODE',
      message: `Bilinmeyen istisna kodu: '${code}'`,
      path: pathPrefix,
      actual: code,
    };
  }

  if (rule.forbiddenInvoiceTypes?.has(type)) {
    return {
      code: 'FORBIDDEN_EXEMPTION_FOR_TYPE',
      message: `'${code}' istisna kodu '${type}' fatura tipinde yasaktır`,
      path: pathPrefix,
      expected: 'İzin verilen fatura tipi',
      actual: type,
    };
  }

  if (!rule.allowedInvoiceTypes.has(type)) {
    return {
      code: 'INVALID_EXEMPTION_FOR_TYPE',
      message: `'${code}' istisna kodu '${type}' fatura tipinde kullanılamaz`,
      path: pathPrefix,
      expected: Array.from(rule.allowedInvoiceTypes).join(', '),
      actual: type,
    };
  }

  if (rule.requiresZeroKdvLine && !kdvSubtotals.some(s => s.amount === 0)) {
    return {
      code: 'EXEMPTION_REQUIRES_ZERO_KDV_LINE',
      message: `'${code}' kodu için en az bir satırda KDV tutarı=0 olmalı`,
      path: pathPrefix,
    };
  }

  return null;
}
