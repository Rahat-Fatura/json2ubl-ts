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
 * - **201-250, 301-350**: İstisna serisi — ISTISNA/IADE/IHRACKAYITLI/SGK/YTBISTISNA/YTBIADE
 * - **701-704**: İhraç kayıtlı — IHRACKAYITLI/IADE
 * - **801-812**: Özel matrah — OZELMATRAH/IADE/SGK
 * - **151**: OTV SATIS — SATIS grubu
 * - **555**: Demirbaş KDV — M4 flag ile bypass (matris referans)
 * - **501**: Schematron özel — genel kullanım
 *
 * Sprint 5.1: İskelet (tek smoke entry). Sprint 5.2'de full doldurulacak.
 */

import { InvoiceTypeCode } from '../types/enums';
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

/**
 * İstisna kodu → kural Map'i (O(1) lookup).
 *
 * Sprint 5.1 (iskelet): Yalnızca 351 için smoke entry. Sprint 5.2'de full entry setleri
 * (201-250, 301-350, 701-704, 801-812, 151, 501, 555, SGK sembolik) eklenecek.
 */
export const TAX_EXEMPTION_MATRIX: ReadonlyMap<string, TaxExemptionRule> = new Map<string, TaxExemptionRule>([
  // --- 351 — KDV İstisna Olmayan Diğer (M5 full cross-check) ---
  ['351', {
    code: '351',
    allowedInvoiceTypes: new Set<InvoiceTypeCode>([
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
    ]),
    forbiddenInvoiceTypes: new Set<InvoiceTypeCode>([
      InvoiceTypeCode.ISTISNA,
      InvoiceTypeCode.IADE,
      InvoiceTypeCode.YTBISTISNA,
      InvoiceTypeCode.YTBIADE,
      InvoiceTypeCode.TEVKIFATIADE,
      InvoiceTypeCode.YTBTEVKIFATIADE,
      InvoiceTypeCode.IHRACKAYITLI,
    ]),
    requiresZeroKdvLine: true,
  }],
]);

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
