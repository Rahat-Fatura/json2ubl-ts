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
} from "./config/constants";
export type { PartyIdentificationSchemeId } from "./config/constants";

/**
 * 4.1.0 — türev whitelist'leri (`TAX_TYPE_CODES` vb.) `configManager`'ın GÜNCEL
 * durumundan elle yeniden hesaplar. Normalde GEREKMEZ: `configManager` her
 * değiştiğinde otomatik tetiklenir. Yalnız kaçış kapağıdır.
 */
export { refreshDerivedConfig } from "./config/derived-config";

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
