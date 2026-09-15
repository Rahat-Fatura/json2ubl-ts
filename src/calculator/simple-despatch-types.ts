/**
 * Basitleştirilmiş e-İrsaliye giriş tipleri.
 *
 * Geliştirici sadece temel verileri sağlar, SDK VKN/TCKN ayrımını, tarih/saat
 * bölünmesini ve UBL-TR dönüşümünü otomatik yapar.
 *
 * ── 🔴 FATURA KATMANININ AYNASI ─────────────────────────────────────────────
 * Bu dosya `simple-types.ts` (fatura) ile BİLİNÇLİ olarak aynı desende yazılmıştır;
 * dışarıdan bakan biri birini tanıdığında diğerini de tanımalıdır. Korunan kurallar:
 *   · taraflar `sender` / `customer` adlanır (ham UBL'deki `DespatchSupplierParty` /
 *     `DeliveryCustomerParty` DEĞİL) — `SimplePartyInput` fatura ile ORTAK.
 *   · `datetime` TEK alandır; SDK `issueDate` + `issueTime`e böler (fatura:
 *     `simple-invoice-mapper.ts:72-78`). İrsaliyede `IssueTime` XSD-zorunlu
 *     olduğu için bu bölünme burada daha da kritiktir (UBL-TR B-18).
 *   · `type` / `profile` DÜZ STRING'dir, enum değil. Enum yalnız HAM katmandadır
 *     (`DespatchInput.despatchTypeCode`); `Simple*` katmanı string konuşur,
 *     tıpkı `SimpleInvoiceInput.profile` gibi.
 *   · `id` opsiyoneldir — numaralandırma çağıranın ya da seri motorunun işidir.
 *
 * ── İRSALİYENİN FATURADAN FARKI ─────────────────────────────────────────────
 * TUTAR / VERGİ YOKTUR. `DespatchLine` XSD'sinde `LineExtensionAmount`, `TaxTotal`,
 * `Price` YOKTUR — kalem yalnız "ne, ne kadar, hangi birimde"dir. Bu yüzden
 * irsaliye oturumunda hesaplama motoru da YOKTUR (fatura: `document-calculator`).
 * Tek istisna `shipment.goodsItem.valueAmount` (taşınan malın beyan değeri).
 */
import type { SimplePartyInput } from './simple-types';

// ─── Sevkiyat ────────────────────────────────────────────────────────────────

/**
 * Şoför — `Shipment/ShipmentStage/DriverPerson`.
 *
 * 🔴 Schematron `DespatchCarrierDriverCheck` (Common:765-770): şoför VERİLİRSE
 * ad, soyad ve kimlik numarasının ÜÇÜ DE dolu olmalıdır.
 * ⚠️ Kural `string(node-set)` kullandığı için GİB yalnız İLK şoförü denetler;
 * çoklu şoförde ikincinin boş alanı şematrondan geçer → doğrulama BİZİM işimiz.
 */
export interface SimpleDriverInput {
  /** Ad — zorunlu */
  firstName: string;
  /** Soyad — zorunlu */
  familyName: string;
  /**
   * TCKN — zorunlu. Yabancı uyruklu şoförde pasaport numarası
   * (e-İrsaliye Uygulama Kılavuzu §15.34: dolgu numara YASAK, UETDS bildirimiyle
   * eşleşmek zorunda).
   */
  nationalityId: string;
}

/** Plaka şema kimlikleri — `LicensePlateIDSchemeIDCheck` (Codelist:37). */
export type SimpleLicensePlateScheme =
  | 'PLAKA'
  | 'DORSE'
  | 'DORSEPLAKA'
  | 'YABANCIPLAKA'
  | 'YABANCIDORSE'
  | 'YABANCIDORSEPLAKA';

/**
 * Araç plakası — `ShipmentStage/TransportMeans/RoadTransport/LicensePlateID`.
 *
 * 🔴 `LicensePlateIDCheck` (Common:786-788): geçerli şemalı, BOŞ OLMAYAN en az bir
 * plaka HER İRSALİYEDE zorunludur — taşıyıcı firma verilse BİLE. Ekran "kargoya
 * verdim" dese de plaka istemek zorundadır.
 * TR şemalarında biçim `^(0[1-9]|[1-7][0-9]|8[01])[A-Z]+[0-9]+$`; `YABANCI*`
 * şemalarında `^[A-Z0-9_-]+$`.
 */
export interface SimpleLicensePlateInput {
  /** Plaka metni */
  value: string;
  /** Şema — varsayılan: "PLAKA" */
  scheme?: SimpleLicensePlateScheme;
}

/** Sevkiyat bilgileri — `cac:Shipment` (XSD'de zorunlu). */
export interface SimpleShipmentInput {
  /**
   * Fiili sevk anı — `ActualDespatchDate` + `ActualDespatchTime`.
   * `datetime` gibi TEK alandır, SDK böler.
   *
   * 🔴 Fiili sevk anı, düzenleme anından ÖNCE OLAMAZ (Uygulama Kılavuzu §10).
   * İleri tarih serbesttir. Tek istisna MATBUDAN dönüşümüdür.
   */
  actualDespatchDatetime: string;
  /** Teslimat adresi — zorunlu (`DespatchAddressCheck`: ilçe+il+ülke+posta kodu) */
  deliveryAddress: SimpleDeliveryAddressInput;
  /**
   * Şoförler. 🔴 Şoför VEYA taşıyıcıdan en az biri ZORUNLU
   * (`DespatchCarrierDriverCheck`).
   */
  drivers?: SimpleDriverInput[];
  /** Taşıyıcı firma — `Delivery/CarrierParty`. Şoför yoksa zorunlu. */
  carrier?: SimplePartyInput;
  /** Araç/dorse plakaları — en az biri ZORUNLU (yukarıdaki nota bkz.) */
  licensePlates?: SimpleLicensePlateInput[];
  /** Sevkiyat numarası — `Shipment/ID` */
  shipmentId?: string;
  /** Taşınan malın beyan değeri — irsaliyedeki TEK tutar alanı */
  goodsValue?: number;
  /** Beyan değerinin para birimi — varsayılan: "TRY" */
  goodsValueCurrency?: string;
}

/** Teslimat adresi — fatura `SimplePartyInput` adres alanlarıyla aynı dilde. */
export interface SimpleDeliveryAddressInput {
  /** Açık adres — zorunlu */
  address: string;
  /** İlçe — zorunlu (`CitySubdivisionName`) */
  district: string;
  /** İl — zorunlu (`CityName`) */
  city: string;
  /** Ülke — varsayılan: "Türkiye" */
  country?: string;
  /**
   * Posta kodu — zorunlu.
   * 🔴 Şematron TR biçimini KOŞULSUZ dayatır (`^((0[1-9])|([1-7][0-9])|(8[0-1]))[0-9]{3}$`),
   * ülke ayrımı YAPMAZ. Yurt dışı teslimat adresi bu kapıyı geçemez — ihracat
   * e-İrsaliyesi bu sürümde KAPSAM DIŞIDIR.
   */
  zipCode: string;
}

// ─── Kalem ───────────────────────────────────────────────────────────────────

/** Ek ürün kimliği — `Item/AdditionalItemIdentification`. */
export interface SimpleItemIdentificationInput {
  /** Şema: "KUNYENO" (HKS, 19 karakter) / "ETIKETNO" (İDİS, 9 karakter) vb. */
  scheme: string;
  /** Değer */
  value: string;
}

/**
 * İrsaliye kalemi.
 *
 * 🔴 TUTAR/VERGİ ALANI YOKTUR — `DespatchLineType` XSD'sinde karşılıkları yok.
 * Faturanın 25+ sütunlu kalemiyle karıştırılmamalıdır.
 */
export interface SimpleDespatchLineInput {
  /** Mal/hizmet adı — zorunlu (`ItemNameCheck`) */
  name: string;
  /** Sevk edilen miktar — zorunlu (`DeliveredQuantityCheck`) */
  quantity: number;
  /** Birim kodu (UN/ECE Rec20) — zorunlu */
  unitCode: string;
  /** Açıklama */
  description?: string;
  /**
   * Ek kimlikler. HKSIRSALIYE'de HER satırda 19 karakterlik `KUNYENO`,
   * IDISIRSALIYE'de 9 karakterlik `ETIKETNO` ZORUNLUDUR.
   */
  additionalIdentifications?: SimpleItemIdentificationInput[];
  /** Satır notu */
  note?: string;
}

// ─── Referanslar ─────────────────────────────────────────────────────────────

/** Sipariş referansı — irsaliyede 0..n (XSD `maxOccurs="unbounded"`, B-53). */
export interface SimpleDespatchOrderReferenceInput {
  /** Sipariş numarası */
  id: string;
  /** Sipariş tarihi (YYYY-MM-DD) */
  issueDate?: string;
}

/**
 * Ek belge — `AdditionalDocumentReference`.
 * 🔴 `MATBUDAN` tipinde ID ve tarihi dolu EN AZ BİR ek belge ZORUNLUDUR
 * (`DespatchAdviceTypeCodeCheck`).
 */
export interface SimpleDespatchAdditionalDocumentInput {
  /** Belge numarası */
  id: string;
  /** Belge tarihi (YYYY-MM-DD) */
  issueDate: string;
  /** Belge tipi kodu */
  documentTypeCode?: string;
  /** Açıklama */
  description?: string;
}

// ─── Kök ─────────────────────────────────────────────────────────────────────

/** Basitleştirilmiş e-İrsaliye girişi. */
export interface SimpleDespatchInput {
  /** Gönderici — `DespatchSupplierParty` */
  sender: SimplePartyInput;
  /** Alıcı — `DeliveryCustomerParty` */
  customer: SimplePartyInput;
  /** Sevkiyat bilgileri — zorunlu */
  shipment: SimpleShipmentInput;
  /** Kalemler — en az bir tane */
  lines: SimpleDespatchLineInput[];

  /** İrsaliye numarası (16 hane). Verilmezse çağıran/seri motoru doldurur. */
  id?: string;
  /** ETTN. Verilmezse üretilir. */
  uuid?: string;
  /** Düzenleme anı — SDK `issueDate` + `issueTime`e böler. Varsayılan: şimdi. */
  datetime?: string;
  /** İrsaliye tipi: "SEVK" | "MATBUDAN" — varsayılan: "SEVK" */
  type?: string;
  /** Profil: "TEMELIRSALIYE" | "HKSIRSALIYE" | "IDISIRSALIYE" — varsayılan: "TEMELIRSALIYE" */
  profile?: string;

  /** Notlar */
  notes?: string[];
  /** Sipariş referansları (0..n) */
  orderReferences?: SimpleDespatchOrderReferenceInput[];
  /** Ek belgeler — MATBUDAN'da zorunlu */
  additionalDocuments?: SimpleDespatchAdditionalDocumentInput[];

  /** Teslim eden kişinin adı — `DespatchSupplierParty/DespatchContact/Name` */
  despatchContactName?: string;
  /** Alıcı müşteri — teslimat tarafından FARKLIYSA (`BuyerCustomerParty`) */
  buyerCustomer?: SimplePartyInput;
  /** Satıcı — göndericiden FARKLIYSA (`SellerSupplierParty`) */
  sellerSupplier?: SimplePartyInput;
  /** Sipariş veren — komisyoncu/özel senaryo (`OriginatorCustomerParty`) */
  originator?: SimplePartyInput;
}
