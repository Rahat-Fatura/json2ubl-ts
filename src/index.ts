// Types
export * from "./types";

// Builders
export { InvoiceBuilder } from "./documents/invoice/builder";
export { DespatchBuilder } from "./documents/despatch-advice/builder";

// Calculator — Basitleştirilmiş fatura giriş ve hesaplama motoru
export * from "./calculator";

/* ── e-SMM (Serbest Meslek Makbuzu) — S5a ─────────────────────────────────────
 *
 * Adlar BİLEREK NİTELİKLİ (`SelfEmployedVoucher*`): paketin tepe yüzeyi tek bir
 * ad uzayıdır ve `SessionPaths` / `UnsetScope` gibi niteliksiz adlar fatura
 * muadilleriyle ÇAKIŞIR (irsaliyede alınan kararla aynı).
 *
 * `SelfEmployedVoucherProfileId` / `SelfEmployedVoucherTypeCode` enum'ları
 * `./types` üzerinden zaten açıktır — fatura enum'una EKLENMEDİLER, kendi
 * eksenlerinde dururlar.
 *
 * Dışa AÇILMAYAN: `VAT_CODE` / `INCOME_TAX_WITHHOLDING_CODE` /
 * `VAT_WITHHOLDING_CODE` skalerleri. Niteliksiz adlardır ve tüketicinin ihtiyacı
 * olan küme zaten `SELF_EMPLOYED_VOUCHER_TAX_TYPE_CODES` ile açıktır. */
export {
    SelfEmployedVoucherBuilder,
    SimpleSelfEmployedVoucherBuilder,
    SelfEmployedVoucherSession,
    SelfEmployedVoucherSessionPaths,
    SELF_EMPLOYED_VOUCHER_KNOWN_PATH_TEMPLATES,
    SELF_EMPLOYED_VOUCHER_READ_ONLY_PATHS,
    SELF_EMPLOYED_VOUCHER_TAX_TYPE_CODES,
    SEND_METHOD_DOCUMENT_TYPE_CODE,
    calculateSelfEmployedVoucher,
    mapSimpleToSelfEmployedVoucherInput,
    selfEmployedVoucherHeaderBindings,
    selfEmployedVoucherTotals,
    serializeSelfEmployedVoucher,
    validateSelfEmployedVoucher,
} from "./documents/self-employed-voucher";
export type {
    SelfEmployedVoucherInput,
    SelfEmployedVoucherLineInput,
    SelfEmployedVoucherTaxTotalInput,
    SelfEmployedVoucherTaxSubtotalInput,
    SelfEmployedVoucherTaxTypeCode,
    SimpleSelfEmployedVoucherInput,
    SimpleSelfEmployedVoucherLineInput,
    SimpleSelfEmployedVoucherBuilderOptions,
    SimpleSelfEmployedVoucherBuildResult,
    SelfEmployedVoucherSendMethod,
    SelfEmployedVoucherValidationStage,
    SelfEmployedVoucherValidateOptions,
    SelfEmployedVoucherAmountChain,
    SelfEmployedVoucherTotals,
    CalculatedSelfEmployedVoucher,
    SelfEmployedVoucherSessionEvents,
    SelfEmployedVoucherSessionEventName,
    SelfEmployedVoucherSessionOptions,
    SelfEmployedVoucherSessionPathMap,
    SelfEmployedVoucherSessionUpdateOverloads,
    SelfEmployedVoucherUnsetScope,
    SelfEmployedVoucherIdentificationParty,
    SelfEmployedVoucherPathErrorCode,
    SelfEmployedVoucherPathErrorPayload,
    SelfEmployedVoucherFieldChangedPayload,
    SelfEmployedVoucherLineFieldChangedPayload,
} from "./documents/self-employed-voucher";

/* ── e-MM (Müstahsil Makbuzu) — S5b ───────────────────────────────────────────
 *
 * Adlar BİLEREK NİTELİKLİ (`ProducerReceipt*`) — e-SMM ile aynı gerekçe: paketin
 * tepe yüzeyi tek bir ad uzayıdır ve `SessionPaths` / `UnsetScope` gibi
 * niteliksiz adlar kardeş belgelerle ÇAKIŞIR.
 *
 * `ProducerReceiptProfileId` / `ProducerReceiptTypeCode` enum'ları `./types`
 * üzerinden zaten açıktır — e-SMM enum'una EKLENMEDİLER, kendi eksenlerinde
 * dururlar (kökler farklı: `Invoice` ↔ `CreditNote`).
 *
 * 🔴 `SEND_METHOD_DOCUMENT_TYPE_CODE` BURADAN YENİDEN AÇILMAZ: e-SMM bloğunda
 * zaten dışa veriliyor ve GÖVDESİ ortaktır (`ubltr/mapping/earsiv-mapping`).
 * İkinci kez yazmak `export ... has already been declared` ile derlemeyi kırardı
 * — anahtar belgeye değil e-Arşiv ekosistemine ait.
 *
 * Dışa AÇILMAYAN: `INCOME_TAX_WITHHOLDING_CODE` /
 * `EXCHANGE_REGISTRATION_FEE_CODE` / `SOCIAL_SECURITY_PREMIUM_CODE` skalerleri.
 * Niteliksiz adlardır (ilki e-SMM'dekiyle ÇAKIŞIR) ve tüketicinin ihtiyacı olan
 * küme zaten `PRODUCER_RECEIPT_TAX_TYPE_CODES` ile açıktır. */
export {
    ProducerReceiptBuilder,
    SimpleProducerReceiptBuilder,
    ProducerReceiptSession,
    ProducerReceiptSessionPaths,
    PRODUCER_RECEIPT_KNOWN_PATH_TEMPLATES,
    PRODUCER_RECEIPT_READ_ONLY_PATHS,
    PRODUCER_RECEIPT_TAX_TYPE_CODES,
    calculateProducerReceipt,
    mapSimpleToProducerReceiptInput,
    producerReceiptHeaderBindings,
    producerReceiptTotals,
    serializeProducerReceipt,
    validateProducerReceipt,
} from "./documents/producer-receipt";
export type {
    ProducerReceiptInput,
    ProducerReceiptLineInput,
    ProducerReceiptTaxTotalInput,
    ProducerReceiptTaxSubtotalInput,
    ProducerReceiptTaxTypeCode,
    SimpleProducerReceiptInput,
    SimpleProducerReceiptLineInput,
    SimpleProducerReceiptBuilderOptions,
    SimpleProducerReceiptBuildResult,
    ProducerReceiptSendMethod,
    ProducerReceiptValidationStage,
    ProducerReceiptValidateOptions,
    ProducerReceiptAmountChain,
    ProducerReceiptTotals,
    CalculatedProducerReceipt,
    CalculatedProducerReceiptLine,
    CalculatedDeduction,
    ProducerReceiptSessionEvents,
    ProducerReceiptSessionEventName,
    ProducerReceiptSessionOptions,
    ProducerReceiptSessionPathMap,
    ProducerReceiptSessionUpdateOverloads,
    ProducerReceiptUnsetScope,
    ProducerReceiptIdentificationParty,
    ProducerReceiptPathErrorCode,
    ProducerReceiptPathErrorPayload,
    ProducerReceiptFieldChangedPayload,
    ProducerReceiptLineFieldChangedPayload,
} from "./documents/producer-receipt";

// Errors
export { UblBuildError } from "./errors/ubl-build-error";
export type { ValidationError } from "./errors/ubl-build-error";

// Config
export {
    INVOICE_NAMESPACES,
    DESPATCH_NAMESPACES,
    CREDIT_NOTE_NAMESPACES,
    UBL_CONSTANTS,
} from "./ubl/namespaces";
export {
    IADE_GROUP_TYPES,
    TEVKIFAT_GROUP_TYPES,
    ISTISNA_GROUP_TYPES,
    YTB_GROUP_TYPES,
    CURRENCY_CODES,
    TAX_TYPE_CODES,
    WITHHOLDING_TAX_TYPE_CODES,
    /* S3 — ortak GİB belge-numarası deseni (fatura + irsaliye + iade referansı).
     * `INVOICE_ID_REGEX` aynı nesnenin geriye-uyumlu takma adıdır; dışarıdaki
     * tüketiciyi kırmamak için AÇIK KALIR. */
    DOCUMENT_ID_REGEX,
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
} from "./ubltr/vocabulary/constants";
export type { PartyIdentificationSchemeId } from "./ubltr/vocabulary/constants";

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
} from "./ubltr/vocabulary/schematron-scopes";

/**
 * 4.1.0 — türev whitelist'leri (`TAX_TYPE_CODES` vb.) `configManager`'ın GÜNCEL
 * durumundan elle yeniden hesaplar. Normalde GEREKMEZ: `configManager` her
 * değiştiğinde otomatik tetiklenir. Yalnız kaçış kapağıdır.
 */
export { refreshDerivedConfig } from "./ubltr/vocabulary/derived-config";

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
} from "./ubltr/vocabulary/amount-in-words-config";
export type { AmountInWordsUnits } from "./ubltr/vocabulary/amount-in-words-config";
