/**
 * Line-level FieldVisibility türetimi (Sprint 8h.5 / AR-10).
 *
 * Mevcut doc-level `deriveFieldVisibility` (`invoice-rules.ts:250`) korunur ve genişletilir:
 * her satır için kendi visibility map'ini taşıyan `LineFieldVisibility` üretilir.
 *
 * Type/profile flag türetimleri ortak (`deriveTypeProfileFlags`) — hem doc-level hem
 * line-level fonksiyonlar aynı kuralları paylaşır, duplikasyon yok.
 *
 * Schematron / FIX-PLANI referansları her boolean üzerinde JSDoc'ta belirtilmiştir.
 */

import type { SimpleLineInput, SimpleInvoiceInput } from './simple-types';

// ─── Type/Profile Flags (extract from deriveFieldVisibility) ─────────────────

export interface TypeProfileFlags {
  isIade: boolean;
  isTevkifat: boolean;
  isTevkifatIade: boolean;
  isIstisna: boolean;
  isIhracKayitli: boolean;
  isOzelMatrah: boolean;
  isSgk: boolean;
  isTeknolojiDestek: boolean;
  isIhracat: boolean;
  isKamu: boolean;
  isEarsiv: boolean;
  isYatirimTesvik: boolean;
  isIlacTibbi: boolean;
  isYolcuBeraber: boolean;
  isIdis: boolean;
}

/**
 * Type ve profile string'lerinden boolean flag türetir.
 * Hem `deriveFieldVisibility` (doc-level) hem `deriveLineFieldVisibility` (line-level)
 * aynı kaynaktan çalışır → kural duplikasyonu yok.
 */
export function deriveTypeProfileFlags(type: string, profile: string): TypeProfileFlags {
  return {
    isIade: type === 'IADE' || type === 'YTBIADE' || type === 'TEVKIFATIADE' || type === 'YTBTEVKIFATIADE',
    isTevkifat: type === 'TEVKIFAT' || type === 'YTBTEVKIFAT',
    isTevkifatIade: type === 'TEVKIFATIADE' || type === 'YTBTEVKIFATIADE',
    isIstisna: type === 'ISTISNA' || type === 'YTBISTISNA',
    isIhracKayitli: type === 'IHRACKAYITLI',
    isOzelMatrah: type === 'OZELMATRAH',
    isSgk: type === 'SGK',
    isTeknolojiDestek: type === 'TEKNOLOJIDESTEK',
    isIhracat: profile === 'IHRACAT',
    isKamu: profile === 'KAMU',
    isEarsiv: profile === 'EARSIVFATURA',
    isYatirimTesvik: profile === 'YATIRIMTESVIK',
    isIlacTibbi: profile === 'ILAC_TIBBICIHAZ',
    isYolcuBeraber: profile === 'YOLCUBERABERFATURA',
    isIdis: profile === 'IDIS',
  };
}

// ─── Line-level FieldVisibility ──────────────────────────────────────────────

export interface LineFieldVisibility {
  /** Line `kdvPercent === 0` ise true (manuel exemption code dropdown gösterilir, M11/B-NEW-13). */
  showKdvExemptionCodeSelector: boolean;
  /** type=TEVKIFAT|TEVKIFATIADE|YTBTEVKIFAT|YTBTEVKIFATIADE ise true (M2 + BR-OPT-AJ19). */
  showWithholdingTaxSelector: boolean;
  /** withholdingTaxCode === '650' ise dinamik percent input görünür (B-NEW-04). */
  showWithholdingPercentInput: boolean;
  /** Profil IHRACAT veya tip IHRACKAYITLI ise satır delivery dropdown (BR-OPT-DLY13/15). */
  showLineDelivery: boolean;
  /** type=IHRACKAYITLI + line.kdvExemptionCode='702' (GTİP zorunlu, B-78.3). */
  showCommodityClassification: boolean;
  /** type=IHRACKAYITLI + line.kdvExemptionCode='702' (ALICIDIBSATIRKOD zorunlu, B-78.3). */
  showAlicidibsatirkod: boolean;
  /** profile=EARSIVFATURA + type ∈ {TEKNOLOJIDESTEK, ILACTIBBI} ise IMEI/seri dropdown (B-NEW-06/07). */
  showAdditionalItemIdentifications: boolean;
  /** profile=YATIRIMTESVIK ise harcama tipi (01-04) dropdown (M3). */
  showItemClassificationCode: boolean;
  /** profile=YATIRIMTESVIK + line.itemClassificationCode='01' (makine bilgisi, B-NEW-09). */
  showProductTraceId: boolean;
  /** profile=YATIRIMTESVIK + line.itemClassificationCode='01' (makine bilgisi, B-NEW-09). */
  showSerialId: boolean;
}

/**
 * Bir satır için visibility map türetir. `idx` parametresi şu an sadece
 * dokümantasyon için (gelecekte satır-spesifik kuralda kullanılabilir).
 */
export function deriveLineFieldVisibility(
  line: SimpleLineInput,
  doc: Pick<SimpleInvoiceInput, 'type' | 'profile'>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _idx: number,
): LineFieldVisibility {
  const flags = deriveTypeProfileFlags(doc.type ?? 'SATIS', doc.profile ?? 'TICARIFATURA');

  return {
    showKdvExemptionCodeSelector:
      line.kdvPercent === 0
      && !flags.isYatirimTesvik
      && !flags.isOzelMatrah,

    showWithholdingTaxSelector: flags.isTevkifat || flags.isTevkifatIade,

    showWithholdingPercentInput:
      (flags.isTevkifat || flags.isTevkifatIade)
      && line.withholdingTaxCode === '650',

    showLineDelivery: flags.isIhracat || flags.isIhracKayitli,

    showCommodityClassification:
      flags.isIhracKayitli && line.kdvExemptionCode === '702',

    showAlicidibsatirkod:
      flags.isIhracKayitli && line.kdvExemptionCode === '702',

    showAdditionalItemIdentifications:
      flags.isTeknolojiDestek || flags.isIlacTibbi || flags.isIdis,

    showItemClassificationCode: flags.isYatirimTesvik,

    showProductTraceId:
      flags.isYatirimTesvik && line.itemClassificationCode === '01',

    showSerialId:
      flags.isYatirimTesvik && line.itemClassificationCode === '01',
  };
}
