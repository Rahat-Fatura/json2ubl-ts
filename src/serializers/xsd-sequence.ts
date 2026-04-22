/**
 * UBL 2.1 XSD sequence tablosu — her UBL tipi için element yazım sırası.
 *
 * Kaynak: UBL-Invoice-2.1.xsd, UBL-DespatchAdvice-2.1.xsd,
 * UBL-CommonAggregateComponents-2.1.xsd, UBL-CommonBasicComponents-2.1.xsd.
 *
 * Her seq array'i o tipin XSD minOccurs/maxOccurs'a bakılmaksızın
 * **tanımlandığı sırada** içerir. Zorunlu/opsiyonel ayrımı `cbcRequiredTag` /
 * `cbcOptionalTag` çağrısıyla yapılır; sıra tablosu sadece **pozisyon** belirler.
 *
 * `emitInOrder(SEQ, emitters)` — her field için emitter map'ten fonksiyonu alır,
 * çağırır, boş olmayan çıktıları seq sırasında döndürür.
 *
 * Kullanım:
 * ```ts
 * const parts = emitInOrder(TAX_CATEGORY_SEQ, {
 *   Name: () => cbcOptionalTag('Name', cat.taxTypeName),
 *   TaxExemptionReasonCode: () => cbcOptionalTag('TaxExemptionReasonCode', cat.code),
 *   TaxExemptionReason: () => cbcOptionalTag('TaxExemptionReason', cat.reason),
 *   TaxScheme: () => cacTag('TaxScheme', serializeTaxScheme(cat)),
 * });
 * return cacTag('TaxCategory', joinLines(parts));
 * ```
 */

// ─── Invoice ──────────────────────────────────────────────────────────────
// UBL-Invoice-2.1.xsd (root element sequence)
export const INVOICE_SEQ = [
  'UBLExtensions',
  'UBLVersionID',           // 2
  'CustomizationID',        // 3
  'ProfileID',              // 4
  'ID',                     // 5
  'CopyIndicator',          // 6
  'UUID',                   // 7
  'IssueDate',              // 8
  'IssueTime',              // 9
  'InvoiceTypeCode',        // 10
  'Note',                   // 11
  'DocumentCurrencyCode',   // 12
  'TaxCurrencyCode',        // 13
  'PricingCurrencyCode',    // 14
  'PaymentCurrencyCode',    // 15
  'PaymentAlternativeCurrencyCode', // 16
  'AccountingCostCode',
  'AccountingCost',
  'LineCountNumeric',       // 19
  'InvoicePeriod',          // 20
  'OrderReference',         // 21
  'BillingReference',       // 22
  'DespatchDocumentReference', // 23
  'ReceiptDocumentReference',  // 24
  'OriginatorDocumentReference', // 25
  'ContractDocumentReference', // 26
  'AdditionalDocumentReference', // 27
  'ProjectReference',
  'Signature',              // 29
  'AccountingSupplierParty',// 30
  'AccountingCustomerParty',// 31
  'PayeeParty',
  'BuyerCustomerParty',     // 33
  'SellerSupplierParty',    // 34
  'TaxRepresentativeParty', // 35
  'Delivery',               // 36
  'DeliveryTerms',
  'PaymentMeans',           // 38
  'PaymentTerms',           // 39
  'PrepaidPayment',
  'AllowanceCharge',        // 41
  'TaxExchangeRate',        // 42
  'PricingExchangeRate',    // 43
  'PaymentExchangeRate',    // 44
  'PaymentAlternativeExchangeRate', // 45
  'TaxTotal',               // 46
  'WithholdingTaxTotal',    // 47 (UBL-TR)
  'LegalMonetaryTotal',     // 48
  'InvoiceLine',            // 49
] as const;

// ─── DespatchAdvice ───────────────────────────────────────────────────────
// UBL-DespatchAdvice-2.1.xsd
export const DESPATCH_SEQ = [
  'UBLExtensions',
  'UBLVersionID',
  'CustomizationID',
  'ProfileID',
  'ID',
  'CopyIndicator',
  'UUID',
  'IssueDate',
  'IssueTime',
  'DocumentStatusCode',
  'DespatchAdviceTypeCode',
  'Note',
  'LineCountNumeric',
  'OrderReference',
  'AdditionalDocumentReference',
  'Signature',
  'DespatchSupplierParty',
  'DeliveryCustomerParty',
  'BuyerCustomerParty',
  'SellerSupplierParty',
  'OriginatorCustomerParty',
  'Shipment',
  'DespatchLine',
] as const;

// ─── InvoiceLine / DespatchLine ────────────────────────────────────────────
// UBL-CommonAggregateComponents-2.1.xsd InvoiceLineType
export const INVOICE_LINE_SEQ = [
  'ID',
  'UUID',
  'Note',
  'InvoicedQuantity',
  'LineExtensionAmount',
  'TaxPointDate',
  'AccountingCostCode',
  'AccountingCost',
  'PaymentPurposeCode',
  'FreeOfChargeIndicator',
  'InvoicePeriod',
  'OrderLineReference',
  'DespatchLineReference',
  'ReceiptLineReference',
  'BillingReference',
  'DocumentReference',
  'PricingReference',
  'OriginatorParty',
  'Delivery',               // AllowanceCharge ÖNCESİ (B-10 fix)
  'PaymentTerms',
  'AllowanceCharge',
  'TaxTotal',
  'WithholdingTaxTotal',    // UBL-TR
  'Item',
  'Price',
  'DeliveryTerms',
  'SubInvoiceLine',
  'ItemPriceExtension',
] as const;

export const DESPATCH_LINE_SEQ = [
  'ID',
  'UUID',
  'Note',
  'LineStatusCode',
  'DeliveredQuantity',
  'OutstandingQuantity',
  'OutstandingReason',
  'OversupplyQuantity',
  'OrderLineReference',
  'DocumentReference',
  'Item',
  'Shipment',
] as const;

// ─── TaxTotal / TaxSubtotal / TaxCategory / TaxScheme ──────────────────────
// B-09 fix: TaxExemptionReasonCode/Reason TaxCategory altında
export const TAX_TOTAL_SEQ = [
  'TaxAmount',
  'CalculationSequenceNumeric',
  'RoundingAmount',
  'TaxEvidenceIndicator',
  'TaxIncludedIndicator',
  'TaxSubtotal',
] as const;

export const TAX_SUBTOTAL_SEQ = [
  'TaxableAmount',
  'TaxAmount',
  'CalculationSequenceNumeric',
  'TransactionCurrencyTaxAmount',
  'Percent',
  'BaseUnitMeasure',
  'PerUnitAmount',
  'TierRange',
  'TierRatePercent',
  'TaxCategory',
] as const;

export const TAX_CATEGORY_SEQ = [
  'ID',
  'Name',
  'Percent',
  'BaseUnitMeasure',
  'PerUnitAmount',
  'TaxExemptionReasonCode',
  'TaxExemptionReason',
  'TierRange',
  'TierRatePercent',
  'TaxScheme',
] as const;

export const TAX_SCHEME_SEQ = [
  'ID',
  'Name',
  'TaxTypeCode',
  'CurrencyCode',
  'JurisdictionRegionAddress',
] as const;

// ─── AllowanceCharge ──────────────────────────────────────────────────────
// B-12 fix: Reason ChargeIndicator hemen sonrası
export const ALLOWANCE_CHARGE_SEQ = [
  'ID',
  'ChargeIndicator',
  'AllowanceChargeReasonCode',
  'AllowanceChargeReason',   // = Reason (B-12)
  'MultiplierFactorNumeric',
  'PrepaidIndicator',
  'SequenceNumeric',
  'Amount',
  'BaseAmount',
  'AccountingCostCode',
  'AccountingCost',
  'PerUnitAmount',
  'TaxCategory',
  'TaxTotal',
  'PaymentMeans',
] as const;

// ─── Item ─────────────────────────────────────────────────────────────────
// B-13 fix: Description Name'den önce
export const ITEM_SEQ = [
  'Description',
  'PackQuantity',
  'PackSizeNumeric',
  'CatalogueIndicator',
  'Name',
  'HazardousRiskIndicator',
  'AdditionalInformation',
  'Keyword',
  'BrandName',
  'ModelName',
  'BuyersItemIdentification',
  'SellersItemIdentification',
  'ManufacturersItemIdentification',
  'StandardItemIdentification',
  'CatalogueItemIdentification',
  'AdditionalItemIdentification',
  'CatalogueDocumentReference',
  'ItemSpecificationDocumentReference',
  'OriginCountry',
  'CommodityClassification',
  'TransactionConditions',
  'HazardousItem',
  'ClassifiedTaxCategory',
  'AdditionalItemProperty',
  'ManufacturerParty',
  'InformationContentProviderParty',
  'OriginAddress',
  'ItemInstance',
  'Certificate',
  'Dimension',
] as const;

// ─── Price ────────────────────────────────────────────────────────────────
export const PRICE_SEQ = [
  'PriceAmount',
  'BaseQuantity',
  'PriceChangeReason',
  'PriceTypeCode',
  'PriceType',
  'OrderableUnitFactorRate',
  'ValidityPeriod',
  'PriceList',
  'AllowanceCharge',
  'PricingExchangeRate',
  'PricingExchangeRate',
  'PaymentTerms',
  'PricingReference',
] as const;

// ─── Party / Person / Contact ─────────────────────────────────────────────
// UBL-CommonAggregateComponents-2.1.xsd PartyType
// B-34 fix: PostalAddress zorunlu emit (Party verildiyse)
export const PARTY_SEQ = [
  'WebsiteURI',
  'LogoReferenceID',
  'EndpointID',
  'IndustryClassificationCode',
  'PartyIdentification',
  'PartyName',
  'Language',
  'PostalAddress',
  'PhysicalLocation',
  'PartyTaxScheme',
  'PartyLegalEntity',
  'Contact',
  'Person',
  'AgentParty',
  'ServiceProviderParty',
  'PowerOfAttorney',
  'FinancialAccount',
] as const;

// B-20 fix: Person sequence — FirstName → FamilyName → Title → MiddleName → NameSuffix → NationalityID
export const PERSON_SEQ = [
  'ID',
  'FirstName',
  'FamilyName',
  'Title',                   // MiddleName ÖNCESİ
  'MiddleName',
  'NameSuffix',
  'JobTitle',
  'OrganizationDepartment',
  'NationalityID',
  'GenderCode',
  'BirthDate',
  'BirthplaceName',
  'ResidenceAddress',
  'Contact',
  'FinancialAccount',
  'IdentityDocumentReference',
  'ResidenceAddress',
] as const;

// ─── Address ──────────────────────────────────────────────────────────────
// UBL-CommonAggregateComponents-2.1.xsd AddressType
// B-35 fix: CityName + CitySubdivisionName required
export const ADDRESS_SEQ = [
  'ID',
  'AddressTypeCode',
  'AddressFormatCode',
  'Postbox',
  'Floor',
  'Room',
  'StreetName',
  'AdditionalStreetName',
  'BlockName',
  'BuildingName',
  'BuildingNumber',
  'InhouseMail',
  'Department',
  'MarkAttention',
  'MarkCare',
  'PlotIdentification',
  'CitySubdivisionName',    // required
  'CityName',                // required
  'PostalZone',
  'CountrySubentity',
  'CountrySubentityCode',
  'Region',
  'District',
  'TimezoneOffset',
  'AddressLine',
  'Country',
  'LocationCoordinate',
] as const;

// ─── Delivery ─────────────────────────────────────────────────────────────
// B-14 fix: DeliveryAddress → CarrierParty → Despatch
export const DELIVERY_SEQ = [
  'ID',
  'Quantity',
  'MinimumQuantity',
  'MaximumQuantity',
  'ActualDeliveryDate',
  'ActualDeliveryTime',
  'LatestDeliveryDate',
  'LatestDeliveryTime',
  'ReleaseID',
  'TrackingID',
  'DeliveryAddress',         // CarrierParty ÖNCESİ
  'AlternativeDeliveryLocation',
  'RequestedDeliveryPeriod',
  'PromisedDeliveryPeriod',
  'EstimatedDeliveryPeriod',
  'DeliveryParty',
  'Despatch',                // CarrierParty SONRASI
  'DeliveryTerms',
  'MinimumDeliveryUnit',
  'MaximumDeliveryUnit',
  'Shipment',
] as const;

// ─── Shipment ─────────────────────────────────────────────────────────────
export const SHIPMENT_SEQ = [
  'ID',
  'ShippingPriorityLevelCode',
  'HandlingCode',
  'HandlingInstructions',
  'Information',
  'GrossWeightMeasure',
  'NetWeightMeasure',
  'NetNetWeightMeasure',
  'GrossVolumeMeasure',
  'NetVolumeMeasure',
  'TotalGoodsItemQuantity',
  'TotalTransportHandlingUnitQuantity',
  'InsuranceValueAmount',
  'DeclaredCustomsValueAmount',
  'DeclaredForCarriageValueAmount',
  'DeclaredStatisticsValueAmount',
  'FreeOnBoardValueAmount',
  'SpecialInstructions',
  'DeliveryInstructions',
  'SplitConsignmentIndicator',
  'ConsignmentQuantity',
  'Consignment',
  'GoodsItem',
  'ShipmentStage',
  'Delivery',
  'TransportHandlingUnit',
  'ReturnAddress',
  'OriginAddress',
  'FirstArrivalPortLocation',
  'LastExitPortLocation',
  'ExportCountry',
  'FreightAllowanceCharge',
] as const;

// ─── PaymentMeans ─────────────────────────────────────────────────────────
// B-70 fix: PaymentMeansCode required (PaymentMeans verildiyse)
export const PAYMENT_MEANS_SEQ = [
  'ID',
  'PaymentMeansCode',
  'PaymentDueDate',
  'PaymentChannelCode',
  'InstructionID',
  'InstructionNote',
  'PaymentID',
  'CardAccount',
  'PayerFinancialAccount',
  'PayeeFinancialAccount',
  'CreditAccount',
  'PaymentMandate',
  'TradeFinancing',
] as const;

// ─── DocumentReference ────────────────────────────────────────────────────
// B-32 fix: IssueDate required (DocumentReference verildiyse)
export const DOCUMENT_REFERENCE_SEQ = [
  'ID',
  'CopyIndicator',
  'UUID',
  'IssueDate',
  'IssueTime',
  'DocumentTypeCode',
  'DocumentType',
  'XPath',
  'LanguageID',
  'LocaleCode',
  'VersionID',
  'DocumentStatusCode',
  'DocumentDescription',
  'Attachment',
  'ValidityPeriod',
  'IssuerParty',
  'ResultOfVerification',
] as const;

// ─── OrderReference ───────────────────────────────────────────────────────
// B-33 fix: IssueDate required (OrderReference verildiyse)
export const ORDER_REFERENCE_SEQ = [
  'ID',
  'SalesOrderID',
  'CopyIndicator',
  'UUID',
  'IssueDate',
  'IssueTime',
  'CustomerReference',
  'OrderTypeCode',
  'DocumentReference',
] as const;

// ─── ExchangeRate ─────────────────────────────────────────────────────────
export const EXCHANGE_RATE_SEQ = [
  'SourceCurrencyCode',
  'SourceCurrencyBaseRate',
  'TargetCurrencyCode',
  'TargetCurrencyBaseRate',
  'ExchangeMarketID',
  'CalculationRate',
  'MathematicOperatorCode',
  'Date',
  'ForeignExchangeContract',
] as const;

// ─── LegalMonetaryTotal ───────────────────────────────────────────────────
export const LEGAL_MONETARY_TOTAL_SEQ = [
  'LineExtensionAmount',
  'TaxExclusiveAmount',
  'TaxInclusiveAmount',
  'AllowanceTotalAmount',
  'ChargeTotalAmount',
  'PrepaidAmount',
  'PayableRoundingAmount',
  'PayableAmount',
  'PayableAlternativeAmount',
] as const;

// ─── Period ───────────────────────────────────────────────────────────────
export const PERIOD_SEQ = [
  'StartDate',
  'StartTime',
  'EndDate',
  'EndTime',
  'DurationMeasure',
  'DescriptionCode',
  'Description',
] as const;

// ─── BillingReference ─────────────────────────────────────────────────────
export const BILLING_REFERENCE_SEQ = [
  'InvoiceDocumentReference',
  'SelfBilledInvoiceDocumentReference',
  'CreditNoteDocumentReference',
  'SelfBilledCreditNoteDocumentReference',
  'DebitNoteDocumentReference',
  'ReminderDocumentReference',
  'AdditionalDocumentReference',
  'BillingReferenceLine',
] as const;

// ─── ContractDocumentReference / OriginatorDocumentReference ──────────────
// B-32 downstream — aynı DOCUMENT_REFERENCE_SEQ pattern'inde

// ─── Contact ──────────────────────────────────────────────────────────────
export const CONTACT_SEQ = [
  'ID',
  'Name',
  'Telephone',
  'Telefax',
  'ElectronicMail',
  'Note',
  'OtherCommunication',
] as const;

// ─── PartyTaxScheme / PartyLegalEntity ────────────────────────────────────
export const PARTY_TAX_SCHEME_SEQ = [
  'RegistrationName',
  'CompanyID',
  'TaxLevelCode',
  'ExemptionReasonCode',
  'ExemptionReason',
  'RegistrationAddress',
  'TaxScheme',
] as const;

export const PARTY_LEGAL_ENTITY_SEQ = [
  'RegistrationName',
  'CompanyID',
  'RegistrationDate',
  'RegistrationExpirationDate',
  'CompanyLegalFormCode',
  'CompanyLegalForm',
  'SoleProprietorshipIndicator',
  'CompanyLiquidationStatusCode',
  'CorporationStockAmount',
  'FullyPaidSharesIndicator',
  'RegistrationAddress',
  'CorporateRegistrationScheme',
  'HeadOfficeParty',
  'ShareholderParty',
] as const;

// ─── Generic helper ───────────────────────────────────────────────────────

/**
 * Field emitter map'ini verilen XSD sırasında yürütür.
 *
 * - `seq` içinde olan her field için `emitters[field]` varsa çağırılır.
 * - Emitter yoksa veya `''` dönerse atlanır (filter).
 * - Emitter `throw` ederse hata yukarı propagate olur (M6 required enforce).
 *
 * @returns Sıralı, boş-olmayan XML string array'i. Çağıran tarafta `joinLines` ile birleştir.
 */
export function emitInOrder<K extends string>(
  seq: readonly K[],
  emitters: Partial<Record<K, () => string>>,
): string[] {
  const out: string[] = [];
  for (const field of seq) {
    const fn = emitters[field];
    if (!fn) continue;
    const s = fn();
    if (s !== '' && s !== undefined && s !== null) {
      out.push(s);
    }
  }
  return out;
}
