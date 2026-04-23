import type { InvoiceProfileId, InvoiceTypeCode } from './enums';
import type {
  PartyInput,
  BuyerCustomerInput,
  TaxRepresentativeInput,
  TaxTotalInput,
  WithholdingTaxTotalInput,
  MonetaryTotalInput,
  AllowanceChargeInput,
  ItemInput,
  PriceInput,
  TaxSubtotalInput,
  LineDeliveryInput,
  BillingReferenceInput,
  OrderReferenceInput,
  ContractReferenceInput,
  DocumentReferenceInput,
  AdditionalDocumentInput,
  DeliveryInput,
  PaymentMeansInput,
  PeriodInput,
  PaymentTermsInput,
  ExchangeRateInput,
  SignatureInput,
} from './common';

/** Fatura giriş verisi — tüm senaryoları kapsar */
export interface InvoiceInput {
  // === §1 ZORUNLU ALANLAR ===
  /** Fatura numarası: ^[A-Z0-9]{3}20[0-9]{2}[0-9]{9}$ */
  id: string;
  /** UUID v4 formatında */
  uuid: string;
  /** Profil türü */
  profileId: InvoiceProfileId;
  /** Fatura tip kodu */
  invoiceTypeCode: InvoiceTypeCode;
  /** Düzenleme tarihi: YYYY-MM-DD */
  issueDate: string;
  /** Para birimi kodu (CurrencyCodeList) */
  currencyCode: string;
  /** Satıcı taraf */
  supplier: PartyInput;
  /** Alıcı taraf */
  customer: PartyInput;
  /** Vergi toplamları */
  taxTotals: TaxTotalInput[];
  /** Yasal parasal toplamlar */
  legalMonetaryTotal: MonetaryTotalInput;
  /** Fatura kalemleri */
  lines: InvoiceLineInput[];

  // === §1 OPSİYONEL ALANLAR ===
  /** Düzenleme saati: HH:mm:ss */
  issueTime?: string;
  /** Fatura notları */
  notes?: string[];
  /** Vergi para birimi kodu */
  taxCurrencyCode?: string;
  /** Fiyatlandırma para birimi kodu */
  pricingCurrencyCode?: string;
  /** Ödeme para birimi kodu — B-74 (cbc:PaymentCurrencyCode, XSD:23) */
  paymentCurrencyCode?: string;
  /** Döviz kuru (PricingExchangeRate) — currencyCode≠TRY ise zorunlu */
  exchangeRate?: ExchangeRateInput;
  /** Vergi döviz kuru — B-71 (cac:TaxExchangeRate, XSD:45) */
  taxExchangeRate?: ExchangeRateInput;
  /** Signature bilgisi (cac:Signature) */
  signatureInfo?: SignatureInput;

  // === §2 TİP-BAZLI OPSİYONEL ===
  /** Fatura referansları — §2.1 IADE, TEVKIFATIADE, YTBIADE, YTBTEVKIFATIADE için zorunlu */
  billingReferences?: BillingReferenceInput[];
  /** Tevkifat vergi toplamları — §2.2 TEVKIFAT, YTBTEVKIFAT */
  withholdingTaxTotals?: WithholdingTaxTotalInput[];

  // === §3 PROFİL-BAZLI OPSİYONEL ===
  /** Alıcı müşteri — §3.3 IHRACAT (EXPORT), §3.4 YOLCUBERABERFATURA (TAXFREE) */
  buyerCustomer?: BuyerCustomerInput;
  /** Vergi temsilcisi — §3.4 YOLCUBERABERFATURA */
  taxRepresentativeParty?: TaxRepresentativeInput;
  /** Teslimat bilgileri — §3.3 IHRACAT */
  delivery?: DeliveryInput;
  /** Ödeme yöntemleri — §3.6 KAMU */
  paymentMeans?: PaymentMeansInput[];
  /** Sözleşme referansı — §3.10 YATIRIMTESVIK */
  contractReference?: ContractReferenceInput;

  // === GENEL OPSİYONEL ===
  /** Sipariş referansı */
  orderReference?: OrderReferenceInput;
  /** İrsaliye referansları */
  despatchReferences?: DocumentReferenceInput[];
  /** Teslim alma referansları */
  receiptReferences?: DocumentReferenceInput[];
  /** Özel/komisyoncu referansları — B-39 (cac:OriginatorDocumentReference, XSD:32) */
  originatorDocumentReferences?: DocumentReferenceInput[];
  /** Ek belge referansları (XSLT vb.) */
  additionalDocuments?: AdditionalDocumentInput[];
  /** İndirim/Ek yükler */
  allowanceCharges?: AllowanceChargeInput[];
  /** Fatura dönemi */
  invoicePeriod?: PeriodInput;
  /** Ödeme koşulları */
  paymentTerms?: PaymentTermsInput;
  /** Muhasebe maliyet kodu (AccountingCostCodeList) */
  accountingCost?: string;
}

/** Fatura kalemi */
export interface InvoiceLineInput {
  /** Satır numarası */
  id: string;
  /** Faturalanan miktar */
  invoicedQuantity: number;
  /** Birim kodu (UnitCodeList) */
  unitCode: string;
  /** Satır uzantı tutarı (vergi hariç satır toplamı) */
  lineExtensionAmount: number;
  /** Satır vergi toplamı */
  taxTotal: TaxTotalInput;
  /** Ürün bilgileri */
  item: ItemInput;
  /** Fiyat bilgileri */
  price: PriceInput;

  /** Satır indirimleri/ek yükleri */
  allowanceCharges?: AllowanceChargeInput[];
  /** Satır seviyesi teslimat — §3.3 IHRACAT */
  delivery?: LineDeliveryInput;
  /** Satır seviyesi tevkifat — §2.2 */
  withholdingTaxTotal?: WithholdingTaxTotalInput;
  /** Satır seviyesi ek vergi alt toplamları */
  additionalTaxSubtotals?: TaxSubtotalInput[];
}
