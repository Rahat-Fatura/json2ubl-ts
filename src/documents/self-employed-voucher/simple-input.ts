/**
 * Basitleştirilmiş e-SMM giriş tipleri.
 *
 * Çağıran yalnız iş verisini verir; hesaplama, tip/profil, VKN/TCKN ayrımı ve
 * UBL dönüşümü kütüphanede kalır — `SimpleInvoiceInput` ile aynı sözleşme.
 *
 * ── TARAF TİPİ ORTAK ───────────────────────────────────────────────────────
 * `SimplePartyInput` fatura/irsaliye ile PAYLAŞILIR. Kopyalanmadı: taraf şekli
 * belgeye göre değişmiyor ve bu depoda kopyalanan her taraf üreticisi canlı
 * kusur doğurdu.
 *
 * ── PROFİL/TİP GİRDİDE YOK ─────────────────────────────────────────────────
 * e-SMM'de profil ve tip TEK değerlidir (`EARSIVBELGE` / `SERBESTMESLEKMAKBUZU`);
 * seçilecek bir şey olmadığı için girdi yüzeyinde alan AÇILMAZ. Faturada
 * olduğu gibi boş bir eksen taşımak, olmayan bir kararı varmış gibi gösterirdi.
 */

import type { SimplePartyInput } from '../../calculator/simple-types';

/** Gönderim şekli — `AdditionalDocumentReference/cbc:DocumentTypeCode=EXT_SEND_METHOD`. */
export type SelfEmployedVoucherSendMethod = 'ELEKTRONIK' | 'KAGIT';

/** e-SMM kalemi (basit). */
export interface SimpleSelfEmployedVoucherLineInput {
  /** Hizmet adı — zorunlu. */
  name: string;
  /** Miktar — zorunlu. */
  quantity: number;
  /** Birim brüt ücret (KDV hariç) — zorunlu. */
  price: number;
  /** Birim kodu (Türkçe ad ya da UBL kodu: "Adet" / "C62") — varsayılan "Adet". */
  unitCode?: string;
  /** KDV oranı (%) — zorunlu. `0` ise istisna açıklaması ZORUNLU olur. */
  kdvPercent: number;
  /**
   * Gelir vergisi stopajı oranı (%) — `TaxSubtotal[0003]`.
   *
   * 🔴 ORAN SABİT DEĞİLDİR, KULLANICIDAN ALINIR. GVK 94 oranları belirler,
   * Cumhurbaşkanı sıfıra kadar indirebilir ve noterler istisnadır; kütüphane
   * varsayılan bir oran DAYATMAZ. Verilmezse belge seviyesindeki değer,
   * o da yoksa stopaj HİÇ yazılmaz (stopajsız e-SMM meşrudur — 12/12 prod
   * belge stopajsızdır).
   */
  incomeTaxWithholdingPercent?: number;
  /**
   * KDV tevkifatı oranı (%) — `TaxSubtotal[9015]`.
   *
   * ⚠️ Matrah **hesaplanan KDV**'dir, brüt ücret değil. Oran KDV'nin kesridir
   * (`602 → 9/10` gibi); bkz. `TaxDefinition.baseIsCalculatedVat`.
   */
  vatWithholdingPercent?: number;
  /** İskonto oranı (%). */
  allowancePercent?: number;
  /**
   * KDV istisna sebep KODU — üretimde `351`.
   * ⚠️ Şematron `TaxExemptionReasonCheck` METNİ ister; kod tek başına yetmez.
   * Kod verilip metin verilmezse metin kod listesinden çözülür.
   */
  kdvExemptionCode?: string;
  /** KDV istisna sebep METNİ — verilirse koddan türetmeye tercih edilir. */
  kdvExemptionReason?: string;
  /** Hizmet açıklaması — `cac:Item/cbc:Description`. */
  description?: string;
  /** Satır notu — `cac:InvoiceLine/cbc:Note`. */
  note?: string;
}

/** e-SMM belgesi (basit). */
export interface SimpleSelfEmployedVoucherInput {
  /**
   * Makbuz numarası — `^[A-Z0-9]{3}20\d{2}\d{9}$`.
   * Oturum aşamasında BOŞ olabilir; numarayı gönderim anında seri motoru verir.
   */
  documentNumber?: string;
  /** ETTN — verilmezse üretilir. */
  uuid?: string;
  /**
   * Düzenleme tarihi+saati: `YYYY-MM-DDTHH:mm:ss`.
   * Saat e-SMM'de ZORUNLUDUR (509 VUK GT IV.4.3-c) — verilmezse "şimdi" alınır.
   */
  datetime?: string;
  /** Para birimi — varsayılan `TRY`. */
  currencyCode?: string;
  /** Kur — TRY dışı belgede ZORUNLU (şematron `CurrencyCodeCheck`, 6 ondalık). */
  exchangeRate?: number;
  /** Serbest meslek erbabı. */
  supplier: SimplePartyInput;
  /** Hizmeti alan. */
  customer: SimplePartyInput;
  /** Kalemler. */
  lines: SimpleSelfEmployedVoucherLineInput[];
  /** Belge notları. */
  notes?: string[];
  /** Belge seviyesi gelir vergisi stopajı oranı (%) — kalem oranı önceliklidir. */
  incomeTaxWithholdingPercent?: number;
  /** Belge seviyesi KDV tevkifatı oranı (%) — kalem oranı önceliklidir. */
  vatWithholdingPercent?: number;
  /** Belge seviyesi KDV istisna sebep kodu — kalem kodu önceliklidir. */
  kdvExemptionCode?: string;
  /** Belge seviyesi KDV istisna sebep metni — kalem metni önceliklidir. */
  kdvExemptionReason?: string;
  /**
   * Gönderim şekli — rapor eşlemesinde `gonderimSekli` alanını besler.
   * Verilirse `DocumentTypeCode=EXT_SEND_METHOD` taşıyan bir
   * `cac:AdditionalDocumentReference` yazılır (prod deseni; 12/12 belgede var).
   */
  sendMethod?: SelfEmployedVoucherSendMethod;
}
