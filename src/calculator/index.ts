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
} from "./invoice-session";

// SessionPaths runtime export (AR-10) — path-based update API için tip-güvenli sabit map.
// Generator: scripts/generate-session-paths.ts (input: SimpleInvoiceInput).
export { SessionPaths } from "./session-paths.generated";
export type { SessionPathMap } from "./session-paths.generated";

// Kurallar motoru ve UI state
export {
    getAllowedProfilesForType,
    getAllowedTypesForProfile,
    resolveProfileForType,
    resolveTypeForProfile,
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
