import type { DespatchProfileId, DespatchTypeCode } from './enums';
import type {
  PartyInput,
  AdditionalDocumentInput,
  OrderReferenceInput,
  SignatureInput,
  AdditionalItemIdInput,
  AddressInput,
  PartyIdentifierInput,
} from './common';

/** İrsaliye giriş verisi — tüm senaryoları kapsar */
export interface DespatchInput {
  // === §5.1 ZORUNLU ALANLAR ===
  /** İrsaliye numarası: ^[A-Z0-9]{3}20[0-9]{2}[0-9]{9}$ */
  id: string;
  /** UUID v4 */
  uuid: string;
  /** Profil türü */
  profileId: DespatchProfileId;
  /** İrsaliye tip kodu */
  despatchTypeCode: DespatchTypeCode;
  /** Düzenleme tarihi: YYYY-MM-DD */
  issueDate: string;
  /** Düzenleme saati: HH:mm:ss — XSD zorunlu (B-18) */
  issueTime: string;
  /** Gönderici */
  supplier: PartyInput;
  /** Alıcı */
  customer: PartyInput;
  /** Sevkiyat bilgileri */
  shipment: DespatchShipmentInput;
  /** İrsaliye kalemleri */
  lines: DespatchLineInput[];

  // === OPSİYONEL ===
  /** Notlar */
  notes?: string[];
  /** Sipariş referansları — B-53: XSD maxOccurs="unbounded" (0..n) */
  orderReferences?: OrderReferenceInput[];
  /** Ek belgeler — §5.3 MATBUDAN için zorunlu */
  additionalDocuments?: AdditionalDocumentInput[];
  /** Signature bilgisi */
  signatureInfo?: SignatureInput;

  // === B-19: DespatchSupplierParty/DespatchContact/Name (UBL-TR §5.4 "Teslim Eden") ===
  /** Teslim eden kişinin adı — DespatchSupplierParty altındaki DespatchContact/Name */
  despatchContactName?: string;

  // === B-48: XSD opsiyonel 3 party tipi (UBL-DespatchAdvice-2.1.xsd:26-28) ===
  /** Alıcı müşteri (BuyerCustomerParty) — delivery'den farklı tarafsa */
  buyerCustomer?: PartyInput;
  /** Satıcı (SellerSupplierParty) — supplier'dan farklı tarafsa */
  sellerSupplier?: PartyInput;
  /** Sipariş veren (OriginatorCustomerParty) — komisyoncu/özel senaryo */
  originator?: PartyInput;
}

/** Sevkiyat bilgileri */
export interface DespatchShipmentInput {
  /** Gerçek sevk tarihi: YYYY-MM-DD — zorunlu */
  actualDespatchDate: string;
  /** Gerçek sevk saati: HH:mm:ss — zorunlu */
  actualDespatchTime: string;
  /** Teslimat adresi — zorunlu */
  deliveryAddress: AddressInput;
  /** Sürücüler — sürücü (en az 1) veya taşıyıcı zorunlu (AR-2: çoklu destek) */
  driverPersons?: DriverPersonInput[];
  /** Taşıyıcı firma — sürücü veya taşıyıcı zorunlu */
  carrierParty?: CarrierPartyInput;
  /** Plaka bilgileri (TransportMeans/RoadTransport/LicensePlateID path) */
  licensePlates?: LicensePlateInput[];
  /** B-72: Shipment/cbc:ID değeri (default: '1') */
  shipmentId?: string;
  /** B-73: Shipment/GoodsItem/cbc:ValueAmount */
  goodsItem?: {
    valueAmount?: { value: number; currencyId?: string };
  };
  /** B-49: Canonical DORSEPLAKA path — Shipment/TransportHandlingUnit/TransportEquipment/ID */
  transportHandlingUnits?: DespatchTransportHandlingUnitInput[];
}

/** Despatch canonical TransportHandlingUnit/TransportEquipment/ID — B-49 */
export interface DespatchTransportHandlingUnitInput {
  /** TransportEquipment cbc:ID (örn. plaka numarası) */
  transportEquipmentId: string;
  /** schemeID (default: 'DORSEPLAKA') */
  schemeId?: string;
}

/** Sürücü bilgileri */
export interface DriverPersonInput {
  firstName: string;
  familyName: string;
  nationalityId: string;
  title?: string;
}

/** Taşıyıcı firma */
export interface CarrierPartyInput {
  vknTckn: string;
  taxIdType: 'VKN' | 'TCKN';
  name?: string;
  firstName?: string;
  familyName?: string;
  additionalIdentifiers?: PartyIdentifierInput[];
}

/** Plaka bilgisi */
export interface LicensePlateInput {
  /** Plaka numarası */
  plateNumber: string;
  /** PLAKA veya DORSE */
  schemeId: 'PLAKA' | 'DORSE';
}

/** İrsaliye kalemi */
export interface DespatchLineInput {
  /** Satır numarası (numerik) */
  id: string;
  /** Teslim edilen miktar */
  deliveredQuantity: number;
  /** Birim kodu (UnitCodeList) */
  unitCode: string;
  /** Ürün bilgileri */
  item: DespatchItemInput;
}

/** İrsaliye ürün bilgileri */
export interface DespatchItemInput {
  /** Ürün adı — boş olamaz */
  name: string;
  /** Ek ürün kimlikleri — §5.5 KUNYENO, §5.6 ETIKETNO */
  additionalItemIdentifications?: AdditionalItemIdInput[];
}
