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
  /** Gönderici */
  supplier: PartyInput;
  /** Alıcı */
  customer: PartyInput;
  /** Sevkiyat bilgileri */
  shipment: DespatchShipmentInput;
  /** İrsaliye kalemleri */
  lines: DespatchLineInput[];

  // === OPSİYONEL ===
  /** Düzenleme saati: HH:mm:ss */
  issueTime?: string;
  /** Notlar */
  notes?: string[];
  /** Sipariş referansı */
  orderReference?: OrderReferenceInput;
  /** Ek belgeler — §5.3 MATBUDAN için zorunlu */
  additionalDocuments?: AdditionalDocumentInput[];
  /** Signature bilgisi */
  signatureInfo?: SignatureInput;
}

/** Sevkiyat bilgileri */
export interface DespatchShipmentInput {
  /** Gerçek sevk tarihi: YYYY-MM-DD — zorunlu */
  actualDespatchDate: string;
  /** Gerçek sevk saati: HH:mm:ss — zorunlu */
  actualDespatchTime: string;
  /** Teslimat adresi — zorunlu */
  deliveryAddress: AddressInput;
  /** Sürücü bilgileri — sürücü veya taşıyıcı zorunlu */
  driverPerson?: DriverPersonInput;
  /** Taşıyıcı firma — sürücü veya taşıyıcı zorunlu */
  carrierParty?: CarrierPartyInput;
  /** Plaka bilgileri */
  licensePlates?: LicensePlateInput[];
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
