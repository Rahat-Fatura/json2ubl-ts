import type { TaxIdType } from './enums';

/** Taraf kimlik bilgisi (ek tanımlayıcılar için) */
export interface PartyIdentifierInput {
  schemeId: string;
  value: string;
}

/** Taraf bilgileri — §1.5 Party kuralları */
export interface PartyInput {
  /** 10 hane VKN veya 11 hane TCKN */
  vknTckn: string;
  taxIdType: TaxIdType;
  /** Ek tanımlayıcılar (HIZMETNO, MUSTERINO, SEVKIYATNO vb.) */
  additionalIdentifiers?: PartyIdentifierInput[];

  /** Tüzel kişi adı — VKN ise zorunlu */
  name?: string;
  /** Gerçek kişi adı — TCKN ise zorunlu */
  firstName?: string;
  middleName?: string;
  /** Gerçek kişi soyadı — TCKN ise zorunlu */
  familyName?: string;

  /** Adres bilgileri */
  streetName?: string;
  buildingName?: string;
  buildingNumber?: string;
  room?: string;
  citySubdivisionName?: string;
  cityName?: string;
  postalZone?: string;
  region?: string;
  country?: string;

  /** Vergi dairesi adı */
  taxOffice?: string;

  /** İletişim bilgileri */
  telephone?: string;
  telefax?: string;
  email?: string;
  websiteUri?: string;

  /** Tüzel kişilik kayıt adı — §3.3 IHRACAT için */
  registrationName?: string;

  /** Uyruk — §3.4 YOLCUBERABERFATURA Person için */
  nationalityId?: string;
  /** Pasaport numarası — §3.4 YOLCUBERABERFATURA için */
  passportId?: string;
}

/** BuyerCustomerParty — §3.3 IHRACAT / §3.4 YOLCUBERABERFATURA / §3.6 KAMU */
export interface BuyerCustomerInput {
  /** PARTYTYPE schemeID değeri (IHRACAT: EXPORT, YOLCU: TAXFREE, KAMU: undefined) */
  partyType?: 'EXPORT' | 'TAXFREE';
  party: PartyInput;
}

/** TaxRepresentativeParty — §3.4 YOLCUBERABERFATURA */
export interface TaxRepresentativeInput {
  /** Aracı kurum VKN veya TCKN (10-11 hane) */
  intermediaryVknTckn: string;
  /** Aracı kurum etiket adı */
  intermediaryLabel: string;
  /** Ek tanımlayıcılar */
  additionalIdentifiers?: PartyIdentifierInput[];
}

/** Vergi alt toplam */
export interface TaxSubtotalInput {
  /** Matrah (vergiye tabi tutar) */
  taxableAmount: number;
  /** Vergi tutarı */
  taxAmount: number;
  /** Vergi yüzdesi */
  percent?: number;
  /** Hesaplama sıra numarası */
  calculationSequenceNumeric?: number;
  /** Vergi tipi kodu (ör: 0015=KDV) */
  taxTypeCode: string;
  /** Vergi tipi adı (ör: KDV) */
  taxTypeName?: string;
  /** Vergi muafiyet sebebi kodu — §2.3 ISTISNA, §2.4 OZELMATRAH, §2.5 IHRACKAYITLI */
  taxExemptionReasonCode?: string;
  /** Vergi muafiyet sebebi açıklaması */
  taxExemptionReason?: string;
}

/** Vergi toplam */
export interface TaxTotalInput {
  taxAmount: number;
  taxSubtotals: TaxSubtotalInput[];
}

/** Tevkifat vergi toplam — §2.2 */
export interface WithholdingTaxTotalInput {
  taxAmount: number;
  taxSubtotals: WithholdingTaxSubtotalInput[];
}

/** Tevkifat vergi alt toplam */
export interface WithholdingTaxSubtotalInput {
  taxableAmount: number;
  taxAmount: number;
  percent: number;
  taxTypeCode: string;
  taxTypeName?: string;
}

/** Parasal toplamlar — LegalMonetaryTotal */
export interface MonetaryTotalInput {
  /** Satır uzantı tutarı (vergi hariç satır toplamı) */
  lineExtensionAmount: number;
  /** Vergi hariç tutar */
  taxExclusiveAmount: number;
  /** Vergi dahil tutar */
  taxInclusiveAmount: number;
  /** Toplam indirim tutarı */
  allowanceTotalAmount?: number;
  /** Toplam ek yük tutarı */
  chargeTotalAmount?: number;
  /** Ödenecek tutar */
  payableAmount: number;
  /** Ödenmiş yuvarlama tutarı */
  payableRoundingAmount?: number;
}

/** İndirim/Ek yük */
export interface AllowanceChargeInput {
  /** true=ek yük, false=indirim */
  chargeIndicator: boolean;
  /** Çarpan faktörü (yüzde) */
  multiplierFactorNumeric?: number;
  /** Tutar */
  amount: number;
  /** Baz tutar */
  baseAmount?: number;
  /** Sebep */
  reason?: string;
}

/** Fiyat bilgisi */
export interface PriceInput {
  priceAmount: number;
}

/** Ek ürün kimlik bilgisi — HKS, ILAC, TEKNOLOJI, IDIS senaryoları */
export interface AdditionalItemIdInput {
  /** schemeID: KUNYENO, ILAC, TIBBICIHAZ, DIGER, TELEFON, TABLET_PC, ETIKETNO vb. */
  schemeId: string;
  value: string;
}

/** Emtia sınıflandırması — §3.10 YATIRIMTESVIK */
export interface CommodityClassificationInput {
  /** 01=Makine/Teçhizat, 02=Yazılım, 03=Bina İnşaat, 04=Diğer */
  itemClassificationCode: string;
}

/** Ürün örneği — §3.10 YATIRIMTESVIK Kod 01 */
export interface ItemInstanceInput {
  productTraceId?: string;
  serialId?: string;
}

/** Kalem ürün bilgileri */
export interface ItemInput {
  /** Ürün adı — zorunlu, boş olamaz */
  name: string;
  description?: string;
  /** Model adı — §3.10 YATIRIMTESVIK Kod 01 */
  modelName?: string;
  /** Ek ürün kimlikleri — HKS, ILAC, TEKNOLOJI, IDIS */
  additionalItemIdentifications?: AdditionalItemIdInput[];
  /** Emtia sınıflandırması — §3.10 YATIRIMTESVIK */
  commodityClassification?: CommodityClassificationInput;
  /** Ürün örnekleri — §3.10 YATIRIMTESVIK Kod 01 */
  itemInstances?: ItemInstanceInput[];
}

/** Belge referansı (genel amaçlı) */
export interface DocumentReferenceInput {
  id: string;
  issueDate?: string;
  documentTypeCode?: string;
  documentType?: string;
  documentDescription?: string;
}

/** BillingReference — §2.1 IADE grubu */
export interface BillingReferenceInput {
  invoiceDocumentReference: DocumentReferenceInput;
}

/** OrderReference */
export interface OrderReferenceInput {
  id: string;
  issueDate?: string;
}

/** ContractDocumentReference — §3.10 YATIRIMTESVIK */
export interface ContractReferenceInput {
  /** YTBNO (6 haneli numerik) */
  id: string;
  /** schemeID: YTBNO */
  schemeId?: string;
  issueDate?: string;
}

/** AdditionalDocumentReference — XSLT vb. ek belgeler */
export interface AdditionalDocumentInput {
  id: string;
  issueDate?: string;
  documentTypeCode?: string;
  documentType?: string;
  documentDescription?: string;
  attachment?: AttachmentInput;
}

/** Ek — XSLT binary, harici referans */
export interface AttachmentInput {
  embeddedBinaryObject?: EmbeddedBinaryInput;
  externalReference?: ExternalReferenceInput;
}

export interface EmbeddedBinaryInput {
  content: string;
  mimeCode: string;
  encodingCode?: string;
  characterSetCode?: string;
  filename?: string;
}

export interface ExternalReferenceInput {
  uri: string;
}

/** Teslimat bilgileri — §3.3 IHRACAT */
export interface DeliveryInput {
  deliveryAddress?: AddressInput;
  deliveryTerms?: DeliveryTermsInput;
  shipment?: ShipmentInput;
}

/** Adres bilgileri */
export interface AddressInput {
  streetName?: string;
  buildingName?: string;
  buildingNumber?: string;
  room?: string;
  citySubdivisionName?: string;
  cityName?: string;
  postalZone?: string;
  region?: string;
  country?: string;
}

/** Teslimat koşulları — §3.3 IHRACAT */
export interface DeliveryTermsInput {
  /** INCOTERMS kodu (CFR, CIF, FOB vb.) */
  id: string;
}

/** Sevkiyat bilgileri — §3.3 IHRACAT */
export interface ShipmentInput {
  transportModeCode?: string;
  goodsItems?: GoodsItemInput[];
  shipmentStages?: ShipmentStageInput[];
  transportHandlingUnits?: TransportHandlingUnitInput[];
}

export interface GoodsItemInput {
  requiredCustomsId?: string;
}

export interface ShipmentStageInput {
  transportModeCode?: string;
}

export interface TransportHandlingUnitInput {
  actualPackages?: ActualPackageInput[];
}

export interface ActualPackageInput {
  packagingTypeCode?: string;
  quantity?: number;
}

/** Ödeme yöntemi — §3.6 KAMU */
export interface PaymentMeansInput {
  paymentMeansCode?: string;
  paymentDueDate?: string;
  paymentChannelCode?: string;
  payeeFinancialAccount?: FinancialAccountInput;
}

export interface FinancialAccountInput {
  /** IBAN — KAMU profili: ^TR\d{7}[A-Z0-9]{17}$ */
  id: string;
  currencyCode?: string;
  paymentNote?: string;
}

/** Dönem bilgisi */
export interface PeriodInput {
  startDate?: string;
  endDate?: string;
  description?: string;
}

/** Ödeme koşulları */
export interface PaymentTermsInput {
  note?: string;
  penaltySurchargePercent?: number;
  amount?: number;
}

/** Döviz kuru — §1.3 */
export interface ExchangeRateInput {
  sourceCurrencyCode: string;
  targetCurrencyCode: string;
  calculationRate: number;
  date?: string;
}

/** Signature bilgisi — cac:Signature */
export interface SignatureInput {
  /** VKN veya TCKN değeri */
  id: string;
  /** Postal address ve diğer bilgiler için tam party */
  signatoryParty?: PartyInput;
  /** #Signature_{ID} referansı */
  digitalSignatureUri?: string;
}

/** Satır seviyesi teslimat — §3.3 IHRACAT satır seviyesi */
export interface LineDeliveryInput {
  deliveryTerms?: DeliveryTermsInput;
  deliveryAddress?: AddressInput;
  shipment?: ShipmentInput;
}
