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
  /** Apartman / blok adı — B-98 */
  blockName?: string;
  /** Mahalle / district — B-98 */
  district?: string;
  /** Posta kutusu — B-98 */
  postbox?: string;
  citySubdivisionName?: string;
  cityName?: string;
  postalZone?: string;
  region?: string;
  /** Ülke adı — cac:Country/cbc:Name */
  country?: string;
  /** Ülke kodu ISO 3166-1 alpha-2 — cac:Country/cbc:IdentificationCode (B-100) */
  countryCode?: string;

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
  /** Aracı kurum tüzel adı — B-37 cac:PartyName/cbc:Name */
  name?: string;
  /** Aracı kurum posta adresi — B-37 cac:PostalAddress */
  postalAddress?: AddressInput;
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

/** Belge referansı (genel amaçlı) — M6: parent opsiyonel, verilirse issueDate zorunlu (B-32). */
export interface DocumentReferenceInput {
  id: string;
  /** XSD zorunlu (B-32) */
  issueDate: string;
  documentTypeCode?: string;
  documentType?: string;
  documentDescription?: string;
}

/** BillingReference — §2.1 IADE grubu */
export interface BillingReferenceInput {
  invoiceDocumentReference: DocumentReferenceInput;
}

/** OrderReference — M6: parent opsiyonel, verilirse issueDate zorunlu (B-33). */
export interface OrderReferenceInput {
  id: string;
  /** XSD zorunlu (B-33) */
  issueDate: string;
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

/** Adres bilgileri — M6: parent opsiyonel, verilirse cityName+citySubdivisionName zorunlu (B-35). */
export interface AddressInput {
  streetName?: string;
  buildingName?: string;
  buildingNumber?: string;
  room?: string;
  /** Apartman / blok adı — B-98 */
  blockName?: string;
  /** Mahalle / district — B-98 */
  district?: string;
  /** Posta kutusu — B-98 */
  postbox?: string;
  /** İlçe adı — XSD zorunlu (B-35) */
  citySubdivisionName: string;
  /** Şehir adı — XSD zorunlu (B-35) */
  cityName: string;
  postalZone?: string;
  region?: string;
  /** Ülke adı — cac:Country/cbc:Name */
  country?: string;
  /** Ülke kodu ISO 3166-1 alpha-2 — cac:Country/cbc:IdentificationCode (B-100) */
  countryCode?: string;
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
  /**
   * Gümrük beyannameleri — IHRACKAYITLI + 702 için zorunlu (B-07, B-14).
   * Schematron satır 322/451: CustomsDeclaration/IssuerParty/PartyIdentification
   * schemeID ∈ {SATICIDIBSATIRKOD, ALICIDIBSATIRKOD}.
   */
  customsDeclarations?: CustomsDeclarationInput[];
}

export interface ActualPackageInput {
  packagingTypeCode?: string;
  quantity?: number;
}

/**
 * Gümrük beyannamesi — B-14 (Sprint 5.3).
 * IHRACKAYITLI + 702 senaryosu için `issuerParty.partyIdentifications`
 * en az bir `schemeID='ALICIDIBSATIRKOD'` 11 haneli girdi içermelidir.
 */
export interface CustomsDeclarationInput {
  id?: string;
  issuerParty?: CustomsDeclarationIssuerPartyInput;
}

export interface CustomsDeclarationIssuerPartyInput {
  partyIdentifications?: PartyIdentificationInput[];
}

/** Taraf kimliği (schemeID'li) — CustomsDeclaration IssuerParty için */
export interface PartyIdentificationInput {
  /** Kimlik değeri (ör: 11 hane ALICIDIBSATIRKOD) */
  id: string;
  /** Şema tanımlayıcısı (SATICIDIBSATIRKOD | ALICIDIBSATIRKOD — Schematron satır 451) */
  schemeID: string;
}

/** Ödeme yöntemi — §3.6 KAMU. M6: parent opsiyonel, verilirse paymentMeansCode zorunlu (B-70). */
export interface PaymentMeansInput {
  /** XSD zorunlu (B-70) */
  paymentMeansCode: string;
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
