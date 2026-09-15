// Calculator module — basitleştirilmiş fatura giriş ve hesaplama motoru
export { SimpleInvoiceBuilder } from "./simple-invoice-builder";
export type {
    SimpleBuilderOptions,
    SimpleBuildResult,
} from "./simple-invoice-builder";

// Hesaplama fonksiyonları
export { calculateDocument } from "./document-calculator";
export type {
    CalculatedDocument,
    DocumentMonetary,
    DocumentTaxes,
    DocumentWithholding,
    TaxExemptionReason,
} from "./document-calculator";
export { calculateLine, calculateAllLines } from "./line-calculator";
export type {
    CalculatedLine,
    CalculatedLineTaxes,
    CalculatedLineWithholding,
    CalculatedTaxSubtotal,
    CalculatedWithholdingSubtotal,
    CalculatedAllowance,
} from "./line-calculator";

// Mapper
export { mapSimpleToInvoiceInput } from "./simple-invoice-mapper";

// Basit giriş tipleri
export { BillingDocumentTypeCode } from "./simple-types";
// 4.5.5 — tekil/çoğul iade referansı öncelik kuralının tek yorumlayıcısı.
export { billingReferencePath, resolveBillingReferences } from "./simple-types";
export type {
    SimpleInvoiceInput,
    SimplePartyInput,
    SimplePartyIdentification,
    SimpleLineInput,
    SimpleLineTaxInput,
    SimpleLineDeliveryInput,
    SimpleAddressInput,
    SimpleItemIdentification,
    SimpleOrderReferenceInput,
    SimpleBillingReferenceInput,
    SimpleDespatchReferenceInput,
    SimpleAdditionalDocumentInput,
    SimplePaymentMeansInput,
    SimpleOzelMatrahInput,
    SimpleSgkInput,
    SimpleSgkType,
    SimpleOnlineSaleInput,
    SimpleEArchiveInput,
    SimpleBuyerCustomerInput,
    SimplePeriodInput,
    BillingDocumentTypeCodeValue,
} from "./simple-types";

// Not: BillingDocumentTypeCodeValue artık sadece 'IADE' literal tipi.
// Schematron'da IADE grubu dışı tipler için kısıtlama yok, serbest string kabul edilir.

// Dinamik config yöneticisi
export { configManager, ConfigManager } from "./config-manager";
export type {
    ConfigInitOptions,
    ConfigEvents,
    ConfigEventName,
} from "./config-manager";

// Reaktif fatura oturumu
export { InvoiceSession } from "./invoice-session";
export type {
    SessionEvents,
    SessionEventName,
    InvoiceSessionOptions,
    UnsetScope,
    IdentificationParty,
    PathErrorPayload,
    PathErrorCode,
} from "./invoice-session";

// Line-level UI visibility (Sprint 8l.1 / v2.2.4 — direkt re-export, modül zinciri kısaltma)
export type { LineFieldVisibility } from "./line-field-visibility";

// SuggestionEngine ve advisory öneriler (AR-10 Faz 2)
export { runSuggestionEngine, diffSuggestions } from "./suggestion-engine";
export type { Suggestion, SuggestionRule, SuggestionSeverity } from "./suggestion-types";

// SessionPaths runtime export (AR-10) — path-based update API için tip-güvenli sabit map.
// Generator: scripts/generate-session-paths.ts (input: SimpleInvoiceInput).
export { SessionPaths } from "./session-paths.generated";
export type { SessionPathMap } from "./session-paths.generated";

// DespatchSessionPaths runtime export — e-İrsaliye oturumunun path yüzeyi.
// Aynı üreteç, ayrı hedef: scripts/generate-session-paths.ts (input: DespatchInput).
// Adlar bilerek nitelikli: `KNOWN_PATH_TEMPLATES` / `READ_ONLY_PATHS` niteliksiz
// olduğu için fatura muadilleriyle tek yüzeyde çakışırdı.
export {
    DespatchSessionPaths,
    DESPATCH_KNOWN_PATH_TEMPLATES,
    DESPATCH_READ_ONLY_PATHS,
} from "./despatch-session-paths.generated";
export type {
    DespatchSessionPathMap,
    DespatchSessionUpdateOverloads,
} from "./despatch-session-paths.generated";

// Kurallar motoru ve UI state
export {
    getAllowedProfilesForType,
    getAllowedTypesForProfile,
    resolveProfileForType,
    resolveTypeForProfile,
    resolveInitialProfileType,
    deriveFieldVisibility,
    deriveUIState,
    getAvailableExemptions,
    validateInvoiceState,
    filterProfilesByLiability,
    filterTypesByLiability,
    getAvailableBillingDocumentTypeCodes,
} from "./invoice-rules";
export type {
    FieldVisibility,
    ValidationWarning,
    InvoiceUIState,
    CustomerLiability,
    ResolvedProfileType,
} from "./invoice-rules";

// Konfigürasyon verileri (statik embed — varsayılan değerler)
export {
    TAX_DEFINITIONS,
    TAX_MAP,
    KDV_TAX_CODE,
    KDV_TAX_NAME,
    isValidTaxCode,
    getTaxDefinition,
} from "./tax-config";
export type { TaxDefinition } from "./tax-config";
export {
    WITHHOLDING_TAX_DEFINITIONS,
    WITHHOLDING_TAX_MAP,
    isValidWithholdingTaxCode,
    getWithholdingTaxDefinition,
} from "./withholding-config";
export type { WithholdingTaxDefinition } from "./withholding-config";
export {
    EXEMPTION_DEFINITIONS,
    EXEMPTION_MAP,
    getExemptionsByDocumentType,
    isValidExemptionCode,
    getExemptionDefinition,
} from "./exemption-config";
export type { ExemptionDefinition } from "./exemption-config";
export {
    UNIT_DEFINITIONS,
    resolveUnitCode,
    isValidUnitCode,
} from "./unit-config";
export type { UnitDefinition } from "./unit-config";
export {
    CURRENCY_DEFINITIONS,
    CURRENCY_MAP,
    DEFAULT_CURRENCY_CODE,
    isValidCurrencyCode,
    getCurrencyDefinition,
} from "./currency-config";
export type { CurrencyDefinition } from "./currency-config";
export {
    PACKAGING_TYPE_CODE_DEFINITIONS,
    PACKAGING_TYPE_CODE_MAP,
    isValidPackagingTypeCode,
    getPackagingTypeCodeDefinition,
} from "./package-type-code-config";
export type { PackagingTypeCodeDefinition } from "./package-type-code-config";
export {
    PAYMENT_MEANS_DEFINITIONS,
    PAYMENT_MEANS_MAP,
    isValidPaymentMeansCode,
    getPaymentMeansDefinition,
} from "./payment-means-config";
export type { PaymentMeansDefinition } from "./payment-means-config";
