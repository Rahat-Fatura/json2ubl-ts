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
    SimpleOnlineSaleInput,
    SimpleEArchiveInput,
    SimpleBuyerCustomerInput,
    SimplePeriodInput,
} from "./simple-types";

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
} from "./invoice-session";

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
