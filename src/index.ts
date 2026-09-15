// Types
export * from "./types";

// Builders
export { InvoiceBuilder } from "./builders/invoice-builder";
export { DespatchBuilder } from "./builders/despatch-builder";

// Calculator — Basitleştirilmiş fatura giriş ve hesaplama motoru
export * from "./calculator";

// Errors
export { UblBuildError } from "./errors/ubl-build-error";
export type { ValidationError } from "./errors/ubl-build-error";

// Config
export {
    INVOICE_NAMESPACES,
    DESPATCH_NAMESPACES,
    UBL_CONSTANTS,
} from "./config/namespaces";
export {
    IADE_GROUP_TYPES,
    TEVKIFAT_GROUP_TYPES,
    ISTISNA_GROUP_TYPES,
    YTB_GROUP_TYPES,
    CURRENCY_CODES,
    TAX_TYPE_CODES,
    WITHHOLDING_TAX_TYPE_CODES,
    INVOICE_ID_REGEX,
    UUID_REGEX,
    PARTY_IDENTIFICATION_SCHEME_IDS,
    /* 🔴 4.5.1 — "GÖRÜNÜRLÜK BAYRAĞI VAR, KOD LİSTESİ YOK" AÇIĞI.
     *
     * Aşağıdaki beş sabit, paketin ZATEN dışa açtığı bir görünürlük bayrağının
     * (`deriveFieldVisibility` / `LineFieldVisibility`) doldurmasını beklediği
     * seçenek kümesidir ve `configManager` üzerinden erişilebilecek BAŞKA bir
     * genel yolu yoktur. Tüketici (portal) bu yüzden kümeleri elle aynalamak
     * zorunda kalıyordu — kütüphane listeyi güncellediğinde ayna sessizce
     * eskiyordu. Açma ölçütü BU: (a) genel bir bayrak alanı istiyor,
     * (b) başka genel erişimci yok. Ölçütü karşılamayan sabitler (rol kümeleri,
     * biçim regexleri, `configManager` türevleri) BİLEREK kapalı kalır.
     *
     *  • YATIRIM_TESVIK_ONLY_EXEMPTION_CODES — `showExemptionCodeSelector`
     *  • YTB_ITEM_CLASSIFICATION_CODES       — `showItemClassificationCode`
     *  • ADDITIONAL_ITEM_ID_SCHEME_IDS       — `showAdditionalItemIdentifications`
     *  • DELIVERY_TERM_CODES / TRANSPORT_MODE_CODES — `showLineDelivery` */
    YATIRIM_TESVIK_ONLY_EXEMPTION_CODES,
    YTB_ITEM_CLASSIFICATION_CODES,
    ADDITIONAL_ITEM_ID_SCHEME_IDS,
    DELIVERY_TERM_CODES,
    TRANSPORT_MODE_CODES,
} from "./config/constants";
export type { PartyIdentificationSchemeId } from "./config/constants";

/* 🔑 4.5.2 — ŞEMATRON KAPSAM YÜKLEMLERİ DIŞA AÇILDI.
 *
 * 4.5.1'in ölçütünü karşılarlar: (a) paketin dışa açtığı görünürlük bayraklarının
 * (`showYatirimTesvikNo`, `showItemClassificationCode`, `showProductTraceId`,
 * `showSerialId`) HANGİ belgede açıldığını belirleyen kural bunlardır,
 * (b) başka genel erişimcisi yoktur — tüketici (portal) koşulu elle aynalamak
 * zorunda kalıyordu (`isPhantomKdvCombination` de dışa açık değildi ve
 * MimForge'da `isYatirimTesvikExemptionScope` adıyla kopyalanmıştı).
 *
 * Ayna eskirse kütüphaneyle tüketici sessizce ayrışır — bu paketi ÜÇ KEZ vuran
 * kusur sınıfının ta kendisi. */
export {
    isYatirimTesvikScope,
    isYatirimTesvikKdvScope,
    isYatirimTesvikIstisnaScope,
} from "./config/schematron-scopes";

/**
 * 4.1.0 — türev whitelist'leri (`TAX_TYPE_CODES` vb.) `configManager`'ın GÜNCEL
 * durumundan elle yeniden hesaplar. Normalde GEREKMEZ: `configManager` her
 * değiştiğinde otomatik tetiklenir. Yalnız kaçış kapağıdır.
 */
export { refreshDerivedConfig } from "./config/derived-config";

/* GTİP — noktasız 12 hane (GİB 17.01.2017 İHRACAT entegratör test duyurusu).
 *
 * Dışa açılıyor ki portal/ingest tarafı KENDİ sayma kuralını yazmak zorunda
 * kalmasın: kusur tam olarak buydu — aynı değer dört katmanda dört farklı
 * şekilde ölçülüyordu. Tüketiciler alan doğrulamasında `isValidGtip`,
 * kullanıcıya gösterilecek gerekçede `describeGtipDefect` kullanmalıdır. */
export {
    normalizeGtip,
    isValidGtip,
    describeGtipDefect,
    GTIP_DIGIT_COUNT,
} from "./utils/gtip";

// Yazıyla tutar (v3.0.0) — saf sayı okuma + not biçimlendirme
export {
    numberToTurkishWords,
    TURKISH_ZERO_WORD,
    TURKISH_MINUS_WORD,
    MAX_READABLE_INTEGER,
} from "./utils/turkish-number-words";
export {
    formatAmountInWordsNote,
    isAmountInWordsNote,
    AMOUNT_IN_WORDS_PREFIX,
    AMOUNT_IN_WORDS_SUFFIX,
    AMOUNT_IN_WORDS_NOTE_PATTERN,
} from "./utils/amount-in-words";
export {
    AMOUNT_IN_WORDS_UNITS,
    DEFAULT_MINOR_UNIT,
    DEFAULT_CURRENCY_CODE_FOR_WORDS,
    getAmountInWordsUnits,
} from "./config/amount-in-words-config";
export type { AmountInWordsUnits } from "./config/amount-in-words-config";
