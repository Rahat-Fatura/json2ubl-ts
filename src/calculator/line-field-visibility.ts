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
import { WITHHOLDING_ALLOWED_TYPES } from '../config/constants';
import { configManager } from './config-manager';
import type { InvoiceTypeCode } from '../types/enums';

// ─── Type/Profile Flags (extract from deriveFieldVisibility) ─────────────────

export interface TypeProfileFlags {
  isIade: boolean;
  isTevkifat: boolean;
  /**
   * ⚠️ TEVKİFAT İZNİNİ BU BAYRAK BELİRLEMEZ — `canCarryWithholding` belirler.
   * GİB, `TEVKIFATIADE`/`YTBTEVKIFATIADE` tiplerinde `cac:WithholdingTaxTotal`
   * KABUL ETMEZ (bkz. `canCarryWithholding`). Bayrak yalnız "tip adı iade-tevkifat
   * mı" sorusunu yanıtlar; geriye uyum için duruyor.
   */
  isTevkifatIade: boolean;
  /**
   * Satırda tevkifat kodu verilebilir mi? — şematronun izinli tip listesi.
   *
   * Kaynak: `WITHHOLDING_ALLOWED_TYPES` (`GeneralWithholdingTaxTotalCheck`):
   * TEVKIFAT, YTBTEVKIFAT, IADE, YTBIADE, SGK, SARJ, SARJANLIK.
   */
  canCarryWithholding: boolean;
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
    canCarryWithholding: WITHHOLDING_ALLOWED_TYPES.has(type as InvoiceTypeCode),
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

    /* 🔴 4.1.6 — 4.1.5'te ATLANMIŞ İKİNCİ KAPI.
     *
     * Buradaki kural `isTevkifat || isTevkifatIade` idi: doc-level'da düzeltilen
     * aynı yanlış inancın satır seviyesindeki kopyası. Sonucu canlı görüldü:
     * tip IADE'de sütun başlığı geliyor (doc-level izin veriyor) ama HÜCRELER
     * DÜZENLENEMİYORDU (satır seviyesi hâlâ hayır diyordu).
     *
     * Bu dosyanın başlığı "doc-level ve line-level aynı kaynaktan çalışır,
     * duplikasyon yok" diyor — tevkifat kuralında bu DOĞRU DEĞİLDİ. Artık ikisi
     * de `WITHHOLDING_ALLOWED_TYPES`'tan okuyor. */
    showWithholdingTaxSelector: flags.canCarryWithholding,

    /* 4.2.0: '650' dizgisine çakılıydı; o kod kaldırılınca ölü kalırdı. Artık
     * kodun KENDİ `dynamicPercent` niteliğinden okunuyor — bugün hiçbir kodda
     * yok (bayrak daima false), GİB ileride serbest oranlı bir kod tanımlarsa
     * kendiliğinden çalışır. */
    showWithholdingPercentInput:
      flags.canCarryWithholding
      && !!line.withholdingTaxCode
      && configManager.getWithholdingTax(line.withholdingTaxCode)?.dynamicPercent === true,

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
